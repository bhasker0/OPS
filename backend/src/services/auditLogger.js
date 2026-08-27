const mongoose = require('mongoose');
const { connectMongo, getIsConnected } = require('../config/mongo');
const AuditLog = require('../models/AuditLog');

// In-memory fallback log buffer in case MongoDB server is offline
const inMemoryAuditLogs = [];

// Initialize MongoDB connection
async function initMongo() {
  return await connectMongo();
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

  if (getIsConnected()) {
    try {
      await AuditLog.create(logEntry);
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
  if (getIsConnected()) {
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

      return await AuditLog.find(query).sort({ createdAt: -1 }).limit(200);
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
