import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';
import { listDeliverySpeeds, syncDeliverySpeeds } from '@/lib/delivery-speeds';
import { DEFAULT_ACCEL_RANGE_G } from '@/lib/sensor-config';

// GET /api/user/delivery-speeds?limit=N — the user's recent deliveries (default 20, max 200)
// with their release speed (km/h), calculated from each DELIVERY_END reading and the
// user's arm length. Includes deliveries bowled outside a live session.
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    const user = await pool.query(
      'SELECT arm_length_m::float AS arm_length_m FROM users WHERE id = $1',
      [payload.userId]
    );
    const armLengthM: number | null = user.rows[0]?.arm_length_m ?? null;

    // Without an arm length no speed can be calculated.
    if (armLengthM === null) {
      return NextResponse.json({
        success: true,
        data: { armLengthRequired: true, armLengthM: null, accelRangeG: DEFAULT_ACCEL_RANGE_G, deliveries: [] },
      });
    }

    const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? 20);
    const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 200)) : 20;

    await syncDeliverySpeeds(payload.userId, armLengthM);
    const deliveries = await listDeliverySpeeds(payload.userId, limit);

    return NextResponse.json({
      success: true,
      data: { armLengthRequired: false, armLengthM, accelRangeG: DEFAULT_ACCEL_RANGE_G, deliveries },
    });
  } catch (error) {
    console.error('Delivery speeds error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
