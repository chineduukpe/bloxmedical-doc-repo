import { Pool } from 'pg';

// Use connection pooling for better reliability and performance
// Pool automatically handles connection management, reconnection, and cleanup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Export connectDB function that returns the pool
// The pool interface is compatible with Client (both have .query() method)
export async function connectDB() {
  return pool;
}

// Export a convenience function for direct queries
export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

// Export pool for advanced usage if needed
export { pool };
