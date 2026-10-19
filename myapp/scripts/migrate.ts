import pool from '../lib/db';

async function migrate() {
  console.log('🔄 Running database migrations...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS speed_sessions (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      started_at       TIMESTAMPTZ NOT NULL,
      ended_at         TIMESTAMPTZ NOT NULL,
      deliveries_count INTEGER NOT NULL,
      avg_speed        NUMERIC(5,1) NOT NULL,
      max_speed        NUMERIC(5,1) NOT NULL,
      min_speed        NUMERIC(5,1) NOT NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_speed_sessions_user_started
      ON speed_sessions(user_id, started_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS speed_deliveries (
      id          SERIAL PRIMARY KEY,
      session_id  INTEGER NOT NULL REFERENCES speed_sessions(id) ON DELETE CASCADE,
      delivery_no INTEGER NOT NULL,
      speed_kmh   NUMERIC(5,1) NOT NULL
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_speed_deliveries_session
      ON speed_deliveries(session_id, delivery_no);
  `);

  console.log('✅ Migration complete!');
  await pool.end();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
