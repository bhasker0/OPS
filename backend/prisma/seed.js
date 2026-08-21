const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

async function main() {
  console.log('🌱 Starting database seeding with Indian Business compliance & parameters...');

  // 1. Create Master Seed Company (000 UUID)
  const seedCompany = await prisma.company.upsert({
    where: { id: SEED_COMPANY_ID },
    update: {
      name: 'Master Seed Company',
      code: 'SEED000',
      isSeed: true,
      status: 'ACTIVE',
      contactPerson: 'OPS Administrator',
      mobile: '+91 99999 00000',
      email: 'seed@ops.saas',
      gstin: '27AAAAA0000A1Z5',
      address: 'System HQ, Tech Zone, Mumbai, Maharashtra 400001',
      roundOffFormat: 'NEAREST_RUPEE',
      digitsAfterDecimal: 2,
    },
    create: {
      id: SEED_COMPANY_ID,
      name: 'Master Seed Company',
      code: 'SEED000',
      isSeed: true,
      status: 'ACTIVE',
      contactPerson: 'OPS Administrator',
      mobile: '+91 99999 00000',
      email: 'seed@ops.saas',
      gstin: '27AAAAA0000A1Z5',
      address: 'System HQ, Tech Zone, Mumbai, Maharashtra 400001',
      roundOffFormat: 'NEAREST_RUPEE',
      digitsAfterDecimal: 2,
    },
  });

  // Indian Default Parameters
  const defaultParameters = [
    { key: 'date_format', value: 'DD/MM/YYYY', description: 'Standard Indian Date Format' },
    { key: 'time_format', value: '12H', description: 'Standard Time Format' },
    { key: 'currency', value: 'INR', description: 'Indian Rupee Billing Currency' },
    { key: 'currency_symbol', value: '₹', description: 'Indian Rupee Symbol' },
    { key: 'timezone', value: 'Asia/Kolkata', description: 'Indian Standard Time Zone (IST)' },
    { key: 'round_off_format', value: 'NEAREST_RUPEE', description: 'Round off transaction values to nearest Rupee' },
    { key: 'digits_after_decimal', value: '2', description: 'Decimal precision for financial calculations' },
    { key: 'feature_dark_mode', value: 'true', description: 'Enable dark mode interface toggle' },
    { key: 'feature_audit_logs', value: 'true', description: 'Enable detailed security audit logs' },
    { key: 'feature_mfa_required', value: 'false', description: 'Require Multi-Factor Authentication' },
  ];

  for (const param of defaultParameters) {
    await prisma.parameter.upsert({
      where: { companyId_key: { companyId: SEED_COMPANY_ID, key: param.key } },
      update: { value: param.value, description: param.description },
      create: { companyId: SEED_COMPANY_ID, key: param.key, value: param.value, description: param.description },
    });
  }

  // 2. OPS Super Admin Role & User
  const opsRole = await prisma.role.create({
    data: { name: 'OPS Super Admin', companyId: SEED_COMPANY_ID, isSystemDefined: true, permissions: JSON.stringify(['*']) },
  });

  await prisma.user.upsert({
    where: { email: 'admin@ops.saas' },
    update: { roleId: opsRole.id, companyId: SEED_COMPANY_ID, isInternalOps: true },
    create: { name: 'Super Admin User', email: 'admin@ops.saas', password: 'adminpassword123', companyId: SEED_COMPANY_ID, roleId: opsRole.id, isInternalOps: true },
  });

  // 3. Sample Registered Indian Companies
  const sampleIndianCompanies = [
    {
      name: 'Acme Solutions India Pvt Ltd',
      code: 'ACMEIN',
      contactPerson: 'Rajesh Sharma',
      mobile: '+91 98765 43210',
      email: 'billing@acmeindia.in',
      gstin: '27AAPCU1234M1ZV',
      address: '101 Tech Park, Bandra Kurla Complex, Mumbai, Maharashtra 400051',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
    },
    {
      name: 'Stark Tech Innovations Pvt Ltd',
      code: 'STARKIN',
      contactPerson: 'Priya Nair',
      mobile: '+91 91234 56789',
      email: 'finance@starktech.in',
      gstin: '29AAACS5678N1Z2',
      address: '45 Electronics City Phase 1, Bengaluru, Karnataka 560100',
      logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&auto=format&fit=crop&q=60',
    },
  ];

  for (const compData of sampleIndianCompanies) {
    const existing = await prisma.company.findUnique({ where: { code: compData.code } });
    if (!existing) {
      const companyId = uuidv4();
      const company = await prisma.company.create({
        data: {
          id: companyId,
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
        },
      });

      // System defined role
      const sysRole = await prisma.role.create({
        data: {
          name: `${compData.name} System Administrator`,
          companyId: company.id,
          isSystemDefined: true,
          permissions: JSON.stringify(['READ_ALL', 'WRITE_ALL', 'ADMIN_ACCESS']),
        },
      });

      // Clone parameters
      const clonedParams = defaultParameters.map(p => ({
        companyId: company.id,
        key: p.key,
        value: p.value,
        description: p.description,
      }));
      await prisma.parameter.createMany({ data: clonedParams });

      // Create users
      await prisma.user.createMany({
        data: [
          { name: `${compData.contactPerson} (Director)`, email: compData.email, companyId: company.id, roleId: sysRole.id, status: 'ACTIVE' },
          { name: `Accounts Lead`, email: `accounts@${compData.code.toLowerCase()}.in`, companyId: company.id, status: 'ACTIVE' },
        ],
      });

      // Create transactions
      await prisma.transaction.createMany({
        data: [
          { companyId: company.id, amount: 150000.00, currency: 'INR', status: 'SUCCESS', description: 'Annual Enterprise SaaS Plan + GST' },
          { companyId: company.id, amount: 25000.00, currency: 'INR', status: 'SUCCESS', description: 'Add-on Support Service Package' },
        ],
      });

      console.log(`✅ Sample Indian Company '${compData.name}' created with GSTIN '${compData.gstin}'.`);
    }
  }

  console.log('🌱 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
