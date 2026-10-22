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
  const result = await pool.query(
    `SELECT d.delivery_id::text AS delivery_id, d.speed_kmh::float AS speed_kmh, d.a_mag_g::float AS a_mag_g,
            d.saturated, d.arm_length_m::float AS arm_length_m, d.released_at,
            sb.session_no, sb.ball_no
       FROM public.delivery_speeds d
       LEFT JOIN public.session_balls sb
              ON sb.user_id = d.user_id AND sb.delivery_id = d.delivery_id
      WHERE d.user_id = $1
      ORDER BY d.released_at DESC, d.delivery_id DESC
      LIMIT $2`,
    [userId, limit]
  );
  return result.rows.map((r) => ({
    deliveryId: r.delivery_id,
    speedKmh: r.speed_kmh,
    aMagG: r.a_mag_g,
    saturated: r.saturated,
    armLengthM: r.arm_length_m,
    releasedAt: r.released_at,
    sessionNo: r.session_no,
    ballNo: r.ball_no,
  }));
}
