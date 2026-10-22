
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

  // One normalized row per completed delivery.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.delivery_sensor_summary (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      delivery_id BIGINT NOT NULL UNIQUE,
      start_timestamp_ms BIGINT,
      end_timestamp_ms BIGINT,
      start_imu1_gx DOUBLE PRECISION, start_imu1_gy DOUBLE PRECISION, start_imu1_gz DOUBLE PRECISION,
      start_imu2_gx DOUBLE PRECISION, start_imu2_gy DOUBLE PRECISION, start_imu2_gz DOUBLE PRECISION,
      start_pressure1_raw INTEGER, start_pressure2_raw INTEGER, start_pressure3_raw INTEGER,
      end_imu1_gx DOUBLE PRECISION, end_imu1_gy DOUBLE PRECISION, end_imu1_gz DOUBLE PRECISION,
      end_imu2_gx DOUBLE PRECISION, end_imu2_gy DOUBLE PRECISION, end_imu2_gz DOUBLE PRECISION,
      end_pressure1_raw INTEGER, end_pressure2_raw INTEGER, end_pressure3_raw INTEGER,
      wrist_angle_x_deg DOUBLE PRECISION,
      wrist_angle_y_deg DOUBLE PRECISION,
      wrist_angle_z_deg DOUBLE PRECISION,
      wrist_angle_start_deg DOUBLE PRECISION,
      wrist_angle_release_deg DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_delivery_sensor_summary_user
      ON public.delivery_sensor_summary(user_id, created_at DESC);

    ALTER TABLE public.delivery_sensor_summary
      ADD COLUMN IF NOT EXISTS wrist_angle_start_deg DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS wrist_angle_release_deg DOUBLE PRECISION;

    CREATE OR REPLACE FUNCTION public.upsert_delivery_sensor_summary()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
      start_row public.sensor_readings%ROWTYPE;
      end_row public.sensor_readings%ROWTYPE;
      angle_x DOUBLE PRECISION;
      angle_y DOUBLE PRECISION;
      angle_z DOUBLE PRECISION;
    BEGIN
      IF NEW.delivery_id IS NULL THEN
        RETURN NEW;
      END IF;

      SELECT * INTO start_row
        FROM public.sensor_readings
       WHERE user_id = NEW.user_id
         AND delivery_id = NEW.delivery_id
         AND event_type = 'DELIVERY_START'
       ORDER BY id
       LIMIT 1;

      SELECT * INTO end_row
        FROM public.sensor_readings
       WHERE user_id = NEW.user_id
         AND delivery_id = NEW.delivery_id
         AND event_type = 'DELIVERY_END'
       ORDER BY id
       LIMIT 1;

      IF start_row.id IS NULL OR end_row.id IS NULL THEN
        RETURN NEW;
      END IF;

      angle_x := degrees((
        (atan2(end_row.imu1_ay, end_row.imu1_az) - atan2(start_row.imu1_ay, start_row.imu1_az)) +
        (atan2(end_row.imu2_ay, end_row.imu2_az) - atan2(start_row.imu2_ay, start_row.imu2_az))
      ) / 2);

      angle_y := degrees((
        (atan2(-end_row.imu1_ax, sqrt(power(end_row.imu1_ay, 2) + power(end_row.imu1_az, 2))) -
         atan2(-start_row.imu1_ax, sqrt(power(start_row.imu1_ay, 2) + power(start_row.imu1_az, 2)))) +
        (atan2(-end_row.imu2_ax, sqrt(power(end_row.imu2_ay, 2) + power(end_row.imu2_az, 2))) -
         atan2(-start_row.imu2_ax, sqrt(power(start_row.imu2_ay, 2) + power(start_row.imu2_az, 2))))
      ) / 2);

      angle_z := ((start_row.imu1_gz + start_row.imu2_gz + end_row.imu1_gz + end_row.imu2_gz) / 4)
        * greatest(0, end_row.device_timestamp_ms - start_row.device_timestamp_ms) / 1000.0;

      INSERT INTO public.delivery_sensor_summary (
        user_id, delivery_id, start_timestamp_ms, end_timestamp_ms,
        start_imu1_gx, start_imu1_gy, start_imu1_gz,
        start_imu2_gx, start_imu2_gy, start_imu2_gz,
        start_pressure1_raw, start_pressure2_raw, start_pressure3_raw,
        end_imu1_gx, end_imu1_gy, end_imu1_gz,
        end_imu2_gx, end_imu2_gy, end_imu2_gz,
        end_pressure1_raw, end_pressure2_raw, end_pressure3_raw,
        wrist_angle_x_deg, wrist_angle_y_deg, wrist_angle_z_deg,
        wrist_angle_start_deg, wrist_angle_release_deg
      ) VALUES (
        start_row.user_id, start_row.delivery_id,
        start_row.device_timestamp_ms, end_row.device_timestamp_ms,
        start_row.imu1_gx, start_row.imu1_gy, start_row.imu1_gz,
        start_row.imu2_gx, start_row.imu2_gy, start_row.imu2_gz,
        start_row.pressure1_raw, start_row.pressure2_raw, start_row.pressure3_raw,
        end_row.imu1_gx, end_row.imu1_gy, end_row.imu1_gz,
        end_row.imu2_gx, end_row.imu2_gy, end_row.imu2_gz,
        end_row.pressure1_raw, end_row.pressure2_raw, end_row.pressure3_raw,
        angle_x, angle_y, angle_z,
        0, angle_z
      )
      ON CONFLICT (delivery_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        start_timestamp_ms = EXCLUDED.start_timestamp_ms,
        end_timestamp_ms = EXCLUDED.end_timestamp_ms,
        start_imu1_gx = EXCLUDED.start_imu1_gx, start_imu1_gy = EXCLUDED.start_imu1_gy, start_imu1_gz = EXCLUDED.start_imu1_gz,
        start_imu2_gx = EXCLUDED.start_imu2_gx, start_imu2_gy = EXCLUDED.start_imu2_gy, start_imu2_gz = EXCLUDED.start_imu2_gz,
        start_pressure1_raw = EXCLUDED.start_pressure1_raw, start_pressure2_raw = EXCLUDED.start_pressure2_raw, start_pressure3_raw = EXCLUDED.start_pressure3_raw,
        end_imu1_gx = EXCLUDED.end_imu1_gx, end_imu1_gy = EXCLUDED.end_imu1_gy, end_imu1_gz = EXCLUDED.end_imu1_gz,
        end_imu2_gx = EXCLUDED.end_imu2_gx, end_imu2_gy = EXCLUDED.end_imu2_gy, end_imu2_gz = EXCLUDED.end_imu2_gz,
        end_pressure1_raw = EXCLUDED.end_pressure1_raw, end_pressure2_raw = EXCLUDED.end_pressure2_raw, end_pressure3_raw = EXCLUDED.end_pressure3_raw,
        wrist_angle_x_deg = EXCLUDED.wrist_angle_x_deg, wrist_angle_y_deg = EXCLUDED.wrist_angle_y_deg, wrist_angle_z_deg = EXCLUDED.wrist_angle_z_deg,
        wrist_angle_start_deg = EXCLUDED.wrist_angle_start_deg,
        wrist_angle_release_deg = EXCLUDED.wrist_angle_release_deg;

      RETURN NEW;
    END;
    $$;

    DROP TRIGGER IF EXISTS sensor_readings_summary_trigger
      ON public.sensor_readings;
    CREATE TRIGGER sensor_readings_summary_trigger
      AFTER INSERT OR UPDATE ON public.sensor_readings
      FOR EACH ROW
      EXECUTE FUNCTION public.upsert_delivery_sensor_summary();
  `);

  // 8. Row Level Security
  // No policies are created by this migration.
  await pool.query(`
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.speed_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.speed_deliveries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.delivery_sensor_summary ENABLE ROW LEVEL SECURITY;
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
