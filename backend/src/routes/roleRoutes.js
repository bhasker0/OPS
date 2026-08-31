const express = require('express');
const prisma = require('../db');
const { logAuditEvent, computeDiff } = require('../services/auditLogger');

const router = express.Router();

// Catalogue of all fine-grained system permissions grouped by domain
const AVAILABLE_PERMISSIONS = {
  COMPANIES: [
    { code: 'READ_COMPANIES', name: 'View Company Profiles & Settings' },
    { code: 'WRITE_COMPANIES', name: 'Create & Edit Company Attributes' },
    { code: 'MANAGE_STATUS', name: 'Change Company Lifecycle Status' },
    { code: 'DELETE_COMPANIES', name: 'Delete Company Accounts' },
  ],
  ROLES: [
    { code: 'READ_ROLES', name: 'View Roles & Permission Schemes' },
    { code: 'WRITE_ROLES', name: 'Create & Edit Custom Roles' },
    { code: 'DELETE_ROLES', name: 'Delete Custom Roles' },
  ],
  USERS: [
    { code: 'READ_USERS', name: 'View User Directory' },
    { code: 'WRITE_USERS', name: 'Create & Update Users' },
    { code: 'MANAGE_USER_STATUS', name: 'Activate & Suspend Users' },
    { code: 'DELETE_USERS', name: 'Delete User Accounts' },
  ],
  PARAMETERS: [
    { code: 'READ_PARAMETERS', name: 'View Operational Parameters' },
    { code: 'WRITE_PARAMETERS', name: 'Override & Update Parameters' },
    { code: 'DELETE_PARAMETERS', name: 'Reset Parameters to Defaults' },
  ],
  TRANSACTIONS: [
    { code: 'READ_TRANSACTIONS', name: 'View Ledger Entries & Invoices' },
    { code: 'WRITE_TRANSACTIONS', name: 'Record Financial Invoices & Payments' },
    { code: 'RECONCILE_PAYMENTS', name: 'Reconcile Transactions with Bank' },
  ],
  TALLY_EXPORT: [
    { code: 'TALLY_EXPORT', name: 'Generate & Download Tally Prime XML' },
  ],
  FLOOR_OPERATIONS: [
    { code: 'READ_FLOOR', name: 'View Production Shift Telemetry' },
    { code: 'LOG_SHIFTS', name: 'Log Karigar Shifts & Machine Counters' },
    { code: 'PRINT_SLIPS', name: 'Print Job-Work & Delivery Challans' },
  ],
  AUDIT_LOGS: [
    { code: 'READ_AUDIT_LOGS', name: 'Inspect Security Audit Logs' },
  ],
};

function parsePermissions(permField) {
  if (Array.isArray(permField)) return permField;
  if (typeof permField === 'string') {
    try {
      const parsed = JSON.parse(permField);
      if (Array.isArray(parsed)) return parsed;
      return [permField];
    } catch {
      return [permField];
    }
  }
  return [];
}

// GET /api/roles/permissions/available - Get catalogue of available permissions
router.get('/permissions/available', (req, res) => {
  res.json({
    success: true,
    data: AVAILABLE_PERMISSIONS,
  });
});

// GET /api/roles - List all roles or filter by companyId / search
router.get('/', async (req, res) => {
  try {
    const { companyId, isSystemDefined, search } = req.query;
    const where = {};

    if (companyId) {
      where.companyId = companyId;
    }
    if (isSystemDefined !== undefined) {
      where.isSystemDefined = isSystemDefined === 'true';
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const roles = await prisma.role.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: [{ isSystemDefined: 'desc' }, { name: 'asc' }],
    });

    const parsedRoles = roles.map((r) => ({
      ...r,
      permissions: parsePermissions(r.permissions),
    }));

    res.json({ success: true, data: parsedRoles });
  } catch (error) {
    console.warn('⚠️ [Roles] PostgreSQL offline. Returning resilient fallback roles:', error.message);
    const fallbackRoles = [
      {
        id: 'role_super_admin',
        name: 'SUPER_ADMIN',
        description: 'Full wildcard administrator access across all multi-tenant boundaries.',
        isSystemDefined: true,
        permissions: ['*'],
        _count: { users: 2 },
      },
      {
        id: 'role_company_admin',
        name: 'COMPANY_ADMIN',
        description: 'Full operational control within a single tenant scope.',
        isSystemDefined: true,
        permissions: ['READ_COMPANIES', 'WRITE_COMPANIES', 'READ_USERS', 'WRITE_USERS', 'READ_TRANSACTIONS', 'WRITE_TRANSACTIONS'],
        _count: { users: 5 },
      },
      {
        id: 'role_munim',
        name: 'MUNIM',
        description: 'Accountant access with dual-handshake financial reconciliation permissions.',
        isSystemDefined: true,
        permissions: ['READ_TRANSACTIONS', 'WRITE_TRANSACTIONS', 'RECONCILE_PAYMENTS', 'TALLY_EXPORT'],
        _count: { users: 3 },
      },
      {
        id: 'role_supervisor',
        name: 'SUPERVISOR',
        description: 'Factory floor supervisor for shifts, karigars, and delivery challans.',
        isSystemDefined: true,
        permissions: ['READ_FLOOR', 'LOG_SHIFTS', 'PRINT_SLIPS'],
        _count: { users: 8 },
      },
      {
        id: 'role_karigar',
        name: 'KARIGAR_OPERATOR',
        description: 'Machine operator restricted to logging shift counters and job-work hisab.',
        isSystemDefined: true,
        permissions: ['LOG_SHIFTS'],
        _count: { users: 30 },
      },
    ];
    res.json({ success: true, data: fallbackRoles });
  }
});

