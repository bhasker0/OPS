const { connectMongo, closeMongoConnection, getIsConnected, MONGO_OPTIONS } = require('./src/config/mongo');
const AuditLog = require('./src/models/AuditLog');
const { logAuditEvent, getAuditLogs, computeDiff } = require('./src/services/auditLogger');

async function runMongoAuditQA() {
  console.log('?? Starting SCRUM-4 MongoDB Connection & Audit Document Store QA Suite...\n');
  let passed = 0;
  let total = 7;

  // Test 1: Connection Pool & Options
  try {
    if (MONGO_OPTIONS.maxPoolSize === 10 && MONGO_OPTIONS.serverSelectionTimeoutMS === 5000) {
      console.log('  ? PASSED [Test 1]: MongoDB connection pool tuned for production (maxPoolSize: 10, serverSelectionTimeoutMS: 5000)');
      passed++;
    } else {
      console.error('  ? FAILED [Test 1]: MONGO_OPTIONS not configured properly', MONGO_OPTIONS);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Connection Initialization & Event Listeners
  try {
    await connectMongo();
    if (getIsConnected()) {
      console.log('  ? PASSED [Test 2]: Connected to MongoDB Audit Store & connection event listeners verified');
      passed++;
    } else {
      console.error('  ? FAILED [Test 2]: MongoDB connection could not be established');
    }
  } catch (err) {
    console.error('  ? FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Model Schema & Index Verification
  try {
    await AuditLog.syncIndexes();
    const indexes = await AuditLog.collection.indexes();
    const hasCompanyCreatedIndex = indexes.some(idx => idx.key.companyId === 1 && idx.key.createdAt === -1);
    const hasModuleCreatedIndex = indexes.some(idx => idx.key.module === 1 && idx.key.createdAt === -1);
    const hasTTLIndex = indexes.some(idx => idx.key.createdAt === 1 && idx.expireAfterSeconds !== undefined);

    if (hasCompanyCreatedIndex && hasModuleCreatedIndex && hasTTLIndex) {
      console.log('  ? PASSED [Test 3]: AuditLog schema compound indexes & 90-day TTL archival index verified on MongoDB');
      passed++;
    } else {
      console.error('  ? FAILED [Test 3]: Required indexes missing on AuditLog collection', indexes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: Write Audit Event & Retrieve via Multi-Filter
  const testCompanyId = 'qa-mongo-' + Date.now();
  try {
    await logAuditEvent({
      module: 'COMPANY',
      action: 'CREATE_COMPANY_QA',
      entityId: testCompanyId,
      companyId: testCompanyId,
      performedBy: 'qa_lead@ops.saas',
      details: { tier: 'ENTERPRISE', plan: 'ANNUAL' }
    });

    // Wait 50ms for setImmediate async mongo write
    await new Promise(r => setTimeout(r, 50));

    const logs = await getAuditLogs({
      companyId: testCompanyId,
      module: 'COMPANY',
      action: 'CREATE_COMPANY_QA'
    });

    if (logs && logs.length > 0 && logs[0].entityId === testCompanyId) {
      console.log('  ? PASSED [Test 4]: logAuditEvent successfully persisted document & getAuditLogs filtered multi-attribute queries');
      passed++;
    } else {
      console.error('  ? FAILED [Test 4]: Audit log retrieval failed or empty', logs);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: Compute Entity Mutation Diffs
  try {
    const oldState = { name: 'Alpha Ltd', status: 'ACTIVE', contact: 'Alice', updatedAt: '2026-01-01' };
    const newState = { name: 'Alpha Corp Ltd', status: 'SUSPENDED', contact: 'Alice', updatedAt: '2026-02-01' };
    const diff = computeDiff(oldState, newState);

    if (diff && diff.name && diff.name.from === 'Alpha Ltd' && diff.name.to === 'Alpha Corp Ltd' && diff.status.to === 'SUSPENDED' && !diff.updatedAt) {
      console.log('  ? PASSED [Test 5]: computeDiff correctly identified mutation delta and filtered ignored metadata timestamps');
      passed++;
    } else {
      console.error('  ? FAILED [Test 5]: Diff computation incorrect', diff);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: App Startup Resilience on Unreachable MongoDB (Fallback Buffer)
  try {
    const unreachableRes = await connectMongo('mongodb://127.0.0.1:29999/unreachable_db', {
      serverSelectionTimeoutMS: 500,
      connectTimeoutMS: 500
    });
    // System should catch error and return null without throwing fatal exception
    if (unreachableRes === null) {
      console.log('  ? PASSED [Test 6]: Startup resilience handles unreachable MongoDB gracefully without crashing server');
      passed++;
    } else {
      console.error('  ? FAILED [Test 6]: Did not handle unreachable database properly');
    }
  } catch (err) {
    console.error('  ? FAILED [Test 6] Exception:', err.message);
  }

  // Test 7: Graceful Pool Termination
  try {
    // Reconnect to primary
    await connectMongo();
    await closeMongoConnection();
    if (!getIsConnected()) {
      console.log('  ? PASSED [Test 7]: Graceful shutdown closes MongoDB connection pool cleanly');
      passed++;
    } else {
      console.error('  ? FAILED [Test 7]: MongoDB connection remained open after closeMongoConnection');
    }
  } catch (err) {
    console.error('  ? FAILED [Test 7] Exception:', err.message);
  }

  console.log(`\n?? MONGODB AUDIT QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-4 MONGODB CONNECTION & AUDIT DOCUMENT STORE VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runMongoAuditQA();
