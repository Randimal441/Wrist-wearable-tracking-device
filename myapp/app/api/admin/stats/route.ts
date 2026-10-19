import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    // Total user count (exclude admins)
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM users WHERE role = 'user'`
    );

    // 5 latest users
    const latestResult = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE role = 'user'
       ORDER BY created_at DESC
       LIMIT 5`
    );

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: parseInt(countResult.rows[0].total, 10),
        latestUsers: latestResult.rows,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
