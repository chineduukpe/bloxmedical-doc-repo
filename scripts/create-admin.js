const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('👤 Creating admin user...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('password', 12);

    const user = await prisma.user.upsert({
      where: { email: 'admin@bloxmedical.com' },
      update: {
        password: hashedPassword,
        name: 'Admin User',
      },
      create: {
        email: 'admin@bloxmedical.com',
        name: 'Admin User',
        password: hashedPassword,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password: password');
    console.log('👤 Name:', user.name);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
