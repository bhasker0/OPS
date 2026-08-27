const express = require('express');
const prisma = require('../db');
const { logAuditEvent } = require('../services/auditLogger');

const router = express.Router();

// GET /api/companies/:companyId/transactions - List transactions for a company
router.get('/:companyId/transactions', async (req, res) => {
  try {
    const { companyId } = req.params;

    const transactions = await prisma.transaction.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/companies/:companyId/transactions - Create transaction
router.post('/:companyId/transactions', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { amount, currency, status, description } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        companyId,
        amount: parseFloat(amount),
        currency: currency || 'INR',
        status: status || 'SUCCESS',
        description: description || 'Support Processed Payment',
      },
    });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'TRANSACTION',
      action: 'RECORD_TRANSACTION',
      entityId: transaction.id,
      companyId,
      details: { amount: transaction.amount, currency: transaction.currency, description: transaction.description },
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/companies/:companyId/transactions/:id/status - Update transaction status transition
router.patch('/:companyId/transactions/:id/status', async (req, res) => {
  try {
    const { companyId, id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid transaction status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const existingTx = await prisma.transaction.findFirst({ where: { id, companyId } });
    if (!existingTx) {
      return res.status(404).json({ success: false, message: 'Transaction not found for this company.' });
    }

    const updatedTx = await prisma.transaction.update({
      where: { id },
      data: { status },
    });

    await logAuditEvent({
      module: 'TRANSACTION',
      action: 'UPDATE_TRANSACTION_STATUS',
      entityId: id,
      companyId,
      details: { previousStatus: existingTx.status, newStatus: status, amount: existingTx.amount },
    });

    res.json({ success: true, message: `Transaction status transitioned to ${status}`, data: updatedTx });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
