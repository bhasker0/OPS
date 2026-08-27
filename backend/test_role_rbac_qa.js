const http = require('http');
const prisma = require('./src/db/prisma');
const AuditLog = require('./src/models/AuditLog');
const { connectMongo, closeMongoConnection } = require('./src/config/mongo');

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

async function runRoleRBACQA() {
  console.log('?? Starting SCRUM-8 Dynamic Role & Fine-Grained Permission Engine QA Suite...\n');
  let passed = 0;
  let total = 8;

  // Find a tenant company for test fixtures
  const tenant = await prisma.company.findFirst({
    where: { isSeed: false },
    include: { roles: true }
  });

  const systemRole = tenant.roles.find(r => r.isSystemDefined);
  let customRoleId = null;

  // Test 1: Available Permissions Catalogue (GET /api/roles/permissions/available)
  try {
    const catRes = await request('GET', '/roles/permissions/available');
    if (
      catRes.status === 200 &&
      catRes.data.success &&
      catRes.data.data.COMPANIES &&
      catRes.data.data.ROLES &&
      catRes.data.data.TALLY_EXPORT &&
      catRes.data.data.FLOOR_OPERATIONS
    ) {
      console.log('  ? PASSED [Test 1]: GET /api/roles/permissions/available returned domain permission catalogue');
      passed++;
    } else {
      console.error('  ? FAILED [Test 1]: Permission catalogue missing or malformed', catRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Create Custom Role with Fine-Grained Permissions (POST /api/roles)
  const customRoleName = 'Karigar Shift Supervisor ' + Date.now();
  try {
    const createRes = await request('POST', '/roles', {
      name: customRoleName,
      companyId: tenant.id,
      permissions: ['READ_FLOOR', 'LOG_SHIFTS', 'PRINT_SLIPS'],
    });

    if (
      createRes.status === 201 &&
      createRes.data.success &&
      createRes.data.data.name === customRoleName &&
      createRes.data.data.isSystemDefined === false &&
      Array.isArray(createRes.data.data.permissions) &&
      createRes.data.data.permissions.includes('LOG_SHIFTS')
    ) {
      customRoleId = createRes.data.data.id;
      console.log('  ? PASSED [Test 2]: POST /api/roles created custom tenant role with isolated permission array');
      passed++;
    } else {
      console.error('  ? FAILED [Test 2]: Custom role creation failed', createRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Role Name Uniqueness per Tenant Enforcement (HTTP 400)
  try {
    const dupRes = await request('POST', '/roles', {
      name: customRoleName,
      companyId: tenant.id,
      permissions: ['READ_FLOOR'],
    });

    if (dupRes.status === 400 && dupRes.data.message.includes('already exists')) {
      console.log('  ? PASSED [Test 3]: Duplicate role name within tenant rejected with HTTP 400 Bad Request');
      passed++;
    } else {
      console.error('  ? FAILED [Test 3]: Duplicate role was not rejected', dupRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: IMMUTABILITY GUARD 1 - PUT /api/roles/:id on System-Defined Role (HTTP 403)
  try {
    const putSysRes = await request('PUT', `/roles/${systemRole.id}`, {
      name: 'Hacked Root Admin Role',
      permissions: ['*'],
    });

    if (putSysRes.status === 403 && putSysRes.data.message.includes('System-defined roles cannot be modified')) {
      console.log('  ? PASSED [Test 4]: Immutability Guard BLOCKED modification of system-defined role with HTTP 403 Forbidden');
      passed++;
    } else {
      console.error('  ? FAILED [Test 4]: System role modification was not blocked with 403', putSysRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: IMMUTABILITY GUARD 2 - DELETE /api/roles/:id on System-Defined Role (HTTP 403)
  try {
    const delSysRes = await request('DELETE', `/roles/${systemRole.id}`);

    if (delSysRes.status === 403 && delSysRes.data.message.includes('System-defined roles cannot be deleted')) {
      console.log('  ? PASSED [Test 5]: Immutability Guard BLOCKED deletion of system-defined role with HTTP 403 Forbidden');
      passed++;
    } else {
      console.error('  ? FAILED [Test 5]: System role deletion was not blocked with 403', delSysRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: Assigned-User Safety Deletion Guard (HTTP 400)
  try {
    // Create a temporary user attached to custom role
    const tempUser = await prisma.user.create({
      data: {
        name: 'Temp Role Assigned User',
        email: `temp_user_${Date.now()}@test.com`,
        password: 'password123',
        companyId: tenant.id,
        roleId: customRoleId,
      }
    });

    const delAssignedRes = await request('DELETE', `/roles/${customRoleId}`);

    if (delAssignedRes.status === 400 && delAssignedRes.data.message.includes('user(s) are currently assigned')) {
      console.log('  ? PASSED [Test 6]: Deletion of role with active assigned users BLOCKED with HTTP 400 Bad Request');
      passed++;
    } else {
      console.error('  ? FAILED [Test 6]: Role with assigned users was not protected', delAssignedRes);
    }

    // Clean up temporary user
    await prisma.user.delete({ where: { id: tempUser.id } });
  } catch (err) {
    console.error('  ? FAILED [Test 6] Exception:', err.message);
  }

  // Test 7: Update & Delete Custom Role (PUT /api/roles/:id & DELETE /api/roles/:id)
  try {
    const updateRes = await request('PUT', `/roles/${customRoleId}`, {
      name: customRoleName + ' Updated',
      permissions: ['READ_FLOOR', 'LOG_SHIFTS', 'PRINT_SLIPS', 'TALLY_EXPORT'],
    });

    const delRes = await request('DELETE', `/roles/${customRoleId}`);

    if (
      updateRes.status === 200 &&
      updateRes.data.data.name.includes('Updated') &&
      delRes.status === 200 &&
      delRes.data.success
    ) {
      console.log('  ? PASSED [Test 7]: Custom non-system roles support full update and deletion lifecycle');
      passed++;
    } else {
      console.error('  ? FAILED [Test 7]: Custom role update or deletion failed', { updateRes, delRes });
    }
  } catch (err) {
    console.error('  ? FAILED [Test 7] Exception:', err.message);
  }

  // Test 8: Blocked System-Role Security Attempts Logged in MongoDB
  try {
    await connectMongo();
    const blockedLogs = await AuditLog.find({
      action: { $in: ['UPDATE_SYSTEM_ROLE_BLOCKED', 'DELETE_SYSTEM_ROLE_BLOCKED'] }
    });

    if (blockedLogs && blockedLogs.length >= 2) {
      console.log(`  ? PASSED [Test 8]: Security Audit Trail verified in MongoDB (${blockedLogs.length} blocked intrusion events recorded)`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 8]: Blocked attempts not found in MongoDB audit logs', blockedLogs);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 8] Exception:', err.message);
  }

  console.log(`\n?? ROLE RBAC QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-8 DYNAMIC ROLE & FINE-GRAINED PERMISSION ENGINE VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runRoleRBACQA()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongoConnection();
  });
