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

  // Allow raw-token authentication for newly registered devices.
  await pool.query(`
    ALTER TABLE public.devices
      ALTER COLUMN device_secret_hash DROP NOT NULL;
  `);

  // Enforce uniqueness for stored raw tokens.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS devices_device_token_unique
      ON public.devices(device_token)
      WHERE device_token IS NOT NULL;
  `);

  // 4. Bowling sessions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.bowling_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
      device_id BIGINT NOT NULL
        REFERENCES public.devices(id) ON DELETE CASCADE,
      session_name VARCHAR(120),
      source VARCHAR(16) NOT NULL DEFAULT 'device'
        CHECK (source IN ('seed', 'device')),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 5. Sensor readings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.sensor_readings (
      id BIGSERIAL PRIMARY KEY,
      session_id BIGINT NOT NULL
        REFERENCES public.bowling_sessions(id) ON DELETE CASCADE,
      sample_index BIGINT NOT NULL
        CHECK (sample_index >= 0),
      device_timestamp_ms BIGINT NOT NULL
        CHECK (device_timestamp_ms >= 0),
      source VARCHAR(16) NOT NULL DEFAULT 'device'
        CHECK (source IN ('seed', 'device')),

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

      UNIQUE (session_id, sample_index)
    );
  `);

  // 6. Indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_started
      ON public.bowling_sessions(user_id, started_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_device_started
      ON public.bowling_sessions(device_id, started_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_readings_session_time
      ON public.sensor_readings(session_id, device_timestamp_ms);
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