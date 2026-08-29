const assert = require('assert');

const API_BASE = 'http://127.0.0.1:5000/api';

async function runTenantImpersonationTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING TENANT IMPERSONATION QA SUITE (SCRUM-86 & 87)');
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

  // Helper: Super Admin Login
  let adminToken = '';
  let tenantUser = null;
  let nonAdminToken = '';

  await test('1. Authenticate as Super Admin to get root JWT', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ops.saas', password: 'admin123' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, 'Super admin login should succeed');
    assert.ok(data.data.accessToken, 'Access token should be returned');
    adminToken = data.data.accessToken;
  });

  await test('2. Identify active non-internal tenant user', async () => {
    const res = await fetch(`${API_BASE}/users`);
    const data = await res.json();
    tenantUser = data.data.find((u) => !u.isInternalOps && u.status === 'ACTIVE');
    assert.ok(tenantUser, 'Active tenant user must exist for testing');
  });

  let impersonationToken = '';

  await test('3. POST /api/auth/impersonate/:userId as Super Admin (15m Ephemeral Token)', async () => {
    const res = await fetch(`${API_BASE}/auth/impersonate/${tenantUser.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, 'Impersonation request should succeed');
    assert.strictEqual(data.success, true);
    assert.ok(data.data.impersonationToken, 'Impersonation token must be returned');
    assert.strictEqual(data.data.expiresIn, 900, 'TTL must be exactly 900 seconds (15 minutes)');
    assert.strictEqual(data.data.targetUser.email, tenantUser.email);
    impersonationToken = data.data.impersonationToken;
  });

  await test('4. Impersonated token carries isImpersonated and target claims in GET /api/auth/me', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${impersonationToken}`,
      },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.user.email, tenantUser.email, 'Current user in context must be target user');
  });

  await test('5. Security Guard: Non-Super-Admin cannot initiate impersonation (403 Forbidden)', async () => {
    const res = await fetch(`${API_BASE}/auth/impersonate/${tenantUser.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${impersonationToken}`, // target user token has isInternalOps=false
      },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 403, 'Non-admin must be rejected with 403');
    assert.strictEqual(data.success, false);
  });

  await test('6. Terminate impersonation context via POST /api/auth/exit-impersonation', async () => {
    const res = await fetch(`${API_BASE}/auth/exit-impersonation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${impersonationToken}`,
      },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
  });

  await test('7. Verify IMPERSONATION_STARTED & IMPERSONATION_EXITED logged in MongoDB audit trail', async () => {
    const res = await fetch(`${API_BASE}/audit-logs?module=SECURITY&limit=200`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    const startEvent = data.data.find((e) => e.action === 'IMPERSONATION_STARTED');
    const exitEvent = data.data.find((e) => e.action === 'IMPERSONATION_EXITED');
    assert.ok(startEvent, 'IMPERSONATION_STARTED must be recorded');
    assert.ok(exitEvent, 'IMPERSONATION_EXITED must be recorded');
  });

  console.log(`\n======================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTenantImpersonationTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
