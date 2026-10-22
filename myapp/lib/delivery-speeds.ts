import pool from '@/lib/db';
import { releaseSpeed } from '@/lib/release-speed';
import { DEFAULT_ACCEL_RANGE_G } from '@/lib/sensor-config';
import { sensorReadingsHaveDeliveries } from '@/lib/sensor-schema';

export interface DeliverySpeed {
  deliveryId: string;
  speedKmh: number;
  aMagG: number;
  saturated: boolean;
  armLengthM: number;
  releasedAt: string;
  sessionNo: number | null; // the live session it was counted in, or null for a delivery outside a session
  ballNo: number | null;
  gripPercent: number | null;   // average of the three release-point pressure sensors, % of 4095
  wristAngleDeg: number | null; // wrist angle at release, from delivery_sensor_summary
}

const MAX_ROWS_PER_SYNC = 200;

// Calculates the release speed of every delivery whose DELIVERY_END reading has no speed
// yet, or whose speed was calculated with a different arm length / sensor range, and
// stores it in delivery_speeds. sensor_readings is only read, never changed.
export async function syncDeliverySpeeds(userId: number, armLengthM: number): Promise<void> {
  if (!(await sensorReadingsHaveDeliveries())) return;

  // The latest DELIVERY_END reading of each delivery.
  const pending = await pool.query(
    `WITH latest AS (
       SELECT DISTINCT ON (delivery_id) id, delivery_id, imu2_ax, imu2_ay, imu2_az, received_at
         FROM public.sensor_readings
        WHERE user_id = $1 AND event_type = 'DELIVERY_END' AND delivery_id IS NOT NULL
        ORDER BY delivery_id, id DESC
     )
     SELECT l.id, l.delivery_id, l.imu2_ax, l.imu2_ay, l.imu2_az, l.received_at
       FROM latest l
       LEFT JOIN public.delivery_speeds d
              ON d.user_id = $1 AND d.delivery_id = l.delivery_id
      WHERE d.delivery_id IS NULL
         OR d.reading_id <> l.id
         OR d.arm_length_m <> $2::numeric
         OR d.accel_range_g <> $3::numeric
      ORDER BY l.delivery_id
      LIMIT ${MAX_ROWS_PER_SYNC}`,
    [userId, armLengthM, DEFAULT_ACCEL_RANGE_G]
  );

  for (const row of pending.rows) {
    const result = releaseSpeed(row.imu2_ax, row.imu2_ay, row.imu2_az, armLengthM, DEFAULT_ACCEL_RANGE_G);
    await pool.query(
      `INSERT INTO public.delivery_speeds
         (user_id, delivery_id, reading_id, arm_length_m, accel_range_g,
          a_mag_g, saturated, speed_kmh, released_at, computed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id, delivery_id) DO UPDATE SET
         reading_id = EXCLUDED.reading_id,
         arm_length_m = EXCLUDED.arm_length_m,
         accel_range_g = EXCLUDED.accel_range_g,
         a_mag_g = EXCLUDED.a_mag_g,
         saturated = EXCLUDED.saturated,
         speed_kmh = EXCLUDED.speed_kmh,
         released_at = EXCLUDED.released_at,
         computed_at = NOW()`,
      [
        userId, row.delivery_id, row.id, armLengthM, DEFAULT_ACCEL_RANGE_G,
        result.aMagG.toFixed(3), result.saturated, result.speedKmh.toFixed(1), row.received_at,
      ]
    );
  }
}

// The user's most recent deliveries with their release speed, newest first. Every delivery
// the glove sent is included, whether or not it was bowled in a live session.
export async function listDeliverySpeeds(userId: number, limit = 20): Promise<DeliverySpeed[]> {
  // Grip and wrist angle are the same figures the Grip Status and Wrist Angle pages show,
  // taken from the delivery summary the glove backend writes (NULL until it exists).
  const base = `SELECT d.delivery_id::text AS delivery_id, d.speed_kmh::float AS speed_kmh, d.a_mag_g::float AS a_mag_g,
            d.saturated, d.arm_length_m::float AS arm_length_m, d.released_at,
            sb.session_no, sb.ball_no`;
  const from = `
       FROM public.delivery_speeds d
       LEFT JOIN public.session_balls sb
              ON sb.user_id = d.user_id AND sb.delivery_id = d.delivery_id`;
  const tail = `
      WHERE d.user_id = $1
      ORDER BY d.released_at DESC, d.delivery_id DESC
      LIMIT $2`;

  let result;
  try {
    result = await pool.query(
      `${base},
            CASE WHEN s.end_pressure1_raw IS NULL OR s.end_pressure2_raw IS NULL OR s.end_pressure3_raw IS NULL
                 THEN NULL
                 ELSE ((LEAST(GREATEST(s.end_pressure1_raw, 0), 4095)
                      + LEAST(GREATEST(s.end_pressure2_raw, 0), 4095)
                      + LEAST(GREATEST(s.end_pressure3_raw, 0), 4095)) / 3.0) / 4095 * 100
            END::float AS grip_percent,
            s.wrist_angle_release_deg::float AS wrist_angle_deg
       ${from}
       LEFT JOIN public.delivery_sensor_summary s
              ON s.user_id = d.user_id AND s.delivery_id = d.delivery_id${tail}`,
      [userId, limit]
    );
  } catch (error) {
    // 42P01: the glove backend's summary table doesn't exist in this database yet.
    if ((error as { code?: string }).code !== '42P01') throw error;
    result = await pool.query(`${base}${from}${tail}`, [userId, limit]);
  }
  return result.rows.map((r) => ({
    deliveryId: r.delivery_id,
    speedKmh: r.speed_kmh,
    aMagG: r.a_mag_g,
    saturated: r.saturated,
    armLengthM: r.arm_length_m,
    releasedAt: r.released_at,
    sessionNo: r.session_no,
    ballNo: r.ball_no,
    gripPercent: r.grip_percent ?? null,
    wristAngleDeg: r.wrist_angle_deg ?? null,
  }));
}
