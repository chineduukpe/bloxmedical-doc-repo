import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  sendEmail,
  generateVerificationToken,
  createVerificationEmailHtml,
  createVerificationEmailText,
} from '@/lib/email';
import cuid from 'cuid';

// POST /api/resend-verification - Resend verification email
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await connectDB();

    // Get user details
    const userResult = await client.query(
      'SELECT id, name, email, "emailVerified" FROM "User" WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Check if user is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'User email is already verified' },
        { status: 400 }
      );
    }

    // Generate new verification token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Delete any existing verification tokens for this user
    await client.query(
      'DELETE FROM "VerificationToken" WHERE identifier = $1',
      [user.email]
    );

    // Store new verification token
    await client.query(
      'INSERT INTO "VerificationToken" (id, identifier, token, expires) VALUES ($1, $2, $3, $4)',
      [cuid(), user.email, token, expires]
    );

    // Create verification link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;

    // Send verification email
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Verify Your Email - BLOX Medical Admin',
      html: createVerificationEmailHtml(user.name || 'User', verificationLink),
      text: createVerificationEmailText(user.name || 'User', verificationLink),
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  }
}
