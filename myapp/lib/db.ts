import dotenv from 'dotenv';
import { join } from 'path';
import { Pool } from 'pg';

// Next.js loads .env.local automatically; for standalone scripts (migrate, seed)
// we load it manually here. dotenv.config() is a no-op if vars are already set.
dotenv.config({ path: join(process.cwd(), '.env.local') });

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (globalThis._pgPool) return globalThis._pgPool;

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

  // Supabase requires TLS. With DATABASE_CA_CERT (Supabase's CA, PEM) the server
  // certificate is verified; without it the connection is encrypted but unverified.
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n');

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
  });

  if (process.env.NODE_ENV !== 'production') {
    globalThis._pgPool = pool;
  }

  return pool;
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
