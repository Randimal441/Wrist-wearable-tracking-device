// app/api/sensor/sessions/[sessionId]/finish/route.ts

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getDeviceFromRequest } from '@/lib/api-auth';

export async function POST(
  request: Request,
  context: {
    params: Promise<{ sessionId: string }>;
  }
) {
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

  const { sessionId } = await context.params;

  if (!/^[1-9]\d*$/.test(sessionId)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid session ID.',
      },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `UPDATE public.bowling_sessions
          SET ended_at = NOW()
        WHERE id = $1
          AND device_id = $2
          AND user_id = $3
          AND ended_at IS NULL
        RETURNING id, started_at, ended_at`,
      [sessionId, device.id, device.user_id]
    );

    if (result.rowCount !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Open session not found for this device.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Session finish failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Could not finish session.',
      },
      { status: 500 }
    );
  }
}