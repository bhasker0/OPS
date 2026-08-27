const http = require('http');

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

async function runQA() {
  console.log('🧪 Starting Comprehensive QA Suite for OPS Backend...');
  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName, extraInfo = null) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAILED: ${testName}`);
      if (extraInfo) console.error('     Response:', JSON.stringify(extraInfo));
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.data.status === 'OK', 'GET /api/health returns 200 OK');

    // 2. Global stats
    const stats = await request('GET', '/stats');
    assert(stats.status === 200 && stats.data.success && stats.data.data.systemHealth, 'GET /api/stats returns analytics overview & system health', stats);

    const globalStats = await request('GET', '/stats/global');
    assert(globalStats.status === 200 && globalStats.data.success, 'GET /api/stats/global returns executive metrics', globalStats);

    // 3. Company CRUD & Compliance
    const companyCode = 'QA_COMP_' + Date.now();
    const createComp = await request('POST', '/companies', {
      name: 'QA Test Enterprise Pvt Ltd',
      code: companyCode,
      gstin: '24AAACQ9999P1Z3',
      contactPerson: 'QA Manager',
      email: 'qa@testenterprise.in',
      mobile: '+91 98989 88888',
      address: '123 QA Boulevard, Surat, Gujarat 395007',
      roundOffFormat: 'NEAREST_RUPEE',
      digitsAfterDecimal: 2,
    });
    assert(createComp.status === 201 && createComp.data.success, 'POST /api/companies creates new tenant with Indian GSTIN', createComp);
    const companyId = createComp.data.data.company.id;

    const getComp = await request('GET', `/companies/${companyId}`);
    assert(getComp.status === 200 && getComp.data.data.gstin === '24AAACQ9999P1Z3', 'GET /api/companies/:id returns full tenant profile', getComp);

    const updateComp = await request('PUT', `/companies/${companyId}`, {
      name: 'QA Test Enterprise Pvt Ltd',
      contactPerson: 'QA Senior Lead',
    });
    assert(updateComp.status === 200 && updateComp.data.data.contactPerson === 'QA Senior Lead', 'PUT /api/companies/:id updates tenant info', updateComp);

    const patchStatus = await request('PATCH', `/companies/${companyId}/status`, {
      status: 'ACTIVE',
    });
    assert(patchStatus.status === 200 && patchStatus.data.data.status === 'ACTIVE', 'PATCH /api/companies/:id/status updates company status', patchStatus);

    // 4. Parameter Store & Seed Fallback Inheritance
    const getParams = await request('GET', `/companies/${companyId}/parameters`);
    assert(getParams.status === 200 && Array.isArray(getParams.data.data) && getParams.data.data.length >= 10, 'GET /api/companies/:id/parameters returns inherited seed parameters', getParams);

    const putParam = await request('PUT', `/companies/${companyId}/parameters/custom_qa_flag`, {
      value: 'enabled',
      description: 'QA parameter',
    });
    assert(putParam.status === 200 && putParam.data.data.value === 'enabled', 'PUT /api/companies/:id/parameters/:key creates/updates parameter', putParam);

    const deleteParam = await request('DELETE', `/companies/${companyId}/parameters/custom_qa_flag`);
    assert(deleteParam.status === 200 && deleteParam.data.success, 'DELETE /api/companies/:id/parameters/:key removes custom override', deleteParam);

    // 5. RBAC & System-Defined Role Guard Security
    const getRoles = await request('GET', `/roles?companyId=${companyId}`);
    assert(getRoles.status === 200 && getRoles.data.data.length >= 1, 'GET /api/roles returns tenant roles', getRoles);

    const systemRole = getRoles.data.data.find(r => r.isSystemDefined);
    assert(systemRole !== undefined, 'Company automatically receives system-defined admin role');

    if (systemRole) {
      const editBlocked = await request('PUT', `/roles/${systemRole.id}`, { name: 'Hacked Role' });
      assert(editBlocked.status === 403, 'PUT /api/roles/:id BLOCKS modification of system-defined role (403 Forbidden Guard)', editBlocked);

      const deleteBlocked = await request('DELETE', `/roles/${systemRole.id}`);
      assert(deleteBlocked.status === 403, 'DELETE /api/roles/:id BLOCKS deletion of system-defined role (403 Forbidden Guard)', deleteBlocked);
    }

    const createCustomRole = await request('POST', '/roles', {
      name: 'Custom QA Inspector',
      companyId,
      permissions: ['READ_INVENTORY', 'INSPECT_BATCHES'],
    });
    assert(createCustomRole.status === 201 && createCustomRole.data.success, 'POST /api/roles creates custom role', createCustomRole);

    // 6. User Management
    const createUser = await request('POST', '/users', {
      name: 'QA Inspector User',
      email: `qa_inspector_${Date.now()}@test.in`,
      companyId,
      roleId: createCustomRole.data.data.id,
      isInternalOps: false,
    });
    assert(createUser.status === 201 && createUser.data.success, 'POST /api/users creates user under tenant', createUser);

    const updateUser = await request('PUT', `/users/${createUser.data.data.id}`, {
      name: 'QA Inspector User Updated',
    });
    assert(updateUser.status === 200 && updateUser.data.data.name === 'QA Inspector User Updated', 'PUT /api/users/:id updates user details', updateUser);

    // 7. Transaction Ledger & Financial Status Transitions
    const createTx = await request('POST', `/companies/${companyId}/transactions`, {
      amount: 45000.50,
      currency: 'INR',
      status: 'PENDING',
      description: 'QA Sample Invoice Payment',
    });
    assert(createTx.status === 201 && createTx.data.data.amount === 45000.50, 'POST /api/companies/:id/transactions records financial entry', createTx);

    const patchTx = await request('PATCH', `/companies/${companyId}/transactions/${createTx.data.data.id}/status`, {
      status: 'SUCCESS',
    });
    assert(patchTx.status === 200 && patchTx.data.data.status === 'SUCCESS', 'PATCH /api/companies/:id/transactions/:id/status updates status transition', patchTx);

    // 8. Audit Trail Multi-Filter Query
    const getAudit = await request('GET', `/audit-logs?companyId=${companyId}`);
    assert(getAudit.status === 200 && Array.isArray(getAudit.data.data) && getAudit.data.data.length > 0, 'GET /api/audit-logs retrieves filtered MongoDB audit logs', getAudit);

    // Cleanup QA Company
    await request('DELETE', `/companies/${companyId}`);

    console.log(`\n📊 QA RESULT: ${passedTests}/${totalTests} Tests Passed.`);
    if (passedTests === totalTests) {
      console.log('🎉 ALL BACKEND QA INTEGRATION TESTS PASSED 100%!');
    } else {
      console.error('⚠️ SOME QA TESTS FAILED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ QA Execution Error:', err);
    process.exit(1);
  }
}

runQA();
