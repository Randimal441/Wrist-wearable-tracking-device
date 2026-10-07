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

const pool: Pool =
  globalThis._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis._pgPool = pool;
}

export default pool;
