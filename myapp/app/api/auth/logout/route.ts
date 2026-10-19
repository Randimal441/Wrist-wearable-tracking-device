import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully.' },
    { status: 200 }
  );

  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: req.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
