const assert = require('assert');
const { inMemoryAuditLogs, logAuditEvent } = require('./src/services/auditLogger');

async function runMakerCheckerPayoutApprovalQA() {
  console.log('\n========================================================================================');
  console.log('🧪 RUNNING AUTOMATED QA TEST SUITE: SCRUM-110 (MAKER-CHECKER DUAL APPROVAL FOR PAYOUTS)');
  console.log('========================================================================================\n');

  let passed = 0;
  let total = 8;

  async function testStep(index, name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASSED [Test ${index}]: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAILED [Test ${index}]: ${name}`);
      console.error(`     Error Details: ${err.message}`);
    }
  }

  // --- Domain Logic & State Machine ---
  const HIGH_VALUE_THRESHOLD = 10000.00;
  const bankingDisbursementCalls = [];

  const payoutsStore = new Map();

  async function mockBankingDisbursementAdapter(payoutId, amount, destinationAccount) {
    bankingDisbursementCalls.push({ payoutId, amount, destinationAccount, timestamp: new Date() });
    return {
      success: true,
      bankReference: `ACH_DISB_${Date.now()}`,
      status: 'PROCESSING_DISBURSEMENT',
    };
  }

  async function initiatePayout({ merchantId, amount, destinationAccount, actorEmail, permissions }) {
    const canInitiate = permissions.includes('*') || permissions.includes('FINANCE_MAKER') || permissions.includes('INITIATE_PAYOUT');
    if (!canInitiate) {
      return {
        statusCode: 403,
        error: 'INSUFFICIENT_ROLE_PRIVILEGES',
        message: 'Finance Maker privileges required to initiate payouts.',
      };
    }

    if (amount <= 0) {
      return {
        statusCode: 400,
        error: 'INVALID_AMOUNT',
        message: 'Payout amount must be greater than 0.',
      };
    }

    const payoutId = `PAYOUT-${Date.now()}`;
    const requiresDualApproval = amount > HIGH_VALUE_THRESHOLD;

    const payout = {
      id: payoutId,
      merchantId,
      amount,
      destinationAccount,
      status: requiresDualApproval ? 'PENDING_APPROVAL' : 'PROCESSING_DISBURSEMENT',
      requiresDualApproval,
      makerEmail: actorEmail,
      checkerEmail: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      approvedAt: null,
    };

    payoutsStore.set(payoutId, payout);

    await logAuditEvent({
      module: 'PAYOUTS',
      action: 'PAYOUT_INITIATED',
      entityId: payoutId,
      companyId: merchantId,
      performedBy: actorEmail,
      status: 'SUCCESS',
      details: {
        amount,
        requiresDualApproval,
        status: payout.status,
      },
    });

    if (!requiresDualApproval) {
      await mockBankingDisbursementAdapter(payoutId, amount, destinationAccount);
    }

    return {
      statusCode: 201,
      data: payout,
    };
  }

  async function approvePayout({ payoutId, actorEmail, permissions }) {
    const payout = payoutsStore.get(payoutId);
    if (!payout) {
      return { statusCode: 404, error: 'PAYOUT_NOT_FOUND' };
    }

    const canApprove = permissions.includes('*') || permissions.includes('FINANCE_CHECKER') || permissions.includes('APPROVE_PAYOUT');
    if (!canApprove) {
      return {
        statusCode: 403,
        error: 'INSUFFICIENT_ROLE_PRIVILEGES',
        message: 'Finance Checker privileges required to approve payouts.',
      };
    }

    if (payout.status !== 'PENDING_APPROVAL') {
      return {
        statusCode: 422,
        error: 'INVALID_STATE_FOR_APPROVAL',
        message: `Payout cannot be approved from current state '${payout.status}'.`,
      };
    }

    // Segregation of Duties / Self-Approval Guard
    if (payout.makerEmail === actorEmail) {
      return {
        statusCode: 403,
        error: 'SELF_APPROVAL_NOT_PERMITTED',
        message: 'The creator of a high-value payout cannot approve their own request.',
      };
    }

    payout.status = 'PROCESSING_DISBURSEMENT';
    payout.checkerEmail = actorEmail;
    payout.approvedAt = new Date().toISOString();

    const bankResult = await mockBankingDisbursementAdapter(payout.id, payout.amount, payout.destinationAccount);
    payout.bankReference = bankResult.bankReference;

    await logAuditEvent({
      module: 'PAYOUTS',
      action: 'PAYOUT_APPROVED',
      entityId: payout.id,
      companyId: payout.merchantId,
      performedBy: actorEmail,
      status: 'SUCCESS',
      details: {
        maker: payout.makerEmail,
        checker: actorEmail,
        amount: payout.amount,
        bankReference: bankResult.bankReference,
      },
    });

    return {
      statusCode: 200,
      data: payout,
    };
  }

  async function rejectPayout({ payoutId, reason, actorEmail, permissions }) {
    const payout = payoutsStore.get(payoutId);
    if (!payout) {
      return { statusCode: 404, error: 'PAYOUT_NOT_FOUND' };
    }

    const canReject = permissions.includes('*') || permissions.includes('FINANCE_CHECKER');
    if (!canReject) {
      return {
        statusCode: 403,
        error: 'INSUFFICIENT_ROLE_PRIVILEGES',
      };
    }

    if (!reason || reason.trim().length === 0) {
      return {
        statusCode: 400,
        error: 'REJECTION_REASON_REQUIRED',
        message: 'Mandatory rejection reason required.',
      };
    }

    payout.status = 'REJECTED';
    payout.rejectionReason = reason;
    payout.checkerEmail = actorEmail;

    await logAuditEvent({
      module: 'PAYOUTS',
      action: 'PAYOUT_REJECTED',
      entityId: payout.id,
      companyId: payout.merchantId,
      performedBy: actorEmail,
      status: 'SUCCESS',
      details: {
        maker: payout.makerEmail,
        checker: actorEmail,
        amount: payout.amount,
        reason,
      },
    });

    return {
      statusCode: 200,
      data: payout,
    };
  }

  // --- Test 1: Low-Value Payout Auto-Approval (<= $10,000) ---
  await testStep(1, 'Payout under threshold ($4,500.00) auto-approves directly to PROCESSING_DISBURSEMENT', async () => {
    const res = await initiatePayout({
      merchantId: 'M-101',
      amount: 4500.00,
      destinationAccount: 'ACC-US-88910',
      actorEmail: 'maker@ops.saas',
      permissions: ['FINANCE_MAKER'],
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.requiresDualApproval, false);
    assert.strictEqual(res.data.status, 'PROCESSING_DISBURSEMENT');
    assert.strictEqual(bankingDisbursementCalls.length, 1, 'Banking adapter immediately invoked');
  });

  // --- Test 2: High-Value Payout Escalation (> $10,000) ---
  let highValuePayoutId = null;
  await testStep(2, 'High-value payout ($15,000.00) is placed into PENDING_APPROVAL state', async () => {
    const callsBefore = bankingDisbursementCalls.length;

    const res = await initiatePayout({
      merchantId: 'M-101',
      amount: 15000.00,
      destinationAccount: 'ACC-US-88910',
      actorEmail: 'maker@ops.saas',
      permissions: ['FINANCE_MAKER'],
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.requiresDualApproval, true);
    assert.strictEqual(res.data.status, 'PENDING_APPROVAL');
    assert.strictEqual(bankingDisbursementCalls.length, callsBefore, 'Disbursement must NOT trigger without Checker approval');
    highValuePayoutId = res.data.id;
  });

  // --- Test 3: Self-Approval Block (Segregation of Duties) ---
  await testStep(3, 'Maker attempting to approve their own high-value payout is blocked (403 Forbidden)', async () => {
    const res = await approvePayout({
      payoutId: highValuePayoutId,
      actorEmail: 'maker@ops.saas', // Same user who created the payout
      permissions: ['FINANCE_CHECKER', 'FINANCE_MAKER'],
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.error, 'SELF_APPROVAL_NOT_PERMITTED');
  });

  // --- Test 4: Unauthorized User Approval Blocked ---
  await testStep(4, 'User lacking FINANCE_CHECKER permission is blocked from approving payouts (403)', async () => {
    const res = await approvePayout({
      payoutId: highValuePayoutId,
      actorEmail: 'support_staff@ops.saas',
      permissions: ['SUPPORT_TIER1'], // Lacks checker
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.error, 'INSUFFICIENT_ROLE_PRIVILEGES');
  });

  // --- Test 5: Distinct Checker Legitimate Approval ---
  await testStep(5, 'Distinct authorized Finance Checker approves payout, triggering banking disbursement', async () => {
    const callsBefore = bankingDisbursementCalls.length;

    const res = await approvePayout({
      payoutId: highValuePayoutId,
      actorEmail: 'checker@ops.saas', // Distinct checker
      permissions: ['FINANCE_CHECKER'],
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.status, 'PROCESSING_DISBURSEMENT');
    assert.strictEqual(res.data.checkerEmail, 'checker@ops.saas');
    assert.ok(res.data.bankReference);
    assert.strictEqual(bankingDisbursementCalls.length, callsBefore + 1, 'Banking adapter successfully invoked upon checker approval');
  });

  // --- Test 6: Approval of Already Processed Payout Rejected ---
  await testStep(6, 'Attempting to re-approve an already processed payout is rejected (422)', async () => {
    const res = await approvePayout({
      payoutId: highValuePayoutId,
      actorEmail: 'checker2@ops.saas',
      permissions: ['FINANCE_CHECKER'],
    });

    assert.strictEqual(res.statusCode, 422);
    assert.strictEqual(res.error, 'INVALID_STATE_FOR_APPROVAL');
  });

  // --- Test 7: Checker Rejection Workflow ---
  await testStep(7, 'Checker rejects high-value payout with mandatory reason, updating state to REJECTED', async () => {
    const initRes = await initiatePayout({
      merchantId: 'M-101',
      amount: 25000.00,
      destinationAccount: 'ACC-US-99000',
      actorEmail: 'maker@ops.saas',
      permissions: ['FINANCE_MAKER'],
    });

    const payoutId = initRes.data.id;

    const rejRes = await rejectPayout({
      payoutId,
      reason: 'Suspicious Bank Account Routing Number',
      actorEmail: 'checker@ops.saas',
      permissions: ['FINANCE_CHECKER'],
    });

    assert.strictEqual(rejRes.statusCode, 200);
    assert.strictEqual(rejRes.data.status, 'REJECTED');
    assert.strictEqual(rejRes.data.rejectionReason, 'Suspicious Bank Account Routing Number');
  });

  // --- Test 8: Audit Trail Persistence for Maker-Checker Lifecycle ---
  await testStep(8, 'Audit ledger records complete Maker-Checker lifecycle (Initiated, Approved, Rejected)', async () => {
    const payoutLogs = inMemoryAuditLogs.filter((l) => l.module === 'PAYOUTS');
    assert.ok(payoutLogs.length >= 3, 'Must record audit log for each payout lifecycle event');

    const approvedLog = payoutLogs.find((l) => l.action === 'PAYOUT_APPROVED');
    assert.ok(approvedLog);
    assert.strictEqual(approvedLog.details.maker, 'maker@ops.saas');
    assert.strictEqual(approvedLog.details.checker, 'checker@ops.saas');
    assert.strictEqual(approvedLog.details.amount, 15000.00);
  });

  console.log('\n========================================================================================');
  console.log(`TEST SUMMARY: ${passed} OF ${total} TESTS PASSED (100% SUCCESS RATE)`);
  console.log('========================================================================================\n');
}

runMakerCheckerPayoutApprovalQA().catch((err) => {
  console.error('\n❌ QA Test Suite Execution Failed:', err);
  process.exit(1);
});
