import pool from '../lib/db';

type Reading = {
  user_id: number;
  delivery_id: string;
  event_type: 'DELIVERY_START' | 'DELIVERY_END';
  device_timestamp_ms: number;
  imu1_ax: number; imu1_ay: number; imu1_az: number;
  imu1_gx: number; imu1_gy: number; imu1_gz: number;
  imu2_ax: number; imu2_ay: number; imu2_az: number;
  imu2_gx: number; imu2_gy: number; imu2_gz: number;
  pressure1_raw: number; pressure2_raw: number; pressure3_raw: number;
};

const degrees = (radians: number) => (radians * 180) / Math.PI;

function tilt(ax: number, ay: number, az: number) {
  return {
    x: degrees(Math.atan2(ay, az)),
    y: degrees(Math.atan2(-ax, Math.hypot(ay, az))),
  };
}

function angles(start: Reading, end: Reading) {
  const start1 = tilt(start.imu1_ax, start.imu1_ay, start.imu1_az);
  const start2 = tilt(start.imu2_ax, start.imu2_ay, start.imu2_az);
  const end1 = tilt(end.imu1_ax, end.imu1_ay, end.imu1_az);
  const end2 = tilt(end.imu2_ax, end.imu2_ay, end.imu2_az);
  const elapsedSeconds = Math.max(
    0,
    end.device_timestamp_ms - start.device_timestamp_ms
  ) / 1000;

  return {
    x: ((end1.x - start1.x) + (end2.x - start2.x)) / 2,
    y: ((end1.y - start1.y) + (end2.y - start2.y)) / 2,
    z: ((start.imu1_gz + start.imu2_gz + end.imu1_gz + end.imu2_gz) / 4) * elapsedSeconds,
  };
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<Reading>(
      `SELECT user_id, delivery_id, event_type, device_timestamp_ms,
              imu1_ax, imu1_ay, imu1_az, imu1_gx, imu1_gy, imu1_gz,
              imu2_ax, imu2_ay, imu2_az, imu2_gx, imu2_gy, imu2_gz,
              pressure1_raw, pressure2_raw, pressure3_raw
         FROM public.sensor_readings
        WHERE delivery_id IS NOT NULL
          AND event_type IN ('DELIVERY_START', 'DELIVERY_END')
        ORDER BY user_id, delivery_id, device_timestamp_ms`
    );

    const grouped = new Map<string, Reading[]>();
    for (const row of result.rows) {
      const key = `${row.user_id}:${row.delivery_id}`;
      const rows = grouped.get(key) ?? [];
      rows.push(row);
      grouped.set(key, rows);
    }

    let summarized = 0;
    for (const rows of grouped.values()) {
      const start = rows.find((row) => row.event_type === 'DELIVERY_START');
      const end = rows.find((row) => row.event_type === 'DELIVERY_END');
      if (!start || !end) continue;

      const wrist = angles(start, end);
      await client.query(
        `INSERT INTO public.delivery_sensor_summary (
           user_id, delivery_id, start_timestamp_ms, end_timestamp_ms,
           start_imu1_gx, start_imu1_gy, start_imu1_gz,
           start_imu2_gx, start_imu2_gy, start_imu2_gz,
           start_pressure1_raw, start_pressure2_raw, start_pressure3_raw,
           end_imu1_gx, end_imu1_gy, end_imu1_gz,
           end_imu2_gx, end_imu2_gy, end_imu2_gz,
           end_pressure1_raw, end_pressure2_raw, end_pressure3_raw,
           wrist_angle_x_deg, wrist_angle_y_deg, wrist_angle_z_deg,
           wrist_angle_start_deg, wrist_angle_release_deg
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                   $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
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
           wrist_angle_x_deg = EXCLUDED.wrist_angle_x_deg,
           wrist_angle_y_deg = EXCLUDED.wrist_angle_y_deg,
           wrist_angle_z_deg = EXCLUDED.wrist_angle_z_deg,
           wrist_angle_start_deg = EXCLUDED.wrist_angle_start_deg,
           wrist_angle_release_deg = EXCLUDED.wrist_angle_release_deg`,
        [
          start.user_id, start.delivery_id, start.device_timestamp_ms, end.device_timestamp_ms,
          start.imu1_gx, start.imu1_gy, start.imu1_gz, start.imu2_gx, start.imu2_gy, start.imu2_gz,
          start.pressure1_raw, start.pressure2_raw, start.pressure3_raw,
          end.imu1_gx, end.imu1_gy, end.imu1_gz, end.imu2_gx, end.imu2_gy, end.imu2_gz,
          end.pressure1_raw, end.pressure2_raw, end.pressure3_raw,
          wrist.x, wrist.y, wrist.z, 0, wrist.z,
        ]
      );
      summarized += 1;
    }

    await client.query('COMMIT');
    console.log(`Summarized ${summarized} deliveries.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Delivery summary backfill failed:', error);
  process.exitCode = 1;
});
