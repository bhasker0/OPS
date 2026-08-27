const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Sprint 4 OPS ↔ ETMS Integration Automated QA Test Suite...\n');
  let passed = 0;
  let total = 5;

  const testCompanyId = '88888888-8888-8888-8888-888888888888';

  // 1. Test SCRUM-53: Provision Company
  try {
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ops-sync/company',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      id: testCompanyId,
      name: 'Surat Auto-Provisioned Embroidery Works',
      gstin: '24TESTA1234A1Z1',
      address: 'Plot 500, Sachin GIDC, Surat',
      phone: '9825088888',
      status: 'ACTIVE'
    });

    if (res1.status === 201 || res1.status === 200) {
      console.log('  ✅ PASSED [SCRUM-53]: POST /api/v1/ops-sync/company auto-provisions tenant company in ETMS');
      passed++;
    } else {
      console.error('  ❌ FAILED [SCRUM-53]:', res1);
    }
  } catch (err) {
    console.error('  ❌ FAILED [SCRUM-53] Exception:', err.message);
  }

  // 2. Test SCRUM-54: Sync User & Roles
  try {
    const res2 = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ops-sync/user',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      id: '99999999-9999-9999-9999-999999999999',
      full_name: 'OPS Super Admin Sync Test',
      mobile: '9825088999',
      email: 'opsadmin@suraterp.com',
      company_id: testCompanyId,
      role: 'COMPANY_ADMIN',
      is_internal_ops: true
    });

    if (res2.status === 201 || res2.status === 200) {
      console.log('  ✅ PASSED [SCRUM-54]: POST /api/v1/ops-sync/user synchronizes user account & Super Admin credentials');
      passed++;
    } else {
      console.error('  ❌ FAILED [SCRUM-54]:', res2);
    }
  } catch (err) {
    console.error('  ❌ FAILED [SCRUM-54] Exception:', err.message);
  }

  // 3. Test SCRUM-55: Sync Operational Parameters
  try {
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ops-sync/parameters',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      company_id: testCompanyId,
      parameters: {
        sac_code: '9988',
        default_rate_per_1000: 0.40,
        shrinkage_tolerance_percent: 2.5,
        default_heads: 44
      }
    });

    if ((res3.status === 200 || res3.status === 201) && res3.body.data && res3.body.data.settings.sac_code === '9988') {
      console.log('  ✅ PASSED [SCRUM-55]: POST /api/v1/ops-sync/parameters updates company operational settings');
      passed++;
    } else {
      console.error('  ❌ FAILED [SCRUM-55]:', res3);
    }
  } catch (err) {
    console.error('  ❌ FAILED [SCRUM-55] Exception:', err.message);
  }

  // 4. Test SCRUM-56: SaaS Module Feature Toggles
  try {
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ops-sync/company',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      id: testCompanyId,
      name: 'Surat Auto-Provisioned Embroidery Works',
      feature_toggles: {
        tally_export_enabled: false,
        munim_portal_enabled: true
      }
    });

    if (res4.status === 200 || res4.status === 201) {
      console.log('  ✅ PASSED [SCRUM-56]: Feature toggle entitlement schema synced for SaaS modules');
      passed++;
    } else {
      console.error('  ❌ FAILED [SCRUM-56]:', res4);
    }
  } catch (err) {
    console.error('  ❌ FAILED [SCRUM-56] Exception:', err.message);
  }

  // 5. Test SCRUM-57: Tenant Subscription Status & Suspension
  try {
    const res5 = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ops-sync/subscription-status',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      company_id: testCompanyId,
      status: 'SUSPENDED'
    });

    if ((res5.status === 200 || res5.status === 201) && res5.body.data && res5.body.data.status === 'SUSPENDED') {
      console.log('  ✅ PASSED [SCRUM-57]: POST /api/v1/ops-sync/subscription-status updates tenant lifecycle status to SUSPENDED');
      passed++;
    } else {
      console.error('  ❌ FAILED [SCRUM-57]:', res5);
    }
  } catch (err) {
    console.error('  ❌ FAILED [SCRUM-57] Exception:', err.message);
  }

  console.log(`\n📊 SPRINT 4 QA RESULT: ${passed}/${total} Integration Tests Passed.`);
  if (passed === total) {
    console.log('🎉 SPRINT 4 ALL INTEGRATION TESTS PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runTests();
