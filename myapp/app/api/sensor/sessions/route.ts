// app/api/sensor/sessions/route.ts

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getDeviceFromRequest } from '@/lib/api-auth';

export async function POST(request: Request) {
  const device = await getDeviceFromRequest(
    request as import('next/server').NextRequest
  ).catch((error) => {
    console.error('Device authentication failed:', error);
    return null;
  });

  if (!device) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid or inactive device token.',
      },
      { status: 401 }
    );
  }

  let body: unknown = {};

  try {
    body = await request.json();
  } catch {
    // An empty request body is allowed.
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const sessionName = (
    body as { sessionName?: unknown }
  ).sessionName;

  if (
    sessionName !== undefined &&
    (
      typeof sessionName !== 'string' ||
      sessionName.trim().length > 120
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message: 'Session name must be a string of at most 120 characters.',
      },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.bowling_sessions
         (user_id, device_id, session_name, source)
       SELECT user_id, id, $2, 'device'
         FROM public.devices
        WHERE id = $1
          AND user_id = $3
          AND is_active = TRUE
       RETURNING
         id, user_id, device_id, session_name,
         source, started_at, ended_at`,
      [
        device.id,
        typeof sessionName === 'string' &&
        sessionName.trim()
          ? sessionName.trim()
          : 'ESP32 recording',
        device.user_id,
      ]
    );

    if (result.rowCount !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'Device is unavailable.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Session creation failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Could not start session.',
      },
      { status: 500 }
    );
  }
}