const express = require('express');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../db');
const { logAuditEvent } = require('../services/auditLogger');
const { dispatchOpsSync } = require('../services/opsSyncClient');

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

    // 🔄 SYNC TO ETMS BACKEND
    dispatchOpsSync('company', result.company).catch(err => console.error('Sync failed:', err));

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

// PUT /api/companies/:id - Update company details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logoUrl, contactPerson, mobile, email, gstin, address, roundOffFormat, digitsAfterDecimal } = req.body;

    const oldCompany = await prisma.company.findUnique({ where: { id } });
    if (!oldCompany) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(mobile !== undefined && { mobile }),
        ...(email !== undefined && { email }),
        ...(gstin !== undefined && { gstin: gstin ? gstin.trim().toUpperCase() : null }),
        ...(address !== undefined && { address }),
        ...(roundOffFormat && { roundOffFormat }),
        ...(digitsAfterDecimal !== undefined && { digitsAfterDecimal: parseInt(digitsAfterDecimal) }),
      },
    });

    await logAuditEvent({
      module: 'COMPANY',
      action: 'UPDATE_COMPANY',
      entityId: id,
      companyId: id,
      details: { old: oldCompany, updated },
    });

    res.json({ success: true, message: 'Company updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/companies/:id/status - Toggle company status (ACTIVE, SUSPENDED, ARCHIVED)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be ACTIVE, SUSPENDED, or ARCHIVED' });
    }

    const oldCompany = await prisma.company.findUnique({ where: { id } });
    if (!oldCompany) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const updated = await prisma.company.update({
      where: { id },
      data: { status },
    });

    await logAuditEvent({
      module: 'COMPANY',
      action: 'UPDATE_COMPANY_STATUS',
      entityId: id,
      companyId: id,
      details: { previousStatus: oldCompany.status, newStatus: status },
    });

    res.json({ success: true, message: `Company status changed to ${status}`, data: updated });
  } catch (error) {
    console.error('Error updating company status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/companies/:id - Soft-delete or remove company
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === SEED_COMPANY_ID) {
      return res.status(400).json({ success: false, message: 'Master Seed Company cannot be deleted.' });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    await prisma.company.delete({ where: { id } });

    await logAuditEvent({
      module: 'COMPANY',
      action: 'DELETE_COMPANY',
      entityId: id,
      companyId: id,
      details: { name: company.name, code: company.code },
    });

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
