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

async function runUserRoleManagementQA() {
  console.log('🧪 Starting SCRUM-21 User & Role Permission Management Views QA Suite...\n');
  let passed = 0;
  let total = 8;

  const timestamp = Date.now();
  const company = await prisma.company.findFirst({ where: { isSeed: false } });
  let testUserId = null;
  let testRoleId = null;

  // Test 1: User Directory Query (GET /api/users)
  try {
    const usersRes = await request('GET', '/users');

    if (
      usersRes.status === 200 &&
      usersRes.data.success &&
      Array.isArray(usersRes.data.data) &&
      usersRes.data.data.length >= 1
    ) {
      console.log(`  ✅ PASSED [Test 1]: User Directory returned ${usersRes.data.data.length} registered users with role metadata`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 1]: User directory query failed', usersRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: User Creation (POST /api/users)
  try {
    const userPayload = {
      name: `Security Auditor ${timestamp}`,
      email: `auditor_${timestamp}@textile.com`,
      password: 'initialPass123',
      companyId: company.id,
      isInternalOps: false,
    };

    const createRes = await request('POST', '/users', userPayload);

    if (
      createRes.status === 201 &&
      createRes.data.success &&
      createRes.data.data.email === userPayload.email
    ) {
      testUserId = createRes.data.data.id;
      console.log(`  ✅ PASSED [Test 2]: User created successfully under tenant '${company.name}'`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 2]: User creation failed', createRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Password Reset Capability (PUT /api/users/:id)
  try {
    const resetRes = await request('PUT', `/users/${testUserId}`, { password: 'newSecurePassword456' });

    if (resetRes.status === 200 && resetRes.data.success) {
      console.log('  ✅ PASSED [Test 3]: Instant password reset executed successfully on user account');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 3]: Password reset failed', resetRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: User Status Toggle (PATCH /api/users/:id/status)
  try {
    const toggleRes = await request('PATCH', `/users/${testUserId}/status`, { status: 'SUSPENDED' });

    if (
      toggleRes.status === 200 &&
      toggleRes.data.success &&
      toggleRes.data.data.status === 'SUSPENDED'
    ) {
      console.log('  ✅ PASSED [Test 4]: User status toggle updated account status to SUSPENDED');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 4]: User status toggle failed', toggleRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: Role Directory Listing & RBAC Matrix (GET /api/roles)
  try {
    const rolesRes = await request('GET', '/roles');

    if (
      rolesRes.status === 200 &&
      rolesRes.data.success &&
      Array.isArray(rolesRes.data.data) &&
      rolesRes.data.data.length >= 1
    ) {
      console.log(`  ✅ PASSED [Test 5]: Role Directory returned ${rolesRes.data.data.length} RBAC roles with granted privileges`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 5]: Role directory listing failed', rolesRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: System-Defined Role Immutability Guard (PUT /api/roles/:id -> 403 Forbidden)
  try {
    const systemRole = await prisma.role.findFirst({ where: { isSystemDefined: true } });

    const editBlockedRes = await request('PUT', `/roles/${systemRole.id}`, { name: 'Attempted Malicious Override' });

    if (editBlockedRes.status === 403 && !editBlockedRes.data.success) {
      console.log(`  ✅ PASSED [Test 6]: System role edit guard BLOCKED modification with 403 Forbidden: ${editBlockedRes.data.message}`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 6]: System role edit was not blocked', editBlockedRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 6] Exception:', err.message);
  }

  // Test 7: System-Defined Role Deletion Guard (DELETE /api/roles/:id -> 403 Forbidden)
  try {
    const systemRole = await prisma.role.findFirst({ where: { isSystemDefined: true } });

    const deleteBlockedRes = await request('DELETE', `/roles/${systemRole.id}`);

    if (deleteBlockedRes.status === 403 && !deleteBlockedRes.data.success) {
      console.log(`  ✅ PASSED [Test 7]: System role deletion guard BLOCKED deletion with 403 Forbidden: ${deleteBlockedRes.data.message}`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 7]: System role deletion was not blocked', deleteBlockedRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 7] Exception:', err.message);
  }

  // Test 8: Custom RBAC Role Creation (POST /api/roles)
  try {
    const rolePayload = {
      name: `Custom Auditor ${timestamp}`,
      companyId: company.id,
      permissions: ['READ_COMPANIES', 'READ_USERS', 'READ_AUDIT_LOGS'],
    };

    const createRoleRes = await request('POST', '/roles', rolePayload);

    if (
      createRoleRes.status === 201 &&
      createRoleRes.data.success &&
      createRoleRes.data.data.name === rolePayload.name &&
      createRoleRes.data.data.isSystemDefined === false
    ) {
      testRoleId = createRoleRes.data.data.id;
      console.log(`  ✅ PASSED [Test 8]: Custom RBAC role created with ${createRoleRes.data.data.permissions.length} granular privileges`);
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 8]: Custom role creation failed', createRoleRes);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 8] Exception:', err.message);
  }

  console.log(`\n📊 USER & ROLE MANAGEMENT QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('🎉 SCRUM-21 USER & ROLE PERMISSION MANAGEMENT VIEWS VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runUserRoleManagementQA()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });