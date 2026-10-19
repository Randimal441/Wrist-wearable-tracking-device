import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';

// GET /api/user/sessions/[sessionNo] — one of the logged-in user's sessions, with its deliveries
export async function GET(
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
    const session = await pool.query(
      `SELECT session_no, started_at, ended_at, deliveries_count,
              avg_speed::float AS avg_speed,
              max_speed::float AS max_speed,
              min_speed::float AS min_speed
       FROM speed_sessions
       WHERE user_id = $1 AND session_no = $2`,
      [payload.userId, sessionNum]
    );

    if (session.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Session not found.' },
        { status: 404 }
      );
    }

    const deliveries = await pool.query(
      `SELECT delivery_no, speed_kmh::float AS speed_kmh
       FROM speed_deliveries
       WHERE user_id = $1 AND session_no = $2
       ORDER BY delivery_no`,
      [payload.userId, sessionNum]
    );

    return NextResponse.json({
      success: true,
      data: { ...session.rows[0], deliveries: deliveries.rows },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
