import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

// POST /api/verify-email - Verify user email
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const client = await connectDB();

    // Find the verification token
    const tokenResult = await client.query(
      'SELECT * FROM "bloxadmin_VerificationToken" WHERE token = $1 AND expires > NOW()',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    const verificationToken = tokenResult.rows[0];
    const email = verificationToken.identifier;

    // Update user's email verification status
    const userResult = await client.query(
      'UPDATE "bloxadmin_User" SET "emailVerified" = NOW() WHERE email = $1 RETURNING id, name, email',
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the used verification token
    await client.query('DELETE FROM "bloxadmin_VerificationToken" WHERE token = $1', [
      token,
    ]);

    return NextResponse.json({
      message: 'Email verified successfully',
      user: userResult.rows[0],
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}
