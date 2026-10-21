// app/api/sensor/readings/route.ts

import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  getDeviceFromRequest,
  isFiniteNumber,
} from '@/lib/api-auth';

type Vec3 = [number, number, number];

type Imu = {
  accel: Vec3;
  gyro: Vec3;
  mag: Vec3;
};

type Pressure = {
  raw: [number, number, number];
  pa?: [number | null, number | null, number | null];
};

type Sample = {
  sampleIndex: number;
  timestampMs: number;
  imu1: Imu;
  imu2: Imu;
  pressure: Pressure;
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
  if (!isRecord(value)) return false;

  return (
    isVec3(value.accel) &&
    isVec3(value.gyro) &&
    isVec3(value.mag)
  );
}

function isPressure(value: unknown): value is Pressure {
  if (!isRecord(value)) return false;

  const raw = value.raw;
  const pa = value.pa;

  if (
    !Array.isArray(raw) ||
    raw.length !== 3 ||
    !raw.every(
      (v) =>
        Number.isSafeInteger(v) &&
        v >= 0 &&
        v <= 10_000_000
    )
  ) {
    return false;
  }

  if (
    pa !== undefined &&
    (
      !Array.isArray(pa) ||
      pa.length !== 3 ||
      !pa.every(
        (v) => v === null || isFiniteNumber(v)
      )
    )
  ) {
    return false;
  }

  return true;
}

function isSample(value: unknown): value is Sample {
  if (!isRecord(value)) return false;

  if (
    !Number.isSafeInteger(value.sampleIndex) ||
    (value.sampleIndex as number) < 0 ||
    !Number.isSafeInteger(value.timestampMs) ||
    (value.timestampMs as number) < 0 ||
    !isImu(value.imu1) ||
    !isImu(value.imu2) ||
    !isPressure(value.pressure)
  ) {
    return false;
  }

  const imuValues = [
    ...value.imu1.accel,
    ...value.imu1.gyro,
    ...value.imu1.mag,
    ...value.imu2.accel,
    ...value.imu2.gyro,
    ...value.imu2.mag,
  ];

  return imuValues.every(
    (v) => Math.abs(v) <= 1_000_000
  );
}

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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON request.' },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
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
        message:
          'samples must contain between 1 and 500 samples.',
      },
      { status: 400 }
    );
  }

  if (!body.samples.every(isSample)) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Invalid sample. Check indexes, timestamps, IMU vectors and pressure values.',
      },
      { status: 400 }
    );
  }

  const samples = body.samples;
  const indexes = samples.map((s) => s.sampleIndex);

  if (new Set(indexes).size !== indexes.length) {
    return NextResponse.json(
      {
        success: false,
        message: 'Duplicate sample indexes in this batch.',
      },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Serialize session selection/creation for this device.
    const lockedDevice = await client.query(
      `SELECT id
         FROM public.devices
        WHERE id = $1
          AND user_id = $2
          AND is_active = TRUE
        FOR UPDATE`,
      [device.id, device.user_id]
    );

    if (lockedDevice.rowCount !== 1) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        { success: false, message: 'Device is unavailable.' },
        { status: 401 }
      );
    }

    // Readings belong to the session the user started in the app. If none is
    // open there is nothing to attach them to, so refuse instead of guessing.
    const openSession = await client.query(
      `SELECT session_no
         FROM public.speed_sessions
        WHERE user_id = $1
          AND ended_at IS NULL
        ORDER BY session_no DESC
        LIMIT 1
        FOR SHARE`,
      [device.user_id]
    );

    if (openSession.rowCount !== 1) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        {
          success: false,
          message: 'No active session. Start a live session in the app first.',
        },
        { status: 409 }
      );
    }

    const sessionNo: number = openSession.rows[0].session_no;

    const columns = [
      'user_id',
      'session_no',
      'sample_index',
      'device_timestamp_ms',
      'imu1_ax', 'imu1_ay', 'imu1_az',
      'imu1_gx', 'imu1_gy', 'imu1_gz',
      'imu1_mx', 'imu1_my', 'imu1_mz',
      'imu2_ax', 'imu2_ay', 'imu2_az',
      'imu2_gx', 'imu2_gy', 'imu2_gz',
      'imu2_mx', 'imu2_my', 'imu2_mz',
      'pressure1_raw', 'pressure2_raw', 'pressure3_raw',
      'pressure1_pa', 'pressure2_pa', 'pressure3_pa',
    ];

    const values: unknown[] = [];
    const rowPlaceholders = samples.map((sample) => {
      const row = [
        device.user_id,
        sessionNo,
        sample.sampleIndex,
        sample.timestampMs,
        ...sample.imu1.accel,
        ...sample.imu1.gyro,
        ...sample.imu1.mag,
        ...sample.imu2.accel,
        ...sample.imu2.gyro,
        ...sample.imu2.mag,
        ...sample.pressure.raw,
        ...(sample.pressure.pa ?? [null, null, null]),
      ];

      const start = values.length + 1;
      values.push(...row);

      return `(${row.map(
        (_, index) => `$${start + index}`
      ).join(', ')})`;
    });

    const inserted = await client.query(
      `INSERT INTO public.sensor_readings
         (${columns.join(', ')})
       VALUES ${rowPlaceholders.join(', ')}
       ON CONFLICT (user_id, session_no, sample_index)
       DO NOTHING
       RETURNING sample_index`,
      values
    );

    await client.query(
      `UPDATE public.devices
          SET last_seen_at = NOW()
        WHERE id = $1`,
      [device.id]
    );

    await client.query('COMMIT');

    const storedSamples = inserted.rowCount ?? 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          sessionNo,
          receivedSamples: samples.length,
          storedSamples,
          duplicateSamples: samples.length - storedSamples,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('Sensor ingest failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Could not store sensor samples.',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}