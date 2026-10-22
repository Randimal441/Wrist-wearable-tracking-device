
import { NextRequest, NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
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

type StoredReading = {
  delivery_id: string;
  event_type: EventType;
  device_timestamp_ms: number;
  imu1_ax: number; imu1_ay: number; imu1_az: number;
  imu1_gx: number; imu1_gy: number; imu1_gz: number;
  imu2_ax: number; imu2_ay: number; imu2_az: number;
  imu2_gx: number; imu2_gy: number; imu2_gz: number;
  pressure1_raw: number; pressure2_raw: number; pressure3_raw: number;
};

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

function tilt(accel: Vec3) {
  const [ax, ay, az] = accel;
  return {
    x: toDegrees(Math.atan2(ay, az)),
    y: toDegrees(Math.atan2(-ax, Math.hypot(ay, az))),
  };
}

function calculateWristAngles(start: StoredReading, end: StoredReading) {
  const start1 = tilt([start.imu1_ax, start.imu1_ay, start.imu1_az]);
  const start2 = tilt([start.imu2_ax, start.imu2_ay, start.imu2_az]);
  const end1 = tilt([end.imu1_ax, end.imu1_ay, end.imu1_az]);
  const end2 = tilt([end.imu2_ax, end.imu2_ay, end.imu2_az]);
  const elapsedSeconds = Math.max(
    0,
    end.device_timestamp_ms - start.device_timestamp_ms
  ) / 1000;

  // No magnetometer is currently stored, so Z is relative gyro rotation,
  // assuming gyro values are degrees/second.
  const averageGyroZ =
    (start.imu1_gz + start.imu2_gz + end.imu1_gz + end.imu2_gz) / 4;

  return {
    x: ((end1.x - start1.x) + (end2.x - start2.x)) / 2,
    y: ((end1.y - start1.y) + (end2.y - start2.y)) / 2,
    z: averageGyroZ * elapsedSeconds,
  };
}

async function summarizeDeliveries(
  client: PoolClient,
  userId: number,
  deliveryIds: number[]
) {
  const result = await client.query<StoredReading>(
    `SELECT delivery_id, event_type, device_timestamp_ms,
            imu1_ax, imu1_ay, imu1_az, imu1_gx, imu1_gy, imu1_gz,
            imu2_ax, imu2_ay, imu2_az, imu2_gx, imu2_gy, imu2_gz,
            pressure1_raw, pressure2_raw, pressure3_raw
       FROM public.sensor_readings
      WHERE user_id = $1
        AND delivery_id = ANY($2::bigint[])
        AND event_type IN ('DELIVERY_START', 'DELIVERY_END')
      ORDER BY delivery_id, device_timestamp_ms`,
    [userId, deliveryIds]
  );

  const grouped = new Map<number, StoredReading[]>();
  for (const row of result.rows) {
    const id = Number(row.delivery_id);
    const rows = grouped.get(id) ?? [];
    rows.push(row);
    grouped.set(id, rows);
  }

  for (const [deliveryId, rows] of grouped) {
    const start = rows.find((row) => row.event_type === 'DELIVERY_START');
    const end = rows.find((row) => row.event_type === 'DELIVERY_END');
    if (!start || !end) continue;

    const angles = calculateWristAngles(start, end);
    await client.query(
      `INSERT INTO public.delivery_sensor_summary (
         user_id, delivery_id, start_timestamp_ms, end_timestamp_ms,
         start_imu1_gx, start_imu1_gy, start_imu1_gz,
         start_imu2_gx, start_imu2_gy, start_imu2_gz,
         start_pressure1_raw, start_pressure2_raw, start_pressure3_raw,
         end_imu1_gx, end_imu1_gy, end_imu1_gz,
         end_imu2_gx, end_imu2_gy, end_imu2_gz,
         end_pressure1_raw, end_pressure2_raw, end_pressure3_raw,
         wrist_angle_x_deg, wrist_angle_y_deg, wrist_angle_z_deg
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                 $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
       ON CONFLICT (delivery_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         start_timestamp_ms = EXCLUDED.start_timestamp_ms,
         end_timestamp_ms = EXCLUDED.end_timestamp_ms,
         start_imu1_gx = EXCLUDED.start_imu1_gx, start_imu1_gy = EXCLUDED.start_imu1_gy, start_imu1_gz = EXCLUDED.start_imu1_gz,
         start_imu2_gx = EXCLUDED.start_imu2_gx, start_imu2_gy = EXCLUDED.start_imu2_gy, start_imu2_gz = EXCLUDED.start_imu2_gz,
         start_pressure1_raw = EXCLUDED.start_pressure1_raw, start_pressure2_raw = EXCLUDED.start_pressure2_raw, start_pressure3_raw = EXCLUDED.start_pressure3_raw,
         end_imu1_gx = EXCLUDED.end_imu1_gx, end_imu1_gy = EXCLUDED.end_imu1_gy, end_imu1_gz = EXCLUDED.end_imu1_gz,
         end_imu2_gx = EXCLUDED.end_imu2_gx, end_imu2_gy = EXCLUDED.end_imu2_gy, end_imu2_gz = EXCLUDED.end_imu2_gz,
         end_pressure1_raw = EXCLUDED.end_pressure1_raw, end_pressure2_raw = EXCLUDED.end_pressure2_raw, end_pressure3_raw = EXCLUDED.end_pressure3_raw,
         wrist_angle_x_deg = EXCLUDED.wrist_angle_x_deg,
         wrist_angle_y_deg = EXCLUDED.wrist_angle_y_deg,
         wrist_angle_z_deg = EXCLUDED.wrist_angle_z_deg`,
      [
        userId, deliveryId, start.device_timestamp_ms, end.device_timestamp_ms,
        start.imu1_gx, start.imu1_gy, start.imu1_gz, start.imu2_gx, start.imu2_gy, start.imu2_gz,
        start.pressure1_raw, start.pressure2_raw, start.pressure3_raw,
        end.imu1_gx, end.imu1_gy, end.imu1_gz, end.imu2_gx, end.imu2_gy, end.imu2_gz,
        end.pressure1_raw, end.pressure2_raw, end.pressure3_raw,
        angles.x, angles.y, angles.z,
      ]
    );
  }
}

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
    | PoolClient
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

    await summarizeDeliveries(
      client,
      device.user_id,
      [...new Set(samples.map((sample) => sample.deliveryId))]
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
