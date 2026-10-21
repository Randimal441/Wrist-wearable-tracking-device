import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import pool from '../lib/db';

const DEMO_EMAIL = 'demo.bowler@wristtrack.local';
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'DemoBowler123!';
const DEMO_DEVICE_NAME = 'WristTrack Demo ESP32-S3';
const DEMO_DEVICE_TOKEN = 'local-seed-device-token-do-not-use-on-hardware';
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query('SELECT id FROM public.users WHERE email = $1', [DEMO_EMAIL]);
    let userId: number;
    if (userResult.rows.length) {
      userId = userResult.rows[0].id;
      await client.query("UPDATE public.users SET name = 'Demo Bowler', role = 'user' WHERE id = $1", [userId]);
    } else {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
      const inserted = await client.query(
        `INSERT INTO public.users (name, email, password_hash, role)
         VALUES ('Demo Bowler', $1, $2, 'user') RETURNING id`, [DEMO_EMAIL, passwordHash]
      );
      userId = inserted.rows[0].id;
    }

    const deviceResult = await client.query(
      `INSERT INTO public.devices (user_id, device_name, device_secret_hash, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (user_id, device_name) DO UPDATE SET device_secret_hash = EXCLUDED.device_secret_hash, is_active = TRUE
       RETURNING id`, [userId, DEMO_DEVICE_NAME, hashToken(DEMO_DEVICE_TOKEN)]
    );
    const deviceId = deviceResult.rows[0].id;
    // Re-running this script replaces only its own generated sessions/readings.
    await client.query("DELETE FROM public.bowling_sessions WHERE device_id = $1 AND source = 'seed'", [deviceId]);

    // Small fixed fixture makes API/DB assertions deterministic.
    const fixture = await client.query(
      `INSERT INTO public.bowling_sessions (user_id, device_id, session_name, source, started_at, ended_at)
       VALUES ($1, $2, 'Fixed API fixture — 10 samples', 'seed', NOW() - INTERVAL '10 seconds', NOW() - INTERVAL '9.9 seconds')
       RETURNING id`, [userId, deviceId]
    );
    await client.query(
      `INSERT INTO public.sensor_readings (
        session_id, sample_index, device_timestamp_ms, source,
        imu1_ax, imu1_ay, imu1_az, imu1_gx, imu1_gy, imu1_gz, imu1_mx, imu1_my, imu1_mz,
        imu2_ax, imu2_ay, imu2_az, imu2_gx, imu2_gy, imu2_gz, imu2_mx, imu2_my, imu2_mz,
        pressure1_raw, pressure2_raw, pressure3_raw
      )
      SELECT $1, n, n * 10, 'seed',
        0.1, 0.2, 9.81, 1.0, 2.0, 3.0, 20.0, -5.0, 40.0,
        0.2, 0.1, 9.80, 1.5, 2.5, 3.5, 21.0, -4.0, 39.0,
        1200 + n, 1800 + n, 1400 + n
      FROM generate_series(0, 9) AS n`, [fixture.rows[0].id]
    );

    const sessionSpecs = [
      { name: 'Seeded practice — latest', offsetDays: 0, offsetHours: 0 },
      { name: 'Seeded practice — previous', offsetDays: 1, offsetHours: 0 },
      { name: 'Seeded practice — earlier', offsetDays: 3, offsetHours: 0 },
    ];
    for (let sessionNo = 0; sessionNo < sessionSpecs.length; sessionNo++) {
      const spec = sessionSpecs[sessionNo];
      const created = await client.query(
        `INSERT INTO public.bowling_sessions (user_id, device_id, session_name, source, started_at, ended_at)
         VALUES ($1, $2, $3, 'seed', NOW() - ($4::text || ' days')::interval, NOW() - ($4::text || ' days')::interval + INTERVAL '5 seconds')
         RETURNING id, started_at`, [userId, deviceId, spec.name, spec.offsetDays]
      );
      const sessionId = created.rows[0].id;
      // 500 points at 100 Hz = a 5-second illustrative session.
      await client.query(
        `INSERT INTO public.sensor_readings (
          session_id, sample_index, device_timestamp_ms, source,
          imu1_ax, imu1_ay, imu1_az, imu1_gx, imu1_gy, imu1_gz, imu1_mx, imu1_my, imu1_mz,
          imu2_ax, imu2_ay, imu2_az, imu2_gx, imu2_gy, imu2_gz, imu2_mx, imu2_my, imu2_mz,
          pressure1_raw, pressure2_raw, pressure3_raw, pressure1_pa, pressure2_pa, pressure3_pa
        )
        SELECT $1, n, n * 10, 'seed',
          0.4 * sin(n / 17.0 + $2), 0.3 * cos(n / 19.0), 9.81 + 0.2 * sin(n / 13.0),
          35.0 * sin(n / 21.0), 18.0 * cos(n / 27.0), 12.0 * sin(n / 31.0),
          24.0 + 2.0 * sin(n / 23.0), -8.0 + 1.5 * cos(n / 29.0), 41.0 + 1.2 * sin(n / 33.0),
          0.5 * sin(n / 16.0 + 0.5), 0.25 * cos(n / 20.0), 9.81 + 0.18 * sin(n / 14.0),
          28.0 * sin(n / 22.0), 16.0 * cos(n / 25.0), 10.0 * sin(n / 30.0),
          23.5 + 1.8 * sin(n / 24.0), -7.5 + 1.4 * cos(n / 28.0), 40.5 + 1.1 * sin(n / 32.0),
          GREATEST(0, LEAST(4095, round(1500 + 420 * sin(n / 18.0 + $2)))::int),
          GREATEST(0, LEAST(4095, round(1700 + 350 * cos(n / 20.0 + $2)))::int),
          GREATEST(0, LEAST(4095, round(1300 + 300 * sin(n / 16.0 + $2)))::int),
          NULL, NULL, NULL
        FROM generate_series(0, 499) AS n`, [sessionId, sessionNo]
      );
    }
    await client.query('COMMIT');
    console.log('✅ Sensor demo data seeded.');
    console.log(`   Demo login: ${DEMO_EMAIL}`);
    console.log(`   Demo password: ${DEMO_PASSWORD}`);
    console.log('   Device name: ' + DEMO_DEVICE_NAME);
    console.log('   Created one fixed 10-sample API fixture plus three simulated 5-second sessions.');
    console.log('   Seeded data is simulated and is not from physical sensors.');
    console.log('   Seed-only token is for local testing and must never be used on hardware.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Sensor seed failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
