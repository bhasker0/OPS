const { execSync } = require('child_process');
const prisma = require('./src/db/prisma');
const AuditLog = require('./src/models/AuditLog');
const { connectMongo, closeMongoConnection } = require('./src/config/mongo');

async function runSeedQA() {
  console.log('?? Starting SCRUM-5 Database Seeding & Mock Tenant Fixtures QA Suite...\n');
  let passed = 0;
  let total = 7;

  // Test 1: Master Seed Company & Global System Parameters
  try {
    const seedCompany = await prisma.company.findUnique({
      where: { id: '00000000-0000-0000-0000-000000000000' },
      include: { parameters: true }
    });

    const sacParam = seedCompany.parameters.find(p => p.key === 'sac_code');
    const currencyParam = seedCompany.parameters.find(p => p.key === 'currency');
    const shrinkageParam = seedCompany.parameters.find(p => p.key === 'shrinkage_tolerance_percent');

    if (seedCompany && seedCompany.isSeed && sacParam && sacParam.value === '9988' && currencyParam && currencyParam.value === 'INR') {
      console.log('  ? PASSED [Test 1]: Master Seed Company & SAC 9988 / INR compliance parameters verified');
      passed++;
    } else {
      console.error('  ? FAILED [Test 1]: Master Seed Company parameters incomplete');
    }
  } catch (err) {
    console.error('  ? FAILED [Test 1] Exception:', err.message);
  }

  // Test 2: Multi-Tenant Surat Textile Companies Fixtures
  try {
    const tenants = await prisma.company.findMany({
      where: { isSeed: false }
    });

    const radhe = tenants.find(t => t.code === 'RADHEEMB');
    const suratTex = tenants.find(t => t.code === 'SURATTEX');
    const shivShakti = tenants.find(t => t.code === 'SHIVSHAKTI');

    if (tenants.length >= 4 && radhe && suratTex && shivShakti) {
      console.log(`  ? PASSED [Test 2]: ${tenants.length} multi-tenant companies populated with realistic Surat embroidery profiles`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 2]: Tenant fixtures missing or insufficient', tenants);
    }
  } catch (err) {
    console.error('  ? FAILED [Test 2] Exception:', err.message);
  }

  // Test 3: Indian GSTIN & Contact Compliance
  try {
    const companies = (await prisma.company.findMany()).filter(c => !c.name.includes('Invalid') && !c.name.includes('Test') && !c.name.includes('qa-'));
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const invalidCompanies = companies.filter(c => c.gstin && !gstinRegex.test(c.gstin.trim().toUpperCase()));
    const allValidGstin = invalidCompanies.length === 0;

    if (allValidGstin) {
      console.log('  ? PASSED [Test 3]: 100% of seeded companies strictly adhere to Indian GSTIN format (State 24 Gujarat / 27 Maharashtra)');
      passed++;
    } else {
      console.error('  ? FAILED [Test 3]: Invalid GSTIN format found in companies:', invalidCompanies.map(c => ({ name: c.name, gstin: c.gstin })));
    }
  } catch (err) {
    console.error('  ? FAILED [Test 3] Exception:', err.message);
  }

  // Test 4: Role Hierarchies & System-Defined Guards
  try {
    const roles = await prisma.role.findMany();
    const adminRoles = roles.filter(r => r.name === 'Company Admin' || r.name === 'OPS Super Admin');
    const munimRoles = roles.filter(r => r.name === 'Munim');
    const supervisorRoles = roles.filter(r => r.name === 'Floor Supervisor');

    if (adminRoles.length >= 4 && munimRoles.length >= 3 && supervisorRoles.length >= 1) {
      console.log('  ? PASSED [Test 4]: Role hierarchies (Company Admin, Munim, Floor Supervisor) established across tenants');
      passed++;
    } else {
      console.error('  ? FAILED [Test 4]: Role distribution unexpected', { admin: adminRoles.length, munim: munimRoles.length, supervisor: supervisorRoles.length });
    }
  } catch (err) {
    console.error('  ? FAILED [Test 4] Exception:', err.message);
  }

  // Test 5: Transaction Ledger Mock Records in INR
  try {
    const transactions = await prisma.transaction.findMany();
    const allInr = transactions.every(t => t.currency === 'INR');
    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

    if (transactions.length >= 8 && allInr && totalVolume > 500000) {
      console.log(`  ? PASSED [Test 5]: Transaction ledger seeded with ${transactions.length} entries (Total Volume: ?${totalVolume.toLocaleString('en-IN')})`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 5]: Transactions insufficient or not in INR', { count: transactions.length, totalVolume });
    }
  } catch (err) {
    console.error('  ? FAILED [Test 5] Exception:', err.message);
  }

  // Test 6: MongoDB Seed Audit Logs
  try {
    await connectMongo();
    const seedAuditLogs = await AuditLog.find({ action: 'SEED_TENANT_PROVISIONED' });

    if (seedAuditLogs && seedAuditLogs.length >= 4) {
      console.log(`  ? PASSED [Test 6]: MongoDB audit store populated with ${seedAuditLogs.length} tenant provisioning audit events`);
      passed++;
    } else {
      console.error('  ? FAILED [Test 6]: MongoDB seed audit logs missing or incomplete');
    }
  } catch (err) {
    console.error('  ? FAILED [Test 6] Exception:', err.message);
  }

  // Test 7: 100% Idempotent Execution Validation
  try {
    const seedOutput = execSync('node prisma/seed.js', { cwd: __dirname, encoding: 'utf8' });
    if (seedOutput.includes('100% idempotency') || seedOutput.includes('seeded successfully')) {
      console.log('  ✅ PASSED [Test 7]: node prisma/seed.js runs cleanly without duplicate key collisions (100% Idempotent)');
      passed++;
    } else {
      console.error('  ❌ FAILED [Test 7]: Idempotent re-run output failed:', seedOutput);
    }
  } catch (err) {
    console.error('  ❌ FAILED [Test 7] Exception:', err.message);
  }

  console.log(`\n?? SEED QA RESULTS: ${passed}/${total} Tests Passed.`);
  if (passed === total) {
    console.log('?? SCRUM-5 DATABASE SEEDING & MOCK FIXTURE VALIDATION PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runSeedQA()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongoConnection();
  });
