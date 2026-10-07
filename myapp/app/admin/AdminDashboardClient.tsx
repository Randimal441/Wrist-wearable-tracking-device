'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminProps {
  admin: { name: string; email: string };
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

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
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
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                Wrist<span style={{ color: '#fb923c' }}>Track</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-orange)', marginTop: '-1px', fontWeight: 600 }}>Admin Panel</div>
            </div>
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
            onClick={() => setActiveTab('overview')}
            label="Overview"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            label="Users"
            badge={24}
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'devices'}
            onClick={() => setActiveTab('devices')}
            label="Devices"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="7" /><path d="M12 6v6l3 3" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            label="Analytics"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'alerts'}
            onClick={() => setActiveTab('alerts')}
            label="Alerts"
            badge={3}
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            label="System Settings"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>}
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
          background: 'rgba(13,15,26,0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              {activeTab === 'overview' && 'Admin Overview'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'devices' && 'Device Management'}
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'alerts' && 'System Alerts'}
              {activeTab === 'settings' && 'System Settings'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '1px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge-red">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              3 Alerts
            </div>
            <div className="badge badge-green">
              <div className="pulse-dot" style={{ width: '6px', height: '6px' }} />
              System Normal
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, padding: '2rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {activeTab === 'overview' && <AdminOverviewTab />}
          {activeTab === 'users' && <ComingSoonTab label="User Management" />}
          {activeTab === 'devices' && <ComingSoonTab label="Device Management" />}
          {activeTab === 'analytics' && <ComingSoonTab label="Analytics" />}
          {activeTab === 'alerts' && <ComingSoonTab label="System Alerts" />}
          {activeTab === 'settings' && <ComingSoonTab label="System Settings" />}
        </div>
      </main>
    </div>
  );
}

function AdminOverviewTab() {
  const stats = [
    { label: 'Total Users', value: '24', icon: '👥', color: '#6c63ff', change: '+3 this week', badge: 'badge-purple' },
    { label: 'Active Devices', value: '18', icon: '📡', color: '#22d3ee', change: '75% online', badge: 'badge-teal' },
    { label: 'Data Points Today', value: '142K', icon: '📊', color: '#34d399', change: '+12% vs yesterday', badge: 'badge-green' },
    { label: 'Active Alerts', value: '3', icon: '🚨', color: '#f87171', change: '2 critical', badge: 'badge-red' },
  ];

  const recentUsers = [
    { name: 'Sarah Chen', email: 'sarah@example.com', status: 'Active', device: 'WT-001', joined: '2h ago' },
    { name: 'Michael Ross', email: 'michael@example.com', status: 'Active', device: 'WT-002', joined: '5h ago' },
    { name: 'Emma Wilson', email: 'emma@example.com', status: 'Inactive', device: 'WT-003', joined: '1d ago' },
    { name: 'James Liu', email: 'james@example.com', status: 'Active', device: 'WT-004', joined: '2d ago' },
  ];

  const alerts = [
    { type: 'critical', message: 'Device WT-007 disconnected unexpectedly', time: '12m ago' },
    { type: 'warning', message: 'High heart rate detected for user #12', time: '45m ago' },
    { type: 'info', message: 'System backup completed successfully', time: '2h ago' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s, i) => (
          <div key={s.label} className="stat-card animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
              <span className={`badge ${s.badge}`} style={{ fontSize: '0.65rem' }}>●</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.375rem' }}>{s.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.change}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        {/* Recent Users */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              Recent Users
            </h4>
            <span className="badge badge-purple">{recentUsers.length} shown</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentUsers.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem', borderRadius: '0.625rem', background: 'var(--bg-card)', transition: 'background 0.2s' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  background: `hsl(${(i * 60 + 240) % 360}, 70%, 60%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: 'white',
                }}>
                  {u.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Device: {u.device}</div>
                  <span className={`badge ${u.status === 'Active' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>
                    {u.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '45px', textAlign: 'right' }}>{u.joined}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts panel */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            System Alerts
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{
                padding: '0.75rem',
                borderRadius: '0.5rem',
                background: a.type === 'critical' ? 'rgba(248,113,113,0.06)' : a.type === 'warning' ? 'rgba(251,146,60,0.06)' : 'rgba(108,99,255,0.06)',
                border: `1px solid ${a.type === 'critical' ? 'rgba(248,113,113,0.15)' : a.type === 'warning' ? 'rgba(251,146,60,0.15)' : 'rgba(108,99,255,0.12)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: a.type === 'critical' ? 'var(--accent-red)' : a.type === 'warning' ? 'var(--accent-orange)' : 'var(--accent-secondary)' }}>
                    {a.type}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.time}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
        <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{label}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Content for this section will be added soon.</p>
      </div>
    </div>
  );
}
