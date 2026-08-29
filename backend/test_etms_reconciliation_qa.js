const assert = require('assert');

const API_BASE = 'http://127.0.0.1:5000/api';

async function runEtmsReconciliationTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING ETMS TENANT RECONCILIATION QA SUITE (SCRUM-100 to 103)');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  let discoveryData = null;
  let targetUntrackedTenant = null;

  // Clean up any previously adopted test tenants to guarantee 100% test repeatability
  const prisma = require('./src/db');
  await prisma.user.deleteMany({
    where: {
      email: { in: ['mukesh.munim@suratauto888.com', 'ramesh.karigar@suratauto888.com', 'radhe@radhetextiles.in'] },
    },
  });
  await prisma.parameter.deleteMany({
    where: {
      company: { code: { in: ['SURAT_AUTO_8888', 'RADHE_KRISHNA_7777'] } },
    },
  });
  await prisma.role.deleteMany({
    where: {
      company: { code: { in: ['SURAT_AUTO_8888', 'RADHE_KRISHNA_7777'] } },
    },
  });
  await prisma.company.deleteMany({
    where: {
      code: { in: ['SURAT_AUTO_8888', 'RADHE_KRISHNA_7777'] },
    },
  });

  await test('1. GET /api/sync/reconcile/discovery scans ETMS & detects untracked tenants & orphan users', async () => {
    const res = await fetch(`${API_BASE}/sync/reconcile/discovery`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.totalEtmsTenants >= 2, 'Should discover at least 2 ETMS tenants');
    assert.ok(data.data.untrackedCount >= 1, 'Should find untracked tenants in ETMS');
    assert.ok(data.data.orphanUsersCount >= 1, 'Should find orphan users in ETMS');
    discoveryData = data.data;
    targetUntrackedTenant = data.data.untrackedCompanies[0];
    assert.ok(targetUntrackedTenant, 'Target untracked tenant must exist');
  });

  let adoptedCompanyResult = null;

  await test('2. POST /api/sync/reconcile/adopt-tenant ingests company, seeds 18 parameters & creates system role', async () => {
    const res = await fetch(`${API_BASE}/sync/reconcile/adopt-tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantData: targetUntrackedTenant }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.company.code, targetUntrackedTenant.code.toUpperCase());
    assert.ok(data.data.role.isSystemDefined, 'Role must be system-defined');
    assert.ok(data.data.usersIngestedCount >= 1, 'Users should be ingested');
    adoptedCompanyResult = data.data;
  });

  await test('3. Verify all 18 parameters are standardized in PostgreSQL for adopted tenant', async () => {
    const res = await fetch(`${API_BASE}/companies/${adoptedCompanyResult.company.id}/parameters`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.length, 18, 'Must have exactly 18 standardized textile parameters');
    const sacParam = data.data.find((p) => p.key === 'sac_code');
    assert.ok(sacParam, 'sac_code parameter must exist');
  });

  await test('4. Verify ingested users exist in OPS with active status & assigned role', async () => {
    const res = await fetch(`${API_BASE}/users?companyId=${adoptedCompanyResult.company.id}`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.length >= 1, 'Users must be returned for adopted company');
    assert.strictEqual(data.data[0].status, 'ACTIVE');
    assert.strictEqual(data.data[0].companyId, adoptedCompanyResult.company.id);
  });

  await test('5. Verify TENANT_RECONCILED_AND_ADOPTED event recorded in MongoDB audit trail', async () => {
    const res = await fetch(`${API_BASE}/audit-logs?module=TENANT_RECONCILIATION`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    const adoptionEvent = data.data.find((e) => e.action === 'TENANT_RECONCILED_AND_ADOPTED');
    assert.ok(adoptionEvent, 'TENANT_RECONCILED_AND_ADOPTED audit event must exist in MongoDB');
    assert.strictEqual(adoptionEvent.entityId, adoptedCompanyResult.company.id);
  });

  await test('6. POST /api/sync/reconcile/adopt-all batch adopts all remaining untracked tenants', async () => {
    const res = await fetch(`${API_BASE}/sync/reconcile/adopt-all`, {
      method: 'POST',
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  });

  await test('7. Re-running discovery confirms 0 untracked companies remaining (100% Reconciled)', async () => {
    const res = await fetch(`${API_BASE}/sync/reconcile/discovery`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.untrackedCount, 0, 'Untracked count must be 0 after full reconciliation');
    assert.strictEqual(data.data.orphanUsersCount, 0, 'Orphan users count must be 0');
  });

  console.log(`\n======================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEtmsReconciliationTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
