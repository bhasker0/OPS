const assert = require('assert');
const crypto = require('crypto');

const API_BASE = 'http://127.0.0.1:5000/api';
const RAZORPAY_SECRET = 'ops_razorpay_secret_key_2026';
const STRIPE_SECRET = 'ops_stripe_secret_key_2026';

async function runInvoicingAndWebhooksQaSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING INVOICING & PAYMENT WEBHOOKS QA SUITE (SCRUM-89, 90, 91)');
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

  let gujaratCompany = null;
  let maharashtraCompany = null;
  let starterPlan = null;
  let enterprisePlan = null;

  await test('1. Setup Test Companies (Gujarat 24 vs Maharashtra 27) and Plans', async () => {
    // Create Gujarat Company
    const comp1Res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Surat Silk Mill Ltd',
        code: `GJ_${Date.now()}`,
        gstin: '24AABCS1234F1Z5',
        email: 'billing@suratsilk.in',
      }),
    });
    const comp1Data = await comp1Res.json();
    gujaratCompany = comp1Data.data?.company || comp1Data.data;

    // Create Maharashtra Company
    const comp2Res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Mumbai Fashion Apparels',
        code: `MH_${Date.now()}`,
        gstin: '27AABCM5678G1Z2',
        email: 'accounts@mumbaifashion.in',
      }),
    });
    const comp2Data = await comp2Res.json();
    maharashtraCompany = comp2Data.data?.company || comp2Data.data;

    const plansRes = await fetch(`${API_BASE}/subscription-plans`);
    const plansData = await plansRes.json();
    starterPlan = plansData.data.find((p) => p.code === 'STARTER') || plansData.data[0];
    enterprisePlan = plansData.data.find((p) => p.code === 'ENTERPRISE') || plansData.data[plansData.data.length - 1];

    assert.ok(gujaratCompany, 'Gujarat company created');
    assert.ok(maharashtraCompany, 'Maharashtra company created');
  });

  let gujaratInvoice = null;
  let maharashtraInvoice = null;

  await test('2. Issue Invoice for Gujarat Tenant: SAC 9983 Intra-State (9% CGST + 9% SGST, 0% IGST)', async () => {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: gujaratCompany.id,
        planId: starterPlan.id,
        customBaseAmount: 10000,
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.baseAmount, 10000);
    assert.strictEqual(data.data.cgstAmount, 900, 'CGST must be 9% (₹900)');
    assert.strictEqual(data.data.sgstAmount, 900, 'SGST must be 9% (₹900)');
    assert.strictEqual(data.data.igstAmount, 0, 'IGST must be 0 for Gujarat intra-state');
    assert.strictEqual(data.data.totalAmount, 11800, 'Total must be ₹11,800');
    assert.strictEqual(data.data.sacCode, '998313');
    gujaratInvoice = data.data;
  });

  await test('3. Issue Invoice for Maharashtra Tenant: SAC 9983 Inter-State (18% IGST, 0% CGST/SGST)', async () => {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: maharashtraCompany.id,
        planId: enterprisePlan.id,
        customBaseAmount: 20000,
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.baseAmount, 20000);
    assert.strictEqual(data.data.cgstAmount, 0, 'CGST must be 0 for inter-state');
    assert.strictEqual(data.data.sgstAmount, 0, 'SGST must be 0 for inter-state');
    assert.strictEqual(data.data.igstAmount, 3600, 'IGST must be 18% (₹3,600)');
    assert.strictEqual(data.data.totalAmount, 23600, 'Total must be ₹23,600');
    maharashtraInvoice = data.data;
  });

  await test('4. GET /api/invoices and GET /api/invoices/stats KPIs calculation', async () => {
    const res = await fetch(`${API_BASE}/invoices/stats`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.totalBilled >= 35400, 'Total billed should include newly generated invoices');
    assert.ok(data.data.pendingAmount >= 35400, 'Both invoices start as pending');
  });

  await test('5. Manual Settlement: PATCH /api/invoices/:id/status to PAID', async () => {
    const res = await fetch(`${API_BASE}/invoices/${gujaratInvoice.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'PAID',
        paymentMethod: 'BANK_TRANSFER',
        paymentGatewayTxnId: 'NEFT_HDFC_998182',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.data.status, 'PAID');
    assert.ok(data.data.paidAt, 'paidAt must be recorded');
  });

  await test('6. Ingest Razorpay Webhook (payment.captured) with HMAC signature & auto-upgrade plan', async () => {
    const eventId = `pay_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: eventId,
            amount: 2360000, // 23,600 in paise
            currency: 'INR',
            status: 'captured',
            notes: {
              invoiceId: maharashtraInvoice.id,
              companyId: maharashtraCompany.id,
            },
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', RAZORPAY_SECRET).update(rawBody).digest('hex');

    const res = await fetch(`${API_BASE}/billing/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
      },
      body: rawBody,
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    // Verify invoice marked PAID in database
    const invRes = await fetch(`${API_BASE}/invoices/${maharashtraInvoice.id}`);
    const invData = await invRes.json();
    assert.strictEqual(invData.data.status, 'PAID');
    assert.strictEqual(invData.data.paymentMethod, 'RAZORPAY');
  });

  await test('7. Idempotency Guard: Duplicate Webhook Event handled gracefully', async () => {
    const eventId = `pay_dup_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: eventId,
            amount: 100000,
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', RAZORPAY_SECRET).update(rawBody).digest('hex');

    // First call
    const res1 = await fetch(`${API_BASE}/billing/webhooks/razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature },
      body: rawBody,
    });
    assert.strictEqual(res1.status, 200);

    // Second call (Duplicate)
    const res2 = await fetch(`${API_BASE}/billing/webhooks/razorpay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature },
      body: rawBody,
    });
    const data2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(data2.status, 'DUPLICATE', 'Duplicate webhook must be recognized and acknowledged');
  });

  await test('8. Ingest Stripe Webhook (payment_intent.succeeded) and verify payment log', async () => {
    const eventId = `evt_stripe_${Date.now()}`;
    const payload = {
      id: eventId,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_${Date.now()}`,
          amount: 500000,
          currency: 'inr',
          metadata: {
            companyId: gujaratCompany.id,
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', STRIPE_SECRET).update(rawBody).digest('hex');

    const res = await fetch(`${API_BASE}/billing/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
      body: rawBody,
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    // Verify webhook log recorded in MongoDB
    const logsRes = await fetch(`${API_BASE}/billing/webhooks/logs`);
    const logsData = await logsRes.json();
    const recordedLog = logsData.data.find((l) => l.eventId === eventId);
    assert.ok(recordedLog, 'Stripe webhook log must be recorded in MongoDB');
    assert.strictEqual(recordedLog.gateway, 'STRIPE');
  });

  await test('9. Compliance Guard: Cannot delete a PAID invoice (400 Bad Request)', async () => {
    const res = await fetch(`${API_BASE}/invoices/${gujaratInvoice.id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, 'Must reject deleting paid tax invoice');
    assert.strictEqual(data.success, false);
  });

  console.log(`\n======================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runInvoicingAndWebhooksQaSuite().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
