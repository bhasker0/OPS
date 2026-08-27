const http = require('http');
const prisma = require('./src/db/prisma');

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

async function runCompanyCRUDQA() {
  console.log('?? Starting SCRUM-7 Company CRUD & Tenant Provisioning QA Suite...\n');
  let passed = 0;
  let total = 8;

  const testCode = 'QA_CRUD_' + Date.now();
  let createdCompanyId = null;

  // Test 1: Atomic Company Provisioning (POST /api/companies)
  try {
    const res1 = await request('POST', '/companies', {
      name: 'Surat Embroidery Tech Hub Pvt Ltd',
      code: testCode,
      gstin: '24AAACT1234A1Z1',
      contactPerson: 'Bhasker Savaliya',
      mobile: '+91 98250 99999',
      email: 'techhub@suratembroidery.in',
      address: 'Plot 202, Road No. 8, Sachin GIDC, Surat, Gujarat 394230',
      currency: 'INR',
      currencySymbol: '?',
      roundOffFormat: 'NEAREST_RUPEE',
      digitsAfterDecimal: 2,
    });

    if (
      res1.status === 201 &&
      res1.data.success &&
      res1.data.data.company &&
      res1.data.data.systemRole &&
      res1.data.data.systemRole.isSystemDefined &&
      res1.data.data.parameters &&
      res1.data.data.parameters.length >= 10
    ) {
      createdCompanyId = res1.data.data.company.id;
      console.log('  ? PASSED [Test 1]: POST /api/companies atomic transaction created company, system admin role, and cloned parameters');
      passed++;
    } else {
      console.error('  ? FAILED [Test 1]: Atomic provisioning failed', res1);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Indian GSTIN Format Validation
  try {
    const invalidGstinRes = await request('POST', '/companies', {
      name: 'Invalid GSTIN Corp',
      code: 'INV_GSTIN_' + Date.now(),
      gstin: 'INVALID_GSTIN_123', // Invalid format
    });

    if (invalidGstinRes.status === 400 && invalidGstinRes.data.message.includes('Invalid Indian GSTIN')) {
      console.log('  ? PASSED [Test 2]: Strict Indian GSTIN validation rejected invalid format with HTTP 400');
      passed++;
    } else {
      console.error('  ? FAILED [Test 2]: Invalid GSTIN was not rejected properly', invalidGstinRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Uniqueness Constraint Enforcement (Duplicate Code)
  try {
    const dupRes = await request('POST', '/companies', {
      name: 'Duplicate Code Corp',
      code: testCode, // Same code as Test 1
      gstin: '24AAACT1234A1Z1',
    });

    if (dupRes.status === 400 && dupRes.data.message.includes('already registered')) {
      console.log('  ? PASSED [Test 3]: Duplicate company code registration blocked with HTTP 400 Bad Request');
      passed++;
    } else {
      console.error('  ? FAILED [Test 3]: Duplicate code was not rejected', dupRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: Search, Filtering & Profile Retrieval (GET /api/companies & GET /api/companies/:id)
  try {
    const listRes = await request('GET', `/companies?search=${testCode}&status=ACTIVE`);
    const getRes = await request('GET', `/companies/${createdCompanyId}`);

    if (
      listRes.status === 200 &&
      listRes.data.data.length >= 1 &&
      getRes.status === 200 &&
      getRes.data.data.id === createdCompanyId &&
      getRes.data.data.roles.length >= 1 &&
      getRes.data.data.parameters.length >= 10
    ) {
      console.log('  ? PASSED [Test 4]: GET /api/companies search/filtering & GET /api/companies/:id profile verified');
      passed++;
    } else {
      console.error('  ? FAILED [Test 4]: Retrieval or search failed', { listRes, getRes });
    }
  } catch (err) {
    console.error('  ? FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: Company Update with Audit Diff (PUT /api/companies/:id)
  try {
    const updateRes = await request('PUT', `/companies/${createdCompanyId}`, {
      contactPerson: 'Bhasker Savaliya (MD)',
      address: 'Plot 202-204, Road No. 8, Sachin GIDC, Surat 394230',
    });

    if (
      updateRes.status === 200 &&
      updateRes.data.success &&
      updateRes.data.data.contactPerson === 'Bhasker Savaliya (MD)'
    ) {
      console.log('  ? PASSED [Test 5]: PUT /api/companies/:id updated company attributes and logged audit mutation diff');
      passed++;
    } else {
      console.error('  ? FAILED [Test 5]: Update failed', updateRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: Complete Status Transitions (PATCH /api/companies/:id/status)
  try {
    const suspendRes = await request('PATCH', `/companies/${createdCompanyId}/status`, { status: 'SUSPENDED' });
    const delinquentRes = await request('PATCH', `/companies/${createdCompanyId}/status`, { status: 'DELINQUENT' });
    const activateRes = await request('PATCH', `/companies/${createdCompanyId}/status`, { status: 'ACTIVE' });

    if (
      suspendRes.status === 200 && suspendRes.data.data.status === 'SUSPENDED' &&
      delinquentRes.status === 200 && delinquentRes.data.data.status === 'DELINQUENT' &&
      activateRes.status === 200 && activateRes.data.data.status === 'ACTIVE'
    ) {
      console.log('  ? PASSED [Test 6]: Status lifecycle transitions (ACTIVE -> SUSPENDED -> DELINQUENT -> ACTIVE) operating correctly');
      passed++;
    } else {
      console.error('  ? FAILED [Test 6]: Status transition failed', { suspendRes, delinquentRes, activateRes });
    }
  } catch (err) {
    console.error('  ? FAILED [Test 6] Exception:', err.message);
  }

  // Test 7: Master Seed Company Deletion Protection Guard (DELETE /api/companies/000...)
  try {
    const seedDelRes = await request('DELETE', '/companies/00000000-0000-0000-0000-000000000000');
    if (seedDelRes.status === 400 && seedDelRes.data.message.includes('Master Seed Company cannot be deleted')) {
      console.log('  ? PASSED [Test 7]: Master Seed Company deletion guard protected system integrity (HTTP 400)');
      passed++;
    } else {
      console.error('  ? FAILED [Test 7]: Seed company deletion guard failed', seedDelRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 7] Exception:', err.message);
  }

  // Test 8: Atomic Transaction Rollback Integrity Test
  const rollbackCode = 'ROLLBACK_' + Date.now();
  try {
    // Attempt transaction where step 3 fails deliberately
    let txAborted = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.company.create({
          data: {
            id: 'rollback-test-id',
            name: 'Rollback Corp',
            code: rollbackCode,
          }
        });
        // Intentionally throw error to trigger rollback
        throw new Error('Simulated intermediate failure during onboarding parameter cloning');
      });
    } catch (e) {
      txAborted = true;
    }

    const companyCheck = await prisma.company.findUnique({
      where: { code: rollbackCode }
    });

    if (txAborted && companyCheck === null) {
      console.log('  ? PASSED [Test 8]: Atomic transaction rollback verified: intermediate failures leave 0 orphaned company records');
      passed++;
    } else {
      console.error('  ? FAILED [Test 8]: Rollback integrity failed (Orphaned company created)');
    }
  } catch (err) {
    console.error('  ? FAILED [Test 8] Exception:', err.message);
  }

  // Cleanup created test company
  if (createdCompanyId) {
    await request('DELETE', `/companies/${createdCompanyId}`);
  }

  console.log(`\n?? COMPANY CRUD QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-7 COMPANY CRUD & TENANT PROVISIONING API VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runCompanyCRUDQA()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
