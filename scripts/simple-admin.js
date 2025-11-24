const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function createAdmin() {
  const client = new Client({
    connectionString:
      'postgresql://chinedu:pandora007@localhost:5432/bloxmedical',
  });

  try {
    await client.connect();
    console.log('👤 Creating admin user...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('password', 12);

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM "bloxadmin_User" WHERE email = $1',
      ['admin@bloxmedical.com']
    );

    if (existingUser.rows.length > 0) {
      // Update existing user
      await client.query(
        'UPDATE "bloxadmin_User" SET password = $1, name = $2 WHERE email = $3',
        [hashedPassword, 'Admin User', 'admin@bloxmedical.com']
      );
      console.log('✅ Admin user updated successfully!');
    } else {
      // Create new user
      await client.query(
        'INSERT INTO "bloxadmin_User" (id, email, name, password, "emailVerified") VALUES ($1, $2, $3, $4, $5)',
        [
          'admin-' + Date.now(),
          'admin@bloxmedical.com',
          'Admin User',
          hashedPassword,
          null,
        ]
      );
      console.log('✅ Admin user created successfully!');
    }

    console.log('📧 Email: admin@bloxmedical.com');
    console.log('🔑 Password: password');
    console.log('👤 Name: Admin User');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdmin();
