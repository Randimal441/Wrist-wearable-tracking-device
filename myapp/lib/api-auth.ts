import { createHash, randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyToken, type JWTPayload } from '@/lib/jwt';

export function hashDeviceToken(
  token: string
): string {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

export function createDeviceToken(): string {
  return randomBytes(32).toString('hex');
}

export function getUserFromRequest(
  req: NextRequest
): JWTPayload | null {
  const token = req.cookies.get('auth_token')?.value;
  return token ? verifyToken(token) : null;
}

export async function getDeviceFromRequest(
  req: NextRequest
) {
  const token = req.headers.get('x-device-token');

  if (!token || token.length !== 64) {
    return null;
  }

  const tokenHash = hashDeviceToken(token);

  const result = await pool.query(
    `SELECT id, user_id, device_name, is_active
       FROM public.devices
      WHERE device_secret_hash = $1
        AND is_active = TRUE`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const device = result.rows[0];

  await pool.query(
    `UPDATE public.devices
        SET last_seen_at = NOW()
      WHERE id = $1`,
    [device.id]
  );

  return device as {
    id: string;
    user_id: number;
    device_name: string;
    is_active: boolean;
  };
}

export function isFiniteNumber(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}