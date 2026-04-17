/**
 * Hosted PostgreSQL often only allows TLS (pg_hba shows "no encryption" otherwise).
 * Local Postgres typically does not require TLS.
 *
 * @param {string} connectionString
 * @returns {{ connectionString: string; ssl?: import('pg').ConnectionConfig['ssl'] }}
 */
function buildPgConfig(connectionString) {
  if (!connectionString) {
    return { connectionString: '' };
  }

  const lower = connectionString.toLowerCase();
  if (lower.includes('sslmode=disable')) {
    return { connectionString };
  }

  // URL already requests TLS — pg reads sslmode from the connection string.
  if (
    lower.includes('sslmode=require') ||
    lower.includes('sslmode=verify-full') ||
    lower.includes('sslmode=verify-ca') ||
    lower.includes('sslmode=no-verify') ||
    lower.includes('ssl=true')
  ) {
    return { connectionString };
  }

  let host = '';
  try {
    const normalized = connectionString.replace(/^postgres(ql)?:/i, 'http:');
    host = new URL(normalized).hostname;
  } catch {
    host = '';
  }

  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local');

  if (isLocal) {
    return { connectionString };
  }

  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
}

module.exports = { buildPgConfig };
