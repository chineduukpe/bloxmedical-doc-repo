import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  sendEmail,
  generateVerificationToken,
  createPasswordResetEmailHtml,
  createPasswordResetEmailText,
} from '@/lib/email';
import cuid from 'cuid';

// POST /api/forgot-password - Send password reset email
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const client = await connectDB();

    try {
      // Check if user exists
      const userResult = await client.query(
        'SELECT id, name, email FROM "bloxadmin_User" WHERE email = $1',
        [email]
      );

      // Always return success to prevent email enumeration
      // But only send email if user exists
      if (userResult.rows.length === 0) {
        return NextResponse.json({
          message:
            'If an account with that email exists, a password reset link has been sent.',
        });
      }

      const user = userResult.rows[0];

      // Generate reset token
      const token = generateVerificationToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Delete any existing reset tokens for this user
      // Use a prefix to distinguish from email verification tokens
      const identifier = `reset:${user.email}`;
      await client.query(
        'DELETE FROM "bloxadmin_VerificationToken" WHERE identifier = $1',
        [identifier]
      );

      // Store reset token
      await client.query(
        'INSERT INTO "bloxadmin_VerificationToken" (id, identifier, token, expires) VALUES ($1, $2, $3, $4)',
        [cuid(), identifier, token, expires]
      );

      // Create reset link
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
      const resetLink = `${baseUrl}/reset-password?token=${token}`;

      // Send reset email
      const emailResult = await sendEmail({
        to: user.email,
        subject: 'Reset Your Password - BLOX Medical Admin',
        html: createPasswordResetEmailHtml(user.name || 'User', resetLink),
        text: createPasswordResetEmailText(user.name || 'User', resetLink),
      });

      if (!emailResult.success) {
        console.error(
          'Failed to send password reset email:',
          emailResult.error
        );
        // Still return success to prevent email enumeration
        return NextResponse.json({
          message:
            'If an account with that email exists, a password reset link has been sent.',
        });
      }

      return NextResponse.json({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (dbError) {
      console.error('Database error in forgot-password:', dbError);
      // Still return success to prevent email enumeration
      return NextResponse.json({
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });
    }
  } catch (error) {
    console.error('Error processing forgot password request:', error);
    // Return success to prevent email enumeration
    return NextResponse.json(
      {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      },
      { status: 200 }
    );
  }
}
