const fs = require('fs');
const path = require('path');
const os = require('os');
const { PrismaClient } = require('@prisma/client');
const mongoose = require('mongoose');
const { initMongo } = require('../src/services/auditLogger');
const AuditLog = require('../src/models/AuditLog');

const prisma = new PrismaClient();
const SNAPSHOT_DIR = path.join(__dirname, '../../data_snapshots');

async function exportSnapshot() {
  console.log('📦 Starting Comprehensive Data Export Snapshot...\n');

  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  const snapshot = {
    metadata: {
      exportedAt: new Date().toISOString(),
      hostname: os.hostname(),
      platform: os.platform(),
      version: '1.0.0',
    },
    postgres: {},
    mongo: {},
  };

  try {
    // 1. Export PostgreSQL Models
    console.log('🔹 Exporting PostgreSQL database tables...');
    
    snapshot.postgres.subscriptionPlans = await prisma.subscriptionPlan.findMany();
    console.log(`  ✓ Subscription Plans: ${snapshot.postgres.subscriptionPlans.length} records`);

    snapshot.postgres.companies = await prisma.company.findMany();
    console.log(`  ✓ Companies (Tenants & Seed): ${snapshot.postgres.companies.length} records`);

    snapshot.postgres.roles = await prisma.role.findMany();
    console.log(`  ✓ Roles: ${snapshot.postgres.roles.length} records`);

    snapshot.postgres.users = await prisma.user.findMany();
    console.log(`  ✓ Users: ${snapshot.postgres.users.length} records`);

    snapshot.postgres.parameters = await prisma.parameter.findMany();
    console.log(`  ✓ Parameters & API Keys: ${snapshot.postgres.parameters.length} records`);

    snapshot.postgres.transactions = await prisma.transaction.findMany();
    console.log(`  ✓ Transactions: ${snapshot.postgres.transactions.length} records`);

    snapshot.postgres.invoices = await prisma.subscriptionInvoice.findMany();
    console.log(`  ✓ Invoices: ${snapshot.postgres.invoices.length} records`);

    // 2. Export MongoDB Collections
    console.log('\n🔹 Exporting MongoDB audit logs & telemetry...');
    try {
      await initMongo();
      const logs = await AuditLog.find({}).lean();
      snapshot.mongo.auditLogs = logs;
      console.log(`  ✓ MongoDB Audit Logs: ${logs.length} records`);
    } catch (mErr) {
      console.warn('  ⚠️ MongoDB Export Warning (Proceeding with PG data):', mErr.message);
      snapshot.mongo.auditLogs = [];
    }

    // 3. Write Snapshot File
    const latestFile = path.join(SNAPSHOT_DIR, 'latest_snapshot.json');
    const timestampFile = path.join(SNAPSHOT_DIR, `snapshot_${Date.now()}.json`);

    const jsonContent = JSON.stringify(snapshot, null, 2);
    fs.writeFileSync(latestFile, jsonContent, 'utf8');
    fs.writeFileSync(timestampFile, jsonContent, 'utf8');

    console.log('\n======================================================');
    console.log(`✅ Snapshot successfully created at:`);
    console.log(`   📄 ${latestFile}`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Failed to export snapshot:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    try {
      await mongoose.disconnect();
    } catch (_) {}
  }
}

exportSnapshot();
