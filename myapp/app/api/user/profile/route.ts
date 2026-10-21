import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/jwt';
import { signToken } from '@/lib/jwt';
import pool from '@/lib/db';

function getPayload(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(req: NextRequest) {
  const payload = getPayload(req);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Invalid or expired token.' },
      { status: 401 }
    );
  }

  const result = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [payload.userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { success: false, message: 'User not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: result.rows[0] });
}

export async function PATCH(req: NextRequest) {
  const payload = getPayload(req);
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Name is required.' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, message: 'Name must be 100 characters or fewer.' },
        { status: 400 }
      );
    }

    if (newPassword && newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const current = await pool.query(
      'SELECT name, email, role, password_hash FROM users WHERE id = $1',
      [payload.userId]
    );
    if (current.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found.' },
        { status: 404 }
      );
    }

    if (newPassword) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, current.rows[0].password_hash))) {
        return NextResponse.json(
          { success: false, message: 'Current password is incorrect.' },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await pool.query(
        'UPDATE users SET name = $1, password_hash = $2 WHERE id = $3',
        [name, passwordHash, payload.userId]
      );
    } else {
      await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, payload.userId]);
    }

    const token = signToken({
      userId: payload.userId,
      email: current.rows[0].email,
      name,
      role: current.rows[0].role,
    });
    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { name, email: current.rows[0].email },
    });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
