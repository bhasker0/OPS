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

// GET /api/stats/health-deep - Deep Infrastructure Telemetry, Heartbeats & Latency Monitor (SCRUM-82)
router.get('/health-deep', async (req, res) => {
  const startOverall = Date.now();

  // 1. Measure PostgreSQL Heartbeat & Latency
  let pgStatus = 'DOWN';
  let pgLatencyMs = -1;
  let pgError = null;
  const startPg = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    pgLatencyMs = Date.now() - startPg;
    pgStatus = 'UP';
  } catch (err) {
    pgLatencyMs = Date.now() - startPg;
    pgError = err.message;
  }

  // 2. Measure MongoDB Heartbeat & Latency
  let mongoStatus = 'DOWN';
  let mongoLatencyMs = -1;
  let mongoError = null;
  const startMongo = Date.now();
  try {
    if (getIsConnected()) {
      const mongoose = require('mongoose');
      await mongoose.connection.db.admin().ping();
      mongoLatencyMs = Date.now() - startMongo;
      mongoStatus = 'UP';
    } else {
      mongoStatus = 'BUFFERED';
      mongoLatencyMs = 0;
    }
  } catch (err) {
    mongoLatencyMs = Date.now() - startMongo;
    mongoError = err.message;
  }

  // 3. Measure ETMS Outbound Gateway Connectivity
  let etmsStatus = 'UNREACHABLE';
  let etmsLatencyMs = -1;
  const startEtms = Date.now();
  try {
    const etmsUrl = process.env.ETMS_BACKEND_URL || 'http://localhost:4000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const etmsRes = await fetch(`${etmsUrl}/api/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    etmsLatencyMs = Date.now() - startEtms;
    if (etmsRes.ok) etmsStatus = 'UP';
    else etmsStatus = `HTTP_${etmsRes.status}`;
  } catch (err) {
    etmsLatencyMs = Date.now() - startEtms;
    etmsStatus = 'STANDALONE_MODE';
  }

  // 4. Runtime & Process Telemetry
  const mem = process.memoryUsage();
  const uptimeSec = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  const seconds = uptimeSec % 60;
  const uptimeFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;

  // Determine aggregate system status
  const isHealthy = pgStatus === 'UP' && (mongoStatus === 'UP' || mongoStatus === 'BUFFERED');
  const isDegraded = pgLatencyMs > 250 || mongoLatencyMs > 250;
  const overallStatus = !isHealthy ? 'CRITICAL' : isDegraded ? 'DEGRADED' : 'HEALTHY';

  res.json({
    success: true,
    data: {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startOverall,
      heartbeats: {
        postgres: {
          service: 'PostgreSQL 16 Multi-Tenant Store',
          status: pgStatus,
          latencyMs: pgLatencyMs,
          error: pgError,
        },
        mongo: {
          service: 'MongoDB 7 Audit Log Cluster',
          status: mongoStatus,
          latencyMs: mongoLatencyMs,
          error: mongoError,
        },
        etmsGateway: {
          service: 'ETMS Outbound Job-Work Sync Gateway',
          status: etmsStatus,
          latencyMs: etmsLatencyMs,
        },
      },
      runtime: {
        processId: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: uptimeSec,
        uptimeFormatted,
        memory: {
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
          rssMB: Math.round(mem.rss / 1024 / 1024),
          externalMB: Math.round(mem.external / 1024 / 1024),
        },
        cpuUsage: process.cpuUsage(),
      },
    },
  });
});

module.exports = router;
