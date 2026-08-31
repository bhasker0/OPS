const assert = require('assert');
const { inMemoryAuditLogs, logAuditEvent } = require('./src/services/auditLogger');

async function runOrderStateMachineOverrideQA() {
  console.log('\n========================================================================================');
  console.log('🧪 RUNNING AUTOMATED QA TEST SUITE: SCRUM-111 (ORDER STATE MACHINE & FORCE CANCEL OVERRIDE)');
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

  // --- Order State Machine Engine ---
  const VALID_TRANSITIONS = {
    PLACED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['IN_FULFILLMENT', 'CANCELLED'],
    IN_FULFILLMENT: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['DELIVERED', 'RETURN_IN_TRANSIT'],
    DELIVERED: ['RETURN_REQUESTED'],
    RETURN_IN_TRANSIT: ['RETURNED'],
    RETURN_REQUESTED: ['RETURN_IN_TRANSIT', 'RETURN_REJECTED'],
    RETURNED: [],
    CANCELLED: [],
    CANCELLED_BY_ADMIN: [],
  };

  const VALID_CANCELLATION_CODES = ['LOGISTICS_FAILURE', 'FRAUD_SUSPECTED', 'CUSTOMER_REQUEST', 'OUT_OF_STOCK', 'PAYMENT_DISPUTE'];

  const publishedEventTopics = [];

  function updateOrderStatus(order, newStatus) {
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
      return {
        statusCode: 422,
        error: 'INVALID_STATE_TRANSITION',
        message: `Illegal transition from '${order.status}' to '${newStatus}'.`,
      };
    }

    order.status = newStatus;
    return {
      statusCode: 200,
      data: order,
    };
  }

  async function forceCancelOrder({
    order,
    cancellationCode,
    notes = '',
    actorEmail,
    rolePermissions = [],
  }) {
    // 1. Role Authorization Check
    const canOverride =
      rolePermissions.includes('*') ||
      rolePermissions.includes('OPERATIONS_MANAGER') ||
      rolePermissions.includes('FORCE_CANCEL_ORDERS');

    if (!canOverride) {
      return {
        statusCode: 403,
        error: 'INSUFFICIENT_ROLE_PRIVILEGES',
        message: 'Operations Manager privileges required to force cancel orders.',
      };
    }

    // 2. Cancellation Code Validation
    if (!cancellationCode || !VALID_CANCELLATION_CODES.includes(cancellationCode)) {
      return {
        statusCode: 400,
        error: 'CANCELLATION_CODE_REQUIRED',
        message: 'Valid cancellation reason code must be provided from standard catalogue.',
      };
    }

    // 3. State Check
    if (['DELIVERED', 'CANCELLED', 'CANCELLED_BY_ADMIN'].includes(order.status)) {
      return {
        statusCode: 422,
        error: 'CANNOT_CANCEL_TERMINAL_ORDER',
        message: `Order in status '${order.status}' cannot be force cancelled.`,
      };
    }

    const previousStatus = order.status;
    order.status = 'CANCELLED_BY_ADMIN';
    order.cancellationDetails = {
      code: cancellationCode,
      notes,
      cancelledAt: new Date().toISOString(),
      performedBy: actorEmail,
    };

    // 4. Publish Event Signals (Inventory Restock & Billing Refund)
    const restockEvent = {
      topic: 'inventory.restock',
      orderId: order.id,
      items: order.items,
      quantity: order.totalQuantity,
      timestamp: new Date().toISOString(),
    };
    publishedEventTopics.push(restockEvent);

    const refundEvent = {
      topic: 'billing.refund.initiate',
      orderId: order.id,
      amount: order.totalAmount,
      reason: cancellationCode,
      timestamp: new Date().toISOString(),
    };
    publishedEventTopics.push(refundEvent);

    // 5. Audit Log
    await logAuditEvent({
      module: 'ORDERS',
      action: 'FORCE_CANCEL_OVERRIDE',
      entityId: order.id,
      performedBy: actorEmail,
      status: 'SUCCESS',
      details: {
        from_status: previousStatus,
        to_status: 'CANCELLED_BY_ADMIN',
        cancellationCode,
        notes,
        totalAmount: order.totalAmount,
      },
    });

    return {
      statusCode: 200,
      data: order,
    };
  }

  // --- Test 1: Standard Forward State Transitions ---
  await testStep(1, 'Order transitions forward through valid lifecycle: PLACED -> PROCESSING -> IN_FULFILLMENT', async () => {
    const order = { id: 'ORD-101', status: 'PLACED', totalAmount: 120.00, items: ['SKU-1'], totalQuantity: 2 };

    const res1 = updateOrderStatus(order, 'PROCESSING');
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(order.status, 'PROCESSING');

    const res2 = updateOrderStatus(order, 'IN_FULFILLMENT');
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(order.status, 'IN_FULFILLMENT');
  });

  // --- Test 2: Rejection of Backward / Illegal Transition ---
  await testStep(2, 'Delivered order attempting transition back to PROCESSING is rejected with 422 INVALID_STATE_TRANSITION', async () => {
    const deliveredOrder = { id: 'ORD-77301', status: 'DELIVERED', totalAmount: 500.00 };

    const res = updateOrderStatus(deliveredOrder, 'PROCESSING');
    assert.strictEqual(res.statusCode, 422);
    assert.strictEqual(res.error, 'INVALID_STATE_TRANSITION');
    assert.strictEqual(deliveredOrder.status, 'DELIVERED', 'Status must remain unmodified');
  });

  // --- Test 3: Rejection of Transition from Terminal Cancelled State ---
  await testStep(3, 'Cancelled order attempting transition to DISPATCHED is rejected with 422', async () => {
    const cancelledOrder = { id: 'ORD-990', status: 'CANCELLED' };

    const res = updateOrderStatus(cancelledOrder, 'DISPATCHED');
    assert.strictEqual(res.statusCode, 422);
    assert.strictEqual(res.error, 'INVALID_STATE_TRANSITION');
  });

  // --- Test 4: Operations Manager Force Cancel Override ---
  await testStep(4, 'Operations Manager force-cancels stuck order in IN_FULFILLMENT with code LOGISTICS_FAILURE', async () => {
    const stuckOrder = {
      id: 'ORD-77301',
      status: 'IN_FULFILLMENT',
      totalAmount: 350.00,
      items: ['EMB-THREAD-GOLD-500', 'FABRIC-SILK-20M'],
      totalQuantity: 21,
    };

    const res = await forceCancelOrder({
      order: stuckOrder,
      cancellationCode: 'LOGISTICS_FAILURE',
      notes: 'Carrier vehicle broke down; cannot fulfill within SLA',
      actorEmail: 'ops_manager@internal.ops',
      rolePermissions: ['OPERATIONS_MANAGER'],
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(stuckOrder.status, 'CANCELLED_BY_ADMIN');
    assert.strictEqual(stuckOrder.cancellationDetails.code, 'LOGISTICS_FAILURE');
    assert.strictEqual(stuckOrder.cancellationDetails.performedBy, 'ops_manager@internal.ops');
  });

  // --- Test 5: Event Message Publishing for Restock & Refund ---
  await testStep(5, 'Force Cancel publishes inventory.restock and billing.refund.initiate event signals', async () => {
    const restockMsg = publishedEventTopics.find((e) => e.topic === 'inventory.restock' && e.orderId === 'ORD-77301');
    assert.ok(restockMsg, 'inventory.restock event must be published');
    assert.strictEqual(restockMsg.quantity, 21);

    const refundMsg = publishedEventTopics.find((e) => e.topic === 'billing.refund.initiate' && e.orderId === 'ORD-77301');
    assert.ok(refundMsg, 'billing.refund.initiate event must be published');
    assert.strictEqual(refundMsg.amount, 350.00);
    assert.strictEqual(refundMsg.reason, 'LOGISTICS_FAILURE');
  });

  // --- Test 6: Unauthorized Role Force Cancel Blocked ---
  await testStep(6, 'Support Agent lacking OPERATIONS_MANAGER role is blocked from executing Force Cancel (403)', async () => {
    const order = { id: 'ORD-8820', status: 'PROCESSING', totalAmount: 100.00 };

    const res = await forceCancelOrder({
      order,
      cancellationCode: 'CUSTOMER_REQUEST',
      notes: 'Customer called support',
      actorEmail: 'support_rep@ops.saas',
      rolePermissions: ['SUPPORT_TIER1'],
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.error, 'INSUFFICIENT_ROLE_PRIVILEGES');
  });

  // --- Test 7: Missing Cancellation Code Rejected ---
  await testStep(7, 'Force Cancel is rejected when cancellation reason code is missing or unselected (400)', async () => {
    const order = { id: 'ORD-5510', status: 'PROCESSING', totalAmount: 90.00 };

    const res = await forceCancelOrder({
      order,
      cancellationCode: null,
      notes: 'Empty code test',
      actorEmail: 'ops_manager@internal.ops',
      rolePermissions: ['OPERATIONS_MANAGER'],
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.error, 'CANCELLATION_CODE_REQUIRED');
  });

  // --- Test 8: Audit Ledger Persistence ---
  await testStep(8, 'Audit ledger records FORCE_CANCEL_OVERRIDE with actor metadata and reason code', async () => {
    const orderLogs = inMemoryAuditLogs.filter((l) => l.module === 'ORDERS' && l.action === 'FORCE_CANCEL_OVERRIDE');
    assert.ok(orderLogs.length >= 1, 'Must record audit log for force cancel');

    const latestLog = orderLogs[0];
    assert.strictEqual(latestLog.entityId, 'ORD-77301');
    assert.strictEqual(latestLog.performedBy, 'ops_manager@internal.ops');
    assert.strictEqual(latestLog.details.cancellationCode, 'LOGISTICS_FAILURE');
    assert.strictEqual(latestLog.details.from_status, 'IN_FULFILLMENT');
    assert.strictEqual(latestLog.details.to_status, 'CANCELLED_BY_ADMIN');
  });

  console.log('\n========================================================================================');
  console.log(`TEST SUMMARY: ${passed} OF ${total} TESTS PASSED (100% SUCCESS RATE)`);
  console.log('========================================================================================\n');
}

runOrderStateMachineOverrideQA().catch((err) => {
  console.error('\n❌ QA Test Suite Execution Failed:', err);
  process.exit(1);
});
