import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';

const MIN_SPEED = 20;
const MAX_SPEED = 180;
const MAX_DELIVERIES = 500;

// POST /api/user/sessions/[sessionNo]/end — close the user's open session and
// store its delivery speeds. Body: { speeds: number[] } (km/h, may be empty).
// A session with no speeds and no sensor readings is discarded.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionNo: string }> }
) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  const { sessionNo } = await params;
  const sessionNum = Number(sessionNo);
  if (!Number.isInteger(sessionNum)) {
    return NextResponse.json(
      { success: false, message: 'Session not found.' },
      { status: 404 }
    );
  }

  let body: { speeds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const speeds = body.speeds;
  const validSpeeds =
    Array.isArray(speeds) &&
    speeds.length <= MAX_DELIVERIES &&
    speeds.every((s) => typeof s === 'number' && s >= MIN_SPEED && s <= MAX_SPEED);
  if (!validSpeeds) {
    return NextResponse.json(
      {
        success: false,
        message: `speeds must be up to ${MAX_DELIVERIES} numbers between ${MIN_SPEED} and ${MAX_SPEED} km/h.`,
      },
      { status: 400 }
    );
  }
  const values = speeds as number[];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const session = await client.query(
      `SELECT 1 FROM speed_sessions
       WHERE user_id = $1 AND session_no = $2 AND ended_at IS NULL
       FOR UPDATE`,
      [payload.userId, sessionNum]
    );
    if (session.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, message: 'Open session not found.' },
        { status: 404 }
      );
    }

    if (values.length === 0) {
      const readings = await client.query(
        'SELECT 1 FROM sensor_readings WHERE user_id = $1 AND session_no = $2 LIMIT 1',
        [payload.userId, sessionNum]
      );
      if (readings.rows.length === 0) {
        await client.query(
          'DELETE FROM speed_sessions WHERE user_id = $1 AND session_no = $2',
          [payload.userId, sessionNum]
        );
        await client.query('COMMIT');
        return NextResponse.json({ success: true, data: { sessionNo: sessionNum, discarded: true } });
      }
      // Readings exist but no speeds: keep the raw data, close without totals.
      await client.query(
        'UPDATE speed_sessions SET ended_at = NOW() WHERE user_id = $1 AND session_no = $2',
        [payload.userId, sessionNum]
      );
      await client.query('COMMIT');
      return NextResponse.json({ success: true, data: { sessionNo: sessionNum, discarded: false } });
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    await client.query(
      `INSERT INTO speed_deliveries (user_id, session_no, delivery_no, speed_kmh)
       SELECT $1, $2, t.ord, t.speed
       FROM unnest($3::numeric[]) WITH ORDINALITY AS t(speed, ord)`,
      [payload.userId, sessionNum, values]
    );
    await client.query(
      `UPDATE speed_sessions
       SET ended_at = NOW(), deliveries_count = $3,
           avg_speed = $4, max_speed = $5, min_speed = $6
       WHERE user_id = $1 AND session_no = $2`,
      [payload.userId, sessionNum, values.length, avg.toFixed(1), Math.max(...values), Math.min(...values)]
    );
    await client.query('COMMIT');

    return NextResponse.json({ success: true, data: { sessionNo: sessionNum, discarded: false } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('End session error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
