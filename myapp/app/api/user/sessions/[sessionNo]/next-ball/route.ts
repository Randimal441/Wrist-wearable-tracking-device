import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';
import { getLiveState, refreshSession } from '@/lib/session-balls';

// POST /api/user/sessions/[sessionNo]/next-ball — arm the next ball. The player has to do
// this before bowling it; a delivery that arrives while no ball is armed is not counted.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionNo: string }> }
) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  }

  const { sessionNo } = await params;
  const sessionNum = Number(sessionNo);
  if (!Number.isInteger(sessionNum)) {
    return NextResponse.json({ success: false, message: 'Open session not found.' }, { status: 404 });
  }

  const user = await pool.query(
    'SELECT arm_length_m::float AS arm_length_m FROM users WHERE id = $1',
    [payload.userId]
  );
  const armLengthM: number | null = user.rows[0]?.arm_length_m ?? null;
  if (armLengthM === null) {
    return NextResponse.json(
      { success: false, code: 'ARM_LENGTH_REQUIRED', message: 'Please update your arm length in your profile.' },
      { status: 403 }
    );
  }

  const client = await pool.connect();
  try {
    // A delivery may have just arrived for the current ball: link it first.
    await refreshSession(payload.userId, sessionNum, armLengthM);

    await client.query('BEGIN');
    const session = await client.query(
      `SELECT 1 FROM speed_sessions
        WHERE user_id = $1 AND session_no = $2 AND ended_at IS NULL
        FOR UPDATE`,
      [payload.userId, sessionNum]
    );
    if (session.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, message: 'Open session not found.' }, { status: 404 });
    }

    const last = await client.query(
      `SELECT ball_no, delivery_id FROM session_balls
        WHERE user_id = $1 AND session_no = $2
        ORDER BY ball_no DESC LIMIT 1`,
      [payload.userId, sessionNum]
    );
    if (last.rows.length > 0 && last.rows[0].delivery_id === null) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, code: 'BALL_PENDING', message: `Ball ${last.rows[0].ball_no} is ready. Bowl it first.` },
        { status: 409 }
      );
    }

    await client.query(
      'INSERT INTO session_balls (user_id, session_no, ball_no) VALUES ($1, $2, $3)',
      [payload.userId, sessionNum, (last.rows[0]?.ball_no ?? 0) + 1]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Next ball error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  } finally {
    client.release();
  }

  const state = await getLiveState(payload.userId, sessionNum);
  return NextResponse.json({ success: true, data: state });
}
