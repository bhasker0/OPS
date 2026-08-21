const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../db');
const { logAuditEvent } = require('../services/auditLogger');

const router = express.Router();
const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/companies - List all registered companies
router.get('/', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        roles: {
          where: { isSystemDefined: true },
        },
        _count: {
          select: { parameters: true, users: true, transactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: companies });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/companies/:id - Get detailed view of a company
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        roles: true,
        parameters: {
          orderBy: { key: 'asc' },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            isInternalOps: true,
            createdAt: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({ success: true, data: company });
  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/companies - Register a new company with Indian Compliance & Utility Formats
router.post('/', async (req, res) => {
  try {
    const {
      name,
      code,
      logoUrl,
      contactPerson,
      mobile,
      email,
      gstin,
      address,
      timezone,
      dateFormat,
      timeFormat,
      currency,
      currencySymbol,
      roundOffFormat,
      digitsAfterDecimal,
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Company Name and Code are required' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Check code uniqueness
    const existing = await prisma.company.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Company code '${cleanCode}' is already registered.` });
    }

    const newCompanyId = uuidv4();

    // Perform atomic transaction:
    // 1. Create Company with Indian Business fields
    // 2. Create System Defined Role for Company
    // 3. Populate custom parameters & clone seed parameters
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          id: newCompanyId,
          name: name.trim(),
          code: cleanCode,
          logoUrl: logoUrl || null,
          contactPerson: contactPerson || null,
          mobile: mobile || null,
          email: email || null,
          gstin: gstin ? gstin.trim().toUpperCase() : null,
          address: address || null,
          roundOffFormat: roundOffFormat || 'NEAREST_RUPEE',
          digitsAfterDecimal: digitsAfterDecimal ? parseInt(digitsAfterDecimal) : 2,
          status: 'ACTIVE',
          isSeed: false,
        },
      });

      // 2. Create System-Defined Role for this company
      const systemRole = await tx.role.create({
        data: {
          name: `${company.name} System Administrator`,
          companyId: company.id,
          isSystemDefined: true,
          permissions: JSON.stringify(['READ_ALL', 'WRITE_ALL', 'ADMIN_ACCESS']),
        },
      });

      // 3. Fetch Seed Company Parameters
      const seedParameters = await tx.parameter.findMany({
        where: { companyId: SEED_COMPANY_ID },
      });

      // Customized parameter dictionary overrides
      const customParamOverrides = {
        date_format: dateFormat || 'DD/MM/YYYY',
        time_format: timeFormat || '12H',
        currency: currency || 'INR',
        currency_symbol: currencySymbol || '₹',
        timezone: timezone || 'Asia/Kolkata',
        round_off_format: roundOffFormat || 'NEAREST_RUPEE',
        digits_after_decimal: String(digitsAfterDecimal || 2),
      };

      // 4. Build cloned parameters list with custom overrides
      const clonedParameters = seedParameters.map((param) => ({
        companyId: company.id,
        key: param.key,
        value: customParamOverrides[param.key] !== undefined ? customParamOverrides[param.key] : param.value,
        description: param.description,
      }));

      // Add any additional override keys that were not in seed
      Object.keys(customParamOverrides).forEach((key) => {
        if (!clonedParameters.some((p) => p.key === key)) {
          clonedParameters.push({
            companyId: company.id,
            key,
            value: customParamOverrides[key],
            description: `Configured utility setting ${key}`,
          });
        }
      });

      await tx.parameter.createMany({
        data: clonedParameters,
      });

      // Fetch created parameters
      const createdParams = await tx.parameter.findMany({
        where: { companyId: company.id },
      });

      return {
        company,
        systemRole,
        parametersCount: createdParams.length,
        parameters: createdParams,
      };
    });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'COMPANY',
      action: 'REGISTER_INDIAN_COMPANY',
      entityId: result.company.id,
      companyId: result.company.id,
      details: {
        name: result.company.name,
        code: result.company.code,
        gstin: result.company.gstin,
        contactPerson: result.company.contactPerson,
        mobile: result.company.mobile,
        address: result.company.address,
        timezone: timezone || 'Asia/Kolkata',
        currency: currency || 'INR',
        systemRole: result.systemRole.name,
        clonedParametersCount: result.parametersCount,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Indian Business Company registered successfully with compliance details, system role, and utility parameters.',
      data: result,
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
