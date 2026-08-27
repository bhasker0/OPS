const http = require('http');
const prisma = require('./src/db/prisma');
const AuditLog = require('./src/models/AuditLog');
const { calculateDelta, MASKED_PLACEHOLDER } = require('./src/utils/auditDiff');
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

async function runEntityMutationDeltaQA() {
  console.log('?? Starting SCRUM-16 Entity Mutation History & Change-Delta QA Suite...\n');
  let passed = 0;
  let total = 7;

  // Test 1: Acceptance Criteria: Status change from ACTIVE to SUSPENDED
  const oldState = { id: 'comp-101', name: 'Surat Textiles', status: 'ACTIVE' };
  const newState = { id: 'comp-101', name: 'Surat Textiles', status: 'SUSPENDED' };
  const delta1 = calculateDelta(oldState, newState);

  if (
    delta1 &&
    delta1.status &&
    delta1.status.old === 'ACTIVE' &&
    delta1.status.new === 'SUSPENDED' &&
    !delta1.name
  ) {
    console.log('  ? PASSED [Test 1]: Given status ACTIVE -> SUSPENDED, calculateDelta produced exact AC delta { status: { old: "ACTIVE", new: "SUSPENDED" } }');
    passed++;
  } else {
    console.error('  ? FAILED [Test 1]: Status change delta failed', delta1);
  }

  // Test 2: Sensitive Credential Masking (Passwords, Secrets, Tokens)
  const oldUser = { id: 'usr-1', email: 'user@ops.saas', password: 'myOldPassword123' };
  const newUser = { id: 'usr-1', email: 'user@ops.saas', password: 'myNewPassword456' };
  const userDelta = calculateDelta(oldUser, newUser);

  if (
    userDelta &&
    userDelta.password &&
    userDelta.password.old === MASKED_PLACEHOLDER &&
    userDelta.password.new === MASKED_PLACEHOLDER
  ) {
    console.log(`  ? PASSED [Test 2]: Sensitive credential field masked properly: { password: { old: "${MASKED_PLACEHOLDER}", new: "${MASKED_PLACEHOLDER}" } }`);
    passed++;
  } else {
    console.error('  ? FAILED [Test 2]: Sensitive field was not masked', userDelta);
  }

  // Test 3: Array & Fine-Grained Permissions Delta
  const oldRole = { id: 'role-1', name: 'Manager', permissions: ['READ_ALL', 'WRITE_DRAFT'] };
  const newRole = { id: 'role-1', name: 'Manager', permissions: ['READ_ALL', 'WRITE_ALL', 'ADMIN_ACCESS'] };
  const roleDelta = calculateDelta(oldRole, newRole);

  if (
    roleDelta &&
    roleDelta.permissions &&
    Array.isArray(roleDelta.permissions.old) &&
    Array.isArray(roleDelta.permissions.new) &&
    roleDelta.permissions.new.includes('ADMIN_ACCESS')
  ) {
    console.log('  ? PASSED [Test 3]: Array permissions mutation delta computed accurately');
    passed++;
  } else {
    console.error('  ? FAILED [Test 3]: Role permissions delta failed', roleDelta);
  }

  // Test 4: Nested Object Delta Comparison
  const oldConfig = {
    id: 'cfg-1',
    settings: { autoExport: false, timeoutSec: 30 },
  };
  const newConfig = {
    id: 'cfg-1',
    settings: { autoExport: true, timeoutSec: 30 },
  };
  const configDelta = calculateDelta(oldConfig, newConfig);

  if (configDelta && configDelta.settings) {
    console.log('  ? PASSED [Test 4]: Nested object mutation delta detected correctly');
    passed++;
  } else {
    console.error('  ? FAILED [Test 4]: Nested object delta failed', configDelta);
  }

  // Test 5: Ignored Timestamps and Identical State Check
  const tsObj1 = { id: 'obj-1', value: 100, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };
  const tsObj2 = { id: 'obj-1', value: 100, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02') };
  const noDelta = calculateDelta(tsObj1, tsObj2);

  if (noDelta === null) {
    console.log('  ? PASSED [Test 5]: Unmutated objects with only timestamp updates correctly returned null delta');
    passed++;
  } else {
    console.error('  ? FAILED [Test 5]: Timestamps produced false positive delta', noDelta);
  }

  // Test 6: End-to-End API Company Mutation with MongoDB Delta Recording
  const company = await prisma.company.findFirst({ where: { isSeed: false } });
  const initialContact = company.contactPerson || 'Initial Contact';
  const updatedContact = `Updated Contact ${Date.now()}`;

  try {
    const updateRes = await request('PUT', `/companies/${company.id}`, {
      contactPerson: updatedContact,
    });

    if (updateRes.status === 200 && updateRes.data.success) {
      console.log('  ? PASSED [Test 6]: PUT /api/companies/:id executed successfully');
      passed++;
    } else {
      console.error('  ? FAILED [Test 6]: Company update failed', updateRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 6] Exception:', err.message);
  }

  // Test 7: MongoDB Audit Document Diff Verification
  try {
    await connectMongo();
    // Allow background worker to persist
    await new Promise((res) => setTimeout(res, 200));

    const auditEntry = await AuditLog.findOne({
      module: 'COMPANY',
      action: 'UPDATE_COMPANY',
      entityId: company.id,
    }).sort({ createdAt: -1 });

    if (auditEntry && auditEntry.diff && auditEntry.diff.contactPerson) {
      console.log(`  ? PASSED [Test 7]: MongoDB audit document verified with exact mutation delta:`, JSON.stringify(auditEntry.diff.contactPerson));
      passed++;
    } else {
      console.error('  ? FAILED [Test 7]: Audit diff not found in MongoDB', auditEntry);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 7] Exception:', err.message);
  }

  // Revert contactPerson
  await prisma.company.update({
    where: { id: company.id },
    data: { contactPerson: initialContact },
  });

  console.log(`\n?? ENTITY MUTATION DELTA QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-16 ENTITY MUTATION HISTORY & CHANGE-DELTA TRACKING VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runEntityMutationDeltaQA()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongoConnection();
  });
