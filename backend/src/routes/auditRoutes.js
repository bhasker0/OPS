const express = require('express');
const { getAuditLogs } = require('../services/auditLogger');

const router = express.Router();

// GET /api/audit-logs - Query MongoDB audit logs
router.get('/', async (req, res) => {
  try {
    const { module, companyId } = req.query;
    const logs = await getAuditLogs({ module, companyId });

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
