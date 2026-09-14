const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { logAuditEvent, initMongo } = require('../src/services/auditLogger');
const { closeMongoConnection } = require('../src/config/mongo');

const prisma = new PrismaClient();
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
  console.log('?? Starting 100% Idempotent Database Seeding with Indian Business compliance & parameters...\n');

  // Initialize MongoDB for seed audit trail logging
  await initMongo();

  // Master Super Admin Account
  const defaultAdminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@ops.saas' },
    update: {
      name: 'Super Administrator',
      password: defaultAdminPassword,
      isInternalOps: true,
      status: 'ACTIVE',
    },
    create: {
      name: 'Super Administrator',
      email: 'admin@ops.saas',
      password: defaultAdminPassword,
      isInternalOps: true,
      status: 'ACTIVE',
    },
  });

  // 0. Seed Subscription Plans (SCRUM-80)
  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'STARTER' },
    update: {
      name: 'Starter Plan',
      description: 'Entry-level tier for small job-work units & solo embroidery machines.',
      price: 0,
      currency: 'INR',
      billingInterval: 'MONTHLY',
      maxMachines: 2,
      maxUsers: 5,
      maxInvoicesPerMonth: 100,
      features: JSON.stringify(['BASIC_BILLING', 'KARIGAR_HISAB', 'CHALLAN_GEN']),
      isDefault: true,
    },
    create: {
      name: 'Starter Plan',
      code: 'STARTER',
      description: 'Entry-level tier for small job-work units & solo embroidery machines.',
      price: 0,
      currency: 'INR',
      billingInterval: 'MONTHLY',
      maxMachines: 2,
      maxUsers: 5,
      maxInvoicesPerMonth: 100,
      features: JSON.stringify(['BASIC_BILLING', 'KARIGAR_HISAB', 'CHALLAN_GEN']),
      isDefault: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'PROFESSIONAL' },
    update: {
      name: 'Professional Growth',
      description: 'High-speed operations for expanding multi-head embroidery manufacturers.',
      price: 2499,
      currency: 'INR',
      billingInterval: 'MONTHLY',
      maxMachines: 8,
      maxUsers: 20,
      maxInvoicesPerMonth: 1000,
      features: JSON.stringify(['BASIC_BILLING', 'KARIGAR_HISAB', 'CHALLAN_GEN', 'TALLY_EXPORT', 'DEAD_STOCK_MATCHING', 'MUNIM_PORTAL']),
      isDefault: false,
    },
    create: {
      name: 'Professional Growth',
      code: 'PROFESSIONAL',
      description: 'High-speed operations for expanding multi-head embroidery manufacturers.',
      price: 2499,
      currency: 'INR',
      billingInterval: 'MONTHLY',
      maxMachines: 8,
      maxUsers: 20,
      maxInvoicesPerMonth: 1000,
      features: JSON.stringify(['BASIC_BILLING', 'KARIGAR_HISAB', 'CHALLAN_GEN', 'TALLY_EXPORT', 'DEAD_STOCK_MATCHING', 'MUNIM_PORTAL']),
      isDefault: false,
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { code: 'ENTERPRISE' },
    update: {
      name: 'Enterprise Factory Tier',
      description: 'Unlimited multi-factory textile mills, priority SLA & automated Tally Prime sync.',
      price: 7999,
      currency: 'INR',
      billingInterval: 'MONTHLY',
      maxMachines: 50,
      maxUsers: 100,
      maxInvoicesPerMonth: 10000,
      features: JSON.stringify(['BASIC_BILLING', 'KARIGAR_HISAB', 'CHALLAN_GEN', 'TALLY_EXPORT', 'DEAD_STOCK_MATCHING', 'MUNIM_PORTAL', 'MULTI_FACTORY', 'PRIORITY_SLA', 'CUSTOM_WEBHOOKS']),
      isDefault: false,
    },
    create: {
      name: 'Enterprise Factory Tier',
      code: 'ENTERPRISE',
      description: 'Unlimited multi-factory textile mills, priority SLA & automated Tally Prime sync.',
      price: 7999,
      currency: 'INR',
      billingInterval: 'MONTHLY',
      maxMachines: 50,
      maxUsers: 100,
      maxInvoicesPerMonth: 10000,
      features: JSON.stringify(['BASIC_BILLING', 'KARIGAR_HISAB', 'CHALLAN_GEN', 'TALLY_EXPORT', 'DEAD_STOCK_MATCHING', 'MUNIM_PORTAL', 'MULTI_FACTORY', 'PRIORITY_SLA', 'CUSTOM_WEBHOOKS']),
      isDefault: false,
    },
  });

  // 1. Create Master Seed Company (000 UUID)
  const seedCompany = await prisma.company.upsert({
    where: { id: SEED_COMPANY_ID },
    update: {
      name: 'Master Seed Company',
      code: 'SEED000',
      isSeed: true,
      status: 'ACTIVE',
      contactPerson: 'OPS Super Administrator',
      mobile: '+91 98250 00000',
      email: 'seed@ops.saas',
      gstin: '24AAAAA0000A1Z5',
      address: 'OPS Headquarters, Surat IT Park, Nanpura, Surat, Gujarat 395001',
      roundOffFormat: 'NEAREST_RUPEE',
      digitsAfterDecimal: 2,
      subscriptionPlanId: enterprisePlan.id,
      planStatus: 'ACTIVE',
    },
    create: {
      id: SEED_COMPANY_ID,
      name: 'Master Seed Company',
      code: 'SEED000',
      isSeed: true,
      status: 'ACTIVE',
      contactPerson: 'OPS Super Administrator',
      mobile: '+91 98250 00000',
      email: 'seed@ops.saas',
      gstin: '24AAAAA0000A1Z5',
      address: 'OPS Headquarters, Surat IT Park, Nanpura, Surat, Gujarat 395001',
      roundOffFormat: 'NEAREST_RUPEE',
      digitsAfterDecimal: 2,
      subscriptionPlanId: enterprisePlan.id,
      planStatus: 'ACTIVE',
    },
  });

  // Global Default Operational & Compliance Parameters
  const defaultParameters = [
    { key: 'date_format', value: 'DD/MM/YYYY', description: 'Standard Indian Date Format' },
    { key: 'time_format', value: '12H', description: 'Standard 12-Hour Shift Time Format' },
    { key: 'currency', value: 'INR', description: 'Indian Rupee Billing Currency' },
    { key: 'currency_symbol', value: '?', description: 'Indian Rupee Symbol' },
    { key: 'timezone', value: 'Asia/Kolkata', description: 'Indian Standard Time Zone (IST)' },
    { key: 'round_off_format', value: 'NEAREST_RUPEE', description: 'Round off transaction values to nearest Rupee' },
    { key: 'digits_after_decimal', value: '2', description: 'Decimal precision for financial calculations' },
    { key: 'sac_code', value: '9988', description: 'SAC 9988 Stitching & Job-Work Invoicing' },
    { key: 'default_rate_per_1000', value: '0.40', description: 'Default Job-Work Rate (?0.40 per 1000 stitches)' },
    { key: 'default_heads', value: '44', description: 'Default Multi-Head Embroidery Machine Heads' },
    { key: 'shrinkage_tolerance_percent', value: '3.0', description: 'Maximum Fabric Shrinkage Threshold Warning (%)' },
    { key: 'gst_rate_percent', value: '5.0', description: 'Job-Work GST Rate (2.5% CGST + 2.5% SGST / 5.0% IGST)' },
    { key: 'tally_export_version', value: 'Prime 4.0', description: 'Target Tally Prime XML Export Specification' },
    { key: 'feature_dark_mode', value: 'true', description: 'Enable dark mode interface toggle' },
    { key: 'feature_audit_logs', value: 'true', description: 'Enable detailed MongoDB security audit logging' },
    { key: 'feature_tally_export', value: 'true', description: 'Enable Tally Prime 4.0 XML voucher export module' },
    { key: 'feature_munim_portal', value: 'true', description: 'Enable Munim Double-Handshake Reconciliation portal' },
    { key: 'feature_broadcasting_alerts', value: 'true', description: 'Enable/Disable Broadcasting & Multilingual Alerts in ETMS' },
    { key: 'feature_kyc_onboarding', value: 'true', description: 'Enable/Disable KYC Verification & Indic Document OCR in ETMS' },
    { key: 'feature_command_palette', value: 'true', description: 'Enable/Disable Global Command Palette (Ctrl+K) & Voice Navigation in ETMS' },
    { key: 'feature_audit_log_viewer', value: 'true', description: 'Enable/Disable In-App Tenant Audit Log Viewer in ETMS' },
    { key: 'feature_speech_data_entry', value: 'true', description: 'Enable/Disable Speech-to-Form Automated Data Entry in ETMS' },
    { key: 'bhashini_udyat_key', value: '02ea2ee8d4-a9a4-4004-b983-4f269f0581b7', description: 'Bhashini Udyat API Access Key for Indic Speech Services' },
    { key: 'bhashini_inference_key', value: 'iwSJbBpSd7vxMdU-2E_2BQhuqMmcZwzF4avGyQDUO2fcL_b0C0PPmpV2SLt1oeAn', description: 'Bhashini Model Inference Pipeline Token' },
    { key: 'dashboard_card_order', value: 'fleet_status,production_output,sac_billing,inward_lots', description: 'Default dashboard card arrangement order for factory overview' },
  ];

  for (const param of defaultParameters) {
    await prisma.parameter.upsert({
      where: { companyId_key: { companyId: SEED_COMPANY_ID, key: param.key } },
      update: { value: param.value, description: param.description },
      create: { companyId: SEED_COMPANY_ID, key: param.key, value: param.value, description: param.description },
    });
  }

  // OPS Super Admin Role (Idempotent upsert)
  const opsRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: SEED_COMPANY_ID, name: 'OPS Super Admin' } },
    update: { isSystemDefined: true, permissions: JSON.stringify(['*']) },
    create: {
      name: 'OPS Super Admin',
      companyId: SEED_COMPANY_ID,
      isSystemDefined: true,
      permissions: JSON.stringify(['*']),
    },
  });

  // OPS Super Admin User (Idempotent upsert)
  await prisma.user.upsert({
    where: { email: 'admin@ops.saas' },
    update: { roleId: opsRole.id, companyId: SEED_COMPANY_ID, isInternalOps: true, status: 'ACTIVE' },
    create: {
      name: 'Super Admin User',
      email: 'admin@ops.saas',
      password: 'adminpassword123',
      companyId: SEED_COMPANY_ID,
      roleId: opsRole.id,
      isInternalOps: true,
      status: 'ACTIVE',
    },
  });

  // 2. Realistic Multi-Tenant Tenant Companies (Surat Embroidery & Textile Hub)
  const tenantCompanies = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Radhe Krishna Embroidery Works',
      code: 'RADHEEMB',
      contactPerson: 'Bhasker Savaliya',
      mobile: '+91 98250 11111',
      email: 'contact@radheembroidery.com',
      gstin: '24AABCR1234A1Z5',
      address: 'Plot 104-106, Road No. 6, Sachin GIDC, Surat, Gujarat 394230',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
      rate: '0.42',
      heads: '44',
      users: [
        { name: 'Bhasker Savaliya (Proprietor)', email: 'bhasker@radheembroidery.com', role: 'Company Admin' },
        { name: 'Ramesh Patel (Munim)', email: 'munim@radheembroidery.com', role: 'Munim' },
        { name: 'Suresh Bhai (Floor Supervisor)', email: 'supervisor@radheembroidery.com', role: 'Floor Supervisor' },
      ],
      transactions: [
        { amount: 185000.00, desc: 'SAC 9988 Job-Work Stitch Billing (Batch #RK-1024 - 440K Stitches)' },
        { amount: 48500.00, desc: 'Fortnightly Karigar Piece-Rate Wage Disbursement' },
        { amount: 12000.00, desc: 'Yarn & Metallic Zari Inward Settlement' },
      ],
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Surat Textile & Jacquard Mills Pvt Ltd',
      code: 'SURATTEX',
      contactPerson: 'Kishore Bhai Patel',
      mobile: '+91 98250 22222',
      email: 'admin@surattextilemills.in',
      gstin: '24AAACS5678N1Z2',
      address: 'Survey No. 45, Near Khwaja Dana Dargah, Pandesara GIDC, Surat, Gujarat 394221',
      logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&auto=format&fit=crop&q=60',
      rate: '0.38',
      heads: '56',
      users: [
        { name: 'Kishore Patel (Director)', email: 'kishore@surattextilemills.in', role: 'Company Admin' },
        { name: 'Dinesh Varma (Chief Accountant)', email: 'accounts@surattextilemills.in', role: 'Munim' },
      ],
      transactions: [
        { amount: 342000.00, desc: 'SAC 9988 Multi-Head High Speed Jacquard Processing' },
        { amount: 92000.00, desc: 'Fortnightly Shift Worker Wage Settlement' },
      ],
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Shiv Shakti Embroidery Processors',
      code: 'SHIVSHAKTI',
      contactPerson: 'Mansukh Bhai Radadiya',
      mobile: '+91 98250 33333',
      email: 'billing@shivshaktiprocessors.com',
      gstin: '24AAACQ9999P1Z3',
      address: '2nd Floor, Ring Road Textile Market, Katargam, Surat, Gujarat 395004',
      logoUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=100&auto=format&fit=crop&q=60',
      rate: '0.45',
      heads: '32',
      users: [
        { name: 'Mansukh Radadiya (Owner)', email: 'mansukh@shivshaktiprocessors.com', role: 'Company Admin' },
        { name: 'Pooja Shah (Billing Executive)', email: 'pooja@shivshaktiprocessors.com', role: 'Munim' },
      ],
      transactions: [
        { amount: 125000.00, desc: 'Designer Saree Cord & Sequins Job-Work Stitching' },
        { amount: 36000.00, desc: 'Karigar Fortnightly Uchapat Advances Settlement' },
      ],
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Acme Solutions India Pvt Ltd',
      code: 'ACMEIN',
      contactPerson: 'Rajesh Sharma',
      mobile: '+91 98765 43210',
      email: 'billing@acmeindia.in',
      gstin: '27AAPCU1234M1ZV',
      address: '101 Tech Park, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
      logoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&auto=format&fit=crop&q=60',
      rate: '0.40',
      heads: '44',
      users: [
        { name: 'Rajesh Sharma (Director)', email: 'rajesh@acmeindia.in', role: 'Company Admin' },
        { name: 'Priya Nair (Finance Lead)', email: 'priya@acmeindia.in', role: 'Munim' },
      ],
      transactions: [
        { amount: 150000.00, desc: 'Annual Enterprise SaaS Subscription + GST' },
        { amount: 25000.00, desc: 'Add-on Custom Integration Service Package' },
      ],
    },
  ];

  const planMap = {
    'RADHEEMB': { planId: proPlan.id, status: 'ACTIVE', expiry: new Date(Date.now() + 365 * 86400000) },
    'SURATTEX': { planId: enterprisePlan.id, status: 'ACTIVE', expiry: new Date(Date.now() + 365 * 86400000) },
    'SHIVSHAKTI': { planId: starterPlan.id, status: 'ACTIVE', expiry: new Date(Date.now() + 30 * 86400000) },
    'ACMEIN': { planId: starterPlan.id, status: 'TRIAL', expiry: new Date(Date.now() + 14 * 86400000) }
  };

  for (const compData of tenantCompanies) {
    const planInfo = planMap[compData.code] || { planId: starterPlan.id, status: 'ACTIVE', expiry: null };

    // 1. Upsert Company by unique code
    const company = await prisma.company.upsert({
      where: { code: compData.code },
      update: {
        name: compData.name,
        contactPerson: compData.contactPerson,
        mobile: compData.mobile,
        email: compData.email,
        gstin: compData.gstin,
        address: compData.address,
        logoUrl: compData.logoUrl,
        roundOffFormat: 'NEAREST_RUPEE',
        digitsAfterDecimal: 2,
        status: 'ACTIVE',
        subscriptionPlanId: planInfo.planId,
        planStatus: planInfo.status,
        planExpiryDate: planInfo.expiry,
      },
      create: {
        id: compData.id,
        name: compData.name,
        code: compData.code,
        contactPerson: compData.contactPerson,
        mobile: compData.mobile,
        email: compData.email,
        gstin: compData.gstin,
        address: compData.address,
        logoUrl: compData.logoUrl,
        roundOffFormat: 'NEAREST_RUPEE',
        digitsAfterDecimal: 2,
        status: 'ACTIVE',
        subscriptionPlanId: planInfo.planId,
        planStatus: planInfo.status,
        planExpiryDate: planInfo.expiry,
      },
    });

    // 2. Upsert System-Defined Admin Role
    const adminRole = await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Company Admin' } },
      update: { isSystemDefined: true, permissions: JSON.stringify(['READ_ALL', 'WRITE_ALL', 'ADMIN_ACCESS']) },
      create: {
        name: 'Company Admin',
        companyId: company.id,
        isSystemDefined: true,
        permissions: JSON.stringify(['READ_ALL', 'WRITE_ALL', 'ADMIN_ACCESS']),
      },
    });

    // 3. Upsert Munim Role
    const munimRole = await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Munim' } },
      update: { isSystemDefined: false, permissions: JSON.stringify(['READ_INVOICES', 'WRITE_INVOICES', 'TALLY_EXPORT', 'RECONCILE_PAYMENTS']) },
      create: {
        name: 'Munim',
        companyId: company.id,
        isSystemDefined: false,
        permissions: JSON.stringify(['READ_INVOICES', 'WRITE_INVOICES', 'TALLY_EXPORT', 'RECONCILE_PAYMENTS']),
      },
    });

    // 4. Upsert Floor Supervisor Role
    const supervisorRole = await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: 'Floor Supervisor' } },
      update: { isSystemDefined: false, permissions: JSON.stringify(['READ_FLOOR', 'LOG_SHIFTS', 'KARIGAR_TELEMETRY', 'PRINT_SLIPS']) },
      create: {
        name: 'Floor Supervisor',
        companyId: company.id,
        isSystemDefined: false,
        permissions: JSON.stringify(['READ_FLOOR', 'LOG_SHIFTS', 'KARIGAR_TELEMETRY', 'PRINT_SLIPS']),
      },
    });

    // 5. Clone & Upsert Operational Parameters
    for (const p of defaultParameters) {
      let customValue = p.value;
      if (p.key === 'default_rate_per_1000') customValue = compData.rate;
      if (p.key === 'default_heads') customValue = compData.heads;

      await prisma.parameter.upsert({
        where: { companyId_key: { companyId: company.id, key: p.key } },
        update: { value: customValue, description: p.description },
        create: { companyId: company.id, key: p.key, value: customValue, description: p.description },
      });
    }

    // 6. Upsert Users
    for (const u of compData.users) {
      let assignedRole = adminRole;
      if (u.role === 'Munim') assignedRole = munimRole;
      if (u.role === 'Floor Supervisor') assignedRole = supervisorRole;

      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, companyId: company.id, roleId: assignedRole.id, status: 'ACTIVE' },
        create: {
          name: u.name,
          email: u.email,
          password: 'password123',
          companyId: company.id,
          roleId: assignedRole.id,
          status: 'ACTIVE',
        },
      });
    }

    // 7. Seed Transactions
    for (const tx of compData.transactions) {
      const existingTx = await prisma.transaction.findFirst({
        where: { companyId: company.id, description: tx.desc },
      });
      if (!existingTx) {
        await prisma.transaction.create({
          data: {
            companyId: company.id,
            amount: tx.amount,
            currency: 'INR',
            status: 'SUCCESS',
            description: tx.desc,
          },
        });
      }
    }

    // 8. Log Seed Audit Event in MongoDB
    await logAuditEvent({
      module: 'COMPANY',
      action: 'SEED_TENANT_PROVISIONED',
      entityId: company.id,
      companyId: company.id,
      performedBy: 'system@ops.saas',
      details: {
        code: company.code,
        gstin: company.gstin,
        ratePer1000: compData.rate,
        heads: compData.heads,
      },
    });

    console.log(`? Tenant '${compData.name}' (${compData.code}) seeded with GSTIN '${compData.gstin}' & operational parameters.`);
  }

  console.log('\n?? All database fixtures seeded successfully with 100% idempotency!');
}

main()
  .catch((e) => {
    console.error('? Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await closeMongoConnection();
  });
