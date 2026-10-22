
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
         id,
         user_id,
         delivery_id,
         start_timestamp_ms,
         end_timestamp_ms,

         start_imu1_gx,
         start_imu1_gy,
         start_imu1_gz,
         start_imu2_gx,
         start_imu2_gy,
         start_imu2_gz,

         start_pressure1_raw,
         start_pressure2_raw,
         start_pressure3_raw,

         end_imu1_gx,
         end_imu1_gy,
         end_imu1_gz,
         end_imu2_gx,
         end_imu2_gy,
         end_imu2_gz,

         end_pressure1_raw,
         end_pressure2_raw,
         end_pressure3_raw,

         wrist_angle_x_deg,
         wrist_angle_y_deg,
         wrist_angle_z_deg,
         wrist_angle_start_deg,
         wrist_angle_release_deg,

         created_at
       FROM public.delivery_sensor_summary
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 30`,
      [user.userId]
    );

    const rows = result.rows;

    return NextResponse.json({
      success: true,
      data: {
        latest: rows[0] ?? null,
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
