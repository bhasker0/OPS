const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../db');
const PaymentWebhookLog = require('../models/PaymentWebhookLog');
const { logAuditEvent } = require('../services/auditLogger');

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'ops_razorpay_secret_key_2026';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'ops_stripe_secret_key_2026';

// Helper: Verify Razorpay HMAC-SHA256 Signature
function verifyRazorpaySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');
    return expected === signature;
  } catch (err) {
    return false;
  }
}

// Helper: Verify Stripe Signature
function verifyStripeSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');
    return signature.includes(expected) || signature === expected;
  } catch (err) {
    return false;
  }
}

// POST /api/billing/webhooks/razorpay - Ingest Razorpay Webhook Events
router.post('/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const event = req.body;

  if (!event || !event.event) {
    return res.status(400).json({ success: false, message: 'Invalid webhook payload structure.' });
  }

  const eventId = event.payload?.payment?.entity?.id || event.id || `rzp_${Date.now()}`;
  const eventType = event.event;

  // Signature verification
  const isVerified = verifyRazorpaySignature(req.body, signature, RAZORPAY_WEBHOOK_SECRET);

  // Idempotency check in MongoDB
  const existingLog = await PaymentWebhookLog.findOne({ eventId });
  if (existingLog) {
    return res.json({
      success: true,
      message: 'Duplicate webhook event received and acknowledged.',
      status: 'DUPLICATE',
    });
  }

  try {
    let companyId = null;
    let invoiceId = null;
    let amountReceived = 0;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity || {};
      amountReceived = (paymentEntity.amount || 0) / 100; // Razorpay amounts in paise
      const notes = paymentEntity.notes || {};

      invoiceId = notes.invoiceId || notes.invoice_id;
      companyId = notes.companyId || notes.company_id;

      if (invoiceId) {
        const invoice = await prisma.subscriptionInvoice.findUnique({
          where: { id: invoiceId },
          include: { company: true, plan: true },
        });

        if (invoice) {
          companyId = invoice.companyId;

          // Mark invoice PAID and upgrade subscription
          await prisma.subscriptionInvoice.update({
            where: { id: invoice.id },
            data: {
              status: 'PAID',
              paidAt: new Date(),
              paymentMethod: 'RAZORPAY',
              paymentGatewayTxnId: paymentEntity.id || eventId,
            },
          });

          await prisma.company.update({
            where: { id: invoice.companyId },
            data: {
              subscriptionPlanId: invoice.planId,
              planStatus: 'ACTIVE',
              planExpiryDate: invoice.billingPeriodEnd,
            },
          });

          await logAuditEvent({
            module: 'BILLING',
            action: 'PAYMENT_CAPTURED_WEBHOOK',
            entityId: invoice.id,
            companyId: invoice.companyId,
            performedBy: 'Razorpay Gateway',
            details: {
              gateway: 'RAZORPAY',
              paymentId: paymentEntity.id,
              amount: amountReceived,
              invoiceNumber: invoice.invoiceNumber,
              upgradedPlan: invoice.plan.name,
            },
          });
        }
      }
    }

    // Record Event in MongoDB Log
    await PaymentWebhookLog.create({
      gateway: 'RAZORPAY',
      eventId,
      eventType,
      payload: event,
      signatureVerified: isVerified,
      processedStatus: 'PROCESSED',
      companyId,
      invoiceId,
      amountReceived,
      currency: 'INR',
    });

    res.json({ success: true, message: 'Razorpay webhook processed successfully.' });
  } catch (error) {
    console.error('Error processing Razorpay webhook:', error);

    await PaymentWebhookLog.create({
      gateway: 'RAZORPAY',
      eventId,
      eventType,
      payload: event,
      signatureVerified: isVerified,
      processedStatus: 'FAILED',
      errorReason: error.message,
    });

    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/billing/webhooks/stripe - Ingest Stripe Webhook Events
router.post('/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const event = req.body;

  if (!event || !event.type) {
    return res.status(400).json({ success: false, message: 'Invalid Stripe webhook payload.' });
  }

  const eventId = event.id || `str_${Date.now()}`;
  const eventType = event.type;
  const isVerified = verifyStripeSignature(req.body, signature, STRIPE_WEBHOOK_SECRET);

  const existingLog = await PaymentWebhookLog.findOne({ eventId });
  if (existingLog) {
    return res.json({ success: true, message: 'Duplicate Stripe webhook acknowledged.' });
  }

  try {
    let companyId = null;
    let invoiceId = null;
    let amountReceived = 0;

    if (eventType === 'payment_intent.succeeded' || eventType === 'invoice.payment_succeeded') {
      const dataObj = event.data?.object || {};
      amountReceived = (dataObj.amount || dataObj.amount_paid || 0) / 100;
      const metadata = dataObj.metadata || {};

      invoiceId = metadata.invoiceId || metadata.invoice_id;
      companyId = metadata.companyId || metadata.company_id;

      if (invoiceId) {
        const invoice = await prisma.subscriptionInvoice.findUnique({
          where: { id: invoiceId },
          include: { plan: true },
        });

        if (invoice) {
          companyId = invoice.companyId;

          await prisma.subscriptionInvoice.update({
            where: { id: invoice.id },
            data: {
              status: 'PAID',
              paidAt: new Date(),
              paymentMethod: 'STRIPE',
              paymentGatewayTxnId: dataObj.id || eventId,
            },
          });

          await prisma.company.update({
            where: { id: invoice.companyId },
            data: {
              subscriptionPlanId: invoice.planId,
              planStatus: 'ACTIVE',
              planExpiryDate: invoice.billingPeriodEnd,
            },
          });
        }
      }
    }

    await PaymentWebhookLog.create({
      gateway: 'STRIPE',
      eventId,
      eventType,
      payload: event,
      signatureVerified: isVerified,
      processedStatus: 'PROCESSED',
      companyId,
      invoiceId,
      amountReceived,
      currency: 'INR',
    });

    res.json({ success: true, message: 'Stripe webhook processed successfully.' });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);

    await PaymentWebhookLog.create({
      gateway: 'STRIPE',
      eventId,
      eventType,
      payload: event,
      signatureVerified: isVerified,
      processedStatus: 'FAILED',
      errorReason: error.message,
    });

    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/billing/webhooks/logs - Query recent payment webhook logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await PaymentWebhookLog.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
