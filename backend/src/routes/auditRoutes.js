const express = require('express');
const { getAuditLogs } = require('../services/auditLogger');

const router = express.Router();

// GET /api/audit-logs - Query MongoDB audit logs with multi-filter support
router.get('/', async (req, res) => {
  try {
    const { module, companyId, action, entityId, performedBy, startDate, endDate } = req.query;
    const logs = await getAuditLogs({ module, companyId, action, entityId, performedBy, startDate, endDate });

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
