const mongoose = require('mongoose');

const paymentWebhookLogSchema = new mongoose.Schema(
  {
    gateway: {
      type: String,
      required: true,
      enum: ['RAZORPAY', 'STRIPE', 'MANUAL'],
    },
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    payload: {
      type: Object,
      required: true,
    },
    signatureVerified: {
      type: Boolean,
      default: false,
    },
    processedStatus: {
      type: String,
      enum: ['PROCESSED', 'FAILED', 'IGNORED', 'DUPLICATE'],
      default: 'PROCESSED',
    },
    companyId: {
      type: String,
    },
    invoiceId: {
      type: String,
    },
    amountReceived: {
      type: Number,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    errorReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

paymentWebhookLogSchema.index({ gateway: 1, eventType: 1 });
paymentWebhookLogSchema.index({ companyId: 1 });

const PaymentWebhookLog =
  mongoose.models.PaymentWebhookLog ||
  mongoose.model('PaymentWebhookLog', paymentWebhookLogSchema, 'ops_payment_webhook_logs');

module.exports = PaymentWebhookLog;
