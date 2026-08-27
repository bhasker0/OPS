const express = require('express');
const prisma = require('../db');
const { logAuditEvent } = require('../services/auditLogger');

const router = express.Router();

// GET /api/users - List users
router.get('/', async (req, res) => {
  try {
    const { companyId, isInternalOps } = req.query;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (isInternalOps !== undefined) where.isInternalOps = isInternalOps === 'true';

    const users = await prisma.user.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, code: true },
        },
        role: {
          select: { id: true, name: true, isSystemDefined: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
  try {
    const { name, email, password, companyId, roleId, isInternalOps } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email address already exists' });
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password || 'password123',
        companyId: companyId || null,
        roleId: roleId || null,
        isInternalOps: Boolean(isInternalOps),
      },
      include: {
        company: { select: { id: true, name: true } },
        role: { select: { id: true, name: true, isSystemDefined: true } },
      },
    });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'USER',
      action: 'CREATE_USER',
      entityId: user.id,
      companyId: user.companyId,
      details: {
        name: user.name,
        email: user.email,
        isInternalOps: user.isInternalOps,
      },
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id - Support Operation: Update user information/status/role
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status, roleId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existingUser.name,
        email: email !== undefined ? email.trim().toLowerCase() : existingUser.email,
        status: status !== undefined ? status : existingUser.status,
        roleId: roleId !== undefined ? roleId : existingUser.roleId,
      },
      include: {
        company: { select: { id: true, name: true } },
        role: { select: { id: true, name: true, isSystemDefined: true } },
      },
    });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'USER',
      action: 'SUPPORT_UPDATE_USER',
      entityId: updatedUser.id,
      companyId: updatedUser.companyId,
      details: {
        old: { name: existingUser.name, email: existingUser.email, status: existingUser.status },
        new: { name: updatedUser.name, email: updatedUser.email, status: updatedUser.status },
        reason: 'Customer Support Request Modification',
      },
    });

    res.json({ success: true, message: 'User updated successfully via OPS support panel.', data: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id - Delete user with audit trail
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });

    await logAuditEvent({
      module: 'USER',
      action: 'DELETE_USER',
      entityId: id,
      companyId: existingUser.companyId,
      details: { name: existingUser.name, email: existingUser.email },
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
