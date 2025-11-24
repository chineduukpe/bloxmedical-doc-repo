const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function ensureAdminExists() {
  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://chinedu:pandora007@localhost:5432/bloxmedical',
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Check if admin user exists
    const adminCheck = await client.query(
      'SELECT id, role FROM "bloxadmin_User" WHERE email = $1',
      ['admin@bloxmedical.com']
    );

    if (adminCheck.rows.length === 0) {
      console.log('👤 Creating admin user...');

      // Create admin user with ADMIN role
      const hashedPassword = await bcrypt.hash('password', 12);
      const adminId = require('cuid')();

      await client.query(
        `INSERT INTO "bloxadmin_User" (id, name, email, password, role, "emailVerified", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          adminId,
          'Admin User',
          'admin@bloxmedical.com',
          hashedPassword,
          'ADMIN',
          true,
        ]
      );

      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@bloxmedical.com');
      console.log('🔑 Password: password');
      console.log('👤 Name: Admin User');
      console.log('🔐 Role: ADMIN');
    } else {
      const admin = adminCheck.rows[0];
      console.log('👤 Admin user already exists');

      // Ensure admin has ADMIN role
      if (admin.role !== 'ADMIN') {
        console.log('🔐 Updating admin role to ADMIN...');
        await client.query(
          'UPDATE "bloxadmin_User" SET role = $1, "updatedAt" = NOW() WHERE id = $2',
          ['ADMIN', admin.id]
        );
        console.log('✅ Admin role updated to ADMIN');
      } else {
        console.log('✅ Admin role is already set to ADMIN');
      }
    }
  } catch (error) {
    console.error('❌ Failed to ensure admin exists:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the function
ensureAdminExists();
