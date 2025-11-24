import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

// POST /api/reset-password - Reset password with token
export async function POST(request: NextRequest) {
  try {
    const { token, password, action } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    const client = await connectDB();

    try {
      // Find the reset token (using prefix to distinguish from email verification)
      // First find the token, then check if it's a reset token
      const tokenResult = await client.query(
        'SELECT * FROM "bloxadmin_VerificationToken" WHERE token = $1 AND expires > NOW()',
        [token]
      );

      if (tokenResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      const foundToken = tokenResult.rows[0];
      
      // Check if this is a password reset token (not an email verification token)
      if (!foundToken.identifier || !foundToken.identifier.startsWith('reset:')) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      const email = foundToken.identifier.replace('reset:', '');

      // If action is 'validate', just return success
      if (action === 'validate') {
        return NextResponse.json({
          message: 'Token is valid',
          email: email,
        });
      }

      // Validate password
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        );
      }

      // Get user by email
      const userResult = await client.query(
        'SELECT id, password FROM "bloxadmin_User" WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = userResult.rows[0];

      // Check if new password is same as current password
      if (user.password) {
        const isSamePassword = await bcrypt.compare(password, user.password);
        if (isSamePassword) {
          return NextResponse.json(
            { error: 'New password must be different from current password' },
            { status: 400 }
          );
        }
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update password in database
      await client.query(
        'UPDATE "bloxadmin_User" SET password = $1, "updatedAt" = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );

      // Delete the used reset token
      await client.query('DELETE FROM "bloxadmin_VerificationToken" WHERE token = $1', [
        token,
      ]);

      return NextResponse.json({
        message: 'Password reset successfully',
      });
    } catch (dbError) {
      console.error('Database error in reset-password:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

