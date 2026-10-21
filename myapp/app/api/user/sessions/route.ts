import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';

const MIN_SPEED = 20;
const MAX_SPEED = 180;
const MAX_DELIVERIES = 500;

function authenticate(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(req: NextRequest) {
  const payload = authenticate(req);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT session_no, started_at, ended_at, deliveries_count,
              avg_speed::float AS avg_speed,
              max_speed::float AS max_speed,
              min_speed::float AS min_speed
       FROM speed_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 100`,
      [payload.userId]
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const payload = authenticate(req);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  let body: { startedAt?: unknown; endedAt?: unknown; speeds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const startedAt = new Date(String(body.startedAt));
  const endedAt = new Date(String(body.endedAt));
  const speeds = body.speeds;

  const validSpeeds =
    Array.isArray(speeds) &&
    speeds.length > 0 &&
    speeds.length <= MAX_DELIVERIES &&
    speeds.every((s) => typeof s === 'number' && s >= MIN_SPEED && s <= MAX_SPEED);

  if (isNaN(startedAt.getTime()) || isNaN(endedAt.getTime()) || !validSpeeds) {
    return NextResponse.json(
      {
        success: false,
        message: `Provide startedAt, endedAt and 1-${MAX_DELIVERIES} speeds between ${MIN_SPEED} and ${MAX_SPEED} km/h.`,
      },
      { status: 400 }
    );
  }

  const values = speeds as number[];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the user's row so two saves at once can't pick the same session number.
    const user = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [payload.userId]);
    if (user.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      );
    }

    const session = await client.query(
      `INSERT INTO speed_sessions
         (user_id, session_no, started_at, ended_at, deliveries_count, avg_speed, max_speed, min_speed)
       SELECT $1, COALESCE(MAX(session_no), 0) + 1, $2, $3, $4, $5, $6, $7
       FROM speed_sessions
       WHERE user_id = $1
       RETURNING session_no`,
      [
        payload.userId,
        startedAt,
        endedAt,
        values.length,
        avg.toFixed(1),
        Math.max(...values),
        Math.min(...values),
      ]
    );
    const sessionNo = session.rows[0].session_no as number;

    await client.query(
      `INSERT INTO speed_deliveries (user_id, session_no, delivery_no, speed_kmh)
       SELECT $1, $2, t.ord, t.speed
       FROM unnest($3::numeric[]) WITH ORDINALITY AS t(speed, ord)`,
      [payload.userId, sessionNo, values]
    );
    await client.query('COMMIT');

    return NextResponse.json({ success: true, data: { sessionNo } }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Save session error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
