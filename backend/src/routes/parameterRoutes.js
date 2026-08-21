const express = require('express');
const prisma = require('../db');
const { logAuditEvent } = require('../services/auditLogger');

const router = express.Router();

// GET /api/companies/:companyId/parameters - Get all parameters for a company
router.get('/:companyId/parameters', async (req, res) => {
  try {
    const { companyId } = req.params;
    const parameters = await prisma.parameter.findMany({
      where: { companyId },
      orderBy: { key: 'asc' },
    });

    res.json({ success: true, data: parameters });
  } catch (error) {
    console.error('Error fetching parameters:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/companies/:companyId/parameters/:key - Update a parameter value
router.put('/:companyId/parameters/:key', async (req, res) => {
  try {
    const { companyId, key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'Parameter value is required' });
    }

    const existingParam = await prisma.parameter.findUnique({
      where: { companyId_key: { companyId, key } },
    });

    const updated = await prisma.parameter.upsert({
      where: {
        companyId_key: { companyId, key },
      },
      update: {
        value: String(value),
        description: description !== undefined ? description : undefined,
      },
      create: {
        companyId,
        key,
        value: String(value),
        description: description || null,
      },
    });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'PARAMETER',
      action: 'UPDATE_PARAMETER',
      entityId: updated.id,
      companyId: updated.companyId,
      details: {
        key: updated.key,
        oldValue: existingParam ? existingParam.value : null,
        newValue: updated.value,
      },
    });

    res.json({ success: true, message: `Parameter '${key}' updated successfully.`, data: updated });
  } catch (error) {
    console.error('Error updating parameter:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
