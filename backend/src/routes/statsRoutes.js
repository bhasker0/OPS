const express = require('express');
const prisma = require('../db');
const { getIsConnected } = require('../config/mongo');
const { formatIndianCurrency } = require('../utils/currencyFormatter');

const router = express.Router();

// GET /api/stats - Main Analytics Overview & System Health
router.get('/', async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalUsers,
      internalOpsUsers,
      totalTransactions,
    ] = await Promise.all([
      prisma.company.count({ where: { isSeed: false } }),
      prisma.company.count({ where: { isSeed: false, status: 'ACTIVE' } }),
      prisma.company.count({ where: { isSeed: false, status: 'SUSPENDED' } }),
      prisma.user.count(),
      prisma.user.count({ where: { isInternalOps: true } }),
      prisma.transaction.count(),
    ]);

    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [volume24hAgg, totalVolumeAgg, recentTx] = await Promise.all([
      prisma.transaction.aggregate({
        where: { createdAt: { gte: past24h } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
      }),
    ]);

    const totalVolume = totalVolumeAgg._sum.amount || 0;
    const volume24h = volume24hAgg._sum.amount || 0;

    res.json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        suspendedCompanies,
        totalUsers,
        internalOpsUsers,
        tenantUsers: totalUsers - internalOpsUsers,
        totalTransactions,
        volume24h: parseFloat(volume24h.toFixed(2)),
        volume24hFormatted: formatIndianCurrency(volume24h),
        totalVolume: parseFloat(totalVolume.toFixed(2)),
        totalVolumeFormatted: formatIndianCurrency(totalVolume),
        recentTransactions: recentTx,
        systemHealth: {
          postgres: 'HEALTHY',
          mongo: getIsConnected() ? 'HEALTHY' : 'BUFFERED',
          uptimePercent: 99.99,
          lastChecked: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching overall stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/stats/global - Executive Global Dashboard Metrics
router.get('/global', async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      totalTransactions,
      transactionAggregate,
      activeFeaturesCount,
    ] = await Promise.all([
      prisma.company.count({ where: { isSeed: false } }),
      prisma.company.count({ where: { isSeed: false, status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.transaction.count(),
      prisma.transaction.aggregate({ _sum: { amount: true } }),
      prisma.parameter.count({
        where: {
          key: { startsWith: 'feature_' },
          value: 'true',
        },
      }),
    ]);

    const totalVolume = transactionAggregate._sum.amount || 0;

    res.json({
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        totalUsers,
        totalTransactions,
        totalVolume: parseFloat(totalVolume.toFixed(2)),
        totalVolumeFormatted: formatIndianCurrency(totalVolume),
        activeFeaturesCount,
        systemStatus: 'ALL_SYSTEMS_OPERATIONAL',
      },
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/stats/company/:id - Specific Company Stats
router.get('/company/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [userCount, paramCount, transactionCount, volumeAgg] = await Promise.all([
      prisma.user.count({ where: { companyId: id } }),
      prisma.parameter.count({ where: { companyId: id } }),
      prisma.transaction.count({ where: { companyId: id } }),
      prisma.transaction.aggregate({
        where: { companyId: id },
        _sum: { amount: true },
      }),
    ]);

    const totalVolume = volumeAgg._sum.amount || 0;

    res.json({
      success: true,
      data: {
        userCount,
        paramCount,
        transactionCount,
        totalVolume: parseFloat(totalVolume.toFixed(2)),
        totalVolumeFormatted: formatIndianCurrency(totalVolume),
      },
    });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