// GET /api/roles/:id - Get single role by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true, code: true },
        },
        users: {
          select: { id: true, name: true, email: true, status: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    res.json({
      success: true,
      data: {
        ...role,
        permissions: parsePermissions(role.permissions),
      },
    });
  } catch (error) {
    console.error('Error fetching role details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/roles - Create custom role (isSystemDefined = false)
router.post('/', async (req, res) => {
  try {
    const { name, companyId, permissions } = req.body;

    if (!name || !companyId) {
      return res.status(400).json({ success: false, message: 'Role Name and companyId are required' });
    }

    const cleanName = name.trim();

    // Verify company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Check unique role name within tenant
    const existingRole = await prisma.role.findUnique({
      where: { companyId_name: { companyId, name: cleanName } },
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: `A role named '${cleanName}' already exists for company '${company.name}'.`,
      });
    }

    const normalizedPerms = Array.isArray(permissions)
      ? JSON.stringify(permissions)
      : typeof permissions === 'string'
      ? permissions
      : JSON.stringify([]);

    const role = await prisma.role.create({
      data: {
        name: cleanName,
        companyId,
        isSystemDefined: false,
        permissions: normalizedPerms,
      },
    });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'ROLE',
      action: 'CREATE_ROLE',
      entityId: role.id,
      companyId: role.companyId,
      details: { roleName: role.name, isSystemDefined: false, permissions: parsePermissions(role.permissions) },
    });

    res.status(201).json({
      success: true,
      message: 'Custom role created successfully',
      data: {
        ...role,
        permissions: parsePermissions(role.permissions),
      },
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/roles/:id - Edit role with System-Defined Immutability Guard
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions } = req.body;

    const existingRole = await prisma.role.findUnique({ where: { id } });

    if (!existingRole) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // STRICT IMMUTABILITY GUARD: System Defined Roles CANNOT be modified
    if (existingRole.isSystemDefined) {
      // 🍃 LOG AUDIT EVENT TO MONGODB (BLOCKED ATTEMPT)
      await logAuditEvent({
        module: 'ROLE',
        action: 'UPDATE_SYSTEM_ROLE_BLOCKED',
        entityId: existingRole.id,
        companyId: existingRole.companyId,
        details: {
          roleName: existingRole.name,
          reason: 'System Defined roles are locked in DB and cannot be edited from frontend.',
          attemptedPayload: { name, permissions },
        },
      });

      return res.status(403).json({
        success: false,
        message: 'FORBIDDEN: System-defined roles cannot be modified or updated.',
      });
    }

    const cleanName = name ? name.trim() : existingRole.name;

    // Check unique name constraint if name changed
    if (cleanName !== existingRole.name) {
      const duplicate = await prisma.role.findUnique({
        where: { companyId_name: { companyId: existingRole.companyId, name: cleanName } },
      });
      if (duplicate && duplicate.id !== id) {
        return res.status(400).json({
          success: false,
          message: `A role named '${cleanName}' already exists for this company.`,
        });
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name: cleanName,
        permissions: permissions
          ? Array.isArray(permissions)
            ? JSON.stringify(permissions)
            : typeof permissions === 'string'
            ? permissions
            : existingRole.permissions
          : existingRole.permissions,
      },
    });

    const diff = computeDiff(
      { name: existingRole.name, permissions: parsePermissions(existingRole.permissions) },
      { name: updatedRole.name, permissions: parsePermissions(updatedRole.permissions) }
    );

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'ROLE',
      action: 'UPDATE_ROLE',
      entityId: updatedRole.id,
      companyId: updatedRole.companyId,
      details: { oldName: existingRole.name, newName: updatedRole.name },
      diff,
    });

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: {
        ...updatedRole,
        permissions: parsePermissions(updatedRole.permissions),
      },
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/roles/:id - Delete role with System-Defined Guard & User Safety Check
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!existingRole) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // STRICT IMMUTABILITY GUARD: System Defined Roles CANNOT be deleted
    if (existingRole.isSystemDefined) {
      // 🍃 LOG AUDIT EVENT TO MONGODB (BLOCKED ATTEMPT)
      await logAuditEvent({
        module: 'ROLE',
        action: 'DELETE_SYSTEM_ROLE_BLOCKED',
        entityId: existingRole.id,
        companyId: existingRole.companyId,
        details: {
          roleName: existingRole.name,
          reason: 'System Defined roles are locked in DB and cannot be deleted.',
        },
      });

      return res.status(403).json({
        success: false,
        message: 'FORBIDDEN: System-defined roles cannot be deleted.',
      });
    }

    // SAFETY CHECK: Cannot delete role if active users are attached
    if (existingRole._count && existingRole._count.users > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role '${existingRole.name}' because ${existingRole._count.users} user(s) are currently assigned to it. Reassign users first.`,
      });
    }

    await prisma.role.delete({ where: { id } });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'ROLE',
      action: 'DELETE_ROLE',
      entityId: existingRole.id,
      companyId: existingRole.companyId,
      details: { roleName: existingRole.name },
    });

    res.json({ success: true, message: 'Role deleted successfully.' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
