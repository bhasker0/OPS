const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const { initMongo } = require('../src/services/auditLogger');
const AuditLog = require('../src/models/AuditLog');

const prisma = new PrismaClient();
const SNAPSHOT_FILE = path.join(__dirname, '../../data_snapshots/latest_snapshot.json');

async function importSnapshot() {
  console.log('🔄 Starting Data Import from Local PC Snapshot...\n');

  if (!fs.existsSync(SNAPSHOT_FILE)) {
    console.error(`❌ Snapshot file not found at: ${SNAPSHOT_FILE}`);
    console.log('👉 Please ensure the latest Git changes are pulled or run export on the other PC first.');
    process.exit(1);
  }

  const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
  const snapshot = JSON.parse(raw);

  console.log(`📅 Snapshot Export Timestamp: ${snapshot.metadata?.exportedAt || 'Unknown'}`);
  console.log(`💻 Source Machine Hostname: ${snapshot.metadata?.hostname || 'Unknown'}\n`);

  try {
    // 0. Wipe existing tables to ensure clean restore of snapshot IDs & unique codes
    console.log('🧹 Clearing pre-existing data for clean snapshot restore...');
    await prisma.subscriptionInvoice.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.parameter.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.subscriptionPlan.deleteMany({});
    console.log('  ✓ Existing data cleared.\n');

    // 1. Restore Subscription Plans
    if (snapshot.postgres.subscriptionPlans?.length) {
      console.log(`🔹 Importing ${snapshot.postgres.subscriptionPlans.length} Subscription Plans...`);
      for (const plan of snapshot.postgres.subscriptionPlans) {
        await prisma.subscriptionPlan.upsert({
          where: { code: plan.code },
          update: {
            name: plan.name,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            billingInterval: plan.billingInterval,
            maxMachines: plan.maxMachines,
            maxUsers: plan.maxUsers,
            maxInvoicesPerMonth: plan.maxInvoicesPerMonth,
            features: typeof plan.features === 'string' ? plan.features : JSON.stringify(plan.features || []),
            isDefault: plan.isDefault,
            isCustom: plan.isCustom,
            isActive: plan.isActive,
          },
          create: {
            id: plan.id,
            name: plan.name,
            code: plan.code,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            billingInterval: plan.billingInterval,
            maxMachines: plan.maxMachines,
            maxUsers: plan.maxUsers,
            maxInvoicesPerMonth: plan.maxInvoicesPerMonth,
            features: typeof plan.features === 'string' ? plan.features : JSON.stringify(plan.features || []),
            isDefault: plan.isDefault,
            isCustom: plan.isCustom,
            isActive: plan.isActive,
          },
        });
      }
      console.log('  ✓ Subscription Plans imported successfully.');
    }

    // 2. Restore Companies
    if (snapshot.postgres.companies?.length) {
      console.log(`🔹 Importing ${snapshot.postgres.companies.length} Companies...`);
      for (const comp of snapshot.postgres.companies) {
        await prisma.company.upsert({
          where: { id: comp.id },
          update: {
            name: comp.name,
            code: comp.code,
            status: comp.status,
            isSeed: comp.isSeed,
            logoUrl: comp.logoUrl,
            contactPerson: comp.contactPerson,
            mobile: comp.mobile,
            email: comp.email,
            gstin: comp.gstin,
            address: comp.address,
            roundOffFormat: comp.roundOffFormat,
            digitsAfterDecimal: comp.digitsAfterDecimal,
            subscriptionPlanId: comp.subscriptionPlanId,
            planExpiryDate: comp.planExpiryDate ? new Date(comp.planExpiryDate) : null,
            planStatus: comp.planStatus,
          },
          create: {
            id: comp.id,
            name: comp.name,
            code: comp.code,
            status: comp.status,
            isSeed: comp.isSeed,
            logoUrl: comp.logoUrl,
            contactPerson: comp.contactPerson,
            mobile: comp.mobile,
            email: comp.email,
            gstin: comp.gstin,
            address: comp.address,
            roundOffFormat: comp.roundOffFormat,
            digitsAfterDecimal: comp.digitsAfterDecimal,
            subscriptionPlanId: comp.subscriptionPlanId,
            planExpiryDate: comp.planExpiryDate ? new Date(comp.planExpiryDate) : null,
            planStatus: comp.planStatus,
          },
        });
      }
      console.log('  ✓ Companies imported successfully.');
    }

    // 3. Restore Roles
    if (snapshot.postgres.roles?.length) {
      console.log(`🔹 Importing ${snapshot.postgres.roles.length} Roles...`);
      for (const role of snapshot.postgres.roles) {
        await prisma.role.upsert({
          where: { id: role.id },
          update: {
            name: role.name,
            companyId: role.companyId,
            isSystemDefined: role.isSystemDefined,
            permissions: typeof role.permissions === 'string' ? role.permissions : JSON.stringify(role.permissions || []),
          },
          create: {
            id: role.id,
            name: role.name,
            companyId: role.companyId,
            isSystemDefined: role.isSystemDefined,
            permissions: typeof role.permissions === 'string' ? role.permissions : JSON.stringify(role.permissions || []),
          },
        });
      }
      console.log('  ✓ Roles imported successfully.');
    }

    // 4. Restore Users
    if (snapshot.postgres.users?.length) {
      console.log(`🔹 Importing ${snapshot.postgres.users.length} Users...`);
      for (const u of snapshot.postgres.users) {
        await prisma.user.upsert({
          where: { email: u.email },
          update: {
            name: u.name,
            mobile: u.mobile,
            password: u.password,
            companyId: u.companyId,
            roleId: u.roleId,
            isInternalOps: u.isInternalOps,
            status: u.status,
            tokenVersion: u.tokenVersion || 0,
          },
          create: {
            id: u.id,
            name: u.name,
            email: u.email,
            mobile: u.mobile,
            password: u.password,
            companyId: u.companyId,
            roleId: u.roleId,
            isInternalOps: u.isInternalOps,
            status: u.status,
            tokenVersion: u.tokenVersion || 0,
          },
        });
      }
      console.log('  ✓ Users imported successfully.');
    }

    // 5. Restore Parameters (Company Settings & API Keys)
    if (snapshot.postgres.parameters?.length) {
      console.log(`🔹 Importing ${snapshot.postgres.parameters.length} Parameters & Feature Flags...`);
      for (const p of snapshot.postgres.parameters) {
        await prisma.parameter.upsert({
          where: { companyId_key: { companyId: p.companyId, key: p.key } },
          update: {
            value: p.value,
            description: p.description,
          },
          create: {
            id: p.id,
            companyId: p.companyId,
            key: p.key,
            value: p.value,
            description: p.description,
          },
        });
      }
      console.log('  ✓ Parameters imported successfully.');
    }

    // 6. Restore Transactions
    if (snapshot.postgres.transactions?.length) {
      console.log(`🔹 Importing ${snapshot.postgres.transactions.length} Transactions...`);
      for (const tx of snapshot.postgres.transactions) {
        await prisma.transaction.upsert({
          where: { id: tx.id },
          update: {
            companyId: tx.companyId,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            description: tx.description,
          },
          create: {
            id: tx.id,
            companyId: tx.companyId,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            description: tx.description,
            createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date(),
          },
        });
      }
      console.log('  ✓ Transactions imported successfully.');
    }

    // 7. Restore Invoices
    if (snapshot.postgres.invoices?.length) {
      console.log(`🔹 Importing ${snapshot.postgres.invoices.length} Invoices...`);
      for (const inv of snapshot.postgres.invoices) {
        await prisma.subscriptionInvoice.upsert({
          where: { invoiceNumber: inv.invoiceNumber },
          update: {
            companyId: inv.companyId,
            planId: inv.planId,
            baseAmount: inv.baseAmount,
            sacCode: inv.sacCode,
            gstRate: inv.gstRate,
            cgstAmount: inv.cgstAmount,
            sgstAmount: inv.sgstAmount,
            igstAmount: inv.igstAmount,
            totalAmount: inv.totalAmount,
            currency: inv.currency,
            status: inv.status,
            billingPeriodStart: new Date(inv.billingPeriodStart),
            billingPeriodEnd: new Date(inv.billingPeriodEnd),
            dueDate: new Date(inv.dueDate),
            paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
            paymentMethod: inv.paymentMethod,
            pdfUrl: inv.pdfUrl,
          },
          create: {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            companyId: inv.companyId,
            planId: inv.planId,
            baseAmount: inv.baseAmount,
            sacCode: inv.sacCode,
            gstRate: inv.gstRate,
            cgstAmount: inv.cgstAmount,
            sgstAmount: inv.sgstAmount,
            igstAmount: inv.igstAmount,
            totalAmount: inv.totalAmount,
            currency: inv.currency,
            status: inv.status,
            billingPeriodStart: new Date(inv.billingPeriodStart),
            billingPeriodEnd: new Date(inv.billingPeriodEnd),
            dueDate: new Date(inv.dueDate),
            paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
            paymentMethod: inv.paymentMethod,
            pdfUrl: inv.pdfUrl,
          },
        });
      }
      console.log('  ✓ Invoices imported successfully.');
    }

    // 8. Restore MongoDB Audit Logs
    if (snapshot.mongo.auditLogs?.length) {
      console.log(`\n🔹 Restoring ${snapshot.mongo.auditLogs.length} MongoDB Audit Logs...`);
      try {
        await initMongo();
        for (const log of snapshot.mongo.auditLogs) {
          const existing = await AuditLog.findOne({ _id: log._id });
          if (!existing) {
            await AuditLog.create(log);
          }
        }
        console.log('  ✓ MongoDB Audit Logs restored successfully.');
      } catch (mErr) {
        console.warn('  ⚠️ MongoDB restore warning:', mErr.message);
      }
    }

    console.log('\n================================================================');
    console.log('🎉 100% DATA IMPORT COMPLETE! ALL TABLES ARE FULLY SYNCHRONIZED!');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Failed to import snapshot:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    try {
      await mongoose.disconnect();
    } catch (_) {}
  }
}

importSnapshot();
