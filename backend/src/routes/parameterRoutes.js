const express = require('express');
const prisma = require('../db');
const { logAuditEvent } = require('../services/auditLogger');

const router = express.Router();

const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/companies/:companyId/parameters - Get all parameters for a company (with Seed fallback inheritance)
router.get('/:companyId/parameters', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Fetch company specific parameters
    const companyParams = await prisma.parameter.findMany({
      where: { companyId },
      orderBy: { key: 'asc' },
    });

    if (companyId === SEED_COMPANY_ID) {
      return res.json({ success: true, data: companyParams });
    }

    // Fetch seed master parameters for inheritance fallback
    const seedParams = await prisma.parameter.findMany({
      where: { companyId: SEED_COMPANY_ID },
      orderBy: { key: 'asc' },
    });

    const paramMap = new Map();
    // 1. Set default seed parameters
    seedParams.forEach((sp) => {
      paramMap.set(sp.key, { ...sp, isInherited: true, companyId });
    });

    // 2. Override with company specific parameters
    companyParams.forEach((cp) => {
      paramMap.set(cp.key, { ...cp, isInherited: false });
    });

    const mergedParameters = Array.from(paramMap.values());

    res.json({ success: true, data: mergedParameters });
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

// DELETE /api/companies/:companyId/parameters/:key - Delete parameter override (revert to seed inheritance)
router.delete('/:companyId/parameters/:key', async (req, res) => {
  try {
    const { companyId, key } = req.params;

    if (companyId === SEED_COMPANY_ID) {
      return res.status(400).json({ success: false, message: 'Master Seed parameters cannot be deleted.' });
    }

    const existing = await prisma.parameter.findUnique({
      where: { companyId_key: { companyId, key } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'No custom override found for this key.' });
    }

    await prisma.parameter.delete({
      where: { companyId_key: { companyId, key } },
    });

    await logAuditEvent({
      module: 'PARAMETER',
      action: 'DELETE_PARAMETER_OVERRIDE',
      entityId: existing.id,
      companyId,
      details: { key, deletedOverrideValue: existing.value },
    });

    res.json({ success: true, message: `Parameter override '${key}' removed. Reverted to master seed default.` });
  } catch (error) {
    console.error('Error deleting parameter override:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
