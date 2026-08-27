const express = require('express');
const prisma = require('../db');
const { logAuditEvent, computeDiff } = require('../services/auditLogger');
const { dispatchOpsSync } = require('../services/opsSyncClient');

const router = express.Router();
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

// Infer and format parameter value type
function inferValueType(val) {
  if (typeof val === 'boolean' || val === 'true' || val === 'false') return 'BOOLEAN';
  if (typeof val === 'number' || (!isNaN(Number(val)) && !isNaN(parseFloat(val)))) return 'NUMBER';
  if (typeof val === 'object' && val !== null) return 'JSON';
  if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
    try {
      JSON.parse(val);
      return 'JSON';
    } catch {
      return 'STRING';
    }
  }
  return 'STRING';
}

function stringifyValue(val) {
  if (typeof val === 'object' && val !== null) return JSON.stringify(val);
  return String(val);
}

// ---------------------------------------------------------
// Global Seed Parameter Routes (MUST BE BEFORE :companyId)
// ---------------------------------------------------------

// GET /api/seed/parameters or /api/companies/seed/parameters
router.get('/seed/parameters', async (req, res) => {
  try {
    const seedParams = await prisma.parameter.findMany({
      where: { companyId: SEED_COMPANY_ID },
      orderBy: { key: 'asc' },
    });

    const formatted = seedParams.map((p) => ({
      ...p,
      type: inferValueType(p.value),
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching seed parameters:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/seed/parameters
router.post('/seed/parameters', async (req, res) => {
  try {
    const { key, value, description } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ success: false, message: 'Key and Value are required' });
    }

    const cleanKey = key.trim();
    const strVal = stringifyValue(value);

    const param = await prisma.parameter.upsert({
      where: {
        companyId_key: {
          companyId: SEED_COMPANY_ID,
          key: cleanKey,
        },
      },
      update: {
        value: strVal,
        description: description !== undefined ? description : undefined,
      },
      create: {
        companyId: SEED_COMPANY_ID,
        key: cleanKey,
        value: strVal,
        description: description || null,
      },
    });

    // ?? LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'SEED',
      action: 'ADD_SEED_PARAMETER',
      entityId: param.id,
      companyId: SEED_COMPANY_ID,
      details: { key: param.key, value: param.value, type: inferValueType(param.value) },
    });

    res.status(201).json({
      success: true,
      message: 'Master default parameter configured on SEED Company (000 UUID).',
      data: {
        ...param,
        type: inferValueType(param.value),
      },
    });
  } catch (error) {
    console.error('Error configuring seed parameter:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------
// Company Parameter Store Routes
// ---------------------------------------------------------

// GET /api/companies/:companyId/parameters - Get all effective parameters for a company (with Seed fallback inheritance)
router.get('/:companyId/parameters', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Verify company exists
    if (companyId !== SEED_COMPANY_ID) {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found.' });
      }
    }

    // Fetch company specific overrides
    const companyParams = await prisma.parameter.findMany({
      where: { companyId },
      orderBy: { key: 'asc' },
    });

    // Fetch seed master parameters for inheritance fallback
    const seedParams = await prisma.parameter.findMany({
      where: { companyId: SEED_COMPANY_ID },
      orderBy: { key: 'asc' },
    });

    const paramMap = new Map();
    // 1. Seed defaults
    seedParams.forEach((sp) => {
      paramMap.set(sp.key, {
        id: sp.id,
        companyId,
        key: sp.key,
        value: sp.value,
        description: sp.description,
        type: inferValueType(sp.value),
        isInherited: companyId !== SEED_COMPANY_ID,
        isOverridden: false,
        defaultValue: sp.value,
        createdAt: sp.createdAt,
        updatedAt: sp.updatedAt,
      });
    });

    // 2. Company custom overrides
    companyParams.forEach((cp) => {
      const seedDefault = seedParams.find((sp) => sp.key === cp.key);
      paramMap.set(cp.key, {
        id: cp.id,
        companyId,
        key: cp.key,
        value: cp.value,
        description: cp.description || (seedDefault ? seedDefault.description : null),
        type: inferValueType(cp.value),
        isInherited: false,
        isOverridden: companyId !== SEED_COMPANY_ID,
        defaultValue: seedDefault ? seedDefault.value : null,
        createdAt: cp.createdAt,
        updatedAt: cp.updatedAt,
      });
    });

    const mergedParameters = Array.from(paramMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    res.json({ success: true, data: mergedParameters });
  } catch (error) {
    console.error('Error fetching company parameters:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/companies/:companyId/parameters/:key - Get single effective parameter
router.get('/:companyId/parameters/:key', async (req, res) => {
  try {
    const { companyId, key } = req.params;

    const companyParam = await prisma.parameter.findUnique({
      where: { companyId_key: { companyId, key } },
    });

    if (companyParam) {
      const seedParam = await prisma.parameter.findUnique({
        where: { companyId_key: { companyId: SEED_COMPANY_ID, key } },
      });
      return res.json({
        success: true,
        data: {
          ...companyParam,
          type: inferValueType(companyParam.value),
          isInherited: false,
          isOverridden: companyId !== SEED_COMPANY_ID,
          defaultValue: seedParam ? seedParam.value : null,
        },
      });
    }

    // Fallback to seed default
    const seedParam = await prisma.parameter.findUnique({
      where: { companyId_key: { companyId: SEED_COMPANY_ID, key } },
    });

    if (!seedParam) {
      return res.status(404).json({ success: false, message: `Parameter '${key}' not found.` });
    }

    res.json({
      success: true,
      data: {
        id: seedParam.id,
        companyId,
        key: seedParam.key,
        value: seedParam.value,
        description: seedParam.description,
        type: inferValueType(seedParam.value),
        isInherited: true,
        isOverridden: false,
        defaultValue: seedParam.value,
      },
    });
  } catch (error) {
    console.error('Error fetching single parameter:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/companies/:companyId/parameters/:key - Set or update parameter override
router.put('/:companyId/parameters/:key', async (req, res) => {
  try {
    const { companyId, key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'Parameter value is required.' });
    }

    // Verify company exists
    if (companyId !== SEED_COMPANY_ID) {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        return res.status(404).json({ success: false, message: 'Company not found.' });
      }
    }

    const cleanKey = key.trim();
    const strVal = stringifyValue(value);

    const existingParam = await prisma.parameter.findUnique({
      where: { companyId_key: { companyId, key: cleanKey } },
    });

    const updated = await prisma.parameter.upsert({
      where: {
        companyId_key: { companyId, key: cleanKey },
      },
      update: {
        value: strVal,
        description: description !== undefined ? description : undefined,
      },
      create: {
        companyId,
        key: cleanKey,
        value: strVal,
        description: description || null,
      },
    });

    const diff = computeDiff(
      { [cleanKey]: existingParam ? existingParam.value : null },
      { [cleanKey]: updated.value }
    );

    // ?? LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'PARAMETER',
      action: 'UPDATE_PARAMETER',
      entityId: updated.id,
      companyId: updated.companyId,
      details: {
        key: updated.key,
        oldValue: existingParam ? existingParam.value : null,
        newValue: updated.value,
        type: inferValueType(updated.value),
      },
      diff,
    });

    // ?? SYNC TO ETMS
    dispatchOpsSync('parameters', { company_id: companyId, settings: { [cleanKey]: strVal } })
      .catch((err) => console.error('Sync failed:', err));

    res.json({
      success: true,
      message: `Parameter '${cleanKey}' updated successfully.`,
      data: {
        ...updated,
        type: inferValueType(updated.value),
        isOverridden: companyId !== SEED_COMPANY_ID,
      },
    });
  } catch (error) {
    console.error('Error updating parameter:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/companies/:companyId/parameters/:key - Remove parameter override (reverting to master seed default)
router.delete('/:companyId/parameters/:key', async (req, res) => {
  try {
    const { companyId, key } = req.params;
    const cleanKey = key.trim();

    if (companyId === SEED_COMPANY_ID) {
      return res.status(400).json({
        success: false,
        message: 'Master Seed Company (000 UUID) default parameters cannot be deleted.',
      });
    }

    const existing = await prisma.parameter.findUnique({
      where: { companyId_key: { companyId, key: cleanKey } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'No custom override found for this key.' });
    }

    await prisma.parameter.delete({
      where: { companyId_key: { companyId, key: cleanKey } },
    });

    // Fetch seed default for response context
    const seedDefault = await prisma.parameter.findUnique({
      where: { companyId_key: { companyId: SEED_COMPANY_ID, key: cleanKey } },
    });

    // ?? LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'PARAMETER',
      action: 'DELETE_PARAMETER_OVERRIDE',
      entityId: existing.id,
      companyId,
      details: { key: cleanKey, deletedOverrideValue: existing.value, revertedToSeedDefault: seedDefault ? seedDefault.value : null },
    });

    // ?? SYNC REVERSION TO ETMS
    if (seedDefault) {
      dispatchOpsSync('parameters', { company_id: companyId, settings: { [cleanKey]: seedDefault.value } })
        .catch((err) => console.error('Sync failed:', err));
    }

    res.json({
      success: true,
      message: `Parameter override '${cleanKey}' removed. Reverted to master seed default.`,
      revertedToDefault: seedDefault ? seedDefault.value : null,
    });
  } catch (error) {
    console.error('Error deleting parameter override:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
