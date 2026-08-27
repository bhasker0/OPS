const http = require('http');
const prisma = require('./src/db/prisma');
const AuditLog = require('./src/models/AuditLog');
const { connectMongo, closeMongoConnection } = require('./src/config/mongo');

const API_BASE = 'http://localhost:5000/api';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runParameterStoreQA() {
  console.log('?? Starting SCRUM-12 Dynamic Company Parameter Store QA Suite...\n');
  let passed = 0;
  let total = 8;

  // Retrieve two tenant companies for multi-tenant isolation testing
  const companies = await prisma.company.findMany({
    where: { isSeed: false },
    take: 2,
  });

  const tenantA = companies[0];
  const tenantB = companies[1];

  // Test 1: Global Seed Parameter Catalogue (GET /api/seed/parameters)
  try {
    const seedRes = await request('GET', '/seed/parameters');
    if (
      seedRes.status === 200 &&
      seedRes.data.success &&
      seedRes.data.data.length >= 10 &&
      seedRes.data.data.some(p => p.key === 'sac_code' && p.value === '9988')
    ) {
      console.log('  ✅ PASSED [Test 1]: GET /api/seed/parameters returned master default parameter catalogue');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 1]: Seed parameter catalogue failed', seedRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Tenant Parameter Query with Inheritance Fallback (GET /api/companies/:id/parameters)
  try {
    const tenantParamsRes = await request('GET', `/companies/${tenantA.id}/parameters`);
    if (
      tenantParamsRes.status === 200 &&
      tenantParamsRes.data.success &&
      tenantParamsRes.data.data.length >= 10 &&
      tenantParamsRes.data.data.every(p => p.type && p.defaultValue !== undefined)
    ) {
      console.log('  ? PASSED [Test 2]: GET /api/companies/:id/parameters returned effective parameters with typed values & seed defaults');
      passed++;
    } else {
      console.error('  ? FAILED [Test 2]: Tenant parameters retrieval failed', tenantParamsRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Set Custom Parameter Override (PUT /api/companies/:id/parameters/:key)
  const testKey = 'shrinkage_tolerance_percent';
  const customOverrideVal = '4.75';
  try {
    const putRes = await request('PUT', `/companies/${tenantA.id}/parameters/${testKey}`, {
      value: customOverrideVal,
      description: 'Custom textile shrinkage warning tolerance for high-speed looms',
    });

    if (
      putRes.status === 200 &&
      putRes.data.success &&
      putRes.data.data.value === customOverrideVal &&
      putRes.data.data.type === 'NUMBER' &&
      putRes.data.data.isOverridden === true
    ) {
      console.log('  ? PASSED [Test 3]: PUT /api/companies/:id/parameters/:key updated custom override with typed coercion (NUMBER)');
      passed++;
    } else {
      console.error('  ? FAILED [Test 3]: Custom override update failed', putRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: Single Parameter Retrieval (GET /api/companies/:id/parameters/:key)
  try {
    const getSingleRes = await request('GET', `/companies/${tenantA.id}/parameters/${testKey}`);
    if (
      getSingleRes.status === 200 &&
      getSingleRes.data.success &&
      getSingleRes.data.data.value === customOverrideVal &&
      getSingleRes.data.data.isOverridden === true
    ) {
      console.log('  ? PASSED [Test 4]: GET /api/companies/:id/parameters/:key returned effective overridden value');
      passed++;
    } else {
      console.error('  ? FAILED [Test 4]: Single parameter fetch failed', getSingleRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: Multi-Tenant Isolation Verification
  try {
    const tenantBParamRes = await request('GET', `/companies/${tenantB.id}/parameters/${testKey}`);
    if (
      tenantBParamRes.status === 200 &&
      tenantBParamRes.data.data.value !== customOverrideVal // Tenant B does NOT see Tenant A's 4.75 override
    ) {
      console.log(`  ? PASSED [Test 5]: Multi-Tenant Isolation verified: Tenant A's override (${customOverrideVal}) does NOT leak to Tenant B (${tenantBParamRes.data.data.value})`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 5]: Cross-tenant parameter leakage detected', tenantBParamRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: Delete Parameter Override & Revert to Seed Default (DELETE /api/companies/:id/parameters/:key)
  try {
    const delRes = await request('DELETE', `/companies/${tenantA.id}/parameters/${testKey}`);
    const postDelRes = await request('GET', `/companies/${tenantA.id}/parameters/${testKey}`);

    if (
      delRes.status === 200 &&
      delRes.data.success &&
      postDelRes.status === 200 &&
      postDelRes.data.data.isInherited === true &&
      postDelRes.data.data.isOverridden === false
    ) {
      console.log('  ? PASSED [Test 6]: Deleting parameter override cleanly reverted tenant back to master seed default');
      passed++;
    } else {
      console.error('  ? FAILED [Test 6]: Parameter deletion reversion failed', { delRes, postDelRes });
    }
  } catch (err) {
    console.error('  ? FAILED [Test 6] Exception:', err.message);
  }

  // Test 7: Master Seed Parameter Deletion Guard (HTTP 400)
  try {
    const seedDelRes = await request('DELETE', `/companies/00000000-0000-0000-0000-000000000000/parameters/sac_code`);
    if (seedDelRes.status === 400 && seedDelRes.data.message.includes('Master Seed Company')) {
      console.log('  ? PASSED [Test 7]: Master Seed default parameter deletion guard protected root parameters (HTTP 400)');
      passed++;
    } else {
      console.error('  ? FAILED [Test 7]: Seed deletion guard failed', seedDelRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 7] Exception:', err.message);
  }

  // Test 8: Mutation Diff & Deletion Recorded in MongoDB Audit Trail
  try {
    await connectMongo();
    const paramAuditLogs = await AuditLog.find({
      module: 'PARAMETER',
      action: { $in: ['UPDATE_PARAMETER', 'DELETE_PARAMETER_OVERRIDE'] },
    });

    if (paramAuditLogs && paramAuditLogs.length >= 2) {
      console.log(`  ? PASSED [Test 8]: MongoDB audit store verified with ${paramAuditLogs.length} parameter update and deletion audit events`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 8]: Parameter audit logs missing in MongoDB', paramAuditLogs);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 8] Exception:', err.message);
  }

  console.log(`\n?? PARAMETER STORE QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-12 DYNAMIC COMPANY PARAMETER STORE VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runParameterStoreQA()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongoConnection();
  });
