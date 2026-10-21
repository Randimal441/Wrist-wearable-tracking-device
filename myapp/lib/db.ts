
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
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set in .env.local'
    );
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl:
      process.env.PGSSLMODE === 'require'
        ? { rejectUnauthorized: true }
        : false,
  });
}

const pool =
  globalForPg.pgPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export default pool;
export { pool };
