const { PrismaClient } = require('@prisma/client');

// Instance unique du client Prisma, réutilisée dans toute l'app
// (évite d'épuiser le pool de connexions en dev avec le hot-reload)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
