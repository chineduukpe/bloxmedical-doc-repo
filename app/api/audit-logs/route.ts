import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth-middleware';

// GET /api/audit-logs - Get audit logs (admin only)
export const GET = requireAdmin(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');
    const recordId = searchParams.get('recordId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const auditLogs = await getAuditLogs(
      tableName || undefined,
      recordId || undefined,
      limit
    );

    return NextResponse.json(auditLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
});
