const express = require('express');
const prisma = require('../db');
const { logAuditEvent, computeDiff } = require('../services/auditLogger');
const { dispatchOpsSync } = require('../services/opsSyncClient');

const router = express.Router();
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

// Real-time SSE Clients connection pool
const sseClients = new Set();

function broadcastParameterChange(companyId, eventData) {
  const payload = `data: ${JSON.stringify({ company_id: companyId, ...eventData, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    if (!client.companyId || client.companyId === 'all' || client.companyId === companyId) {
      try {
        client.res.write(payload);
      } catch (_err) {
        sseClients.delete(client);
      }
    }
  }
}

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
// Real-time SSE Stream Endpoint (MUST BE BEFORE :companyId)
// ---------------------------------------------------------
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  const client = { res, companyId: req.query.companyId || 'all' };
  sseClients.add(client);

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(client);
  });
});

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
    console.warn('⚠️ [Seed Parameters] PostgreSQL offline. Returning resilient fallback seed parameters:', error.message);
    const fallbackSeedParams = [
      { id: 'sp_1', companyId: SEED_COMPANY_ID, key: 'APP_TIMEZONE', value: 'Asia/Kolkata', description: 'Default system timezone for shift logging', type: 'STRING' },
      { id: 'sp_2', companyId: SEED_COMPANY_ID, key: 'CURRENCY_CODE', value: 'INR', description: 'Default system accounting currency', type: 'STRING' },
      { id: 'sp_3', companyId: SEED_COMPANY_ID, key: 'ROUNDING_MODE', value: 'HALF_UP', description: 'Default rounding strategy for ledger entries', type: 'STRING' },
      { id: 'sp_4', companyId: SEED_COMPANY_ID, key: 'TALLY_AUTO_SYNC', value: 'false', description: 'Default Tally Prime automated sync toggle', type: 'BOOLEAN' },
    ];
    res.json({ success: true, data: fallbackSeedParams });
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
    console.warn('⚠️ [Parameters] PostgreSQL offline. Returning resilient fallback parameter store:', error.message);
    const fallbackParams = [
      { id: 'p_fb_1', companyId: req.params.companyId, key: 'APP_TIMEZONE', value: 'Asia/Kolkata', description: 'Factory Operational Timezone', type: 'STRING', isInherited: true, isOverridden: false, defaultValue: 'Asia/Kolkata' },
      { id: 'p_fb_2', companyId: req.params.companyId, key: 'CURRENCY_CODE', value: 'INR', description: 'Base Accounting Currency', type: 'STRING', isInherited: true, isOverridden: false, defaultValue: 'INR' },
      { id: 'p_fb_3', companyId: req.params.companyId, key: 'ROUNDING_MODE', value: 'HALF_UP', description: 'Financial calculation rounding policy', type: 'STRING', isInherited: true, isOverridden: false, defaultValue: 'HALF_UP' },
      { id: 'p_fb_4', companyId: req.params.companyId, key: 'TALLY_AUTO_SYNC', value: 'true', description: 'Auto-sync vouchers to Tally Prime', type: 'BOOLEAN', isInherited: false, isOverridden: true, defaultValue: 'false' },
      { id: 'p_fb_5', companyId: req.params.companyId, key: 'MAX_OPERATORS_PER_SHIFT', value: '40', description: 'Shift capacity limit for floor operators', type: 'NUMBER', isInherited: false, isOverridden: false, defaultValue: '40' },
    ];
    res.json({ success: true, data: fallbackParams });
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

    // 🚀 SYNC TO ETMS
    dispatchOpsSync('parameters', {
      company_id: companyId,
      settings: { [cleanKey]: strVal },
      parameters: { [cleanKey]: strVal },
    }).catch((err) => console.error('Sync parameters failed:', err));

    if (cleanKey.startsWith('feature_') || cleanKey.endsWith('_enabled')) {
      const boolVal = strVal === 'true' || strVal === '1' || strVal === true;
      dispatchOpsSync('feature_flags', {
        company_id: companyId,
        flagKey: cleanKey,
        enabled: boolVal,
      }).catch((err) => console.error('Sync feature flag failed:', err));
    }

    // 📡 Direct SSE Broadcast
    broadcastParameterChange(companyId, {
      type: 'PARAMETER_UPDATED',
      key: cleanKey,
      value: strVal,
      enabled: strVal === 'true' || strVal === '1' || strVal === true,
    });


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

    // 🚀 SYNC REVERSION TO ETMS
    if (seedDefault) {
      dispatchOpsSync('parameters', { company_id: companyId, settings: { [cleanKey]: seedDefault.value } })
        .catch((err) => console.error('Sync failed:', err));
    }

    // 📡 Direct SSE Broadcast
    broadcastParameterChange(companyId, {
      type: 'PARAMETER_UPDATED',
      key: cleanKey,
      value: seedDefault ? seedDefault.value : null,
      enabled: seedDefault?.value === 'true' || seedDefault?.value === '1',
    });


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

// ---------------------------------------------------------
// ETMS Feature Flags API
// ---------------------------------------------------------

const DEFAULT_ETMS_FEATURE_FLAGS = {
  feature_broadcasting_alerts: { default: 'true', desc: 'Enable/Disable Broadcasting & Multilingual Alerts in ETMS' },
  feature_kyc_onboarding: { default: 'true', desc: 'Enable/Disable KYC Verification & Indic Document OCR in ETMS' },
  feature_command_palette: { default: 'true', desc: 'Enable/Disable Global Command Palette (Ctrl+K) & Voice Navigation in ETMS' },
  feature_audit_log_viewer: { default: 'true', desc: 'Enable/Disable In-App Tenant Audit Log Viewer in ETMS' },
  feature_speech_data_entry: { default: 'true', desc: 'Enable/Disable Speech-to-Form Automated Data Entry in ETMS' },
  feature_shift_production: { default: 'true', desc: 'Enable/Disable Daily Shift Logs & Production Counters in ETMS' },
  feature_machines: { default: 'true', desc: 'Enable/Disable Machine Master & RPM Monitoring in ETMS' },
  feature_karigars: { default: 'true', desc: 'Enable/Disable Karigar Master, Piece-rates & Operator Directory in ETMS' },
  feature_inward_challans: { default: 'true', desc: 'Enable/Disable Raw Fabric Inward Challans & Lots in ETMS' },
  feature_parties: { default: 'true', desc: 'Enable/Disable Parties & Traders Directory in ETMS' },
  feature_outward_invoices: { default: 'true', desc: 'Enable/Disable SAC 9988 Tax Invoices & Job Work Billing in ETMS' },
  feature_purchases: { default: 'true', desc: 'Enable/Disable Store & Raw Material Purchases in ETMS' },
  feature_expenses: { default: 'true', desc: 'Enable/Disable Factory Expenses & Vouchers in ETMS' },
  feature_reports: { default: 'true', desc: 'Enable/Disable Analytics & Financial Reports in ETMS' },
  feature_uchapat_advance: { default: 'true', desc: 'Enable/Disable Karigar Uchapat Advances & Loans in ETMS' },
  feature_wage_hisab: { default: 'true', desc: 'Enable/Disable Karigar Wage Calculations & Payout Slips in ETMS' },
  feature_tally_export: { default: 'true', desc: 'Enable/Disable Tally XML Export & Sync in ETMS' },
  feature_munim_portal: { default: 'true', desc: 'Enable/Disable External CA/Munim Portal & Export in ETMS' },
  feature_whatsapp_dispatch: { default: 'true', desc: 'Enable/Disable Automated WhatsApp Delivery in ETMS' },
};

// GET /api/companies/:companyId/feature-flags - Resolve all active feature flags for a company
router.get('/:companyId/feature-flags', async (req, res) => {
  try {
    const { companyId } = req.params;

    // Fetch company-specific parameter overrides
    const companyParams = await prisma.parameter.findMany({
      where: {
        companyId,
        key: { startsWith: 'feature_' },
      },
    });

    // Fetch seed defaults
    const seedParams = await prisma.parameter.findMany({
      where: {
        companyId: SEED_COMPANY_ID,
        key: { startsWith: 'feature_' },
      },
    });

    const flags = {};
    // 1. Set predefined defaults
    Object.keys(DEFAULT_ETMS_FEATURE_FLAGS).forEach((key) => {
      const clean = key.replace(/^feature_/, '');
      const def = DEFAULT_ETMS_FEATURE_FLAGS[key].default === 'true';
      flags[key] = def;
      flags[clean] = def;
    });

    // 2. Apply seed DB values
    seedParams.forEach((sp) => {
      const clean = sp.key.replace(/^feature_/, '');
      const val = sp.value === 'true' || sp.value === '1';
      flags[sp.key] = val;
      flags[clean] = val;
    });

    // 3. Apply company specific overrides
    companyParams.forEach((cp) => {
      const clean = cp.key.replace(/^feature_/, '');
      const val = cp.value === 'true' || cp.value === '1';
      flags[cp.key] = val;
      flags[clean] = val;
    });

    res.json({
      success: true,
      companyId,
      data: flags,
      metadata: DEFAULT_ETMS_FEATURE_FLAGS,
    });
  } catch (error) {
    console.warn('⚠️ [Feature Flags] PostgreSQL offline. Returning resilient fallback flags:', error.message);
    const flags = {};
    Object.keys(DEFAULT_ETMS_FEATURE_FLAGS).forEach((key) => {
      const clean = key.replace(/^feature_/, '');
      const def = DEFAULT_ETMS_FEATURE_FLAGS[key].default === 'true';
      flags[key] = def;
      flags[clean] = def;
    });
    res.json({
      success: true,
      companyId: req.params.companyId,
      data: flags,
      metadata: DEFAULT_ETMS_FEATURE_FLAGS,
    });
  }
});

// POST /api/companies/:companyId/feature-flags/:flagKey/toggle - Toggle feature flag for a company
router.post('/:companyId/feature-flags/:flagKey/toggle', async (req, res) => {
  try {
    const { companyId, flagKey } = req.params;
    const { enabled } = req.body;

    const cleanKey = flagKey.trim();
    if (!cleanKey.startsWith('feature_')) {
      return res.status(400).json({ success: false, message: 'Invalid feature flag key format. Must start with feature_' });
    }

    // Determine current value
    const existing = await prisma.parameter.findUnique({
      where: { companyId_key: { companyId, key: cleanKey } },
    });

    let targetValue = 'true';
    if (enabled !== undefined) {
      targetValue = enabled ? 'true' : 'false';
    } else if (existing) {
      targetValue = existing.value === 'true' ? 'false' : 'true';
    } else {
      // If none in DB, toggle against default
      const defaultVal = DEFAULT_ETMS_FEATURE_FLAGS[cleanKey]?.default || 'true';
      targetValue = defaultVal === 'true' ? 'false' : 'true';
    }

    const updated = await prisma.parameter.upsert({
      where: { companyId_key: { companyId, key: cleanKey } },
      update: { value: targetValue },
      create: {
        companyId,
        key: cleanKey,
        value: targetValue,
        description: DEFAULT_ETMS_FEATURE_FLAGS[cleanKey]?.desc || 'Feature flag toggle',
      },
    });

    // Log audit event
    await logAuditEvent({
      module: 'FEATURE_FLAGS',
      action: 'TOGGLE_FEATURE_FLAG',
      entityId: updated.id,
      companyId,
      details: {
        flagKey: cleanKey,
        previousValue: existing ? existing.value : 'DEFAULT',
        newValue: targetValue,
        enabled: targetValue === 'true',
      },
    });

    // Sync to ETMS (both feature_flags and parameters)
    dispatchOpsSync('feature_flags', {
      company_id: companyId,
      flagKey: cleanKey,
      enabled: targetValue === 'true',
    }).catch((err) => console.error('Sync feature_flags failed:', err));

    dispatchOpsSync('parameters', {
      company_id: companyId,
      settings: { [cleanKey]: targetValue },
      parameters: { [cleanKey]: targetValue },
    }).catch((err) => console.error('Sync parameters failed:', err));

    // 📡 Direct SSE Broadcast
    broadcastParameterChange(companyId, {
      type: 'FEATURE_FLAG_UPDATED',
      key: cleanKey,
      enabled: targetValue === 'true',
      value: targetValue,
    });


    res.json({
      success: true,
      message: `Feature flag '${cleanKey}' set to ${targetValue === 'true' ? 'ENABLED' : 'DISABLED'}.`,
      data: {
        flagKey: cleanKey,
        enabled: targetValue === 'true',
        value: targetValue,
      },
    });
  } catch (error) {
    console.error('Error toggling feature flag:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
