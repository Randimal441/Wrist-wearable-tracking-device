import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';
import { getLiveState, refreshSession } from '@/lib/session-balls';

// GET /api/user/sessions/[sessionNo]/live — the balls of the user's open session. Any new
// glove delivery is calculated and linked to the armed ball before the state is returned.
export async function GET(
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

  try {
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

    await refreshSession(payload.userId, sessionNum, armLengthM);
    const state = await getLiveState(payload.userId, sessionNum);
    if (!state) {
      return NextResponse.json({ success: false, message: 'Open session not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: state });
  } catch (error) {
    console.error('Live session error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
