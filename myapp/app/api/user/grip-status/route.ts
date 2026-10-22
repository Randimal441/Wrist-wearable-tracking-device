import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);

  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT
         sr.id,
         sr.session_id,
         sr.sample_index,
         sr.device_timestamp_ms,
         sr.pressure1_raw,
         sr.pressure2_raw,
         sr.pressure3_raw,
         sr.pressure1_pa,
         sr.pressure2_pa,
         sr.pressure3_pa,
         sr.imu1_ax,
         sr.imu1_ay,
         sr.imu1_az,
         sr.imu1_gx,
         sr.imu1_gy,
         sr.imu1_gz,
         sr.imu2_ax,
         sr.imu2_ay,
         sr.imu2_az,
         sr.imu2_gx,
         sr.imu2_gy,
         sr.imu2_gz,
         sr.received_at,
         bs.session_name,
         bs.started_at,
         d.id AS device_id,
         d.device_name
       FROM public.sensor_readings sr
       JOIN public.bowling_sessions bs
         ON bs.id = sr.session_id
       JOIN public.devices d
         ON d.id = bs.device_id
       WHERE bs.user_id = $1
       ORDER BY sr.received_at DESC, sr.id DESC
       LIMIT 30`,
      [user.userId]
    );

    const rows = result.rows;
    const latest = rows[0] ?? null;

    return NextResponse.json({
      success: true,
      data: {
        latest,
        history: rows,
      },
    });
  } catch (error) {
    console.error('Grip status API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Could not load grip sensor readings.',
      },
      { status: 500 }
    );
  }
}