import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) {
    return NextResponse.json(
      { success: false, message: 'Session not found.' },
      { status: 404 }
    );
  }

  try {
    const session = await pool.query(
      `SELECT id, started_at, ended_at, deliveries_count,
              avg_speed::float AS avg_speed,
              max_speed::float AS max_speed,
              min_speed::float AS min_speed
       FROM speed_sessions
       WHERE id = $1 AND user_id = $2`,
      [sessionId, payload.userId]
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
       WHERE session_id = $1
       ORDER BY delivery_no`,
      [sessionId]
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
