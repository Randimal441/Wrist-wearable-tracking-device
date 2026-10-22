import pool from '@/lib/db';

// True when sensor_readings is the session-linked table from scripts/migrate.ts
// (it has session_no). The shared database may hold a different design
// (delivery_id / event_type) until the glove backend and this app agree on one;
// code that reads readings by session checks this first instead of failing.
export async function sensorReadingsHaveSessions(): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'sensor_readings'
         AND column_name = 'session_no'
     ) AS linked`
  );
  return result.rows[0].linked === true;
}

// True when sensor_readings has the glove backend's per-delivery columns
// (delivery_id, event_type) and the wrist accelerometer (imu2) that release
// speed is calculated from.
export async function sensorReadingsHaveDeliveries(): Promise<boolean> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS found
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sensor_readings'
        AND column_name IN ('delivery_id', 'event_type', 'imu2_ax', 'imu2_ay', 'imu2_az')`
  );
  return result.rows[0].found === 5;
}
