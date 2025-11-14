const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('password', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@bloxmedical.com' },
    update: {},
    create: {
      email: 'admin@bloxmedical.com',
      name: 'Admin User',
      password: hashedPassword,
    },
  });

  console.log('Database setup complete!');
  console.log('Admin user created:', {
    email: user.email,
    password: 'password',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
