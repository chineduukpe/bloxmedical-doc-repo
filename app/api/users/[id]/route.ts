import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/auth-middleware';
import { logAudit } from '@/lib/audit';

// GET /api/users/[id] - Get a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await connectDB();
    const result = await client.query(
      'SELECT id, name, email, "emailVerified", image, disabled, "createdAt" FROM "bloxadmin_User" WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update a user
export const PUT = requireAdmin(
  async (
    request: NextRequest,
    user: any,
    context: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await context.params;
      const { name, email, password, disabled, role } = await request.json();
      const client = await connectDB();

      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM "bloxadmin_User" WHERE id = $1',
        [id]
      );

      if (existingUser.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if email is being changed and if it's already taken
      if (email) {
        const emailCheck = await client.query(
          'SELECT id FROM "bloxadmin_User" WHERE email = $1 AND id != $2',
          [email, id]
        );

        if (emailCheck.rows.length > 0) {
          return NextResponse.json(
            { error: 'Email already in use by another user' },
            { status: 400 }
          );
        }
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }

      if (email !== undefined) {
        updates.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
      }

      if (password !== undefined && password !== '') {
        const hashedPassword = await bcrypt.hash(password, 12);
        updates.push(`password = $${paramCount}`);
        values.push(hashedPassword);
        paramCount++;
      }

      if (disabled !== undefined) {
        updates.push(`disabled = $${paramCount}`);
        values.push(disabled);
        paramCount++;
      }

      if (role !== undefined) {
        updates.push(`role = $${paramCount}`);
        values.push(role);
        paramCount++;
      }

      if (updates.length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      updates.push(`"updatedAt" = NOW()`);
      updates.push(`"updatedBy" = $${paramCount + 1}`);
      values.push(id);
      values.push(user.id);

      const query = `UPDATE "bloxadmin_User" SET ${updates.join(
        ', '
      )} WHERE id = $${paramCount} RETURNING id, name, email, disabled, role, "createdAt"`;

      const result = await client.query(query, values);

      // Log audit entry
      await logAudit({
        tableName: 'User',
        recordId: id,
        action: 'UPDATE',
        newValues: { name, email, disabled, role },
        userId: user.id,
      });

      return NextResponse.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/users/[id] - Delete a user
export const DELETE = requireAdmin(
  async (
    request: NextRequest,
    user: any,
    context: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await context.params;
      const client = await connectDB();

      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM "bloxadmin_User" WHERE id = $1',
        [id]
      );

      if (existingUser.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Log audit entry before deletion
      await logAudit({
        tableName: 'User',
        recordId: id,
        action: 'DELETE',
        userId: user.id,
      });

      // Delete the user (this will cascade delete related records due to foreign key constraints)
      await client.query('DELETE FROM "bloxadmin_User" WHERE id = $1', [id]);

      return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }
  }
);
