const express = require('express');
const prisma = require('../db');
const { logAuditEvent } = require('../services/auditLogger');

const router = express.Router();

// GET /api/roles - List all roles or filter by companyId
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;
    const whereClause = companyId ? { companyId } : {};

    const roles = await prisma.role.findMany({
      where: whereClause,
      include: {
        company: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/roles - Create custom role (isSystemDefined = false)
router.post('/', async (req, res) => {
  try {
    const { name, companyId, permissions } = req.body;

    if (!name || !companyId) {
      return res.status(400).json({ success: false, message: 'Name and companyId are required' });
    }

    const role = await prisma.role.create({
      data: {
        name,
        companyId,
        isSystemDefined: false, // User created role
        permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions || []),
      },
    });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'ROLE',
      action: 'CREATE_ROLE',
      entityId: role.id,
      companyId: role.companyId,
      details: { roleName: role.name, isSystemDefined: false },
    });

    res.status(201).json({ success: true, data: role });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/roles/:id - Edit role with System-Defined Guard
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions } = req.body;

    const existingRole = await prisma.role.findUnique({ where: { id } });

    if (!existingRole) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // STRICT GUARD: System Defined Roles CANNOT be modified
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
        message: 'FORBIDDEN: This is a System-Defined role and cannot be modified or updated.',
      });
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        name: name || existingRole.name,
        permissions: permissions
          ? typeof permissions === 'string'
            ? permissions
            : JSON.stringify(permissions)
          : existingRole.permissions,
      },
    });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'ROLE',
      action: 'UPDATE_ROLE',
      entityId: updatedRole.id,
      companyId: updatedRole.companyId,
      details: { oldName: existingRole.name, newName: updatedRole.name },
    });

    res.json({ success: true, data: updatedRole });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/roles/:id - Delete role with System-Defined Guard
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingRole = await prisma.role.findUnique({ where: { id } });

    if (!existingRole) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // STRICT GUARD: System Defined Roles CANNOT be deleted
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
        message: 'FORBIDDEN: This is a System-Defined role and cannot be deleted.',
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
