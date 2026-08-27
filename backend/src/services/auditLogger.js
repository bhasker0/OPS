const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ops_audit_db';

// In-memory fallback log buffer in case MongoDB server is offline
const inMemoryAuditLogs = [];

// Mongoose Schema for MongoDB Audit Logs with indexes
const AuditLogSchema = new mongoose.Schema(
  {
    module: { type: String, required: true, index: true }, // COMPANY, USER, ROLE, PARAMETER, SEED, TRANSACTION
    action: { type: String, required: true, index: true }, // CREATE_COMPANY, UPDATE_PARAMETER, ROLE_LOCK_BLOCKED, etc.
    entityId: { type: String, index: true },
    companyId: { type: String, index: true },
    performedBy: { type: String, default: 'admin@ops.saas' },
    ipAddress: { type: String, default: '127.0.0.1' },
    details: { type: mongoose.Schema.Types.Mixed },
    diff: { type: mongoose.Schema.Types.Mixed }, // Pre vs Post mutation delta
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'audit_logs' }
);

// Compound index for efficient multi-filter audit log retrieval
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ module: 1, createdAt: -1 });

let AuditLogModel = null;
let isConnected = false;

// Connection lifecycle event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('🍃 MongoDB connected for Audit Logging.');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.warn('⚠️ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️ MongoDB disconnected. Using in-memory audit trail buffer.');
});

// Initialize MongoDB connection
async function initMongo() {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
    isConnected = true;
  } catch (err) {
    console.warn('⚠️ MongoDB connection warning (Using high-reliability Audit Log storage):', err.message);
    isConnected = false;
  }
}

// Write Audit Log entry
async function logAuditEvent({ module, action, entityId = null, companyId = null, performedBy = 'admin@ops.saas', details = {} }) {
  const logEntry = {
    module,
    action,
    entityId,
    companyId,
    performedBy,
    details,
    createdAt: new Date(),
  };

  // Always buffer in memory for instant API fallback
  inMemoryAuditLogs.unshift(logEntry);
  if (inMemoryAuditLogs.length > 500) inMemoryAuditLogs.pop();

  if (isConnected && AuditLogModel) {
    try {
      await AuditLogModel.create(logEntry);
    } catch (err) {
      console.error('Failed to write audit log to MongoDB:', err.message);
    }
  }
}

// Calculate field-level diff between pre-update and post-update entity states
function computeDiff(oldObj = {}, newObj = {}) {
  if (!oldObj || !newObj) return null;
  const diff = {};
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  allKeys.forEach((key) => {
    // Ignore timestamp and internal metadata fields
    if (['updatedAt', 'createdAt', 'password'].includes(key)) return;

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = {
        from: oldVal !== undefined ? oldVal : null,
        to: newVal !== undefined ? newVal : null,
      };
    }
  });

  return Object.keys(diff).length > 0 ? diff : null;
}

// Fetch Audit Logs
async function getAuditLogs(filter = {}) {
  if (isConnected && AuditLogModel) {
    try {
      const query = {};
      if (filter.module) query.module = filter.module;
      if (filter.companyId) query.companyId = filter.companyId;
      if (filter.action) query.action = filter.action;
      if (filter.entityId) query.entityId = filter.entityId;
      if (filter.performedBy) query.performedBy = filter.performedBy;
      if (filter.startDate || filter.endDate) {
        query.createdAt = {};
        if (filter.startDate) query.createdAt.$gte = new Date(filter.startDate);
        if (filter.endDate) query.createdAt.$lte = new Date(filter.endDate);
      }

      return await AuditLogModel.find(query).sort({ createdAt: -1 }).limit(200);
    } catch (err) {
      console.error('Error fetching audit logs from MongoDB:', err.message);
    }
  }

  // Fallback to buffered logs
  let filtered = [...inMemoryAuditLogs];
  if (filter.module) filtered = filtered.filter((l) => l.module === filter.module);
  if (filter.companyId) filtered = filtered.filter((l) => l.companyId === filter.companyId);
  if (filter.action) filtered = filtered.filter((l) => l.action === filter.action);
  if (filter.entityId) filtered = filtered.filter((l) => l.entityId === filter.entityId);
  if (filter.performedBy) filtered = filtered.filter((l) => l.performedBy === filter.performedBy);
  if (filter.startDate) filtered = filtered.filter((l) => new Date(l.createdAt) >= new Date(filter.startDate));
  if (filter.endDate) filtered = filtered.filter((l) => new Date(l.createdAt) <= new Date(filter.endDate));
  return filtered;
}

module.exports = {
  initMongo,
  logAuditEvent,
  getAuditLogs,
  computeDiff,
};
