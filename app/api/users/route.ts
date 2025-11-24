import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import cuid from 'cuid';
import {
  sendEmail,
  generateVerificationToken,
  createVerificationEmailHtml,
  createVerificationEmailText,
} from '@/lib/email';
import { requireAdmin } from '@/lib/auth-middleware';
import { logAudit } from '@/lib/audit';

// GET /api/users - Get all users
export async function GET() {
  try {
    const client = await connectDB();
    const result = await client.query(
      'SELECT id, name, email, "emailVerified", image, disabled, "createdAt" FROM "bloxadmin_User" ORDER BY "createdAt" DESC'
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export const POST = requireAdmin(async (request: NextRequest, user: any) => {
  try {
    const {
      name,
      email,
      password,
      role = 'COLLABORATOR',
    } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const client = await connectDB();

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM "bloxadmin_User" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate a unique ID using cuid
    const userId = cuid();

    // Create the user
    const result = await client.query(
      'INSERT INTO "bloxadmin_User" (id, name, email, password, role, "createdBy", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, name, email, role, "createdAt"',
      [userId, name, email, hashedPassword, role, user.id]
    );

    const createdUser = result.rows[0];

    // Generate verification token
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Store verification token
    await client.query(
      'INSERT INTO "bloxadmin_VerificationToken" (id, identifier, token, expires) VALUES ($1, $2, $3, $4)',
      [cuid(), email, token, expires]
    );

    // Create verification link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;

    // Send verification email
    const emailResult = await sendEmail({
      to: email,
      subject: 'Verify Your Email - BLOX Medical Admin',
      html: createVerificationEmailHtml(name, verificationLink),
      text: createVerificationEmailText(name, verificationLink),
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail user creation if email fails, just log it
    }

    // Log audit entry
    await logAudit({
      tableName: 'User',
      recordId: userId,
      action: 'CREATE',
      newValues: { name, email, role },
      userId: user.id,
    });

    return NextResponse.json(createdUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
});
