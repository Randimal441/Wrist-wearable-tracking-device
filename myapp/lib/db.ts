
import dotenv from 'dotenv';
import { join } from 'node:path';
import { Pool } from 'pg';

dotenv.config({
  path: join(process.cwd(), '.env.local'),
});

const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Add your Supabase connection string to .env.local.\n' +
      'Example: DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres'
    );
  }

  // pg lets an `sslmode` in the URL override the `ssl` option below, so drop it
  // and configure TLS here instead.
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    // Don't echo the URL: it contains the database password.
    throw new Error(
      'DATABASE_URL is not a valid URL. If the password contains special characters ' +
      '(@ # / : ? % + ,), URL-encode them, e.g. "?" → %3F, "/" → %2F.'
    );
  }
  url.searchParams.delete('sslmode');

  // Supabase requires TLS, while a local PostgreSQL server commonly has TLS
  // disabled. DATABASE_SSL can explicitly override the default for either case.
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n');
  const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const useSsl = process.env.DATABASE_SSL
    ? process.env.DATABASE_SSL.toLowerCase() === 'true'
    : !isLocalDatabase;

  return new Pool({
    connectionString: url.toString(),
    ...(useSsl
      ? { ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false } }
      : {}),
  });
}

function getPool(): Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = createPool();
  }
  return globalForPg.pgPool;
}

// Lazy proxy — the Pool is created on first property access,
// ensuring env vars are loaded before the connection is made.
// Methods must be bound to the real Pool: pg-pool reassigns its own fields
// (e.g. `this._clients = this._clients.filter(...)`), and with `this` set to
// this proxy those writes would be lost and the pool would eventually hang.
const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const real = getPool();
    const value = (real as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export default pool;
export { pool };
