const mongoose = require('mongoose');
const { connectMongo, getIsConnected } = require('../config/mongo');
const AuditLog = require('../models/AuditLog');

// In-memory fallback log buffer in case MongoDB server is offline
const inMemoryAuditLogs = [];
const MAX_IN_MEMORY_LOGS = 1000;

// Initialize MongoDB connection
async function initMongo() {
  return await connectMongo();
}

/**
 * Extract audit metadata from Express request
 * @param {Object} req - Express request object
 */
function extractAuditMetadata(req) {
  if (!req) return { ipAddress: '127.0.0.1', userAgent: 'System-Internal', performedBy: 'system' };

  const ipAddress =
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    '127.0.0.1';

  const userAgent = req.headers?.['user-agent'] || 'Unknown-Client';

  const performedBy =
    req.user?.email ||
    req.user?.name ||
    req.headers?.['x-actor-id'] ||
    req.headers?.['x-user-email'] ||
    'admin@ops.saas';

  const actorId = req.user?.id || req.headers?.['x-actor-id'] || null;

  return { ipAddress, userAgent, performedBy, actorId };
}

/**
 * Express Middleware to auto-attach audit context
 */
function auditMiddleware(req, res, next) {
  req.auditContext = extractAuditMetadata(req);
  next();
}

/**
 * Core asynchronous persist worker
 */
async function _persistAuditEvent(logEntry) {
  if (getIsConnected()) {
    try {
      await AuditLog.create(logEntry);
    } catch (err) {
      // Fail-Safe Resilience: Error boundary prevents bubbling or crashing
      console.warn('⚠️ [AuditLogger Fail-Safe] MongoDB insertion warning:', err.message);
    }
  }
}

/**
 * Asynchronous, non-blocking audit logger
 * Guarantees zero latency penalty on primary HTTP response cycle and 100% fail-safe resilience
 */
async function logAuditEvent({
  module,
  action,
  entityId = null,
  companyId = null,
  performedBy = 'admin@ops.saas',
  actorId = null,
  ipAddress = '127.0.0.1',
  userAgent = 'OPS-Backend-Agent',
  status = 'SUCCESS',
  details = {},
  diff = null,
  req = null,
}) {
  try {
    // If Express req passed, auto-extract client metadata
    if (req) {
      const meta = extractAuditMetadata(req);
      if (performedBy === 'admin@ops.saas') performedBy = meta.performedBy;
      if (!actorId) actorId = meta.actorId;
      if (ipAddress === '127.0.0.1') ipAddress = meta.ipAddress;
      if (userAgent === 'OPS-Backend-Agent') userAgent = meta.userAgent;
    }

    const logEntry = {
      module,
      action,
      entityId: entityId ? String(entityId) : null,
      companyId: companyId ? String(companyId) : null,
      performedBy,
      actorId: actorId ? String(actorId) : null,
      ipAddress,
      userAgent,
      status,
      details: details || {},
      diff: diff || null,
      createdAt: new Date(),
    };

    // Always buffer in memory for instant API fallback
    inMemoryAuditLogs.unshift(logEntry);
    if (inMemoryAuditLogs.length > MAX_IN_MEMORY_LOGS) inMemoryAuditLogs.pop();

    // Asynchronously dispatch to MongoDB using setImmediate (non-blocking)
    setImmediate(() => {
      _persistAuditEvent(logEntry).catch((err) => {
        console.warn('⚠️ [AuditLogger Async Boundary] Background write caught:', err.message);
      });
    });

    return logEntry;
  } catch (err) {
    // Global Error Boundary: Never fail caller transaction
    console.warn('⚠️ [AuditLogger Boundary] Failed to construct audit log:', err.message);
    return null;
  }
}

const { calculateDelta, computeDiff } = require('../utils/auditDiff');

/**
 * Fetch Audit Logs with multi-filter query
 */
async function getAuditLogs(filter = {}) {
  if (getIsConnected()) {
    try {
      const query = {};
      if (filter.module) query.module = filter.module;
      if (filter.companyId) query.companyId = filter.companyId;
      if (filter.action) query.action = filter.action;
      if (filter.entityId) query.entityId = filter.entityId;
      if (filter.actorId) query.actorId = filter.actorId;
      if (filter.performedBy) query.performedBy = filter.performedBy;
      if (filter.status) query.status = filter.status;
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
  if (filter.actorId) filtered = filtered.filter((l) => l.actorId === filter.actorId);
  if (filter.performedBy) filtered = filtered.filter((l) => l.performedBy === filter.performedBy);
  if (filter.status) filtered = filtered.filter((l) => l.status === filter.status);
  if (filter.startDate) filtered = filtered.filter((l) => new Date(l.createdAt) >= new Date(filter.startDate));
  if (filter.endDate) filtered = filtered.filter((l) => new Date(l.createdAt) <= new Date(filter.endDate));
  return filtered;
}

module.exports = {
  initMongo,
  logAuditEvent,
  getAuditLogs,
  calculateDelta,
  computeDiff,
  extractAuditMetadata,
  auditMiddleware,
  inMemoryAuditLogs,
};
