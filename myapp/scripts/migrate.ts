import pool from '../lib/db';

async function migrate() {
  console.log('🔄 Running database migrations...');

  // 1. Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.users (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(100) NOT NULL,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role          VARCHAR(20) NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'admin')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
  `);
  
  // 2. User indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email
      ON public.users(email);
  `);

  // 3. Devices table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.devices (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
      device_name VARCHAR(100) NOT NULL,
      device_token TEXT UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ,
      UNIQUE (user_id, device_name)
    );
  `);

  // Add device_token to databases where devices already exists.
  await pool.query(`
    ALTER TABLE public.devices
      ADD COLUMN IF NOT EXISTS device_token TEXT;
  `);

  // Allow raw-token authentication for newly registered devices. Only databases
  // created by an older version of this script have device_secret_hash.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'devices'
          AND column_name = 'device_secret_hash'
      ) THEN
        ALTER TABLE public.devices
          ALTER COLUMN device_secret_hash DROP NOT NULL;
      END IF;
    END $$;
  `);

  // Enforce uniqueness for stored raw tokens.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS devices_device_token_unique
      ON public.devices(device_token)
      WHERE device_token IS NOT NULL;
  `);

  // Sessions are numbered per user: user 1 has sessions 1, 2, ... and user 2
  // starts again at session 1. (user_id, session_no) identifies a session.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS speed_sessions (
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_no       INTEGER NOT NULL,
      started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at         TIMESTAMPTZ,
      deliveries_count INTEGER NOT NULL DEFAULT 0,
      avg_speed        NUMERIC(5,1),
      max_speed        NUMERIC(5,1),
      min_speed        NUMERIC(5,1),
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

  // A speed session is "open" (ended_at IS NULL) while the user is bowling: it
  // starts empty and its totals are filled in when the session ends. These
  // ALTERs bring databases created before this change up to date.
  await pool.query(`
    ALTER TABLE speed_sessions
      ALTER COLUMN ended_at DROP NOT NULL,
      ALTER COLUMN started_at SET DEFAULT NOW(),
      ALTER COLUMN deliveries_count SET DEFAULT 0,
      ALTER COLUMN avg_speed DROP NOT NULL,
      ALTER COLUMN max_speed DROP NOT NULL,
      ALTER COLUMN min_speed DROP NOT NULL;
  `);

  // Raw readings streamed by the glove (2 IMUs + 3 pressure sensors) while a
  // speed session is open. Each reading belongs to one (user_id, session_no).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.sensor_readings (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      session_no INTEGER NOT NULL,
      sample_index BIGINT NOT NULL
        CHECK (sample_index >= 0),
      device_timestamp_ms BIGINT NOT NULL
        CHECK (device_timestamp_ms >= 0),

      imu1_ax DOUBLE PRECISION NOT NULL,
      imu1_ay DOUBLE PRECISION NOT NULL,
      imu1_az DOUBLE PRECISION NOT NULL,
      imu1_gx DOUBLE PRECISION NOT NULL,
      imu1_gy DOUBLE PRECISION NOT NULL,
      imu1_gz DOUBLE PRECISION NOT NULL,
      imu1_mx DOUBLE PRECISION NOT NULL,
      imu1_my DOUBLE PRECISION NOT NULL,
      imu1_mz DOUBLE PRECISION NOT NULL,

      imu2_ax DOUBLE PRECISION NOT NULL,
      imu2_ay DOUBLE PRECISION NOT NULL,
      imu2_az DOUBLE PRECISION NOT NULL,
      imu2_gx DOUBLE PRECISION NOT NULL,
      imu2_gy DOUBLE PRECISION NOT NULL,
      imu2_gz DOUBLE PRECISION NOT NULL,
      imu2_mx DOUBLE PRECISION NOT NULL,
      imu2_my DOUBLE PRECISION NOT NULL,
      imu2_mz DOUBLE PRECISION NOT NULL,

      pressure1_raw INTEGER NOT NULL,
      pressure2_raw INTEGER NOT NULL,
      pressure3_raw INTEGER NOT NULL,

      pressure1_pa DOUBLE PRECISION,
      pressure2_pa DOUBLE PRECISION,
      pressure3_pa DOUBLE PRECISION,

      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE (user_id, session_no, sample_index),
      FOREIGN KEY (user_id, session_no)
        REFERENCES speed_sessions(user_id, session_no) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_readings_session_time
      ON public.sensor_readings(user_id, session_no, device_timestamp_ms);
  `);

  // Block Supabase's public REST API (anon/authenticated roles) from these tables.
  // No policies are added: the app connects as the table owner, which bypasses RLS.
  await pool.query(`
    ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
    ALTER TABLE speed_sessions   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE speed_deliveries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.devices          ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.sensor_readings  ENABLE ROW LEVEL SECURITY;
  `);

  console.log('✅ Migration complete!');
}

migrate()
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });