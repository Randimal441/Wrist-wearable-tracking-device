import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { signToken } from '@/lib/jwt';

function requestOrigin(req: NextRequest) {
  const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() || req.nextUrl.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  return `${protocol}://${host}`;
}

export async function POST(req: NextRequest) {
  const isNativeForm = req.headers.get('content-type')?.includes('application/x-www-form-urlencoded') ?? false;
  const origin = requestOrigin(req);

  try {
    const body = isNativeForm ? await req.formData() : await req.json();
    const email = String(body.get ? body.get('email') ?? '' : body.email ?? '');
    const password = String(body.get ? body.get('password') ?? '' : body.password ?? '');

    if (!email || !password) {
      if (isNativeForm) {
        return NextResponse.redirect(new URL('/login?error=invalid', origin));
      }
      return NextResponse.json(
        { success: false, message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      if (isNativeForm) {
        return NextResponse.redirect(new URL('/login?error=invalid', origin));
      }
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      if (isNativeForm) {
        return NextResponse.redirect(new URL('/login?error=invalid', origin));
      }
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const redirectPath = user.role === 'admin' ? '/admin' : '/dashboard';

    const response = isNativeForm
      ? NextResponse.redirect(new URL(redirectPath, origin))
      : NextResponse.json(
          {
            success: true,
            message: 'Logged in successfully.',
            data: { role: user.role, redirectTo: redirectPath },
          },
          { status: 200 }
        );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      // LAN development commonly uses plain HTTP even when the app runs in
      // production mode. Secure cookies are rejected by browsers over HTTP.
      secure: origin.startsWith('https://'),
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (isNativeForm) {
      return NextResponse.redirect(new URL('/login?error=server', origin));
    }
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
