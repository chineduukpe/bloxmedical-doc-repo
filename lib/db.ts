import { Client } from 'pg';

const client = new Client({
  connectionString:
    'postgresql://chinedu:pandora007@localhost:5432/bloxmedical',
});

export async function connectDB() {
  if (!client._connected) {
    await client.connect();
  }
  return client;
}

export { client };
