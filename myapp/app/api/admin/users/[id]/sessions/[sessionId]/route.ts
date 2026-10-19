import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';

// GET /api/admin/users/[id]/sessions/[sessionId] — one speed session with its deliveries
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  const { id, sessionId } = await params;
  const userId = Number(id);
  const sessionIdNum = Number(sessionId);
  if (!Number.isInteger(userId) || !Number.isInteger(sessionIdNum)) {
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
      [sessionIdNum, userId]
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
      [sessionIdNum]
    );

    return NextResponse.json({
      success: true,
      data: { ...session.rows[0], deliveries: deliveries.rows },
    });
  } catch (error) {
    console.error('Admin session detail error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
