'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';
import {
  SessionDetailView,
  formatDateTime,
  formatDuration,
  type SessionDetail,
  type SessionSummary,
} from '../dashboard/SpeedStatus';

interface AdminProps {
  admin: { name: string; email: string };
}

interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

function SidebarLink({
  icon, label, active = false, onClick, badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`sidebar-link${active ? ' active' : ''}`}
      style={{ width: '100%', textAlign: 'left', background: 'none', border: active ? undefined : 'none' }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && (
        <span style={{
          background: 'var(--accent-primary)', color: 'white', borderRadius: '999px',
          fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', lineHeight: '1.4',
        }}>{badge}</span>
      )}
    </button>
  );
}

export default function AdminDashboardClient({ admin }: AdminProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loggingOut, setLoggingOut] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [latestUsers, setLatestUsers] = useState<UserRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [openSessionId, setOpenSessionId] = useState<number | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Fetch stats for dashboard overview
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (json.success) {
        setTotalUsers(json.data.totalUsers);
        setLatestUsers(json.data.latestUsers);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch all users for user management tab
  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) {
        setAllUsers(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Fetch performance data for a specific user
  const fetchUserPerformance = async (userId: number) => {
    setLoadingPerformance(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const json = await res.json();
      if (json.success) {
        setSelectedUser(json.data.user);
        setSessions(json.data.sessions);
        setOpenSessionId(null);
        setSessionDetail(null);
      }
    } catch (err) {
      console.error('Failed to fetch performance:', err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  // Fetch one speed session (with its deliveries) for the selected user
  const fetchSession = async (userId: number, sessionId: number) => {
    setOpenSessionId(sessionId);
    setSessionDetail(null);
    setSessionError('');
    setLoadingSession(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/sessions/${sessionId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setSessionDetail(json.data);
    } catch {
      setSessionError('Could not load this session.');
    } finally {
      setLoadingSession(false);
    }
  };

  // Delete a user
  const handleDeleteUser = async (userId: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setAllUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotalUsers((prev) => prev - 1);
        setLatestUsers((prev) => prev.filter((u) => u.id !== userId));
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
          setSessions([]);
          setOpenSessionId(null);
        }
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchAllUsers();
    }
  }, [activeTab, fetchAllUsers]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navigateToUsers = () => {
    setSelectedUser(null);
    setSessions([]);
    setOpenSessionId(null);
    setActiveTab('users');
  };

  const initials = admin.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Admin Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #fb923c, #f87171)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 4px 12px rgba(251,146,60,0.35)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                Wrist<span style={{ color: '#fb923c' }}>Track</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', marginTop: '-1px', fontWeight: 600 }}>Admin Panel</div>
            </div>
            <ThemeToggle size="sm" />
          </div>
        </div>

        {/* Admin badge */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div className="badge badge-orange" style={{ width: '100%', justifyContent: 'center', padding: '0.375rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Administrator Access
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <SidebarLink
            active={activeTab === 'overview'}
            onClick={() => { setActiveTab('overview'); setSelectedUser(null); }}
            label="Overview"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'users'}
            onClick={navigateToUsers}
            label="Users"
            badge={totalUsers}
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          />
        </nav>

        {/* Admin profile bottom */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem', borderRadius: '0.625rem', background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.12)' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #fb923c, #f87171)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: 'white',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{admin.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#fb923c', fontWeight: 600 }}>Administrator</div>
            </div>
            <button
              id="admin-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}
              title="Sign out"
              aria-label="Sign out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{
          padding: '1.25rem 2rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--header-bg)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              {activeTab === 'overview' && 'Admin Overview'}
              {activeTab === 'users' && (selectedUser
                ? `${selectedUser.name} — ${openSessionId !== null ? 'Session' : 'Speed Status'}`
                : 'User Management')}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '1px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge-green">
              <div className="pulse-dot" style={{ width: '6px', height: '6px' }} />
              System Normal
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, padding: '2rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {activeTab === 'overview' && (
            <AdminOverviewTab
              totalUsers={totalUsers}
              latestUsers={latestUsers}
              loading={loadingStats}
              onClickUserCount={navigateToUsers}
              onClickUser={(userId) => { setActiveTab('users'); fetchUserPerformance(userId); }}
            />
          )}
          {activeTab === 'users' && (
            selectedUser && openSessionId !== null ? (
              <SessionDetailView
                session={sessionDetail}
                loading={loadingSession}
                error={sessionError}
                onBack={() => { setOpenSessionId(null); setSessionError(''); }}
              />
            ) : selectedUser ? (
              <UserPerformanceView
                user={selectedUser}
                sessions={sessions}
                loading={loadingPerformance}
                deleting={deleting}
                deleteConfirm={deleteConfirm}
                onBack={() => { setSelectedUser(null); setSessions([]); }}
                onSelectSession={(sessionId) => fetchSession(selectedUser.id, sessionId)}
                onDelete={handleDeleteUser}
                onDeleteConfirm={setDeleteConfirm}
              />
            ) : (
              <UserManagementTab
                users={allUsers}
                loading={loadingUsers}
                onSelectUser={(userId) => fetchUserPerformance(userId)}
              />
            )
          )}
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   OVERVIEW TAB — Total Users, 5 Latest Users, System Notifications
   ═══════════════════════════════════════════════════════════════════════════════ */

function AdminOverviewTab({
  totalUsers, latestUsers, loading, onClickUserCount, onClickUser,
}: {
  totalUsers: number;
  latestUsers: UserRecord[];
  loading: boolean;
  onClickUserCount: () => void;
  onClickUser: (userId: number) => void;
}) {
  const notifications = [
    { type: 'info', message: 'System backup completed successfully', time: '2h ago', icon: '✅' },
    { type: 'warning', message: 'Database storage reaching 80% capacity', time: '5h ago', icon: '⚠️' },
    { type: 'info', message: 'SSL certificate renewal scheduled', time: '1d ago', icon: '🔐' },
    { type: 'info', message: 'Server firmware update available (v3.2.1)', time: '2d ago', icon: '🔄' },
    { type: 'success', message: 'Monthly user report generated', time: '3d ago', icon: '📊' },
  ];

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Total Users Stat Card — Clickable */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          id="total-users-card"
          onClick={onClickUserCount}
          style={{
            width: '100%', maxWidth: '340px', textAlign: 'left',
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          }}
        >
          <div className="stat-card animate-fade-in-up" style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(167,139,250,0.04))',
            border: '1px solid rgba(108,99,255,0.15)',
          }}>
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '100px', height: '100px', borderRadius: '50%',
              background: 'rgba(108,99,255,0.06)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(108,99,255,0.3)',
                flexShrink: 0,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>
                  {totalUsers}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.25rem' }}>
                  Total Registered Users
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  Click to view all users
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
        {/* Latest 5 Users — Clickable names */}
        <div className="glass-card animate-fade-in-up" style={{ padding: '1.5rem', animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Latest Registrations
            </h4>
            <span className="badge badge-teal">{latestUsers.length} recent</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {latestUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No users registered yet
              </div>
            ) : (
              latestUsers.map((u, i) => (
                <button
                  key={u.id}
                  id={`latest-user-${u.id}`}
                  onClick={() => onClickUser(u.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.75rem', borderRadius: '0.625rem',
                    background: 'var(--bg-card)', border: '1px solid transparent',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.border = '1px solid var(--accent-primary)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.border = '1px solid transparent';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: `hsl(${(i * 60 + 200) % 360}, 70%, 60%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: 'white',
                  }}>
                    {u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatTimeAgo(u.created_at)}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px' }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* System Notifications */}
        <div className="glass-card animate-fade-in-up" style={{ padding: '1.5rem', animationDelay: '0.2s' }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            System Notifications
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {notifications.map((n, i) => (
              <div key={i} style={{
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: n.type === 'warning'
                  ? 'rgba(251,146,60,0.06)'
                  : n.type === 'success'
                    ? 'rgba(52,211,153,0.06)'
                    : 'rgba(108,99,255,0.06)',
                border: `1px solid ${n.type === 'warning'
                  ? 'rgba(251,146,60,0.15)'
                  : n.type === 'success'
                    ? 'rgba(52,211,153,0.15)'
                    : 'rgba(108,99,255,0.12)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.875rem' }}>{n.icon}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.time}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   USER MANAGEMENT TAB — All Registered Users
   ═══════════════════════════════════════════════════════════════════════════════ */

function UserManagementTab({
  users, loading, onSelectUser,
}: {
  users: UserRecord[];
  loading: boolean;
  onSelectUser: (userId: number) => void;
}) {
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="badge badge-purple" style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem' }}>
            {users.length} total users
          </div>
        </div>
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id="user-search-input"
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.25rem',
              borderRadius: '0.625rem', border: '1px solid var(--border)',
              background: 'var(--input-bg)', color: 'var(--text-primary)',
              fontSize: '0.875rem', outline: 'none',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-focus)';
              e.currentTarget.style.background = 'var(--input-bg-focus)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--input-bg)';
            }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Registered</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {search ? 'No users match your search' : 'No users registered yet'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, i) => (
                  <tr key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    onClick={() => onSelectUser(u.id)}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          background: `hsl(${(i * 47 + 120) % 360}, 65%, 55%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 700, color: 'white',
                        }}>
                          {u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{u.email}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem', cursor: 'pointer' }}>
                        View Performance →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   USER PERFORMANCE VIEW — Individual user history + delete
   ═══════════════════════════════════════════════════════════════════════════════ */

function UserPerformanceView({
  user, sessions, loading, deleting, deleteConfirm, onBack, onSelectSession, onDelete, onDeleteConfirm,
}: {
  user: UserRecord;
  sessions: SessionSummary[];
  loading: boolean;
  deleting: boolean;
  deleteConfirm: number | null;
  onBack: () => void;
  onSelectSession: (sessionId: number) => void;
  onDelete: (userId: number) => void;
  onDeleteConfirm: (userId: number | null) => void;
}) {
  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading performance data...</p>
        </div>
      </div>
    );
  }

  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  // Summary across all of the user's sessions (avg speed is weighted by deliveries)
  const totalDeliveries = sessions.reduce((s, p) => s + p.deliveries_count, 0);
  const avgSpeed = totalDeliveries > 0
    ? (sessions.reduce((s, p) => s + p.avg_speed * p.deliveries_count, 0) / totalDeliveries).toFixed(1)
    : '--';
  const topSpeed = sessions.length > 0
    ? Math.max(...sessions.map((p) => p.max_speed)).toFixed(1)
    : '--';

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button
        id="back-to-users-btn"
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500,
          padding: '0.5rem 0', marginBottom: '1.25rem',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-primary)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to All Users
      </button>

      {/* User Profile Header */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #6c63ff, #22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.125rem', fontWeight: 700, color: 'white',
              boxShadow: '0 8px 24px rgba(108,99,255,0.25)',
            }}>
              {initials}
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{user.name}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user.email}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Registered: {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Delete Button */}
          <div>
            {deleteConfirm === user.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-red)', fontWeight: 600 }}>Confirm?</span>
                <button
                  id="confirm-delete-btn"
                  onClick={() => onDelete(user.id)}
                  disabled={deleting}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white', fontWeight: 600, fontSize: '0.8rem',
                    cursor: deleting ? 'wait' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  id="cancel-delete-btn"
                  onClick={() => onDeleteConfirm(null)}
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                id="delete-user-btn"
                onClick={() => onDeleteConfirm(user.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.625rem 1.125rem', borderRadius: '0.625rem',
                  border: '1px solid rgba(248,113,113,0.3)',
                  background: 'rgba(248,113,113,0.06)',
                  color: 'var(--accent-red)', fontWeight: 600, fontSize: '0.8125rem',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.12)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Sessions', value: sessions.length, icon: '🏏', color: '#6c63ff' },
          { label: 'Total Deliveries', value: totalDeliveries, icon: '🎯', color: '#22d3ee' },
          { label: 'Avg Speed', value: avgSpeed === '--' ? '--' : `${avgSpeed} km/h`, icon: '⚡', color: '#fb923c' },
          { label: 'Top Speed', value: topSpeed === '--' ? '--' : `${topSpeed} km/h`, icon: '🚀', color: '#34d399' },
        ].map((s, i) => (
          <div key={s.label} className="stat-card animate-fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1, marginTop: '0.5rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Performance History Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="m7 16 4-5 3 3 5-7" />
            </svg>
            Speed Sessions
          </h4>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Deliveries</th>
                <th style={thStyle}>Avg Speed</th>
                <th style={thStyle}>Max Speed</th>
                <th style={thStyle}>Min Speed</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    This user has no speed sessions yet
                  </td>
                </tr>
              ) : (
                sessions.map((p) => (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    role="button"
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    onClick={() => onSelectSession(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectSession(p.id);
                      }
                    }}
                  >
                    <td style={tdStyle}>{formatDateTime(p.started_at)}</td>
                    <td style={tdStyle}>{formatDuration(p.started_at, p.ended_at)}</td>
                    <td style={tdStyle}>{p.deliveries_count}</td>
                    <td style={{ ...tdStyle, color: 'var(--accent-teal)', fontWeight: 700 }}>{p.avg_speed.toFixed(1)} km/h</td>
                    <td style={tdStyle}>{p.max_speed.toFixed(1)} km/h</td>
                    <td style={tdStyle}>{p.min_speed.toFixed(1)} km/h</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>View Performance →</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */

const thStyle: React.CSSProperties = {
  padding: '0.875rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  fontSize: '0.8125rem',
  color: 'var(--text-secondary)',
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
