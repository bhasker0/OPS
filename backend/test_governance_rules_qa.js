const assert = require('assert');
const prisma = require('./src/db');
const { connectMongo, closeMongoConnection } = require('./src/config/mongo');

const API_BASE = 'http://localhost:5000/api';

async function runGovernanceTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MASTER-SLAVE GOVERNANCE RULES QA (SCRUM-104)');
  console.log('======================================================\n');

  await connectMongo();

  // Test 1: Inbound company creation from ETMS is rejected (403 Forbidden)
  const compRes = await fetch(`${API_BASE}/sync/inbound/company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unauthorized Rogue ETMS Factory',
      code: 'ROGUE_01',
    }),
  });
  const compData = await compRes.json();
  assert.strictEqual(compRes.status, 403, 'Company creation from ETMS must return 403 Forbidden');
  assert.strictEqual(compData.code, 'POLICY_VIOLATION_COMPANY_CREATION_BLOCKED');
  console.log('✅ PASS: 1. Inbound company creation from ETMS is blocked with 403 Forbidden');

  // Test 2: Inbound Admin user creation from ETMS is rejected (403 Forbidden)
  const adminRes = await fetch(`${API_BASE}/sync/inbound/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rogue Admin User',
      email: 'rogue.admin@test.com',
      mobile: '9999900001',
      role: 'COMPANY_ADMIN',
      companyCode: 'RADHEEMB',
    }),
  });
  const adminData = await adminRes.json();
  assert.strictEqual(adminRes.status, 403, 'Admin user creation from ETMS must return 403 Forbidden');
  assert.strictEqual(adminData.code, 'POLICY_VIOLATION_ADMIN_CREATION_BLOCKED');
  console.log('✅ PASS: 2. Inbound Company Admin user creation from ETMS is blocked with 403 Forbidden');

  // Test 3: Inbound staff user for non-existent company is rejected (400 Bad Request)
  const orphanRes = await fetch(`${API_BASE}/sync/inbound/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Orphan Staff Worker',
      email: 'orphan.worker@unknown.com',
      mobile: '9999900002',
      role: 'SUPERVISOR',
      companyCode: 'NON_EXISTENT_COMPANY',
    }),
  });
  const orphanData = await orphanRes.json();
  assert.strictEqual(orphanRes.status, 400, 'Staff creation for unknown company must return 400 Bad Request');
  assert.strictEqual(orphanData.code, 'COMPANY_NOT_FOUND_IN_OPS');
  console.log('✅ PASS: 3. Inbound staff user for non-existent company is rejected (400 Bad Request)');

  // Test 4: Inbound staff user for existing company succeeds and links to company
  const staffRes = await fetch(`${API_BASE}/sync/inbound/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dinesh Yadav (Supervisor)',
      email: 'dinesh.supervisor@radheembroidery.com',
      mobile: '9825099002',
      role: 'SUPERVISOR',
      companyCode: 'RADHEEMB',
    }),
  });
  const staffData = await staffRes.json();
  assert.strictEqual(staffRes.status, 201, 'Staff creation for valid company must return 201 Created');
  assert.strictEqual(staffData.success, true);
  assert.strictEqual(staffData.data.mobile, '9825099002');
  console.log('✅ PASS: 4. Inbound operational staff user (Supervisor) for existing company succeeds (201 Created)');

  // Test 5: Verify Bhavesh Patel exists in OPS as Company Admin
  const bhaveshInDb = await prisma.user.findUnique({
    where: { email: 'bhavesh@radhekrishnaemb.com' },
    include: { company: true, role: true },
  });
  assert.ok(bhaveshInDb, 'Bhavesh Patel must exist in OPS PostgreSQL');
  assert.strictEqual(bhaveshInDb.mobile, '9825012345');
  assert.strictEqual(bhaveshInDb.company.code, 'RADHEEMB');
  assert.strictEqual(bhaveshInDb.role.name, 'Company Admin');
  console.log('✅ PASS: 5. Bhavesh Patel (Owner) verified in OPS as Company Admin with mobile 9825012345');

  console.log('\n======================================================');
  console.log('TEST SUMMARY: 5 PASSED, 0 FAILED');
  console.log('======================================================\n');
}

runGovernanceTests()
  .catch((err) => {
    console.error('❌ Governance QA Suite Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongoConnection();
  });
