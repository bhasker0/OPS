const express = require('express');
const prisma = require('../db');

const router = express.Router();

// GET /api/stats/global - Executive Global Dashboard Metrics
router.get('/global', async (req, res) => {
  try {
    const totalCompanies = await prisma.company.count({
      where: { isSeed: false },
    });

    const totalUsers = await prisma.user.count();

    const totalTransactions = await prisma.transaction.count();

    const transactionAggregate = await prisma.transaction.aggregate({
      _sum: { amount: true },
    });

    const totalVolume = transactionAggregate._sum.amount || 0;

    const activeFeaturesCount = await prisma.parameter.count({
      where: {
        key: { startsWith: 'feature_' },
        value: 'true',
      },
    });

    res.json({
      success: true,
      data: {
        totalCompanies,
        totalUsers,
        totalTransactions,
        totalVolume: parseFloat(totalVolume.toFixed(2)),
        activeFeaturesCount,
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

    const userCount = await prisma.user.count({ where: { companyId: id } });
    const paramCount = await prisma.parameter.count({ where: { companyId: id } });
    const transactionCount = await prisma.transaction.count({ where: { companyId: id } });

    const volumeAgg = await prisma.transaction.aggregate({
      where: { companyId: id },
      _sum: { amount: true },
    });

    res.json({
      success: true,
      data: {
        userCount,
        paramCount,
        transactionCount,
        totalVolume: parseFloat((volumeAgg._sum.amount || 0).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Error fetching company stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
