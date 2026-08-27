const { PrismaClient } = require('@prisma/client');

// Global singleton pattern to prevent multiple instances during hot-reloading
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
