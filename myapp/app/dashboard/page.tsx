import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import pool from '@/lib/db';
import UserDashboardClient from './UserDashboardClient';

export const instant = false;

export default async function UserDashboardPage() {
  await connection();
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'user') {
    redirect('/login');
  }

  const profile = await pool.query(
    'SELECT arm_length_m::float AS arm_length_m FROM users WHERE id = $1',
    [payload.userId]
  );
  const armLengthM: number | null = profile.rows[0]?.arm_length_m ?? null;

  return <UserDashboardClient user={{ name: payload.name, email: payload.email, armLengthM }} />;
}
