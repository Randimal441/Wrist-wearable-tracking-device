import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';
import { sensorReadingsHaveSessions } from '@/lib/sensor-schema';

// GET /api/user/sessions/[sessionNo]/readings — raw glove readings stored for one of
// the logged-in user's speed sessions (open or finished), plus the total reading count.
export async function GET(req: NextRequest, context: { params: Promise<{ sessionNo: string }> }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });

  const { sessionNo } = await context.params;
  if (!/^[1-9]\d*$/.test(sessionNo)) return NextResponse.json({ success: false, message: 'Invalid session number.' }, { status: 400 });

  const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? 200);
  const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 1000)) : 200;
  const before = req.nextUrl.searchParams.get('before');
  if (before !== null && !/^\d+$/.test(before)) return NextResponse.json({ success: false, message: 'before must be a numeric sample index.' }, { status: 400 });

  try {
    const session = await pool.query(
      `SELECT session_no, started_at, ended_at
         FROM public.speed_sessions WHERE user_id = $1 AND session_no = $2`, [user.userId, Number(sessionNo)]
    );
    if (!session.rows.length) return NextResponse.json({ success: false, message: 'Session not found.' }, { status: 404 });

    if (!(await sensorReadingsHaveSessions())) {
      return NextResponse.json({ success: true, data: { session: session.rows[0], count: 0, readings: [] } });
    }

    const params: (string | number)[] = [user.userId, Number(sessionNo), limit];
    let cursorFilter = '';
    if (before !== null) { params.push(Number(before)); cursorFilter = `AND sample_index < $4`; }

    const result = await pool.query(
      `SELECT sample_index, device_timestamp_ms,
              imu1_ax, imu1_ay, imu1_az, imu1_gx, imu1_gy, imu1_gz, imu1_mx, imu1_my, imu1_mz,
              imu2_ax, imu2_ay, imu2_az, imu2_gx, imu2_gy, imu2_gz, imu2_mx, imu2_my, imu2_mz,
              pressure1_raw, pressure2_raw, pressure3_raw, pressure1_pa, pressure2_pa, pressure3_pa, received_at
         FROM public.sensor_readings
        WHERE user_id = $1 AND session_no = $2 ${cursorFilter}
        ORDER BY sample_index DESC LIMIT $3`, params
    );
    const total = await pool.query(
      `SELECT COUNT(*)::int AS count FROM public.sensor_readings WHERE user_id = $1 AND session_no = $2`,
      [user.userId, Number(sessionNo)]
    );

    return NextResponse.json({
      success: true,
      data: { session: session.rows[0], count: total.rows[0].count, readings: result.rows.reverse() },
    });
  } catch (error) {
    console.error('Read sensor data error:', error);
    return NextResponse.json({ success: false, message: 'Could not load sensor readings.' }, { status: 500 });
  }
}
