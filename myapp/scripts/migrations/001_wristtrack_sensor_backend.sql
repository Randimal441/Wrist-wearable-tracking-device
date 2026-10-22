-- WristTrack sensor backend schema. Safe to re-run through the migration runner.
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Older installations may have a users table without the role column.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

CREATE TABLE IF NOT EXISTS public.devices (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_name VARCHAR(100) NOT NULL,
  device_secret_hash CHAR(64) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  UNIQUE (user_id, device_name)
);

CREATE TABLE IF NOT EXISTS public.bowling_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id BIGINT NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  session_name VARCHAR(120),
  source VARCHAR(16) NOT NULL DEFAULT 'device' CHECK (source IN ('seed', 'device')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.bowling_sessions(id) ON DELETE CASCADE,
  sample_index BIGINT NOT NULL CHECK (sample_index >= 0),
  device_timestamp_ms BIGINT NOT NULL CHECK (device_timestamp_ms >= 0),
  source VARCHAR(16) NOT NULL DEFAULT 'device' CHECK (source IN ('seed', 'device')),
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_started
  ON public.bowling_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_device_started
  ON public.bowling_sessions(device_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_session_time
  ON public.sensor_readings(session_id, device_timestamp_ms);

CREATE TABLE IF NOT EXISTS public.delivery_sensor_summary (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delivery_id BIGINT NOT NULL UNIQUE,
  start_timestamp_ms BIGINT,
  end_timestamp_ms BIGINT,
  start_imu1_gx DOUBLE PRECISION,
  start_imu1_gy DOUBLE PRECISION,
  start_imu1_gz DOUBLE PRECISION,
  start_imu2_gx DOUBLE PRECISION,
  start_imu2_gy DOUBLE PRECISION,
  start_imu2_gz DOUBLE PRECISION,
  start_pressure1_raw INTEGER,
  start_pressure2_raw INTEGER,
  start_pressure3_raw INTEGER,
  end_imu1_gx DOUBLE PRECISION,
  end_imu1_gy DOUBLE PRECISION,
  end_imu1_gz DOUBLE PRECISION,
  end_imu2_gx DOUBLE PRECISION,
  end_imu2_gy DOUBLE PRECISION,
  end_imu2_gz DOUBLE PRECISION,
  end_pressure1_raw INTEGER,
  end_pressure2_raw INTEGER,
  end_pressure3_raw INTEGER,
  wrist_angle_x_deg DOUBLE PRECISION,
  wrist_angle_y_deg DOUBLE PRECISION,
  wrist_angle_z_deg DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_sensor_summary_user
  ON public.delivery_sensor_summary(user_id, created_at DESC);
