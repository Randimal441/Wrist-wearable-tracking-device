import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';

// GET /api/admin/users/[id] — get user details + their speed sessions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json(
      { success: false, message: 'Invalid user ID.' },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at FROM users WHERE id = $1 AND role = 'user'`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    const sessions = await pool.query(
      `SELECT session_no, started_at, ended_at, deliveries_count,
              avg_speed::float AS avg_speed,
              max_speed::float AS max_speed,
              min_speed::float AS min_speed
       FROM speed_sessions
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 100`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        user,
        sessions: sessions.rows,
      },
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] — delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json(
      { success: false, message: 'Invalid user ID.' },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 AND role = 'user' RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found or cannot be deleted.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    console.error('Admin user delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
