import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `SELECT delivery_id, created_at,
              start_timestamp_ms, end_timestamp_ms,
              wrist_angle_start_deg, wrist_angle_release_deg
         FROM public.delivery_sensor_summary
        WHERE user_id = $1
        ORDER BY created_at DESC, delivery_id DESC`,
      [user.userId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Wrist angle history API error:', error);
    return NextResponse.json(
      { success: false, message: 'Could not load wrist angle history.' },
      { status: 500 }
    );
  }
}
