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

  // Sessions are numbered per user: user 1 has sessions 1, 2, ... and user 2
  // starts again at session 1. (user_id, session_no) identifies a session.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS speed_sessions (
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_no       INTEGER NOT NULL,
      started_at       TIMESTAMPTZ NOT NULL,
      ended_at         TIMESTAMPTZ NOT NULL,
      deliveries_count INTEGER NOT NULL,
      avg_speed        NUMERIC(5,1) NOT NULL,
      max_speed        NUMERIC(5,1) NOT NULL,
      min_speed        NUMERIC(5,1) NOT NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, session_no)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_speed_sessions_user_started
      ON speed_sessions(user_id, started_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS speed_deliveries (
      user_id     INTEGER NOT NULL,
      session_no  INTEGER NOT NULL,
      delivery_no INTEGER NOT NULL,
      speed_kmh   NUMERIC(5,1) NOT NULL,
      PRIMARY KEY (user_id, session_no, delivery_no),
      FOREIGN KEY (user_id, session_no)
        REFERENCES speed_sessions(user_id, session_no) ON DELETE CASCADE
    );
  `);

  // Block Supabase's public REST API (anon/authenticated roles) from these tables.
  // No policies are added: the app connects as the table owner, which bypasses RLS.
  await pool.query(`
    ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
    ALTER TABLE speed_sessions   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE speed_deliveries ENABLE ROW LEVEL SECURITY;
  `);

  console.log('✅ Migration complete!');
  await pool.end();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
