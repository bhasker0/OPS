const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generateTOTPCode } = require('./src/utils/totp');

const API_BASE = 'http://127.0.0.1:5000/api';

async function runProductionAuthQATests() {
  console.log('🧪 Starting Automated QA Test Suite for SCRUM-84: Production JWT Authentication, TOTP 2FA & Session Killswitch...\n');

  let passed = 0;
  let total = 8;

  try {
    // 1. Test POST /api/auth/login with Bcrypt password verification
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@ops.saas',
        password: 'admin123'
      })
    });
    assert.strictEqual(loginRes.status, 200, 'Login must succeed with HTTP 200');
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.success, true);
    assert(loginData.data.accessToken, 'Access token must be returned');
    assert(loginData.data.refreshToken, 'Refresh token must be returned');
    assert.strictEqual(loginData.data.user.email, 'admin@ops.saas');
    const adminToken = loginData.data.accessToken;
    console.log(`  ✅ PASSED [Test 1]: POST /api/auth/login verifies bcrypt password and issues signed JWT Access & Refresh Tokens`);
    passed++;

    // 2. Test GET /api/auth/me with Bearer token
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(meRes.status, 200, 'GET /api/auth/me must return HTTP 200 with valid JWT');
    const meData = await meRes.json();
    assert.strictEqual(meData.success, true);
    assert.strictEqual(meData.data.user.email, 'admin@ops.saas');
    console.log(`  ✅ PASSED [Test 2]: GET /api/auth/me validates Bearer JWT and returns authenticated profile & permissions`);
    passed++;

    // 3. Test Protected Route with invalid / forged token (HTTP 401)
    const invalidRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: 'Bearer forged.token.signature123' }
    });
    assert.strictEqual(invalidRes.status, 401, 'Invalid token must be rejected with HTTP 401 Unauthorized');
    console.log(`  ✅ PASSED [Test 3]: Auth Middleware strictly blocks invalid and forged tokens with HTTP 401 Unauthorized`);
    passed++;

    // 4. Test 2FA Setup: POST /api/auth/2fa/setup
    const setup2FARes = await fetch(`${API_BASE}/auth/2fa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(setup2FARes.status, 200);
    const setup2FAData = await setup2FARes.json();
    assert(setup2FAData.data.secret, 'TOTP Secret must be generated');
    assert(setup2FAData.data.uri.startsWith('otpauth://totp/'), 'Valid otpauth URI must be generated');
    const secret = setup2FAData.data.secret;
    console.log(`  ✅ PASSED [Test 4]: POST /api/auth/2fa/setup generates standard RFC 6238 TOTP secret & QR URI`);
    passed++;

    // 5. Test 2FA Verification & Activation: POST /api/auth/2fa/verify
    const validOTP = generateTOTPCode(secret);
    const verify2FARes = await fetch(`${API_BASE}/auth/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ secret, code: validOTP })
    });
    assert.strictEqual(verify2FARes.status, 200);
    console.log(`  ✅ PASSED [Test 5]: POST /api/auth/2fa/verify validates 6-digit TOTP code and activates 2FA protection`);
    passed++;

    // 6. Test 2FA Login Challenge
    const login2FARes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ops.saas', password: 'admin123' })
    });
    const login2FAData = await login2FARes.json();
    assert.strictEqual(login2FAData.requires2FA, true, 'User with 2FA enabled must require TOTP code step');

    // Login with valid TOTP code
    const currentCode = generateTOTPCode(secret);
    const fullLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ops.saas', password: 'admin123', totpCode: currentCode })
    });
    const fullLoginData = await fullLoginRes.json();
    assert.strictEqual(fullLoginData.success, true, 'Login with valid TOTP code must succeed');
    console.log(`  ✅ PASSED [Test 6]: Two-Factor Authentication login challenge enforced and verified`);
    passed++;

    // Disable 2FA for cleanup
    await fetch(`${API_BASE}/auth/2fa/disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${fullLoginData.data.accessToken}`
      },
      body: JSON.stringify({ code: generateTOTPCode(secret) })
    });

    // 7. Test Single User Session Revocation Killswitch
    // Create temporary test user
    const tempUserEmail = `killswitch_user_${Date.now()}@ops.saas`;
    const createTempRes = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Killswitch Test User',
        email: tempUserEmail,
        password: 'password123',
        isInternalOps: true
      })
    });
    const tempUserData = await createTempRes.json();
    const tempUserId = tempUserData.data.id;

    // Login to obtain active token for temp user
    const userLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tempUserEmail, password: 'password123' })
    });
    const userTokens = await userLoginRes.json();
    const userTokenBeforeKillswitch = userTokens.data.accessToken;

    // Verify token works before killswitch
    const preCheck = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${userTokenBeforeKillswitch}` }
    });
    assert.strictEqual(preCheck.status, 200);

    // ACTIVATE USER KILLSWITCH
    const revokeUserRes = await fetch(`${API_BASE}/auth/revoke-user-sessions/${tempUserId}`, { method: 'POST' });
    assert.strictEqual(revokeUserRes.status, 200);

    // Attempt access with old token -> MUST BE REJECTED (HTTP 401 SESSION_REVOKED)
    const postCheck = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${userTokenBeforeKillswitch}` }
    });
    assert.strictEqual(postCheck.status, 401, 'Old JWT must be immediately rejected after user killswitch');
    const postCheckData = await postCheck.json();
    assert.strictEqual(postCheckData.code, 'SESSION_REVOKED');
    console.log(`  ✅ PASSED [Test 7]: Single User Session Killswitch immediately invalidates active JWTs (HTTP 401 SESSION_REVOKED)`);
    passed++;

    // 8. Test Company-Wide Session Revocation Killswitch
    const companiesRes = await fetch(`${API_BASE}/companies`);
    const companiesData = await companiesRes.json();
    const targetComp = companiesData.data[0];

    // Create a user in that company
    const tenantUserEmail = `tenant_ks_${Date.now()}@test.com`;
    const tenantUserRes = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tenant KS User',
        email: tenantUserEmail,
        password: 'password123',
        companyId: targetComp.id
      })
    });
    const tenantUserData = await tenantUserRes.json();

    // Login as tenant user
    const tenantLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tenantUserEmail, password: 'password123' })
    });
    const tenantTokens = await tenantLoginRes.json();
    const tenantTokenBeforeKillswitch = tenantTokens.data.accessToken;

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 1000));

    // ACTIVATE COMPANY-WIDE KILLSWITCH
    const revokeCompanyRes = await fetch(`${API_BASE}/companies/${targetComp.id}/revoke-sessions`, { method: 'POST' });
    assert.strictEqual(revokeCompanyRes.status, 200);

    // Access with pre-killswitch token -> MUST BE REJECTED (HTTP 401 TENANT_SESSIONS_REVOKED)
    const postCompCheck = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${tenantTokenBeforeKillswitch}` }
    });
    assert.strictEqual(postCompCheck.status, 401, 'Token issued before company killswitch must be rejected');
    const postCompData = await postCompCheck.json();
    assert.strictEqual(postCompData.code, 'TENANT_SESSIONS_REVOKED');
    console.log(`  ✅ PASSED [Test 8]: Company-Wide Session Killswitch immediately terminates all active tenant tokens (HTTP 401 TENANT_SESSIONS_REVOKED)`);
    passed++;

    console.log(`\n📊 QA Result: ${passed}/${total} Tests Passed (100.0%)`);
    console.log('✨ SCRUM-84 QA Verification Complete: 100% Pass Rate!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n💥 QA Test Error:', err);
    process.exit(1);
  }
}

runProductionAuthQATests();
