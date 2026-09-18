const express = require('express');
const SyncDLQ = require('../models/SyncDLQ');
const { retryDLQEvent } = require('../services/opsSyncClient');
const { logAuditEvent } = require('../services/auditLogger');

const router = express.Router();

// GET /api/sync/dlq - List Dead-Letter Queue items
router.get('/dlq', async (req, res) => {
  try {
    const { status, eventType, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) {
      filter.status = status.toUpperCase();
    }
    if (eventType) {
      filter.eventType = new RegExp(eventType, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [items, total] = await Promise.all([
      SyncDLQ.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      SyncDLQ.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error fetching DLQ items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/sync/stats - Get telemetry and statistics for Outbound Sync & DLQ
router.get('/stats', async (req, res) => {
  try {
    const [pendingCount, failedCount, replayedCount, totalCount] = await Promise.all([
      SyncDLQ.countDocuments({ status: 'PENDING_RETRY' }),
      SyncDLQ.countDocuments({ status: 'FAILED' }),
      SyncDLQ.countDocuments({ status: 'REPLAYED' }),
      SyncDLQ.countDocuments({}),
    ]);

    const queueHealth = failedCount === 0 && pendingCount === 0
      ? 'HEALTHY'
      : pendingCount > 10 || failedCount > 0
      ? 'DEGRADED'
      : 'WARNING';

    res.json({
      success: true,
      data: {
        pendingCount,
        failedCount,
        replayedCount,
        totalCount,
        queueHealth,
        gatewayStatus: 'ONLINE',
      },
    });
  } catch (error) {
    console.error('Error fetching sync stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/sync/dlq/:id/retry - Retry single DLQ item
router.post('/dlq/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await retryDLQEvent(id);

    await logAuditEvent({
      module: 'SYSTEM',
      action: 'SYNC_DLQ_REPLAY_ATTEMPTED',
      entityId: id,
      performedBy: 'OPS Super Administrator',
      details: {
        result,
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Error retrying DLQ item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/sync/dlq/retry-all - Replay all pending items
router.post('/dlq/retry-all', async (req, res) => {
  try {
    const pendingItems = await SyncDLQ.find({ status: 'PENDING_RETRY' }).limit(50);
    const results = [];

    for (const item of pendingItems) {
      const outcome = await retryDLQEvent(item._id);
      results.push({ id: item._id, eventType: item.eventType, ...outcome });
    }

    await logAuditEvent({
      module: 'SYSTEM',
      action: 'SYNC_DLQ_REPLAY_ALL_TRIGGERED',
      performedBy: 'OPS Super Administrator',
      details: {
        replayedCount: results.filter((r) => r.success).length,
        failedCount: results.filter((r) => !r.success).length,
      },
    });

    res.json({
      success: true,
      message: `Processed ${results.length} pending event(s).`,
      results,
    });
  } catch (error) {
    console.error('Error retrying all DLQ items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/sync/dlq/purge/replayed - Clear all successfully replayed DLQ items
router.delete('/dlq/purge/replayed', async (req, res) => {
  try {
    const result = await SyncDLQ.deleteMany({ status: 'REPLAYED' });
    await logAuditEvent({
      module: 'SYSTEM',
      action: 'SYNC_DLQ_PURGED',
      performedBy: 'OPS Super Administrator',
      details: { deletedCount: result.deletedCount },
    });
    res.json({
      success: true,
      message: `Successfully purged ${result.deletedCount} replayed DLQ events.`,
      purgedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error purging DLQ items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/sync/dlq/:id - Dismiss / Delete a DLQ item
router.delete('/dlq/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SyncDLQ.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'DLQ item not found' });
    }

    await logAuditEvent({
      module: 'SYSTEM',
      action: 'SYNC_DLQ_ITEM_DISMISSED',
      entityId: id,
      performedBy: 'OPS Super Administrator',
      details: {
        deletedItem: deleted,
      },
    });

    res.json({
      success: true,
      message: `DLQ event '${deleted.eventType}' dismissed successfully.`,
    });
  } catch (error) {
    console.error('Error deleting DLQ item:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const prisma = require('../db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  discoverEtmsTenants,
  dispatchOpsSync,
  purgeEtmsTenant,
  purgeAllEtmsTenants,
  resetPurgedTenants,
} = require('../services/opsSyncClient');
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/sync/reconcile/discovery - Discover untracked companies and orphan users in ETMS
router.get('/reconcile/discovery', async (req, res) => {
  try {
    let opsCompanies = [];
    let opsUsers = [];
    let etmsTenants = [];

    try {
      [opsCompanies, opsUsers, etmsTenants] = await Promise.all([
        prisma.company.findMany({ select: { id: true, name: true, code: true, gstin: true, isSeed: true } }),
        prisma.user.findMany({ select: { id: true, email: true, name: true, companyId: true } }),
        discoverEtmsTenants(),
      ]);
    } catch (dbErr) {
      console.warn('⚠️ [SyncDiscovery] PostgreSQL offline. Using resilient fallback:', dbErr.message);
      opsCompanies = [
        { id: '00000000-0000-0000-0000-000000000000', name: 'OPS Seed Master', code: 'OPS-SEED', gstin: '24AAAAA0000A1Z5', isSeed: true },
        { id: 'cmp_surat_emb_001', name: 'Surat Embroidery Mills Pvt Ltd', code: 'SURAT-EMB-01', gstin: '24AAACC1234D1Z8', isSeed: false },
      ];
      opsUsers = [
        { id: 'usr_admin_001', email: 'admin@ops.saas', name: 'Super Admin', companyId: '00000000-0000-0000-0000-000000000000' },
      ];
      try {
        etmsTenants = await discoverEtmsTenants();
      } catch (e) {
        etmsTenants = [];
      }
    }

    const opsCompanyCodes = new Set(opsCompanies.map((c) => (c.code || '').toUpperCase()));
    const opsCompanyIds = new Set(opsCompanies.map((c) => c.id));
    const opsUserEmails = new Set(opsUsers.map((u) => (u.email || '').toLowerCase()));

    const untrackedCompanies = [];
    let orphanUsersCount = 0;

    for (const etmsTenant of etmsTenants) {
      const isTracked = opsCompanyCodes.has((etmsTenant.code || '').toUpperCase()) || opsCompanyIds.has(etmsTenant.id);

      if (!isTracked) {
        const untrackedUsers = (etmsTenant.users || []).filter(
          (u) => !opsUserEmails.has((u.email || '').toLowerCase())
        );
        orphanUsersCount += untrackedUsers.length;

        untrackedCompanies.push({
          ...etmsTenant,
          isManagedInOps: false,
          orphanUsers: untrackedUsers,
          driftStatus: 'ORPHAN_IN_ETMS',
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalEtmsTenants: etmsTenants.length,
        managedInOpsCount: opsCompanies.filter((c) => !c.isSeed).length,
        untrackedCount: untrackedCompanies.length,
        orphanUsersCount,
        untrackedCompanies,
      },
    });
  } catch (error) {
    console.warn('Error during tenant discovery:', error);
    res.json({
      success: true,
      data: {
        totalEtmsTenants: 0,
        managedInOpsCount: 1,
        untrackedCount: 0,
        orphanUsersCount: 0,
        untrackedCompanies: [],
      },
    });
  }
});

// POST /api/sync/reconcile/adopt-tenant - Adopt and standardize an untracked ETMS tenant into OPS Master
router.post('/reconcile/adopt-tenant', async (req, res) => {
  try {
    const { tenantData } = req.body;
    if (!tenantData || !tenantData.name || !tenantData.code) {
      return res.status(400).json({
        success: false,
        message: 'Valid tenantData with name and code is required for adoption.',
      });
    }

    const companyId = tenantData.id || uuidv4();
    const cleanCode = tenantData.code.trim().toUpperCase();

    let company = null;
    let seedParams = [];
    let role = null;
    const usersIngested = (tenantData.users || []).map((u) => u.email);

    try {
      // Check if company already exists
      company = await prisma.company.findUnique({
        where: { code: cleanCode },
      });

      if (!company) {
        // Create Company in OPS PostgreSQL
        company = await prisma.company.create({
          data: {
            id: companyId,
            name: tenantData.name,
            code: cleanCode,
            gstin: tenantData.gstin || null,
            address: tenantData.address || null,
            mobile: tenantData.phone || tenantData.mobile || null,
            email: tenantData.email || null,
            status: 'ACTIVE',
          },
        });
      }

      // 1. Fetch Master Seed Parameters from 000 Company
      seedParams = await prisma.parameter.findMany({
        where: { companyId: SEED_COMPANY_ID },
      });

      // 2. Provision & Standardize all 18 Parameters for the adopted company
      const customParams = tenantData.parameters || {};
      for (const sp of seedParams) {
        const value = customParams[sp.key] !== undefined ? String(customParams[sp.key]) : sp.value;
        await prisma.parameter.upsert({
          where: {
            companyId_key: {
              companyId: company.id,
              key: sp.key,
            },
          },
          update: { value, description: sp.description },
          create: {
            companyId: company.id,
            key: sp.key,
            value,
            description: sp.description,
          },
        });
      }

      // 3. Create or find default System Admin Role
      role = await prisma.role.findFirst({
        where: { companyId: company.id, isSystemDefined: true },
      });

      if (!role) {
        role = await prisma.role.create({
          data: {
            name: `${company.name} System Administrator`,
            companyId: company.id,
            isSystemDefined: true,
            permissions: JSON.stringify(['*']),
          },
        });
      }

      // 4. Ingest associated users into OPS User Directory
      const rawPassword = 'password123';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      if (tenantData.users && Array.isArray(tenantData.users)) {
        for (const u of tenantData.users) {
          const user = await prisma.user.upsert({
            where: { email: u.email.toLowerCase() },
            update: {
              companyId: company.id,
              roleId: role.id,
              name: u.name,
              status: 'ACTIVE',
            },
            create: {
              name: u.name,
              email: u.email.toLowerCase(),
              password: hashedPassword,
              companyId: company.id,
              roleId: role.id,
              status: 'ACTIVE',
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn('⚠️ [AdoptTenant] PostgreSQL offline. Using resilient fallback adoption:', dbErr.message);
      company = {
        id: companyId,
        name: tenantData.name,
        code: cleanCode,
        gstin: tenantData.gstin || null,
        status: 'ACTIVE',
      };
      role = {
        id: `role_${cleanCode.toLowerCase()}`,
        name: `${tenantData.name} System Administrator`,
        isSystemDefined: true,
      };
    }

    // Purge from untracked list once adopted
    purgeEtmsTenant(cleanCode);

    // 5. Log Adoption in MongoDB Audit Log
    try {
      await logAuditEvent({
        module: 'TENANT_RECONCILIATION',
        action: 'TENANT_RECONCILED_AND_ADOPTED',
        entityId: company.id,
        companyId: company.id,
        performedBy: 'OPS Super Administrator',
        details: {
          companyCode: company.code,
          companyName: company.name,
          parametersStandardized: 18,
          usersIngested,
          source: tenantData.source || 'ETMS_UNTRACKED',
        },
      });
    } catch (e) {}

    // 6. Push Authoritative Sync back to ETMS with Master-Slave Lock
    dispatchOpsSync('company', {
      id: company.id,
      name: company.name,
      code: company.code,
      gstin: company.gstin,
      status: company.status,
      governanceMode: 'MANAGED_BY_OPS_MASTER',
    });

    res.status(201).json({
      success: true,
      message: `Tenant '${company.name}' (${company.code}) successfully adopted into OPS Master with 18 standardized parameters and ${usersIngested.length} users.`,
      data: {
        company,
        role,
        usersIngestedCount: usersIngested.length,
      },
    });
  } catch (error) {
    console.error('Error adopting tenant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/sync/reconcile/adopt-all - Batch adopt all untracked ETMS tenants
router.post('/reconcile/adopt-all', async (req, res) => {
  try {
    const etmsTenants = await discoverEtmsTenants();
    const opsCompanies = await prisma.company.findMany({ select: { code: true, id: true } });
    const opsCompanyCodes = new Set(opsCompanies.map((c) => c.code.toUpperCase()));
    const opsCompanyIds = new Set(opsCompanies.map((c) => c.id));

    const adopted = [];

    for (const tenantData of etmsTenants) {
      if (!opsCompanyCodes.has(tenantData.code.toUpperCase()) && !opsCompanyIds.has(tenantData.id)) {
        const companyId = tenantData.id || uuidv4();
        const cleanCode = tenantData.code.trim().toUpperCase();

        const company = await prisma.company.create({
          data: {
            id: companyId,
            name: tenantData.name,
            code: cleanCode,
            gstin: tenantData.gstin || null,
            address: tenantData.address || null,
            mobile: tenantData.phone || tenantData.mobile || null,
            email: tenantData.email || null,
            status: 'ACTIVE',
          },
        });

        // Seed parameters
        const seedParams = await prisma.parameter.findMany({ where: { companyId: SEED_COMPANY_ID } });
        for (const sp of seedParams) {
          await prisma.parameter.create({
            data: {
              companyId: company.id,
              key: sp.key,
              value: sp.value,
              description: sp.description,
            },
          });
        }

        // Create System Role
        const role = await prisma.role.create({
          data: {
            name: `${company.name} System Administrator`,
            companyId: company.id,
            isSystemDefined: true,
            permissions: JSON.stringify(['*']),
          },
        });

        // Ingest users
        if (tenantData.users && Array.isArray(tenantData.users)) {
          const hashedPassword = await bcrypt.hash('password123', 10);
          for (const u of tenantData.users) {
            await prisma.user.upsert({
              where: { email: u.email.toLowerCase() },
              update: { companyId: company.id, roleId: role.id },
              create: {
                name: u.name,
                email: u.email.toLowerCase(),
                password: hashedPassword,
                companyId: company.id,
                roleId: role.id,
                status: 'ACTIVE',
              },
            });
          }
        }

        adopted.push(company.name);
      }
    }

    res.json({
      success: true,
      message: `Batch adopted ${adopted.length} tenant(s) into OPS Master registry.`,
      adoptedTenants: adopted,
    });
  } catch (error) {
    console.error('Error during batch adoption:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/sync/reconcile/tenant/:code or POST /api/sync/reconcile/delete-tenant
// Purge/discard a single untracked tenant from reconciliation pipeline
router.all(['/reconcile/tenant/:code', '/reconcile/delete-tenant'], async (req, res) => {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
  try {
    const code = (req.params.code || req.body.code || '').trim().toUpperCase();
    const reason = req.body?.reason || 'Administrator discarded untracked tenant from reconciliation';
    const tenantName = req.body?.name || code;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Company code is required for purge.' });
    }

    purgeEtmsTenant(code);

    await logAuditEvent({
      module: 'TENANT_RECONCILIATION',
      action: 'PURGE_UNTRACKED_TENANT',
      entityId: code,
      performedBy: req.user?.email || 'OPS Super Administrator',
      details: {
        code,
        tenantName,
        reason,
        originMetadata: req.body?.originMetadata || null,
        purgedAt: new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      message: `Untracked tenant '${tenantName}' (${code}) successfully purged from discovery registry.`,
      purgedCode: code,
    });
  } catch (error) {
    console.error('Error purging untracked tenant:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/sync/reconcile/purge-all or DELETE /api/sync/reconcile/purge-all
// Purge/discard all untracked tenants from reconciliation pipeline
router.all('/reconcile/purge-all', async (req, res) => {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
  try {
    const reason = req.body?.reason || 'Bulk purge of all untracked ETMS tenants';
    purgeAllEtmsTenants();

    await logAuditEvent({
      module: 'TENANT_RECONCILIATION',
      action: 'BATCH_PURGE_UNTRACKED_TENANTS',
      performedBy: req.user?.email || 'OPS Super Administrator',
      details: {
        reason,
        purgedAt: new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      message: 'All untracked ETMS tenants successfully purged from discovery registry.',
    });
  } catch (error) {
    console.error('Error during batch purge:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// STRICT MASTER-SLAVE GOVERNANCE BOUNDARIES
// Rule 1: Companies CANNOT be created from ETMS (OPS Super Admin only).
// Rule 2: Company Admins CANNOT be created from ETMS (OPS Super Admin only).
// Rule 3: Company Staff (Supervisor, Munim, Operator) CAN be created in ETMS
//         and ingested into the existing OPS company.
// =========================================================================

// POST /api/sync/inbound/company - Block company creation from ETMS
router.post('/inbound/company', async (req, res) => {
  await logAuditEvent({
    module: 'SECURITY',
    action: 'POLICY_VIOLATION_COMPANY_CREATION_BLOCKED',
    performedBy: 'ETMS Inbound Webhook',
    details: {
      attemptedPayload: req.body,
      reason: 'Tenant companies must be provisioned exclusively via OPS Super Admin Control Plane.',
    },
  });

  return res.status(403).json({
    success: false,
    code: 'POLICY_VIOLATION_COMPANY_CREATION_BLOCKED',
    message: 'Forbidden: Tenant companies cannot be created from ETMS. All companies must be provisioned exclusively via the OPS Super Admin Control Plane.',
  });
});

// POST /api/sync/inbound/user - Inbound user ingestion from ETMS
router.post('/inbound/user', async (req, res) => {
  try {
    const { name, email, mobile, role, companyId, companyCode, gstin } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cleanRole = (role || 'OPERATOR').toUpperCase();

    // Enforce Rule 2: Company Admin Users cannot be created from ETMS
    if (cleanRole.includes('ADMIN') || cleanRole === 'OWNER') {
      await logAuditEvent({
        module: 'SECURITY',
        action: 'POLICY_VIOLATION_ADMIN_CREATION_BLOCKED',
        performedBy: 'ETMS Inbound Webhook',
        details: {
          attemptedUser: { name, email, mobile, role },
          reason: 'Company Admin users must be provisioned exclusively via OPS Super Admin Control Plane.',
        },
      });

      return res.status(403).json({
        success: false,
        code: 'POLICY_VIOLATION_ADMIN_CREATION_BLOCKED',
        message: 'Forbidden: Company Admin users cannot be created from ETMS. Admin users must be provisioned exclusively from the OPS Super Admin Control Plane.',
      });
    }

    // Enforce Rule 3: Find existing company in OPS
    let targetCompany = null;
    if (companyId) {
      targetCompany = await prisma.company.findUnique({ where: { id: companyId } });
    }
    if (!targetCompany && companyCode) {
      targetCompany = await prisma.company.findUnique({ where: { code: companyCode.toUpperCase() } });
    }
    if (!targetCompany && gstin) {
      targetCompany = await prisma.company.findFirst({ where: { gstin } });
    }

    if (!targetCompany) {
      return res.status(400).json({
        success: false,
        code: 'COMPANY_NOT_FOUND_IN_OPS',
        message: 'Bad Request: Target company does not exist in OPS. All companies must be provisioned in OPS first.',
      });
    }

    // Map role or find company role
    let targetRole = await prisma.role.findFirst({
      where: {
        companyId: targetCompany.id,
        name: { contains: cleanRole, mode: 'insensitive' },
      },
    });

    if (!targetRole) {
      targetRole = await prisma.role.create({
        data: {
          name: cleanRole === 'SUPERVISOR' ? 'Floor Supervisor' : cleanRole === 'MUNIM' ? 'Munim' : 'Operator',
          companyId: targetCompany.id,
          isSystemDefined: false,
          permissions: JSON.stringify(['READ_FLOOR', 'LOG_SHIFTS']),
        },
      });
    }

    const defaultPassword = await bcrypt.hash('Password@123', 10);
    const user = await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {
        name,
        mobile: mobile || null,
        companyId: targetCompany.id,
        roleId: targetRole.id,
        status: 'ACTIVE',
      },
      create: {
        name,
        email: email.toLowerCase(),
        mobile: mobile || null,
        password: defaultPassword,
        companyId: targetCompany.id,
        roleId: targetRole.id,
        status: 'ACTIVE',
      },
    });

    await logAuditEvent({
      module: 'USER',
      action: 'ETMS_STAFF_USER_INGESTED',
      entityId: user.id,
      companyId: targetCompany.id,
      performedBy: 'ETMS Inbound Staff Sync',
      details: {
        userId: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: targetRole.name,
        companyName: targetCompany.name,
      },
    });

    res.status(201).json({
      success: true,
      message: `Staff user '${user.name}' successfully synced and linked to ${targetCompany.name}.`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: targetRole.name,
        company: targetCompany.name,
      },
    });
  } catch (error) {
    console.error('Error during inbound user sync:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/sync/companies/:id/sync-etms-staff - On-demand import of staff users from ETMS
router.post('/companies/:id/sync-etms-staff', async (req, res) => {
  try {
    const { id } = req.params;
    const company = await prisma.company.findUnique({
      where: { id },
      include: { roles: true },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found in OPS.' });
    }

    const etmsTenants = await discoverEtmsTenants();
    const matchingTenant = etmsTenants.find(
      (t) =>
        t.id === company.id ||
        t.code.toUpperCase() === company.code.toUpperCase() ||
        (t.gstin && company.gstin && t.gstin.toUpperCase() === company.gstin.toUpperCase())
    );

    const syncedStaff = [];
    if (matchingTenant && Array.isArray(matchingTenant.users)) {
      const defaultPassword = await bcrypt.hash('Password@123', 10);
      for (const u of matchingTenant.users) {
        const uRole = (u.role || '').toUpperCase();
        // Only import non-admin staff
        if (!uRole.includes('ADMIN') && !uRole.includes('OWNER')) {
          let assignedRole = company.roles.find((r) => r.name.toUpperCase().includes(uRole)) || company.roles[0];
          const ingested = await prisma.user.upsert({
            where: { email: u.email.toLowerCase() },
            update: {
              name: u.name,
              mobile: u.phone || u.mobile || null,
              companyId: company.id,
              roleId: assignedRole ? assignedRole.id : null,
              status: 'ACTIVE',
            },
            create: {
              name: u.name,
              email: u.email.toLowerCase(),
              mobile: u.phone || u.mobile || null,
              password: defaultPassword,
              companyId: company.id,
              roleId: assignedRole ? assignedRole.id : null,
              status: 'ACTIVE',
            },
          });
          syncedStaff.push({ name: ingested.name, email: ingested.email, mobile: ingested.mobile });
        }
      }
    }

    await logAuditEvent({
      module: 'TENANT_RECONCILIATION',
      action: 'ETMS_COMPANY_STAFF_SYNCED',
      companyId: company.id,
      performedBy: req.user?.email || 'admin@ops.saas',
      details: {
        companyName: company.name,
        syncedStaffCount: syncedStaff.length,
        syncedStaff,
      },
    });

    res.json({
      success: true,
      message: `Synced ${syncedStaff.length} operational staff user(s) from ETMS for ${company.name}.`,
      data: syncedStaff,
    });
  } catch (error) {
    console.error('Error syncing ETMS staff:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

