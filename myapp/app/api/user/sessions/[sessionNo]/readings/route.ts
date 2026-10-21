import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';

export async function GET(req: NextRequest, context: { params: Promise<{ sessionNo: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  const { sessionNo } = await context.params;
  if (!/^\d+$/.test(sessionNo)) return NextResponse.json({ success: false, message: 'Invalid session ID.' }, { status: 400 });
  const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? 200);
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 1000)) : 200;
  const before = req.nextUrl.searchParams.get('before');
  if (before !== null && !/^\d+$/.test(before)) return NextResponse.json({ success: false, message: 'before must be a numeric sample index.' }, { status: 400 });
  try {
    const session = await pool.query(
      `SELECT id, session_name, source, started_at, ended_at, device_id
         FROM public.bowling_sessions WHERE id = $1 AND user_id = $2`, [sessionNo, user.userId]
    );
    if (!session.rows.length) return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });
    const params: (string | number)[] = [sessionNo, limit];
    let cursorFilter = '';
    if (before !== null) { params.push(Number(before)); cursorFilter = `AND sample_index < $3`; }
    const result = await pool.query(
      `SELECT id, sample_index, device_timestamp_ms, source,
              imu1_ax, imu1_ay, imu1_az, imu1_gx, imu1_gy, imu1_gz, imu1_mx, imu1_my, imu1_mz,
              imu2_ax, imu2_ay, imu2_az, imu2_gx, imu2_gy, imu2_gz, imu2_mx, imu2_my, imu2_mz,
              pressure1_raw, pressure2_raw, pressure3_raw, pressure1_pa, pressure2_pa, pressure3_pa, received_at
         FROM public.sensor_readings
        WHERE session_id = $1 ${cursorFilter}
        ORDER BY sample_index DESC LIMIT $2`, params
    );
    return NextResponse.json({ success: true, data: { session: session.rows[0], readings: result.rows.reverse() } });
  } catch (error) {
    console.error('Read sensor data error:', error);
    return NextResponse.json({ success: false, message: 'Could not load sensor readings.' }, { status: 500 });
  }
}
