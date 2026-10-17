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

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Please add it to your .env.local file.\n' +
      'Example: DATABASE_URL=postgresql://USER@localhost:5432/wrist_tracking'
    );
  }

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalThis._pgPool = pool;
  }

  return pool;
}

// Lazy proxy — the Pool is created on first property access,
// ensuring env vars are loaded before the connection is made.
const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default pool;
