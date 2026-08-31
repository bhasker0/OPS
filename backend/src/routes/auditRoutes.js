const express = require('express');
const AuditLog = require('../models/AuditLog');
const { getIsConnected } = require('../config/mongo');
const { inMemoryAuditLogs } = require('../services/auditLogger');

const router = express.Router();

// GET /api/audit-logs/stats - Aggregate stats by module and status
router.get('/stats', async (req, res) => {
  try {
    const { companyId } = req.query;
    const match = {};
    if (companyId) match.companyId = companyId;

    if (getIsConnected()) {
      const [moduleStats, statusStats, total] = await Promise.all([
        AuditLog.aggregate([
          { $match: match },
          { $group: { _id: '$module', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        AuditLog.aggregate([
          { $match: match },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        AuditLog.countDocuments(match),
      ]);

      return res.json({
        success: true,
        data: {
          totalEvents: total,
          byModule: moduleStats.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
          byStatus: statusStats.reduce((acc, curr) => ({ ...acc, [curr._id || 'SUCCESS']: curr.count }), {}),
        },
      });
    }

    // Fallback
    res.json({
      success: true,
      data: {
        totalEvents: inMemoryAuditLogs.length,
        byModule: {},
        byStatus: { SUCCESS: inMemoryAuditLogs.length },
      },
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/audit-logs/export/csv - Server-side CSV streaming export
router.get('/export/csv', async (req, res) => {
  try {
    const { module, companyId, action, status, search, startDate, endDate } = req.query;
    const query = {};
    if (module && module !== 'ALL') query.module = module.toUpperCase();
    if (companyId && companyId !== 'ALL') query.companyId = companyId;
    if (action) query.action = action;
    if (status && status !== 'ALL') query.status = status.toUpperCase();
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { performedBy: { $regex: search, $options: 'i' } },
        { 'details.name': { $regex: search, $options: 'i' } },
      ];
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.csv"`);
    res.write('Timestamp,Module,Action,PerformedBy,CompanyID,Status,IPAddress,Details\n');

    if (getIsConnected()) {
      const cursor = AuditLog.find(query).sort({ createdAt: -1 }).cursor();
      for await (const doc of cursor) {
        const detailsStr = JSON.stringify(doc.details || {}).replace(/"/g, '""');
        res.write(`"${doc.createdAt.toISOString()}","${doc.module}","${doc.action}","${doc.performedBy || ''}","${doc.companyId || ''}","${doc.status || 'SUCCESS'}","${doc.ipAddress || ''}","${detailsStr}"\n`);
      }
      return res.end();
    }

    // Fallback
    inMemoryAuditLogs.forEach((doc) => {
      const detailsStr = JSON.stringify(doc.details || {}).replace(/"/g, '""');
      res.write(`"${(doc.createdAt || new Date()).toISOString()}","${doc.module}","${doc.action}","${doc.performedBy || ''}","${doc.companyId || ''}","${doc.status || 'SUCCESS'}","${doc.ipAddress || ''}","${detailsStr}"\n`);
    });
    res.end();
  } catch (err) {
    console.error('CSV export error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/audit-logs/export/json - Server-side full JSON export
router.get('/export/json', async (req, res) => {
  try {
    const { module, companyId, action, status, search, startDate, endDate } = req.query;
    const query = {};
    if (module && module !== 'ALL') query.module = module.toUpperCase();
    if (companyId && companyId !== 'ALL') query.companyId = companyId;
    if (action) query.action = action;
    if (status && status !== 'ALL') query.status = status.toUpperCase();
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { performedBy: { $regex: search, $options: 'i' } },
        { 'details.name': { $regex: search, $options: 'i' } },
      ];
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.json"`);

    if (getIsConnected()) {
      const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(10000).lean();
      return res.send(JSON.stringify(logs, null, 2));
    }

    res.send(JSON.stringify(inMemoryAuditLogs, null, 2));
  } catch (err) {
    console.error('JSON export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/audit-logs/:id - Retrieve single audit log by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsConnected()) {
      let log = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        log = await AuditLog.findById(id);
      }
      if (!log) {
        log = await AuditLog.findOne({ entityId: id });
      }

      if (!log) {
        return res.status(404).json({ success: false, message: 'Audit log not found' });
      }

      return res.json({ success: true, data: log });
    }

    const fallback = inMemoryAuditLogs.find((l) => l.entityId === id);
    if (!fallback) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    res.json({ success: true, data: fallback });
  } catch (error) {
    console.error('Error fetching audit log by id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/audit-logs - Multi-Filter Query Engine with Pagination
router.get('/', async (req, res) => {
  try {
    const {
      module,
      companyId,
      action,
      entityId,
      actorId,
      performedBy,
      status,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page) || 1);
    // Limit boundary: max 100 per page to protect memory
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};

    if (module) query.module = module.toUpperCase();
    if (companyId) query.companyId = companyId;
    if (action) query.action = action;
    if (entityId) query.entityId = entityId;
    if (actorId) query.actorId = actorId;
    if (performedBy) query.performedBy = { $regex: performedBy, $options: 'i' };
    if (status) query.status = status.toUpperCase();

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { performedBy: { $regex: search, $options: 'i' } },
        { 'details.name': { $regex: search, $options: 'i' } },
        { 'details.code': { $regex: search, $options: 'i' } },
      ];
    }

    if (getIsConnected()) {
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit)
          .lean(),
        AuditLog.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / parsedLimit);

      return res.json({
        success: true,
        data: logs,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages,
          hasNextPage: parsedPage < totalPages,
          hasPrevPage: parsedPage > 1,
        },
      });
    }

    // Fallback to in-memory buffered logs
    let filtered = [...inMemoryAuditLogs];
    if (module) filtered = filtered.filter((l) => l.module === module.toUpperCase());
    if (companyId) filtered = filtered.filter((l) => l.companyId === companyId);
    if (action) filtered = filtered.filter((l) => l.action === action);
    if (entityId) filtered = filtered.filter((l) => l.entityId === entityId);
    if (status) filtered = filtered.filter((l) => l.status === status.toUpperCase());

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + parsedLimit);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error('Error querying audit logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
