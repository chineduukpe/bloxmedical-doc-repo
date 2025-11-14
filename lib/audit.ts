import { connectDB } from './db';

export interface AuditLogEntry {
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: any;
  newValues?: any;
  userId: string;
}

export async function logAudit(entry: AuditLogEntry) {
  try {
    const client = await connectDB();

    await client.query(
      `INSERT INTO "AuditLog" (id, "tableName", "recordId", action, "oldValues", "newValues", "userId", "createdAt") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        require('cuid')(),
        entry.tableName,
        entry.recordId,
        entry.action,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.userId,
      ]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

export async function getAuditLogs(
  tableName?: string,
  recordId?: string,
  limit: number = 50
) {
  try {
    const client = await connectDB();

    let query = `
      SELECT al.*, u.name as "userName", u.email as "userEmail"
      FROM "AuditLog" al
      JOIN "User" u ON al."userId" = u.id
    `;

    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (tableName) {
      conditions.push(`al."tableName" = $${paramCount}`);
      params.push(tableName);
      paramCount++;
    }

    if (recordId) {
      conditions.push(`al."recordId" = $${paramCount}`);
      params.push(recordId);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY al."createdAt" DESC LIMIT $${paramCount}`;
    params.push(limit);

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}
