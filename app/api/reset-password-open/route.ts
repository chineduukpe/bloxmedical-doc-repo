import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 12;

// POST /api/reset-password-open - Open endpoint to reset password by email and new password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : undefined;
    const password = body.password;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const client = await connectDB();

    const userResult = await client.query(
      'SELECT id, password FROM "bloxadmin_User" WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await client.query(
      'UPDATE "bloxadmin_User" SET password = $1, "updatedAt" = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );

    return NextResponse.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Error in reset-password-open:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
