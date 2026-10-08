import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import AdminDashboardClient from './AdminDashboardClient';

export const instant = false;

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    redirect('/login');
  }

  return <AdminDashboardClient admin={{ name: payload.name, email: payload.email }} />;
}
