const express = require('express');
const cors = require('cors');
require('dotenv').config();

const companyRoutes = require('./routes/companyRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoutes = require('./routes/userRoutes');
const parameterRoutes = require('./routes/parameterRoutes');
const auditRoutes = require('./routes/auditRoutes');
const statsRoutes = require('./routes/statsRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const { initMongo, logAuditEvent } = require('./services/auditLogger');
const prisma = require('./db');

const SEED_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize MongoDB for Audit Logging
initMongo();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/companies', companyRoutes);
app.use('/api/companies', parameterRoutes);
app.use('/api/companies', transactionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/stats', statsRoutes);

// POST /api/seed/parameters - Add or update a master default parameter on 000 Seed company
app.post('/api/seed/parameters', async (req, res) => {
  try {
    const { key, value, description } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ success: false, message: 'Key and Value are required' });
    }

    const param = await prisma.parameter.upsert({
      where: {
        companyId_key: {
          companyId: SEED_COMPANY_ID,
          key: key.trim(),
        },
      },
      update: {
        value: String(value),
        description: description || null,
      },
      create: {
        companyId: SEED_COMPANY_ID,
        key: key.trim(),
        value: String(value),
        description: description || null,
      },
    });

    // 🍃 LOG AUDIT EVENT TO MONGODB
    await logAuditEvent({
      module: 'SEED',
      action: 'ADD_SEED_PARAMETER',
      entityId: param.id,
      companyId: SEED_COMPANY_ID,
      details: { key: param.key, value: param.value },
    });

    res.status(201).json({
      success: true,
      message: 'New default parameter added to 000 Seed Company. All future companies will inherit this parameter.',
      data: param,
    });
  } catch (error) {
    console.error('Error adding seed parameter:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'SaaS OPS Super Admin API',
    database: 'PostgreSQL + MongoDB Audit Logger',
    timestamp: new Date().toISOString(),
  });
});

const { closeMongoConnection } = require('./config/mongo');

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`🚀 SaaS OPS Super Admin Backend running at http://localhost:${PORT}`);
});

// Graceful Shutdown
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await closeMongoConnection();
    await prisma.$disconnect();
    console.log('Database connections closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server };
