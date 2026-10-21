import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  try {
    const limitRaw = Number(req.nextUrl.searchParams.get('limit') ?? 20);
    const limit = Number.isInteger(limitRaw) ? Math.max(1, Math.min(limitRaw, 100)) : 20;
    const result = await pool.query(
      `SELECT s.id, s.session_name, s.source, s.started_at, s.ended_at,
              d.id AS device_id, d.device_name,
              COUNT(r.id)::int AS sample_count,
              MAX(r.received_at) AS last_reading_received_at
         FROM public.bowling_sessions s
         JOIN public.devices d ON d.id = s.device_id
         LEFT JOIN public.sensor_readings r ON r.session_id = s.id
        WHERE s.user_id = $1
        GROUP BY s.id, d.id
        ORDER BY s.started_at DESC
        LIMIT $2`, [user.userId, limit]
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json({ success: false, message: 'Could not load sessions.' }, { status: 500 });
  }
}
