import { NextResponse } from 'next/server';

// POST /api/env-open — Open debug endpoint: returns all process.env keys/values
export async function POST() {
  const keys = Object.keys(process.env).sort();
  const env: Record<string, string | undefined> = {};
  for (const key of keys) {
    env[key] = process.env[key];
  }

  return NextResponse.json({
    count: keys.length,
    env,
  });
}
