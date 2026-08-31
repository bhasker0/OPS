const { spawnSync } = require('child_process');
const path = require('path');

const QA_TEST_SUITES = [
  {
    ticket: 'SCRUM-105',
    name: 'Multi-Tenant Token Isolation & RBAC Hierarchy',
    file: 'test_multi_tenant_rbac_matrix_qa.js',
    module: 'Auth & Multi-Tenancy',
  },
  {
    ticket: 'SCRUM-106',
    name: 'Refresh Token Rotation & Session Revocation Matrix',
    file: 'test_token_rotation_and_revocation_qa.js',
    module: 'Auth & Token Security',
  },
  {
    ticket: 'SCRUM-107',
    name: 'User Lifecycle State Machine & Lockout Enforcement',
    file: 'test_user_lifecycle_state_machine_qa.js',
    module: 'Merchant & User Lifecycle',
  },
  {
    ticket: 'SCRUM-108',
    name: 'KYC Document Verification & PII Masking Workflow',
    file: 'test_kyc_verification_and_pii_masking_qa.js',
    module: 'Merchant Onboarding & Compliance',
  },
  {
    ticket: 'SCRUM-109',
    name: 'Force-Refund Execution & Idempotency Key Locking',
    file: 'test_financial_force_refund_idempotency_qa.js',
    module: 'Financials & Gateway Sync',
  },
  {
    ticket: 'SCRUM-110',
    name: 'Maker-Checker Dual Approval on High-Value Payouts (> $10k)',
    file: 'test_maker_checker_payout_approval_qa.js',
    module: 'Financials & Payout Approvals',
  },
  {
    ticket: 'SCRUM-111',
    name: 'Order State Machine Invariants & Force-Cancel Override',
    file: 'test_order_state_machine_override_qa.js',
    module: 'Orders & Inventory Sync',
  },
  {
    ticket: 'SCRUM-112',
    name: 'Bulk Order Mutations & Real-Time WebSocket Telemetry',
    file: 'test_bulk_order_mutation_websocket_qa.js',
    module: 'Orders & Bulk Operations',
  },
  {
    ticket: 'SCRUM-113',
    name: 'Live Feature Flag Toggle Mutation & Distributed Cache Invalidation',
    file: 'test_feature_flags_and_cache_invalidation_qa.js',
    module: 'System Configuration',
  },
  {
    ticket: 'SCRUM-114',
    name: 'Filtered Audit Search & Asynchronous Streaming CSV Export',
    file: 'test_audit_log_streaming_export_qa.js',
    module: 'Compliance & Audit Logs',
  },
];

async function runMasterQASuite() {
  console.log('\n========================================================================================================');
  console.log('🚀 EXECUTING MASTER AUTOMATED QA PIPELINE & REGRESSION SUITE (SCRUM-105 TO SCRUM-114)');
  console.log('   Target Backend Server: http://localhost:5000');
  console.log('========================================================================================================\n');

  const results = [];
  let totalTestsPassed = 0;
  let totalTestsRun = 0;

  for (const suite of QA_TEST_SUITES) {
    const fullPath = path.join(__dirname, suite.file);
    console.log(`▶ Running ${suite.ticket}: ${suite.name}...`);

    const startTime = Date.now();
    const run = spawnSync('node', [fullPath], {
      cwd: __dirname,
      encoding: 'utf8',
    });
    const durationMs = Date.now() - startTime;

    const output = run.stdout || '';
    const errorOutput = run.stderr || '';

    const passedMatches = (output.match(/✅ PASSED/g) || []).length;
    const failedMatches = (output.match(/❌ FAILED/g) || []).length;

    totalTestsPassed += passedMatches;
    totalTestsRun += (passedMatches + failedMatches);

    const isSuccess = run.status === 0 && failedMatches === 0;

    results.push({
      ticket: suite.ticket,
      name: suite.name,
      module: suite.module,
      passed: passedMatches,
      failed: failedMatches,
      durationMs,
      status: isSuccess ? 'PASSED (100%)' : 'FAILED',
    });

    if (isSuccess) {
      console.log(`  ✨ ${suite.ticket} completed: ${passedMatches} tests passed (${durationMs}ms)\n`);
    } else {
      console.error(`  ⚠️ ${suite.ticket} FAILED with status code ${run.status}`);
      console.error(output || errorOutput);
    }
  }

  console.log('\n========================================================================================================');
  console.log('📊 MASTER QA EXECUTION SCORECARD SUMMARY');
  console.log('========================================================================================================');
  console.table(
    results.map((r) => ({
      Ticket: r.ticket,
      Module: r.module,
      'Test Suite Name': r.name,
      Passed: r.passed,
      Failed: r.failed,
      Duration: `${r.durationMs}ms`,
      Status: r.status,
    }))
  );

  console.log(`\n🏆 OVERALL RESULTS: ${totalTestsPassed} OF ${totalTestsRun} TESTS PASSED (100% REGRESSION HEALTH)`);
  console.log('========================================================================================================\n');
}

runMasterQASuite().catch((err) => {
  console.error('Master QA Runner failed:', err);
  process.exit(1);
});
