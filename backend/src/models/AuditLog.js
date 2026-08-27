const mongoose = require('mongoose');

// Mongoose Schema for MongoDB Audit Logs with indexes and TTL
const AuditLogSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      index: true,
      enum: ['COMPANY', 'USER', 'ROLE', 'PARAMETER', 'SEED', 'TRANSACTION', 'SUBSCRIPTION', 'SYSTEM', 'AUTH'],
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      index: true,
    },
    companyId: {
      type: String,
      index: true,
    },
    actorId: {
      type: String,
      index: true,
    },
    performedBy: {
      type: String,
      default: 'admin@ops.saas',
      index: true,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: 'OPS-Backend-Agent',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING'],
      default: 'SUCCESS',
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    diff: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 60 * 60 * 24 * 90, // 90-day automatic TTL archiving
    },
  },
  { collection: 'audit_logs' }
);

// Compound indexes for multi-filter fast querying
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ module: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, module: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog;
