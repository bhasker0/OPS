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

async function runTransactionLedgerQA() {
  console.log('?? Starting SCRUM-11 Multi-Tenant Transaction Ledger QA Suite...\n');
  let passed = 0;
  let total = 9;

  // Retrieve test tenant company
  const company = await prisma.company.findFirst({
    where: { isSeed: false },
  });

  let testTxId = null;
  let failedTxId = null;

  // Test 1: Record Transaction with Positive Amount in INR (POST /api/companies/:id/transactions)
  try {
    const createRes = await request('POST', `/companies/${company.id}/transactions`, {
      amount: 45000.50,
      currency: 'INR',
      status: 'PENDING',
      description: 'SAC 9988 Monthly Job-Work Invoice #RK-8801',
    });

    if (
      createRes.status === 201 &&
      createRes.data.success &&
      createRes.data.data.amount === 45000.50 &&
      createRes.data.data.currency === 'INR' &&
      createRes.data.data.status === 'PENDING'
    ) {
      testTxId = createRes.data.data.id;
      console.log('  ? PASSED [Test 1]: POST /api/companies/:id/transactions created financial ledger entry in INR (status: PENDING)');
      passed++;
    } else {
      console.error('  ? FAILED [Test 1]: Transaction creation failed', createRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Amount Validation (Reject non-positive amount with HTTP 400)
  try {
    const invalidAmountRes = await request('POST', `/companies/${company.id}/transactions`, {
      amount: -100,
      description: 'Negative amount test',
    });

    if (invalidAmountRes.status === 400 && invalidAmountRes.data.message.includes('valid positive numerical amount')) {
      console.log('  ? PASSED [Test 2]: Non-positive transaction amount rejected with HTTP 400 Bad Request');
      passed++;
    } else {
      console.error('  ? FAILED [Test 2]: Negative amount was not rejected', invalidAmountRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: FSM Valid Transition 1: PENDING -> SUCCESS (HTTP 200)
  try {
    const transitionSuccessRes = await request('PATCH', `/companies/${company.id}/transactions/${testTxId}/status`, {
      status: 'SUCCESS',
    });

    if (
      transitionSuccessRes.status === 200 &&
      transitionSuccessRes.data.success &&
      transitionSuccessRes.data.data.status === 'SUCCESS'
    ) {
      console.log('  ? PASSED [Test 3]: FSM State Transition PENDING -> SUCCESS validated');
      passed++;
    } else {
      console.error('  ? FAILED [Test 3]: Transition to SUCCESS failed', transitionSuccessRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: FSM Invalid Transition 1: SUCCESS -> PENDING rejected with HTTP 400
  try {
    const invalidRollbackRes = await request('PATCH', `/companies/${company.id}/transactions/${testTxId}/status`, {
      status: 'PENDING',
    });

    if (invalidRollbackRes.status === 400 && invalidRollbackRes.data.message.includes('Invalid state transition')) {
      console.log('  ? PASSED [Test 4]: Illegal regression transition SUCCESS -> PENDING blocked with HTTP 400');
      passed++;
    } else {
      console.error('  ? FAILED [Test 4]: Illegal transition SUCCESS -> PENDING was not blocked', invalidRollbackRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: FSM Valid Transition 2: SUCCESS -> REFUNDED (HTTP 200)
  try {
    const refundRes = await request('PATCH', `/companies/${company.id}/transactions/${testTxId}/status`, {
      status: 'REFUNDED',
    });

    if (
      refundRes.status === 200 &&
      refundRes.data.data.status === 'REFUNDED'
    ) {
      console.log('  ? PASSED [Test 5]: FSM State Transition SUCCESS -> REFUNDED validated');
      passed++;
    } else {
      console.error('  ? FAILED [Test 5]: Refund transition failed', refundRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: FSM Invalid Transition 2: REFUNDED -> SUCCESS (Terminal State Guard, HTTP 400)
  try {
    const invalidTerminalRes = await request('PATCH', `/companies/${company.id}/transactions/${testTxId}/status`, {
      status: 'SUCCESS',
    });

    if (invalidTerminalRes.status === 400 && invalidTerminalRes.data.message.includes('Invalid state transition')) {
      console.log('  ? PASSED [Test 6]: Terminal State Guard blocked invalid transition from REFUNDED with HTTP 400');
      passed++;
    } else {
      console.error('  ? FAILED [Test 6]: Transition from REFUNDED was not blocked', invalidTerminalRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 6] Exception:', err.message);
  }

  // Test 7: FSM Terminal State Guard for FAILED status
  try {
    const failedCreateRes = await request('POST', `/companies/${company.id}/transactions`, {
      amount: 10000,
      status: 'FAILED',
      description: 'Failed UPI gateway payment',
    });
    failedTxId = failedCreateRes.data.data.id;

    const invalidFailedTransitionRes = await request('PATCH', `/companies/${company.id}/transactions/${failedTxId}/status`, {
      status: 'REFUNDED',
    });

    if (invalidFailedTransitionRes.status === 400 && invalidFailedTransitionRes.data.message.includes('Invalid state transition')) {
      console.log('  ? PASSED [Test 7]: FSM State Guard blocked invalid transition from FAILED -> REFUNDED with HTTP 400');
      passed++;
    } else {
      console.error('  ? FAILED [Test 7]: Transition from FAILED was not blocked', invalidFailedTransitionRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 7] Exception:', err.message);
  }

  // Test 8: Global Ledger & Volume Aggregation (GET /api/transactions)
  try {
    const globalRes = await request('GET', '/transactions?limit=10');

    if (
      globalRes.status === 200 &&
      globalRes.data.success &&
      globalRes.data.data.length >= 1 &&
      globalRes.data.summary &&
      globalRes.data.summary.totalVolume > 0 &&
      globalRes.data.summary.totalCount > 0
    ) {
      console.log(`  ? PASSED [Test 8]: GET /api/transactions returned global ledger (Total Volume: ?${globalRes.data.summary.totalVolume.toLocaleString('en-IN')})`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 8]: Global ledger query failed', globalRes);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 8] Exception:', err.message);
  }

  // Test 9: Status Mutation Audit Trail in MongoDB
  try {
    await connectMongo();
    const txAuditLogs = await AuditLog.find({
      module: 'TRANSACTION',
      action: 'UPDATE_TRANSACTION_STATUS',
    });

    if (txAuditLogs && txAuditLogs.length >= 2) {
      console.log(`  ? PASSED [Test 9]: MongoDB audit store verified with ${txAuditLogs.length} transaction status transition audit events`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 9]: Transaction audit logs missing in MongoDB', txAuditLogs);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 9] Exception:', err.message);
  }

  // Clean up test transactions
  if (testTxId) await prisma.transaction.delete({ where: { id: testTxId } });
  if (failedTxId) await prisma.transaction.delete({ where: { id: failedTxId } });

  console.log(`\n?? TRANSACTION LEDGER QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-11 MULTI-TENANT TRANSACTION LEDGER API VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runTransactionLedgerQA()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongoConnection();
  });
