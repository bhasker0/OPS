const mongoose = require('mongoose');

const SyncDLQSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING_RETRY', 'FAILED', 'REPLAYED'],
      default: 'PENDING_RETRY',
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 1,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    nextRetryAt: {
      type: Date,
      default: () => new Date(Date.now() + 60000),
    },
    lastError: {
      type: String,
      default: null,
    },
    replayedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

SyncDLQSchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.models.SyncDLQ || mongoose.model('SyncDLQ', SyncDLQSchema);
