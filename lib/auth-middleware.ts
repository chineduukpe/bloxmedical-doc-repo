import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { connectDB } from './db';

export interface AuthenticatedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: 'ADMIN' | 'COLLABORATOR';
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return null;
    }

    const client = await connectDB();
    const result = await client.query(
      'SELECT id, name, email, role FROM "User" WHERE id = $1',
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

export function requireAuth(
  handler: (
    req: NextRequest,
    user: AuthenticatedUser,
    context?: any
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(req, user, context);
  };
}

export function requireRole(roles: ('ADMIN' | 'COLLABORATOR')[]) {
  return function (
    handler: (
      req: NextRequest,
      user: AuthenticatedUser,
      context?: any
    ) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, context?: any) => {
      const user = await getAuthenticatedUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      if (!roles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(req, user, context);
    };
  };
}

export function requireAdmin(
  handler: (
    req: NextRequest,
    user: AuthenticatedUser,
    context?: any
  ) => Promise<NextResponse>
) {
  return requireRole(['ADMIN'])(handler);
}
