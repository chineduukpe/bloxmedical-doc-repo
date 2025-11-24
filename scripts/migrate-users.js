const { Client } = require('pg');

const client = new Client({
  connectionString:
    'postgresql://chinedu:pandora007@localhost:5432/bloxmedical',
});

async function migrateUsers() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Add disabled column if it doesn't exist
    await client.query(`
      ALTER TABLE "bloxadmin_User" 
      ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT false
    `);

    // Add createdAt column if it doesn't exist
    await client.query(`
      ALTER TABLE "bloxadmin_User" 
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW()
    `);

    // Add updatedAt column if it doesn't exist
    await client.query(`
      ALTER TABLE "bloxadmin_User" 
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW()
    `);

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrateUsers();
