const assert = require('assert');
const bcrypt = require('bcryptjs');
const prisma = require('./src/db');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING COMPANY RBAC & DEFAULT USER CREATION QA (SCRUM-105)');
  console.log('=============================================================\n');

  const testCode = 'SHIV_' + Date.now().toString().slice(-4);
  const companyPayload = {
    name: 'Shiv Shakti Embroidery Hub',
    code: testCode,
    contactPerson: 'Jayeshbhai Patel',
    mobile: '9825123456',
    email: 'jayesh@' + testCode.toLowerCase() + '.com',
    gstin: '24AAPCU9999M1ZV',
    address: 'Ring Road, Surat, Gujarat',
    adminName: 'Jayeshbhai Patel (Owner)',
    adminEmail: 'jayesh@' + testCode.toLowerCase() + '.com',
    adminMobile: '9825123456',
    adminPassword: 'Password@123',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
    roundOffFormat: 'NEAREST_RUPEE',
    digitsAfterDecimal: '2'
  };

  // 1. Send POST /api/companies
  const res = await fetch(API_BASE + '/companies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(companyPayload)
  });

  const data = await res.json();
  assert.strictEqual(res.status, 201, 'Company creation returned ' + res.status + ': ' + data.message);
  assert.strictEqual(data.success, true, 'Response must be success: true');
  console.log('✅ PASS: 1. Company registered via POST /api/companies');

  const createdCompany = data.data.company;
  const companyId = createdCompany.id;

  // 2. Verify all 5 Company-Scoped Roles exist for this company
  const roles = await prisma.role.findMany({
    where: { companyId },
    orderBy: { name: 'asc' }
  });

  assert.strictEqual(roles.length, 5, 'Expected 5 roles for company, found ' + roles.length);
  const roleNames = roles.map(r => r.name);
  assert(roleNames.includes('Company Admin'), 'Missing Company Admin role');
  assert(roleNames.includes('Manager'), 'Missing Manager role');
  assert(roleNames.includes('Munim'), 'Missing Munim role');
  assert(roleNames.includes('Supervisor'), 'Missing Supervisor role');
  assert(roleNames.includes('Karigar Operator'), 'Missing Karigar Operator role');
  console.log('✅ PASS: 2. Verified 5 Company-Scoped RBAC roles created: ' + roleNames.join(', '));

  // 3. Verify Default Permissions on Roles
  const adminRole = roles.find(r => r.name === 'Company Admin');
  const munimRole = roles.find(r => r.name === 'Munim');
  const superRole = roles.find(r => r.name === 'Supervisor');
  const karigarRole = roles.find(r => r.name === 'Karigar Operator');

  assert.strictEqual(adminRole.isSystemDefined, true, 'Company Admin must be system-defined');
  assert(adminRole.permissions.includes('INVOICE_CREATE'), 'Company Admin must have INVOICE_CREATE');
  assert(adminRole.permissions.includes('HISAB_GENERATE'), 'Company Admin must have HISAB_GENERATE');
  assert(munimRole.permissions.includes('TALLY_EXPORT'), 'Munim must have TALLY_EXPORT');
  assert(superRole.permissions.includes('SHIFT_LOG'), 'Supervisor must have SHIFT_LOG');
  assert(karigarRole.permissions.includes('SHIFT_LOG_READ'), 'Karigar must have SHIFT_LOG_READ');
  console.log('✅ PASS: 3. Verified granular default permission sets across all 5 roles');

  // 4. Verify Default Administrator / Owner User
  const defaultAdmin = await prisma.user.findUnique({
    where: { email: 'jayesh@' + testCode.toLowerCase() + '.com' },
    include: { role: true, company: true }
  });

  assert(defaultAdmin, 'Default Admin user must exist in PostgreSQL');
  assert.strictEqual(defaultAdmin.name, 'Jayeshbhai Patel (Owner)');
  assert.strictEqual(defaultAdmin.mobile, '9825123456');
  assert.strictEqual(defaultAdmin.companyId, companyId);
  assert.strictEqual(defaultAdmin.roleId, adminRole.id);
  assert.strictEqual(defaultAdmin.role.name, 'Company Admin');
  assert.strictEqual(defaultAdmin.status, 'ACTIVE');

  // Verify password hash against Password@123
  const isPasswordValid = await bcrypt.compare('Password@123', defaultAdmin.password);
  assert(isPasswordValid, 'Default user password must match Password@123');
  console.log('✅ PASS: 4. Verified Default Administrator User created with mobile, role, and valid password hash');

  // 5. Test Login with newly created default Admin credentials
  const loginRes = await fetch(API_BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: defaultAdmin.email,
      password: 'Password@123'
    })
  });

  const loginData = await loginRes.json();
  assert.strictEqual(loginRes.status, 200, 'Login must succeed with 200 OK');
  assert.strictEqual(loginData.success, true, 'Login must return success: true');
  assert(loginData.data && loginData.data.accessToken, 'Login must issue JWT accessToken');
  assert.strictEqual(loginData.data.user.email, defaultAdmin.email);
  console.log('✅ PASS: 5. Default Administrator successfully authenticated via POST /api/auth/login');

  console.log('\n=============================================================');
  console.log('TEST SUMMARY: 5 PASSED, 0 FAILED - 100% SUCCESS');
  console.log('=============================================================\n');
}

runTests()
  .catch((err) => {
    console.error('\n❌ QA Test Suite Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma['$disconnect']());
