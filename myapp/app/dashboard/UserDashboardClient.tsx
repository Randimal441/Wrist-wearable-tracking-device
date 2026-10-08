'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';

interface UserProps {
  user: { name: string; email: string };
}

function SidebarLink({
  icon, label, active = false, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`sidebar-link${active ? ' active' : ''}`}
      style={{ width: '100%', textAlign: 'left', background: 'none', border: active ? undefined : 'none' }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function UserDashboardClient({ user }: UserProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="7" />
                <path d="M12 6v6l3 3" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                Wrist<span style={{ color: 'var(--accent-secondary)' }}>Track</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-1px' }}>User Portal</div>
            </div>
            <ThemeToggle size="sm" />
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
            active={activeTab === 'health'}
            onClick={() => setActiveTab('health')}
            label="Health Metrics"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'device'}
            onClick={() => setActiveTab('device')}
            label="My Device"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="7" /><path d="M12 6v6l3 3" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            label="Activity Log"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            label="Settings"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>}
          />
        </nav>

        {/* User profile bottom */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem', borderRadius: '0.625rem', background: 'var(--bg-card)' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6c63ff, #22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: 'white',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
            </div>
            <button
              id="user-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', transition: 'color 0.2s' }}
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
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'health' && 'Health Metrics'}
              {activeTab === 'device' && 'My Device'}
              {activeTab === 'activity' && 'Activity Log'}
              {activeTab === 'settings' && 'Settings'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '1px' }}>
              Welcome back, {user.name.split(' ')[0]}!
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge-green">
              <div className="pulse-dot" />
              Device Online
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '2rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          {activeTab === 'overview' && <OverviewTab userName={user.name.split(' ')[0]} />}
          {activeTab === 'health' && <ComingSoonTab label="Health Metrics" />}
          {activeTab === 'device' && <ComingSoonTab label="Device Management" />}
          {activeTab === 'activity' && <ComingSoonTab label="Activity Log" />}
          {activeTab === 'settings' && <ComingSoonTab label="Account Settings" />}
        </div>
      </main>
    </div>
  );
}

function OverviewTab({ userName }: { userName: string }) {
  const stats = [
    { label: 'Heart Rate', value: '72', unit: 'bpm', icon: '❤️', color: '#f87171', change: '+2' },
    { label: 'Steps Today', value: '6,842', unit: 'steps', icon: '👟', color: '#34d399', change: '+12%' },
    { label: 'Sleep', value: '7.2', unit: 'hrs', icon: '🌙', color: '#a78bfa', change: '+0.3' },
    { label: 'Calories', value: '1,840', unit: 'kcal', icon: '🔥', color: '#fb923c', change: '-120' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(34,211,238,0.08))',
        border: '1px solid rgba(108,99,255,0.2)',
        borderRadius: '1rem', padding: '1.5rem 2rem', marginBottom: '2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Good to see you, {userName}! 👋
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Your wrist device is connected and syncing data in real time.
          </p>
        </div>
        <div className="badge badge-green" style={{ fontSize: '0.8rem', padding: '0.375rem 0.875rem' }}>
          <div className="pulse-dot" style={{ width: '6px', height: '6px' }} />
          Live Sync Active
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="stat-card animate-fade-in-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
              <span style={{ fontSize: '0.75rem', color: s.change.startsWith('+') ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                {s.change}
              </span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            Activity Chart
          </h4>
          <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', border: '1px dashed var(--border)', borderRadius: '0.5rem' }}>
            📊 Chart content coming soon
          </div>
        </div>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            Recent Activity
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {['Device synced', 'Heart rate measured', 'Step count updated', 'Sleep tracking ended'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--bg-card)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{i + 1}h ago</span>
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
