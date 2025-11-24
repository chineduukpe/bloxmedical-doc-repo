import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

let isConnected = false;

export async function connectDB() {
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
    } catch (error: any) {
      // If already connected, pg will throw an error
      // Check if it's a connection error or already connected error
      if (error.code !== '57P03' && !error.message.includes('already')) {
        throw error;
      }
      isConnected = true;
    }
  }
  return client;
}

export { client };
