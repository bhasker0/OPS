const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { logAuditEvent } = require('../services/auditLogger');

// Helper: Calculate Indian GST SAC 9983 Split
function calculateGstSplit(baseAmount, gstin) {
  const isGujarat = gstin && gstin.trim().startsWith('24');
  const gstRate = 18.0;

  if (isGujarat) {
    const cgstAmount = Number((baseAmount * 0.09).toFixed(2));
    const sgstAmount = Number((baseAmount * 0.09).toFixed(2));
    const igstAmount = 0.0;
    const totalAmount = Number((baseAmount + cgstAmount + sgstAmount).toFixed(2));
    return {
      sacCode: '998313',
      gstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount,
      taxType: 'INTRA_STATE_GUJARAT (9% CGST + 9% SGST)',
    };
  } else {
    const cgstAmount = 0.0;
    const sgstAmount = 0.0;
    const igstAmount = Number((baseAmount * 0.18).toFixed(2));
    const totalAmount = Number((baseAmount + igstAmount).toFixed(2));
    return {
      sacCode: '998313',
      gstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount,
      taxType: 'INTER_STATE (18% IGST)',
    };
  }
}

// GET /api/invoices - List subscription invoices with pagination & filters
router.get('/', async (req, res) => {
  try {
    const { companyId, status, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (companyId && companyId !== 'ALL') {
      where.companyId = companyId;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { company: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const totalCount = await prisma.subscriptionInvoice.count({ where });
    const invoices = await prisma.subscriptionInvoice.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            gstin: true,
            email: true,
            mobile: true,
            contactPerson: true,
            address: true,
          },
        },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/invoices/stats - Billing & Revenue KPIs
router.get('/stats', async (req, res) => {
  try {
    const allInvoices = await prisma.subscriptionInvoice.findMany();

    const totalInvoices = allInvoices.length;
    let totalBilled = 0;
    let totalCollected = 0;
    let pendingAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    const now = new Date();

    for (const inv of allInvoices) {
      totalBilled += inv.totalAmount;
      if (inv.status === 'PAID') {
        totalCollected += inv.totalAmount;
        totalCgst += inv.cgstAmount;
        totalSgst += inv.sgstAmount;
        totalIgst += inv.igstAmount;
        paidCount++;
      } else if (inv.status === 'PENDING') {
        pendingAmount += inv.totalAmount;
        if (new Date(inv.dueDate) < now) {
          overdueCount++;
        } else {
          pendingCount++;
        }
      }
    }

    res.json({
      success: true,
      data: {
        totalInvoices,
        totalBilled: Number(totalBilled.toFixed(2)),
        totalCollected: Number(totalCollected.toFixed(2)),
        pendingAmount: Number(pendingAmount.toFixed(2)),
        totalTaxCollected: Number((totalCgst + totalSgst + totalIgst).toFixed(2)),
        taxBreakdown: {
          cgst: Number(totalCgst.toFixed(2)),
          sgst: Number(totalSgst.toFixed(2)),
          igst: Number(totalIgst.toFixed(2)),
        },
        counts: {
          paid: paidCount,
          pending: pendingCount,
          overdue: overdueCount,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/invoices/:id - Retrieve invoice details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.subscriptionInvoice.findUnique({
      where: { id },
      include: {
        company: true,
        plan: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Error retrieving invoice:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/invoices - Generate New Subscription Invoice with SAC 9983 GST Split
router.post('/', async (req, res) => {
  try {
    const { companyId, planId, billingPeriodStart, billingPeriodEnd, dueDate, customBaseAmount } = req.body;

    if (!companyId || !planId) {
      return res.status(400).json({
        success: false,
        message: 'companyId and planId are required fields.',
      });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Tenant company not found.' });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found.' });
    }

    const baseAmount = customBaseAmount !== undefined ? Number(customBaseAmount) : Number(plan.price);
    const taxCalc = calculateGstSplit(baseAmount, company.gstin);

    // Generate Sequential Invoice Number (e.g. INV-2026-0001)
    const year = new Date().getFullYear();
    const count = await prisma.subscriptionInvoice.count();
    const invoiceNumber = `INV-OPS-${year}-${String(count + 1).padStart(4, '0')}`;

    const startDate = billingPeriodStart ? new Date(billingPeriodStart) : new Date();
    const endDate = billingPeriodEnd
      ? new Date(billingPeriodEnd)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const invoiceDueDate = dueDate ? new Date(dueDate) : new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000);

    const invoice = await prisma.subscriptionInvoice.create({
      data: {
        invoiceNumber,
        companyId,
        planId,
        baseAmount,
        sacCode: taxCalc.sacCode,
        gstRate: taxCalc.gstRate,
        cgstAmount: taxCalc.cgstAmount,
        sgstAmount: taxCalc.sgstAmount,
        igstAmount: taxCalc.igstAmount,
        totalAmount: taxCalc.totalAmount,
        currency: plan.currency || 'INR',
        status: 'PENDING',
        billingPeriodStart: startDate,
        billingPeriodEnd: endDate,
        dueDate: invoiceDueDate,
      },
      include: {
        company: true,
        plan: true,
      },
    });

    await logAuditEvent({
      module: 'BILLING',
      action: 'SUBSCRIPTION_INVOICE_GENERATED',
      entityId: invoice.id,
      companyId: company.id,
      performedBy: 'OPS Billing Engine',
      details: {
        invoiceNumber,
        planCode: plan.code,
        baseAmount,
        totalAmount: taxCalc.totalAmount,
        taxType: taxCalc.taxType,
      },
    });

    res.status(201).json({
      success: true,
      message: `Invoice '${invoiceNumber}' generated successfully for ₹${taxCalc.totalAmount}.`,
      data: invoice,
      taxCalculation: taxCalc,
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/invoices/:id/status - Update invoice payment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod, paymentGatewayTxnId } = req.body;

    const invoice = await prisma.subscriptionInvoice.findUnique({
      where: { id },
      include: { company: true, plan: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const updateData = {
      status,
      ...(paymentMethod && { paymentMethod }),
      ...(paymentGatewayTxnId && { paymentGatewayTxnId }),
    };

    if (status === 'PAID' && !invoice.paidAt) {
      updateData.paidAt = new Date();

      // Extend Company Subscription and upgrade plan
      await prisma.company.update({
        where: { id: invoice.companyId },
        data: {
          subscriptionPlanId: invoice.planId,
          planStatus: 'ACTIVE',
          planExpiryDate: invoice.billingPeriodEnd,
        },
      });
    }

    const updatedInvoice = await prisma.subscriptionInvoice.update({
      where: { id },
      data: updateData,
      include: { company: true, plan: true },
    });

    await logAuditEvent({
      module: 'BILLING',
      action: 'INVOICE_STATUS_UPDATED',
      entityId: id,
      companyId: invoice.companyId,
      performedBy: 'OPS Billing System',
      details: {
        invoiceNumber: invoice.invoiceNumber,
        oldStatus: invoice.status,
        newStatus: status,
        paymentMethod,
        paymentGatewayTxnId,
      },
    });

    res.json({
      success: true,
      message: `Invoice '${invoice.invoiceNumber}' marked as '${status}'.`,
      data: updatedInvoice,
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/invoices/:id - Cancel or delete draft invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.subscriptionInvoice.findUnique({ where: { id } });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a paid tax invoice for compliance reasons.',
      });
    }

    await prisma.subscriptionInvoice.delete({ where: { id } });

    await logAuditEvent({
      module: 'BILLING',
      action: 'INVOICE_DELETED',
      entityId: id,
      companyId: invoice.companyId,
      performedBy: 'OPS Billing System',
      details: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
      },
    });

    res.json({
      success: true,
      message: `Invoice '${invoice.invoiceNumber}' deleted.`,
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
