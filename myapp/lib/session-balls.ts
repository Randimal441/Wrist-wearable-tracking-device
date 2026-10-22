import pool from '@/lib/db';
import { syncDeliverySpeeds } from '@/lib/delivery-speeds';

export interface BallDelivery {
  deliveryId: string;
  speedKmh: number;
  aMagG: number;
  saturated: boolean;
  releasedAt: string;
}

export interface Ball {
  ballNo: number;
  armedAt: string;
  delivery: BallDelivery | null;
}

export interface LiveState {
  sessionNo: number;
  startedAt: string;
  balls: Ball[];
  waiting: boolean;   // the latest ball is armed and its delivery hasn't arrived yet
  uncounted: number;  // deliveries received while no ball was armed (Next ball not clicked)
}

// Calculates any new delivery speeds, then links each armed ball to the first glove
// delivery released after it was armed. A delivery is only ever linked to one ball.
export async function refreshSession(userId: number, sessionNo: number, armLengthM: number): Promise<void> {
  await syncDeliverySpeeds(userId, armLengthM);

  await pool.query(
    `UPDATE public.session_balls b
        SET delivery_id = d.delivery_id,
            speed_kmh   = d.speed_kmh,
            a_mag_g     = d.a_mag_g,
            saturated   = d.saturated,
            released_at = d.released_at
       FROM (
         SELECT sb.ball_no, ds.delivery_id, ds.speed_kmh, ds.a_mag_g, ds.saturated, ds.released_at
           FROM public.session_balls sb
           JOIN LATERAL (
             SELECT x.*
               FROM public.delivery_speeds x
              WHERE x.user_id = sb.user_id
                AND x.released_at > sb.armed_at
                AND NOT EXISTS (
                  SELECT 1 FROM public.session_balls o
                   WHERE o.user_id = x.user_id AND o.delivery_id = x.delivery_id
                )
              ORDER BY x.released_at, x.delivery_id
              LIMIT 1
           ) ds ON TRUE
          WHERE sb.user_id = $1 AND sb.session_no = $2 AND sb.delivery_id IS NULL
       ) d
      WHERE b.user_id = $1 AND b.session_no = $2
        AND b.ball_no = d.ball_no AND b.delivery_id IS NULL`,
    [userId, sessionNo]
  );
}

// The state of the user's open session, or null if it isn't open.
export async function getLiveState(userId: number, sessionNo: number): Promise<LiveState | null> {
  const session = await pool.query(
    `SELECT session_no, started_at FROM public.speed_sessions
      WHERE user_id = $1 AND session_no = $2 AND ended_at IS NULL`,
    [userId, sessionNo]
  );
  if (session.rows.length === 0) return null;

  const balls = await pool.query(
    `SELECT ball_no, armed_at, delivery_id::text AS delivery_id, speed_kmh::float AS speed_kmh,
            a_mag_g::float AS a_mag_g, saturated, released_at
       FROM public.session_balls
      WHERE user_id = $1 AND session_no = $2
      ORDER BY ball_no`,
    [userId, sessionNo]
  );

  const uncounted = await pool.query(
    `SELECT COUNT(*)::int AS n
       FROM public.delivery_speeds x
      WHERE x.user_id = $1
        AND x.released_at > $2
        AND NOT EXISTS (
          SELECT 1 FROM public.session_balls o
           WHERE o.user_id = x.user_id AND o.delivery_id = x.delivery_id
        )`,
    [userId, session.rows[0].started_at]
  );

  const list: Ball[] = balls.rows.map((b) => ({
    ballNo: b.ball_no,
    armedAt: b.armed_at,
    delivery: b.delivery_id === null
      ? null
      : {
          deliveryId: b.delivery_id,
          speedKmh: b.speed_kmh,
          aMagG: b.a_mag_g,
          saturated: b.saturated,
          releasedAt: b.released_at,
        },
  }));

  return {
    sessionNo: session.rows[0].session_no,
    startedAt: session.rows[0].started_at,
    balls: list,
    waiting: list.length > 0 && list[list.length - 1].delivery === null,
    uncounted: uncounted.rows[0].n,
  };
}
