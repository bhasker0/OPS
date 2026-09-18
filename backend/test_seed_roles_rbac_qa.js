const http = require('http');
const prisma = require('./src/db/prisma');
const AuditLog = require('./src/models/AuditLog');
const { connectMongo, closeMongoConnection } = require('./src/config/mongo');

const API_BASE = 'http://localhost:5000/api';
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

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

async function runSeedRolesRBACQA() {
  console.log('🧪 Starting Master Seed Role Inheritance & Tenant Custom Role Isolation QA Suite (SCRUM-332)...\n');
  let passed = 0;
  let total = 8;

  // Retrieve two distinct tenant companies
  const tenantCompanies = await prisma.company.findMany({
    where: { isSeed: false },
    take: 2,
  });

  if (tenantCompanies.length < 2) {
    console.error('❌ Need at least 2 non-seed tenant companies to verify isolation.');
    process.exit(1);
  }

  const companyA = tenantCompanies[0];
  const companyB = tenantCompanies[1];
  console.log(`  🏢 Test Tenant A: '${companyA.name}' (${companyA.id})`);
  console.log(`  🏢 Test Tenant B: '${companyB.name}' (${companyB.id})\n`);

  let customRoleIdCompanyA = null;
  const customRoleName = `Quality Inspector Test ${Date.now()}`;

  // Test 1: Global Master Seed Role Query (Includes OPS Super Admin for Internal OPS)
  try {
    const globalRolesRes = await request('GET', '/roles');
    const isOnlySeed =
      globalRolesRes.status === 200 &&
      globalRolesRes.data.success &&
      Array.isArray(globalRolesRes.data.data) &&
      globalRolesRes.data.data.length >= 4 &&
      globalRolesRes.data.data.every((r) => r.companyId === SEED_COMPANY_ID) &&
      globalRolesRes.data.data.some((r) => r.name === 'OPS Super Admin');

    if (isOnlySeed) {
      console.log(`  ✅ PASSED [Test 1]: Global GET /api/roles returned ${globalRolesRes.data.data.length} Master Seed roles including 'OPS Super Admin'.`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 1]: Global roles contained non-seed roles or missing OPS Super Admin', globalRolesRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Tenant Company A inherits Master Seed Roles EXCEPT OPS Super Admin (SCRUM-333)
  try {
    const tenantARolesRes = await request('GET', `/roles?companyId=${companyA.id}`);
    const hasSeedRoles =
      tenantARolesRes.status === 200 &&
      tenantARolesRes.data.success &&
      tenantARolesRes.data.data.some((r) => r.name === 'Company Admin' && r.isInherited === true) &&
      tenantARolesRes.data.data.some((r) => r.name === 'Munim' && r.isInherited === true) &&
      !tenantARolesRes.data.data.some((r) => r.name === 'OPS Super Admin');

    const directTenantRolesRes = await request('GET', `/companies/${companyA.id}/roles`);
    const directExcludesOpsAdmin =
      directTenantRolesRes.status === 200 &&
      directTenantRolesRes.data.success &&
      !directTenantRolesRes.data.data.some((r) => r.name === 'OPS Super Admin');

    if (hasSeedRoles && directExcludesOpsAdmin) {
      console.log(`  ✅ PASSED [Test 2]: Tenant Company A (${companyA.name}) inherited tenant Seed Roles, and 'OPS Super Admin' is STRICTLY EXCLUDED.`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 2]: Tenant A did not inherit seed roles or leaked OPS Super Admin', { tenantARolesRes, directTenantRolesRes });
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Create Custom Role specifically for Tenant Company A
  try {
    const createRoleRes = await request('POST', '/roles', {
      name: customRoleName,
      companyId: companyA.id,
      permissions: ['READ_FLOOR', 'PRINT_SLIPS'],
    });

    if (
      createRoleRes.status === 201 &&
      createRoleRes.data.success &&
      createRoleRes.data.data.name === customRoleName &&
      createRoleRes.data.data.companyId === companyA.id &&
      createRoleRes.data.data.isSystemDefined === false
    ) {
      customRoleIdCompanyA = createRoleRes.data.data.id;
      console.log(`  ✅ PASSED [Test 3]: Custom Role '${customRoleName}' provisioned strictly for Tenant A (${companyA.name}).`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 3]: Custom role creation failed', createRoleRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: Custom Role visible in Tenant Company A's query
  try {
    const rolesARes = await request('GET', `/roles?companyId=${companyA.id}`);
    const foundInA =
      rolesARes.status === 200 &&
      rolesARes.data.data.some((r) => r.id === customRoleIdCompanyA && r.isCustom === true);

    if (foundInA) {
      console.log(`  ✅ PASSED [Test 4]: Tenant A query contains Seed Roles + its own custom role '${customRoleName}'.`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 4]: Custom role not found in Tenant A query', rolesARes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: STRICT TENANT ISOLATION - Custom Role NOT visible in Tenant Company B's query
  try {
    const rolesBRes = await request('GET', `/roles?companyId=${companyB.id}`);
    const leakedToB =
      rolesBRes.status === 200 &&
      rolesBRes.data.data.some((r) => r.id === customRoleIdCompanyA || r.name === customRoleName);

    if (!leakedToB) {
      console.log(`  ✅ PASSED [Test 5]: STRICT TENANT ISOLATION VERIFIED - Company A's custom role is COMPLETELY INVISIBLE to Company B (${companyB.name}).`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 5]: SECURITY LEAK! Custom role of Tenant A appeared in Tenant B query!', rolesBRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: Custom Role NOT visible in Global Seed baseline view
  try {
    const globalRes = await request('GET', '/roles');
    const leakedToGlobal =
      globalRes.status === 200 &&
      globalRes.data.data.some((r) => r.id === customRoleIdCompanyA || r.name === customRoleName);

    if (!leakedToGlobal) {
      console.log('  ✅ PASSED [Test 6]: Global baseline view remains 100% clean and contains only Master Seed Roles.');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 6]: Custom role leaked into global seed view', globalRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 6] Exception:', err.message);
  }

  // Test 7: Master Seed Role Immutability Guard (PUT & DELETE return 403)
  try {
    const seedRole = await prisma.role.findFirst({
      where: { companyId: SEED_COMPANY_ID, isSystemDefined: true },
    });

    const editRes = await request('PUT', `/roles/${seedRole.id}`, { name: 'Compromised Master Role' });
    const delRes = await request('DELETE', `/roles/${seedRole.id}`);

    if (
      editRes.status === 403 &&
      delRes.status === 403 &&
      editRes.data.message.includes('System-defined roles cannot be modified') &&
      delRes.data.message.includes('System-defined roles cannot be deleted')
    ) {
      console.log('  ✅ PASSED [Test 7]: Master Seed Roles are strictly immutable (PUT/DELETE rejected with 403 Forbidden).');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 7]: Immutability guard failed', { editRes, delRes });
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 7] Exception:', err.message);
  }

  // Test 8: Custom Role Lifecycle & Deletion Cleanup with MongoDB Audit
  try {
    const delCustomRes = await request('DELETE', `/roles/${customRoleIdCompanyA}`);

    await connectMongo();
    const deleteAudit = await AuditLog.findOne({
      module: 'ROLE',
      action: 'DELETE_ROLE',
      entityId: customRoleIdCompanyA,
    });

    if (delCustomRes.status === 200 && delCustomRes.data.success && deleteAudit) {
      console.log('  ✅ PASSED [Test 8]: Custom role deleted cleanly and security event recorded in MongoDB Audit Trail.');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 8]: Custom role deletion or audit logging failed', { delCustomRes, deleteAudit });
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 8] Exception:', err.message);
  }

  console.log(`\n📊 MASTER SEED ROLE & CUSTOM ROLE ISOLATION QA: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('🎉 SCRUM-332 RBAC SEED ROLE INHERITANCE & ISOLATION QA VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runSeedRolesRBACQA()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongoConnection();
  });
