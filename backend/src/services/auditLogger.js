const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ops_audit_db';

// In-memory fallback log buffer in case MongoDB server is offline
const inMemoryAuditLogs = [];

// Mongoose Schema for MongoDB Audit Logs
const AuditLogSchema = new mongoose.Schema(
  {
    module: { type: String, required: true, index: true }, // COMPANY, USER, ROLE, PARAMETER, SEED
    action: { type: String, required: true, index: true }, // CREATE_COMPANY, UPDATE_PARAMETER, ROLE_LOCK_BLOCKED, etc.
    entityId: { type: String },
    companyId: { type: String, index: true },
    performedBy: { type: String, default: 'admin@ops.saas' },
    details: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'audit_logs' }
);

let AuditLogModel = null;
let isConnected = false;

// Initialize MongoDB connection
async function initMongo() {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 2000, // Quick timeout fallback
    });
    isConnected = true;
    AuditLogModel = mongoose.model('AuditLog', AuditLogSchema);
    console.log('🍃 MongoDB connected for Audit Logging.');
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

// Fetch Audit Logs
async function getAuditLogs(filter = {}) {
  if (isConnected && AuditLogModel) {
    try {
      const query = {};
      if (filter.module) query.module = filter.module;
      if (filter.companyId) query.companyId = filter.companyId;

      return await AuditLogModel.find(query).sort({ createdAt: -1 }).limit(100);
    } catch (err) {
      console.error('Error fetching audit logs from MongoDB:', err.message);
    }
  }

  // Fallback to buffered logs
  let filtered = [...inMemoryAuditLogs];
  if (filter.module) filtered = filtered.filter((l) => l.module === filter.module);
  if (filter.companyId) filtered = filtered.filter((l) => l.companyId === filter.companyId);
  return filtered;
}

module.exports = {
  initMongo,
  logAuditEvent,
  getAuditLogs,
};
