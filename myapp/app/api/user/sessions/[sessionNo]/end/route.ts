import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';
import { refreshSession } from '@/lib/session-balls';

// POST /api/user/sessions/[sessionNo]/end — close the user's open session. Its deliveries are
// the balls that received a glove delivery, in order; an armed ball that was never bowled is
// dropped. A session with no deliveries is discarded.
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

  try {
    // Pick up a delivery that arrived just before End was pressed.
    const user = await pool.query(
      'SELECT arm_length_m::float AS arm_length_m FROM users WHERE id = $1',
      [payload.userId]
    );
    const armLengthM: number | null = user.rows[0]?.arm_length_m ?? null;
    if (armLengthM !== null) {
      await refreshSession(payload.userId, sessionNum, armLengthM);
    }
  } catch (error) {
    console.error('End session refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }

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

    const balls = await client.query(
      `SELECT speed_kmh::float AS speed_kmh
         FROM session_balls
        WHERE user_id = $1 AND session_no = $2 AND delivery_id IS NOT NULL
        ORDER BY ball_no`,
      [payload.userId, sessionNum]
    );
    const values: number[] = balls.rows.map((r) => r.speed_kmh);

    if (values.length === 0) {
      await client.query(
        'DELETE FROM speed_sessions WHERE user_id = $1 AND session_no = $2',
        [payload.userId, sessionNum]
      );
      await client.query('COMMIT');
      return NextResponse.json({ success: true, data: { sessionNo: sessionNum, discarded: true } });
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
