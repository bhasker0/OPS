const express = require('express');
const prisma = require('../db');
const { logAuditEvent, computeDiff } = require('../services/auditLogger');
const { dispatchOpsSync } = require('../services/opsSyncClient');

const router = express.Router();

function parseFeatures(featuresField) {
  if (Array.isArray(featuresField)) return featuresField;
  if (typeof featuresField === 'string') {
    try {
      const parsed = JSON.parse(featuresField);
      if (Array.isArray(parsed)) return parsed;
      return [featuresField];
    } catch {
      return [featuresField];
    }
  }
  return [];
}

// GET /api/subscription-plans - List all subscription tiers with tenant counts
router.get('/subscription-plans', async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: { companies: true },
        },
      },
      orderBy: { price: 'asc' },
    });

    const formattedPlans = plans.map((p) => ({
      ...p,
      features: parseFeatures(p.features),
      activeTenantsCount: p._count?.companies || 0,
    }));

    res.json({
      success: true,
      data: formattedPlans,
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/subscription-plans - Create a new subscription plan
router.post('/subscription-plans', async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      price = 0,
      currency = 'INR',
      billingInterval = 'MONTHLY',
      maxMachines = 2,
      maxUsers = 5,
      maxInvoicesPerMonth = 100,
      features = [],
      isDefault = false,
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Plan Name and unique Plan Code are required.' });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await prisma.subscriptionPlan.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Plan code '${cleanCode}' already exists.` });
    }

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        description: description || null,
        price: parseFloat(price) || 0,
        currency: currency || 'INR',
        billingInterval: billingInterval || 'MONTHLY',
        maxMachines: parseInt(maxMachines) || 2,
        maxUsers: parseInt(maxUsers) || 5,
        maxInvoicesPerMonth: parseInt(maxInvoicesPerMonth) || 100,
        features: Array.isArray(features) ? JSON.stringify(features) : String(features || '[]'),
        isDefault: Boolean(isDefault),
      },
    });

    await logAuditEvent({
      module: 'SUBSCRIPTION',
      companyId: '00000000-0000-0000-0000-000000000000',
      action: 'PLAN_CREATED',
      entity: 'SubscriptionPlan',
      entityId: newPlan.id,
      details: {
        after: newPlan,
      },
      performedBy: 'OPS Super Administrator',
    });

    res.status(201).json({
      success: true,
      message: `Subscription plan '${newPlan.name}' created successfully.`,
      data: {
        ...newPlan,
        features: parseFeatures(newPlan.features),
      },
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/subscription-plans/:id - Update an existing subscription plan
router.put('/subscription-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      currency,
      billingInterval,
      maxMachines,
      maxUsers,
      maxInvoicesPerMonth,
      features,
      isDefault,
    } = req.body;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found.' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (currency !== undefined) updateData.currency = currency;
    if (billingInterval !== undefined) updateData.billingInterval = billingInterval;
    if (maxMachines !== undefined) updateData.maxMachines = parseInt(maxMachines);
    if (maxUsers !== undefined) updateData.maxUsers = parseInt(maxUsers);
    if (maxInvoicesPerMonth !== undefined) updateData.maxInvoicesPerMonth = parseInt(maxInvoicesPerMonth);
    if (features !== undefined) {
      updateData.features = Array.isArray(features) ? JSON.stringify(features) : String(features);
    }
    if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData,
    });

    const diff = computeDiff(existing, updated);
    await logAuditEvent({
      module: 'SUBSCRIPTION',
      companyId: '00000000-0000-0000-0000-000000000000',
      action: 'PLAN_UPDATED',
      entity: 'SubscriptionPlan',
      entityId: id,
      details: {
        before: existing,
        after: updated,
        diff,
      },
      performedBy: 'OPS Super Administrator',
    });

    res.json({
      success: true,
      message: `Subscription plan '${updated.name}' updated successfully.`,
      data: {
        ...updated,
        features: parseFeatures(updated.features),
      },
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/subscription-plans/:id - Delete a subscription tier
router.delete('/subscription-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { companies: true } } },
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found.' });
    }

    if (plan.isDefault) {
      return res.status(403).json({ success: false, message: 'Cannot delete the system default subscription plan.' });
    }

    if (plan._count?.companies > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan '${plan.name}' because ${plan._count.companies} active tenant(s) are currently assigned to it. Reassign tenants first.`,
      });
    }

    await prisma.subscriptionPlan.delete({ where: { id } });

    await logAuditEvent({
      module: 'SUBSCRIPTION',
      companyId: '00000000-0000-0000-0000-000000000000',
      action: 'PLAN_DELETED',
      entity: 'SubscriptionPlan',
      entityId: id,
      details: {
        deletedPlan: plan,
      },
      performedBy: 'OPS Super Administrator',
    });

    res.json({
      success: true,
      message: `Subscription plan '${plan.name}' deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/companies/:id/subscription - Allocate or change subscription plan for a tenant
router.patch('/companies/:id/subscription', async (req, res) => {
  try {
    const { id } = req.params;
    const { subscriptionPlanId, planStatus, planExpiryDate } = req.body;

    const company = await prisma.company.findUnique({
      where: { id },
      include: { subscriptionPlan: true },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    let plan = null;
    if (subscriptionPlanId) {
      plan = await prisma.subscriptionPlan.findUnique({ where: { id: subscriptionPlanId } });
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Target subscription plan does not exist.' });
      }
    }

    const updateData = {};
    if (subscriptionPlanId !== undefined) updateData.subscriptionPlanId = subscriptionPlanId;
    if (planStatus !== undefined) updateData.planStatus = planStatus.toUpperCase();
    if (planExpiryDate !== undefined) {
      updateData.planExpiryDate = planExpiryDate ? new Date(planExpiryDate) : null;
    }

    const updatedCompany = await prisma.company.update({
      where: { id },
      data: updateData,
      include: { subscriptionPlan: true },
    });

    const diff = computeDiff(company, updatedCompany);
    await logAuditEvent({
      module: 'SUBSCRIPTION',
      companyId: company.id,
      action: 'COMPANY_SUBSCRIPTION_UPDATED',
      entity: 'Company',
      entityId: company.id,
      details: {
        before: {
          planName: company.subscriptionPlan?.name || 'None',
          status: company.planStatus,
          expiry: company.planExpiryDate,
        },
        after: {
          planName: updatedCompany.subscriptionPlan?.name || 'None',
          status: updatedCompany.planStatus,
          expiry: updatedCompany.planExpiryDate,
        },
        diff,
      },
      performedBy: 'OPS Super Administrator',
    });

    // Dispatch sync event
    dispatchOpsSync('subscription-status', {
      company_id: company.id,
      companyCode: company.code,
      plan: updatedCompany.subscriptionPlan,
      status: updatedCompany.planStatus || 'ACTIVE',
      planExpiryDate: updatedCompany.planExpiryDate,
    });

    res.json({
      success: true,
      message: `Subscription for '${company.name}' updated to '${updatedCompany.subscriptionPlan?.name || 'Unassigned'}'.`,
      data: updatedCompany,
    });
  } catch (error) {
    console.error('Error updating company subscription:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/companies/:id/quota-usage - Compute live tenant quota utilization
router.get('/companies/:id/quota-usage', async (req, res) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        subscriptionPlan: true,
        parameters: true,
      },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    // Default to starter plan if unassigned
    let plan = company.subscriptionPlan;
    if (!plan) {
      plan = await prisma.subscriptionPlan.findFirst({ where: { isDefault: true } }) || {
        name: 'Default Starter',
        code: 'STARTER',
        maxMachines: 2,
        maxUsers: 5,
        maxInvoicesPerMonth: 100,
        features: JSON.stringify(['BASIC_BILLING', 'KARIGAR_HISAB']),
      };
    }

    // Live counts
    const [userCount, transactionCount] = await Promise.all([
      prisma.user.count({ where: { companyId: id } }),
      prisma.transaction.count({ where: { companyId: id } }),
    ]);

    // Check heads/machine parameter
    const headsParam = company.parameters?.find((p) => p.key === 'default_heads');
    const machineCountEstimate = headsParam ? 1 : 1; // Base machine count in facility

    const userPercent = Math.min(100, Math.round((userCount / (plan.maxUsers || 1)) * 100));
    const machinePercent = Math.min(100, Math.round((machineCountEstimate / (plan.maxMachines || 1)) * 100));
    const invoicePercent = Math.min(100, Math.round((transactionCount / (plan.maxInvoicesPerMonth || 1)) * 100));

    const isNearQuota = userPercent >= 80 || machinePercent >= 80 || invoicePercent >= 80;
    const isQuotaExceeded = userCount >= plan.maxUsers || machineCountEstimate > plan.maxMachines || transactionCount >= plan.maxInvoicesPerMonth;

    res.json({
      success: true,
      data: {
        companyId: company.id,
        companyName: company.name,
        companyCode: company.code,
        plan: {
          id: plan.id,
          name: plan.name,
          code: plan.code,
          price: plan.price,
          currency: plan.currency,
          features: parseFeatures(plan.features),
        },
        planStatus: company.planStatus || 'ACTIVE',
        planExpiryDate: company.planExpiryDate,
        quotas: {
          users: {
            used: userCount,
            max: plan.maxUsers,
            percent: userPercent,
            available: Math.max(0, plan.maxUsers - userCount),
          },
          machines: {
            used: machineCountEstimate,
            max: plan.maxMachines,
            percent: machinePercent,
            available: Math.max(0, plan.maxMachines - machineCountEstimate),
          },
          invoices: {
            used: transactionCount,
            max: plan.maxInvoicesPerMonth,
            percent: invoicePercent,
            available: Math.max(0, plan.maxInvoicesPerMonth - transactionCount),
          },
        },
        isNearQuota,
        isQuotaExceeded,
      },
    });
  } catch (error) {
    console.error('Error fetching company quota usage:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
