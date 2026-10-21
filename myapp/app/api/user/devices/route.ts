import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { createDeviceToken, getUserFromRequest } from '@/lib/api-auth';

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
         device_name,
         device_token,
         is_active,
         created_at,
         last_seen_at
       FROM public.devices
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.userId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('List devices error:', error);

    return NextResponse.json(
      { success: false, message: 'Could not load devices.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);

  if (!user) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    const deviceName =
      typeof body.deviceName === 'string'
        ? body.deviceName.trim()
        : '';

    if (!deviceName || deviceName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: 'deviceName is required (maximum 100 characters).',
        },
        { status: 400 }
      );
    }

    // Generate the real token; do not hash it.
    const token = createDeviceToken();

    const result = await pool.query(
      `INSERT INTO public.devices (
         user_id,
         device_name,
         device_token
       )
       VALUES ($1, $2, $3)
       RETURNING
         id,
         device_name,
         device_token,
         is_active,
         created_at`,
      [user.userId, deviceName, token]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Device registered successfully.',
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    const dbError = error as {
      code?: string;
      message?: string;
      detail?: string;
    };

    console.error('Register device error:', {
      code: dbError.code,
      message: dbError.message,
      detail: dbError.detail,
    });

    if (dbError.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          message: 'A device with this name or token already exists.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Could not register device.' },
      { status: 500 }
    );
  }
}