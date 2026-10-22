
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

  // Support existing devices tables.
  await pool.query(`
    ALTER TABLE public.devices
      ADD COLUMN IF NOT EXISTS device_token TEXT;
  `);

  // Older schemas may contain device_secret_hash.
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'devices'
          AND column_name = 'device_secret_hash'
      ) THEN
        ALTER TABLE public.devices
          ALTER COLUMN device_secret_hash DROP NOT NULL;
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS devices_device_token_unique
      ON public.devices(device_token)
      WHERE device_token IS NOT NULL;
  `);

  // 4. Speed sessions (retained for the existing app)
  // Sensor readings no longer depend on these sessions.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.speed_sessions (
      user_id          INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,
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
      ON public.speed_sessions(user_id, started_at DESC);
  `);

  // 5. Speed deliveries (existing feature)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.speed_deliveries (
      user_id     INTEGER NOT NULL,
      session_no  INTEGER NOT NULL,
      delivery_no INTEGER NOT NULL,
      speed_kmh   NUMERIC(5,1) NOT NULL,
      PRIMARY KEY (user_id, session_no, delivery_no),
      FOREIGN KEY (user_id, session_no)
        REFERENCES public.speed_sessions(user_id, session_no)
        ON DELETE CASCADE
    );
  `);

  // Make existing speed-session schemas compatible.
  await pool.query(`
    ALTER TABLE public.speed_sessions
      ALTER COLUMN ended_at DROP NOT NULL,
      ALTER COLUMN started_at SET DEFAULT NOW(),
      ALTER COLUMN deliveries_count SET DEFAULT 0,
      ALTER COLUMN avg_speed DROP NOT NULL,
      ALTER COLUMN max_speed DROP NOT NULL,
      ALTER COLUMN min_speed DROP NOT NULL;
  `);

  // 6. Independent IoT sensor readings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.sensor_readings (
      id BIGSERIAL PRIMARY KEY,

      user_id INTEGER NOT NULL
        REFERENCES public.users(id) ON DELETE CASCADE,

      delivery_id BIGINT NOT NULL,
      event_type VARCHAR(20) NOT NULL
        CHECK (
          event_type IN ('DELIVERY_START', 'DELIVERY_END')
        ),

      device_timestamp_ms BIGINT NOT NULL
        CHECK (device_timestamp_ms >= 0),

      imu1_ax DOUBLE PRECISION NOT NULL,
      imu1_ay DOUBLE PRECISION NOT NULL,
      imu1_az DOUBLE PRECISION NOT NULL,
      imu1_gx DOUBLE PRECISION NOT NULL,
      imu1_gy DOUBLE PRECISION NOT NULL,
      imu1_gz DOUBLE PRECISION NOT NULL,

      imu2_ax DOUBLE PRECISION NOT NULL,
      imu2_ay DOUBLE PRECISION NOT NULL,
      imu2_az DOUBLE PRECISION NOT NULL,
      imu2_gx DOUBLE PRECISION NOT NULL,
      imu2_gy DOUBLE PRECISION NOT NULL,
      imu2_gz DOUBLE PRECISION NOT NULL,

      pressure1_raw INTEGER NOT NULL,
      pressure2_raw INTEGER NOT NULL,
      pressure3_raw INTEGER NOT NULL,

      pressure1_pa DOUBLE PRECISION,
      pressure2_pa DOUBLE PRECISION,
      pressure3_pa DOUBLE PRECISION,

      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 7. Migrate existing sensor_readings tables.
  // Remove dependencies on training sessions and old sample indexes.
  await pool.query(`
    ALTER TABLE public.sensor_readings
      DROP CONSTRAINT IF EXISTS
        sensor_readings_user_id_session_no_fkey,
      DROP CONSTRAINT IF EXISTS
        sensor_readings_user_id_session_no_sample_index_key,
      DROP CONSTRAINT IF EXISTS
        sensor_readings_event_type_check;

    DROP INDEX IF EXISTS public.idx_readings_session_time;

    ALTER TABLE public.sensor_readings
      DROP COLUMN IF EXISTS session_no,
      DROP COLUMN IF EXISTS sample_index,
      DROP COLUMN IF EXISTS imu1_mx,
      DROP COLUMN IF EXISTS imu1_my,
      DROP COLUMN IF EXISTS imu1_mz,
      DROP COLUMN IF EXISTS imu2_mx,
      DROP COLUMN IF EXISTS imu2_my,
      DROP COLUMN IF EXISTS imu2_mz;

    ALTER TABLE public.sensor_readings
      ADD COLUMN IF NOT EXISTS delivery_id BIGINT,
      ADD COLUMN IF NOT EXISTS event_type VARCHAR(20);
  `);

  // Existing rows cannot be reliably assigned to delivery groups.
  // Keep their new columns nullable for backward compatibility.
  // New API inserts should always supply both values.
  await pool.query(`
    ALTER TABLE public.sensor_readings
      ADD CONSTRAINT sensor_readings_event_type_check
      CHECK (
        event_type IS NULL
        OR event_type IN ('DELIVERY_START', 'DELIVERY_END')
      );
  `);

  // Ensure user ownership remains linked to users, not speed_sessions.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.sensor_readings'::regclass
          AND conname = 'sensor_readings_user_id_fkey'
      ) THEN
        ALTER TABLE public.sensor_readings
          ADD CONSTRAINT sensor_readings_user_id_fkey
          FOREIGN KEY (user_id)
          REFERENCES public.users(id)
          ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  // Indexes for retrieving readings independently of sessions.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sensor_readings_user_received
      ON public.sensor_readings(user_id, received_at DESC);

    CREATE INDEX IF NOT EXISTS idx_sensor_readings_delivery
      ON public.sensor_readings(user_id, delivery_id);

    CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time
      ON public.sensor_readings(user_id, device_timestamp_ms);
  `);

  // 8. Row Level Security
  // No policies are created by this migration.
  await pool.query(`
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.speed_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.speed_deliveries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
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
