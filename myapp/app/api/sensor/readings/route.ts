
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
  pressure: { raw: Vec3 };
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
  return typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value);
}

function isVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) &&
    value.length === 3 &&
    value.every(isFiniteNumber);
}

function isImu(value: unknown): value is Imu {
  return isRecord(value) &&
    isVec3(value.accel) &&
    isVec3(value.gyro);
}

function isPressure(
  value: unknown
): value is { raw: Vec3 } {
  if (!isRecord(value) || !isVec3(value.raw)) {
    return false;
  }

  return value.raw.every(
    (v) => Number.isSafeInteger(v) && v >= 0 && v <= 4095
  );
}

function isSample(value: unknown): value is Sample {
  if (!isRecord(value)) return false;

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

  return imuValues.every((v) => Math.abs(v) <= 1_000_000);
}

export async function POST(request: NextRequest) {
  const device = await getDeviceFromRequest(request).catch(
    (error) => {
      console.error('Device authentication failed:', error);
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
      { success: false, message: 'Invalid JSON request.' },
      { status: 400 }
    );
  }

  if (
    !isRecord(body) ||
    !Array.isArray(body.samples) ||
    body.samples.length < 1 ||
    body.samples.length > 500 ||
    !body.samples.every(isSample)
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Invalid samples. Check deliveryId, eventType, timestamps, IMU vectors and pressure values from 0 to 4095.',
      },
      { status: 400 }
    );
  }

  const samples = body.samples as Sample[];
  const deliveryIds = new Set(samples.map((s) => s.deliveryId));

  // A request should contain events for only one delivery.
  if (deliveryIds.size !== 1) {
    return NextResponse.json(
      {
        success: false,
        message: 'Send samples for one delivery per request.',
      },
      { status: 400 }
    );
  }

  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

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
        { success: false, message: 'Device is unavailable.' },
        { status: 401 }
      );
    }

    // STEP 1: Save every individual sensor sample.
    const readingColumns = [
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

    const readingValues: unknown[] = [];

    const readingPlaceholders = samples.map((sample) => {
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

      const firstParameter = readingValues.length + 1;
      readingValues.push(...row);

      return `(${row.map(
        (_, i) => `$${firstParameter + i}`
      ).join(', ')})`;
    });

    const readingsResult = await client.query(
      `INSERT INTO public.sensor_readings (
         ${readingColumns.join(', ')}
       )
       VALUES ${readingPlaceholders.join(', ')}
       RETURNING id`,
      readingValues
    );

    // STEP 2: Create/update one summary row per delivery.
    // Summary IMU columns store gyroscope values because the
    // supplied summary schema has no accelerometer columns.
    for (const sample of samples) {
      const isStart = sample.eventType === 'DELIVERY_START';

      const summaryResult = await client.query(
        `INSERT INTO public.delivery_sensor_summary (
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
           end_pressure3_raw
         )
         VALUES (
           $1, $2, $3, $4,
           $5, $6, $7, $8, $9, $10,
           $11, $12, $13,
           $14, $15, $16, $17, $18, $19,
           $20, $21, $22
         )
         ON CONFLICT (delivery_id) DO UPDATE SET
           start_timestamp_ms = COALESCE(
             EXCLUDED.start_timestamp_ms,
             delivery_sensor_summary.start_timestamp_ms
           ),
           end_timestamp_ms = COALESCE(
             EXCLUDED.end_timestamp_ms,
             delivery_sensor_summary.end_timestamp_ms
           ),
           start_imu1_gx = COALESCE(
             EXCLUDED.start_imu1_gx,
             delivery_sensor_summary.start_imu1_gx
           ),
           start_imu1_gy = COALESCE(
             EXCLUDED.start_imu1_gy,
             delivery_sensor_summary.start_imu1_gy
           ),
           start_imu1_gz = COALESCE(
             EXCLUDED.start_imu1_gz,
             delivery_sensor_summary.start_imu1_gz
           ),
           start_imu2_gx = COALESCE(
             EXCLUDED.start_imu2_gx,
             delivery_sensor_summary.start_imu2_gx
           ),
           start_imu2_gy = COALESCE(
             EXCLUDED.start_imu2_gy,
             delivery_sensor_summary.start_imu2_gy
           ),
           start_imu2_gz = COALESCE(
             EXCLUDED.start_imu2_gz,
             delivery_sensor_summary.start_imu2_gz
           ),
           start_pressure1_raw = COALESCE(
             EXCLUDED.start_pressure1_raw,
             delivery_sensor_summary.start_pressure1_raw
           ),
           start_pressure2_raw = COALESCE(
             EXCLUDED.start_pressure2_raw,
             delivery_sensor_summary.start_pressure2_raw
           ),
           start_pressure3_raw = COALESCE(
             EXCLUDED.start_pressure3_raw,
             delivery_sensor_summary.start_pressure3_raw
           ),
           end_imu1_gx = COALESCE(
             EXCLUDED.end_imu1_gx,
             delivery_sensor_summary.end_imu1_gx
           ),
           end_imu1_gy = COALESCE(
             EXCLUDED.end_imu1_gy,
             delivery_sensor_summary.end_imu1_gy
           ),
           end_imu1_gz = COALESCE(
             EXCLUDED.end_imu1_gz,
             delivery_sensor_summary.end_imu1_gz
           ),
           end_imu2_gx = COALESCE(
             EXCLUDED.end_imu2_gx,
             delivery_sensor_summary.end_imu2_gx
           ),
           end_imu2_gy = COALESCE(
             EXCLUDED.end_imu2_gy,
             delivery_sensor_summary.end_imu2_gy
           ),
           end_imu2_gz = COALESCE(
             EXCLUDED.end_imu2_gz,
             delivery_sensor_summary.end_imu2_gz
           ),
           end_pressure1_raw = COALESCE(
             EXCLUDED.end_pressure1_raw,
             delivery_sensor_summary.end_pressure1_raw
           ),
           end_pressure2_raw = COALESCE(
             EXCLUDED.end_pressure2_raw,
             delivery_sensor_summary.end_pressure2_raw
           ),
           end_pressure3_raw = COALESCE(
             EXCLUDED.end_pressure3_raw,
             delivery_sensor_summary.end_pressure3_raw
           ),
           created_at = NOW()
         WHERE delivery_sensor_summary.user_id = EXCLUDED.user_id
         RETURNING id`,
        [
          device.user_id,
          sample.deliveryId,
          isStart ? sample.deviceTimestampMs : null,
          isStart ? null : sample.deviceTimestampMs,

          isStart ? sample.imu1.gyro[0] : null,
          isStart ? sample.imu1.gyro[1] : null,
          isStart ? sample.imu1.gyro[2] : null,
          isStart ? sample.imu2.gyro[0] : null,
          isStart ? sample.imu2.gyro[1] : null,
          isStart ? sample.imu2.gyro[2] : null,

          isStart ? sample.pressure.raw[0] : null,
          isStart ? sample.pressure.raw[1] : null,
          isStart ? sample.pressure.raw[2] : null,

          isStart ? null : sample.imu1.gyro[0],
          isStart ? null : sample.imu1.gyro[1],
          isStart ? null : sample.imu1.gyro[2],
          isStart ? null : sample.imu2.gyro[0],
          isStart ? null : sample.imu2.gyro[1],
          isStart ? null : sample.imu2.gyro[2],

          isStart ? null : sample.pressure.raw[0],
          isStart ? null : sample.pressure.raw[1],
          isStart ? null : sample.pressure.raw[2],
        ]
      );

      if (summaryResult.rowCount !== 1) {
        throw new Error(
          `Could not update summary for delivery ${sample.deliveryId}. ` +
          'Check delivery ID uniqueness and user ownership.'
        );
      }
    }


    await client.query(
      `UPDATE public.devices
          SET last_seen_at = NOW()
        WHERE id = $1`,
      [device.id]
    );

    // Both tables are committed together.
    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        data: {
          receivedSamples: samples.length,
          storedSamples: readingsResult.rowCount ?? 0,
          updatedDeliveries: deliveryIds.size,
          tables: [
            'sensor_readings',
            'delivery_sensor_summary',
          ],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Sensor rollback failed:', rollbackError);
      }
    }

    console.error('Sensor ingest failed:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Could not store sensor samples and delivery summary.',
      },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
