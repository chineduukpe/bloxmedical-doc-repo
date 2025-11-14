// Test Prisma client import
try {
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ Prisma client imported successfully');
  console.log('PrismaClient:', typeof PrismaClient);
} catch (error) {
  console.error('❌ Error importing Prisma client:', error.message);
}
