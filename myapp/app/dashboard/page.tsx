import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import UserDashboardClient from './UserDashboardClient';

export const instant = false;

export default async function UserDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'user') {
    redirect('/login');
  }

  return <UserDashboardClient user={{ name: payload.name, email: payload.email }} />;
}
