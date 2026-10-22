
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  getDeviceFromRequest,
  isFiniteNumber,
} from '@/lib/api-auth';

type Vec3 = [number, number, number];

type Imu = {
  accel: Vec3;
  gyro: Vec3;
};

type EventType = 'DELIVERY_START' | 'DELIVERY_END';

type Sample = {
  deliveryId: number;
  eventType: EventType;
  deviceTimestampMs: number;
  imu1: Imu;
  imu2: Imu;
  pressure: {
    raw: [number, number, number];
  };
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(isFiniteNumber)
  );
}

function isImu(value: unknown): value is Imu {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isVec3(value.accel) &&
    isVec3(value.gyro)
  );
}

function isPressure(
  value: unknown
): value is { raw: [number, number, number] } {
  if (
    !isRecord(value) ||
    !Array.isArray(value.raw)
  ) {
    return false;
  }

  return (
    value.raw.length === 3 &&
    value.raw.every(
      (v) =>
        Number.isSafeInteger(v) &&
        v >= 0 &&
        v <= 10_000_000
    )
  );
}

function isSample(value: unknown): value is Sample {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !Number.isSafeInteger(value.deliveryId) ||
    (value.deliveryId as number) < 1 ||
    !['DELIVERY_START', 'DELIVERY_END'].includes(
      value.eventType as string
    ) ||
    !Number.isSafeInteger(value.deviceTimestampMs) ||
    (value.deviceTimestampMs as number) < 0 ||
    !isImu(value.imu1) ||
    !isImu(value.imu2) ||
    !isPressure(value.pressure)
  ) {
    return false;
  }

  const imuValues = [
    ...value.imu1.accel,
    ...value.imu1.gyro,
    ...value.imu2.accel,
    ...value.imu2.gyro,
  ];

  return imuValues.every(
    (v) => Math.abs(v) <= 1_000_000
  );
}

export async function POST(request: NextRequest) {
  // Authenticate the IoT device using X-Device-Token.
  const device = await getDeviceFromRequest(request).catch(
    (error) => {
      console.error(
        'Device authentication failed:',
        error
      );
      return null;
    }
  );

  if (!device) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid or inactive device token.',
      },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid JSON request.',
      },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid request body.',
      },
      { status: 400 }
    );
  }

  if (
    !Array.isArray(body.samples) ||
    body.samples.length < 1 ||
    body.samples.length > 500
  ) {
    return NextResponse.json(
      {
        success: false,
        message: 'samples must contain 1–500 samples.',
      },
      { status: 400 }
    );
  }

  if (!body.samples.every(isSample)) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Invalid sample. Each sample must include deliveryId, eventType, deviceTimestampMs, IMU accelerometer/gyroscope vectors, and pressure.raw.',
      },
      { status: 400 }
    );
  }

  const samples = body.samples as Sample[];

  let client:
    | Awaited<ReturnType<typeof pool.connect>>
    | undefined;

  try {
    client = await pool.connect();

    await client.query('BEGIN');

    // Confirm that the authenticated device is still active.
    const deviceResult = await client.query(
      `SELECT id
         FROM public.devices
        WHERE id = $1
          AND user_id = $2
          AND is_active = TRUE
        FOR UPDATE`,
      [device.id, device.user_id]
    );

    if (deviceResult.rowCount !== 1) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          message: 'Device is unavailable.',
        },
        { status: 401 }
      );
    }

    const columns = [
      'user_id',
      'delivery_id',
      'event_type',
      'device_timestamp_ms',
      'imu1_ax',
      'imu1_ay',
      'imu1_az',
      'imu1_gx',
      'imu1_gy',
      'imu1_gz',
      'imu2_ax',
      'imu2_ay',
      'imu2_az',
      'imu2_gx',
      'imu2_gy',
      'imu2_gz',
      'pressure1_raw',
      'pressure2_raw',
      'pressure3_raw',
    ];

    const values: unknown[] = [];

    const rowPlaceholders = samples.map((sample) => {
      const row = [
        device.user_id,
        sample.deliveryId,
        sample.eventType,
        sample.deviceTimestampMs,
        ...sample.imu1.accel,
        ...sample.imu1.gyro,
        ...sample.imu2.accel,
        ...sample.imu2.gyro,
        ...sample.pressure.raw,
      ];

      const start = values.length + 1;

      values.push(...row);

      return `(${row
        .map((_, index) => `$${start + index}`)
        .join(', ')})`;
    });

    const inserted = await client.query(
      `INSERT INTO public.sensor_readings (
         ${columns.join(', ')}
       )
       VALUES ${rowPlaceholders.join(', ')}
       RETURNING id`,
      values
    );

    // Update the device's last-seen timestamp.
    await client.query(
      `UPDATE public.devices
          SET last_seen_at = NOW()
        WHERE id = $1`,
      [device.id]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        data: {
          receivedSamples: samples.length,
          storedSamples: inserted.rowCount ?? 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Sensor rollback failed:',
          rollbackError
        );
      }
    }

    console.error('Sensor ingest failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Could not store sensor samples.',
      },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
