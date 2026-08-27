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

async function runCompanyManagementQA() {
  console.log('🧪 Starting SCRUM-20 Tenant & Company Management Interface QA Suite...\n');
  let passed = 0;
  let total = 6;

  let testCompanyId = null;
  const timestamp = Date.now();

  // Test 1: Onboarding Wizard Tenant Creation with Indian GSTIN & Parameters
  try {
    const payload = {
      name: `Surat Textile Mills ${timestamp}`,
      code: `SURAT${String(timestamp).slice(-4)}`,
      gstin: '24AAPCU1234M1ZV',
      contactPerson: 'Harish Patel',
      mobile: '+91 98250 12345',
      email: `harish@surattextile${timestamp}.com`,
      address: 'Plot 42, Ring Road Textile Park, Surat, Gujarat 395002',
      currency: 'INR',
      currencySymbol: '₹',
      dateFormat: 'DD/MM/YYYY',
      digitsAfterDecimal: '2',
      roundOffFormat: 'NEAREST_RUPEE',
      timezone: 'Asia/Kolkata',
    };

    const createRes = await request('POST', '/companies', payload);
    const compData = createRes.data?.data?.company || createRes.data?.data;

    if (
      createRes.status === 201 &&
      createRes.data.success &&
      compData &&
      compData.gstin === '24AAPCU1234M1ZV' &&
      compData.status === 'ACTIVE'
    ) {
      testCompanyId = compData.id;
      console.log(`  ✅ PASSED [Test 1]: Onboarding Wizard created tenant '${compData.name}' with GSTIN ${compData.gstin}`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 1]: Company creation failed', createRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Status Toggle (ACTIVE -> SUSPENDED)
  try {
    const suspendRes = await request('PATCH', `/companies/${testCompanyId}/status`, { status: 'SUSPENDED' });

    if (
      suspendRes.status === 200 &&
      suspendRes.data.success &&
      suspendRes.data.data.status === 'SUSPENDED'
    ) {
      console.log('  ✅ PASSED [Test 2]: Status toggle updated company status to SUSPENDED');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 2]: Suspend status toggle failed', suspendRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Status Toggle (SUSPENDED -> ACTIVE)
  try {
    const activateRes = await request('PATCH', `/companies/${testCompanyId}/status`, { status: 'ACTIVE' });

    if (
      activateRes.status === 200 &&
      activateRes.data.success &&
      activateRes.data.data.status === 'ACTIVE'
    ) {
      console.log('  ✅ PASSED [Test 3]: Status toggle reactivated company to ACTIVE');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 3]: Activate status toggle failed', activateRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: Parameter Store Drawer Live Inspection
  try {
    const paramsRes = await request('GET', `/companies/${testCompanyId}/parameters`);

    if (
      paramsRes.status === 200 &&
      paramsRes.data.success &&
      Array.isArray(paramsRes.data.data) &&
      paramsRes.data.data.length >= 1
    ) {
      console.log(`  ✅ PASSED [Test 4]: Parameter Store Drawer loaded ${paramsRes.data.data.length} inherited & custom parameters`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 4]: Parameter store fetch failed', paramsRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: Parameter Store Custom Override (feature_gst_e-invoicing = true)
  try {
    const overrideRes = await request('PUT', `/companies/${testCompanyId}/parameters/feature_gst_e-invoicing`, { value: 'true' });

    if (
      overrideRes.status === 200 &&
      overrideRes.data.success &&
      overrideRes.data.data.value === 'true'
    ) {
      console.log('  ✅ PASSED [Test 5]: Parameter Store override set feature_gst_e-invoicing = true');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 5]: Parameter override failed', overrideRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: Company Directory Listing & Multi-Filter Query
  try {
    const listRes = await request('GET', '/companies');

    if (
      listRes.status === 200 &&
      listRes.data.success &&
      Array.isArray(listRes.data.data) &&
      listRes.data.data.some((c) => c.id === testCompanyId)
    ) {
      console.log(`  ✅ PASSED [Test 6]: Company Directory returned ${listRes.data.data.length} registered tenants`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 6]: Company listing failed', listRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 6] Exception:', err.message);
  }

  console.log(`\n📊 COMPANY MANAGEMENT QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('🎉 SCRUM-20 TENANT & COMPANY MANAGEMENT INTERFACE VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runCompanyManagementQA()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });