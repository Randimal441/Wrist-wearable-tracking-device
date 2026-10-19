'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../../components/ThemeToggle';
import PersonalizedRecommendation from './PersonalizedRecommendation';
import SpeedStatus from './SpeedStatus';

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
  const [activeTab, setActiveTab] = useState('delivery');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

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
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
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
            active={activeTab === 'delivery'}
            onClick={() => selectTab('delivery')}
            label="Delivery Performance"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 16 4-5 3 3 5-7" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'speed'}
            onClick={() => selectTab('speed')}
            label="Speed Status"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14 16 10" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /><path d="M12 2v2" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'grip'}
            onClick={() => selectTab('grip')}
            label="Grip Status"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 11V5a2 2 0 1 1 4 0v5" /><path d="M12 10V3a2 2 0 1 1 4 0v8" /><path d="M16 10V6a2 2 0 1 1 4 0v8c0 4-2 7-7 7h-1c-3 0-5-1-7-4l-2-3a2 2 0 0 1 3-2l2 2V8a2 2 0 1 1 4 0v3" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'wrist'}
            onClick={() => selectTab('wrist')}
            label="Wrist Angle Status"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6 3" /><path d="M12 12 8 7" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'recommendations'}
            onClick={() => selectTab('recommendations')}
            label="Personalized Recommendations"
            icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8H4l4.8 3.5-1.8 5.9 5-3.6 5 3.6-1.8-5.9 4.8-3.5h-6.1z" /></svg>}
          />
          <SidebarLink
            active={activeTab === 'settings'}
            onClick={() => selectTab('settings')}
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

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
            <button
              className="mobile-menu-button"
              type="button"
              aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              {activeTab === 'delivery' && 'Delivery Performance'}
              {activeTab === 'speed' && 'Speed Status'}
              {activeTab === 'grip' && 'Grip Status'}
              {activeTab === 'wrist' && 'Wrist Angle Status'}
              {activeTab === 'recommendations' && 'Personalized Recommendations'}
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
          {activeTab === 'delivery' && <DeliveryPerformance />}
          {activeTab === 'speed' && <SpeedStatus />}
          {activeTab === 'grip' && <ComingSoonTab label="Grip Status" />}
          {activeTab === 'wrist' && <WristAngleStatus />}
          {activeTab === 'recommendations' && <PersonalizedRecommendation />}
          {activeTab === 'settings' && <ComingSoonTab label="Account Settings" />}
        </div>
      </main>
    </div>
  );
}

interface DeliveryMetric {
  speed: number;
  grip: number;
  wristAngle: number;
}

const latestDelivery: DeliveryMetric = {
  speed: 118.4,
  grip: 72,
  wristAngle: 84,
};

const prediction: DeliveryMetric & { speedRange: [number, number] } = {
  speed: 121,
  speedRange: [119, 124],
  grip: 86,
  wristAngle: 91,
};

function DeliveryPerformance() {
  const speedDifference = Math.abs(latestDelivery.speed - prediction.speed);
  const speedDeviation = (speedDifference / prediction.speed) * 100;
  const gripDifference = Math.abs(latestDelivery.grip - prediction.grip);
  const wristDifference = Math.abs(latestDelivery.wristAngle - prediction.wristAngle);
  const largestDifference = Math.max(speedDeviation, gripDifference, wristDifference);

  const issue = largestDifference === gripDifference
    ? { label: 'Grip needs attention', detail: 'Your grip is lower than the model prediction for this delivery.', color: 'var(--accent-orange)' }
    : largestDifference === wristDifference
      ? { label: 'Wrist angle needs attention', detail: 'Your wrist angle is lower than the model prediction for this delivery.', color: 'var(--accent-teal)' }
      : { label: 'Speed needs attention', detail: 'Your current delivery speed is outside the predicted target.', color: 'var(--accent-red)' };

  return (
    <div className="delivery-performance animate-fade-in">
      <div className="delivery-intro">
        <div>
          <span className="eyebrow">Live delivery analysis</span>
          <h3>Latest bowling delivery</h3>
          <p>Compare your latest IoT reading with the trained model prediction.</p>
        </div>
        <div className="badge badge-green"><div className="pulse-dot" />Data received</div>
      </div>

      <div className="delivery-columns">
        <DeliveryCard title="Current Delivery" metrics={latestDelivery} />
        <DeliveryCard title="Prediction" metrics={prediction} predicted />
      </div>

      <section className="call-analysis glass-card" aria-labelledby="call-analysis-title">
        <div className="analysis-icon" style={{ color: issue.color }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
          </svg>
        </div>
        <div className="analysis-copy">
          <span className="eyebrow">Call analysis</span>
          <h4 id="call-analysis-title">{issue.label}</h4>
          <p>{issue.detail}</p>
        </div>
        <div className="analysis-summary">
          <span>Speed difference</span>
          <strong>{speedDifference.toFixed(1)} km/h</strong>
        </div>
      </section>
    </div>
  );
}

function DeliveryCard({
  title,
  metrics,
  predicted = false,
}: {
  title: string;
  metrics: DeliveryMetric & Partial<{ speedRange: [number, number] }>;
  predicted?: boolean;
}) {
  return (
    <section className={`delivery-card glass-card ${predicted ? 'prediction-card' : 'current-card'}`} aria-labelledby={`${title.toLowerCase().replace(' ', '-')}-title`}>
      <div className="delivery-card-heading">
        <h4 id={`${title.toLowerCase().replace(' ', '-')}-title`}>{title}</h4>
        {predicted && <span className="badge badge-purple">Model output</span>}
      </div>
      <div className="delivery-metrics">
        <MetricRow
          label="Speed"
          value={predicted && metrics.speedRange ? `${metrics.speedRange[0]}–${metrics.speedRange[1]}` : metrics.speed.toFixed(1)}
          unit="km/h"
          icon={<path d="M12 14 16 10" />} 
          accent="var(--accent-secondary)"
        />
        <MetricRow
          label="Grip"
          value={`${metrics.grip}`}
          unit="%"
          icon={<path d="M8 11V5a2 2 0 1 1 4 0v5M12 10V3a2 2 0 1 1 4 0v8M16 10V6a2 2 0 1 1 4 0v8c0 4-2 7-7 7h-1c-3 0-5-1-7-4l-2-3a2 2 0 0 1 3-2l2 2V8a2 2 0 1 1 4 0v3" />}
          accent="var(--accent-orange)"
          percentage={metrics.grip}
        />
        <MetricRow
          label="Wrist angle"
          value={`${metrics.wristAngle}`}
          unit="%"
          icon={<><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6 3" /></>}
          accent="var(--accent-teal)"
          percentage={metrics.wristAngle}
        />
      </div>
    </section>
  );
}

function MetricRow({
  label,
  value,
  unit,
  icon,
  accent,
  percentage,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  accent: string;
  percentage?: number;
}) {
  return (
    <div className="metric-row">
      <div className="metric-label">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
        <span>{label}</span>
      </div>
      <div className="metric-value"><strong>{value}</strong><span>{unit}</span></div>
      {percentage !== undefined && <div className="metric-progress"><span style={{ width: `${percentage}%`, background: accent }} /></div>}
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

interface WristDelivery {
  id: string;
  date: string;
  session: string;
  delivery: number;
  earlyAngle: number;
  releaseAngle: number;
  expectedAngle: number;
  change: number;
  status: 'On baseline' | 'Above baseline' | 'Below baseline';
}

const wristDeliveries: WristDelivery[] = [
  { id: 'D-248', date: '2025-08-21', session: '', delivery: 18, earlyAngle: 72, releaseAngle: 84, expectedAngle: 82, change: 12, status: 'On baseline' },
  { id: 'D-247', date: '2025-08-21', session: '', delivery: 17, earlyAngle: 71, releaseAngle: 81, expectedAngle: 82, change: 10, status: 'On baseline' },
  { id: 'D-246', date: '2025-08-21', session: '', delivery: 16, earlyAngle: 75, releaseAngle: 88, expectedAngle: 82, change: 13, status: 'Above baseline' },
  { id: 'D-219', date: '2025-08-18', session: '', delivery: 9, earlyAngle: 68, releaseAngle: 77, expectedAngle: 81, change: 9, status: 'Below baseline' },
  { id: 'D-198', date: '2025-08-15', session: '', delivery: 22, earlyAngle: 73, releaseAngle: 83, expectedAngle: 82, change: 10, status: 'On baseline' },
  { id: 'D-176', date: '2025-08-11', session: '', delivery: 14, earlyAngle: 70, releaseAngle: 80, expectedAngle: 81, change: 10, status: 'On baseline' },
];

function WristAngleStatus() {
  const [dateFilter, setDateFilter] = useState('all');
  const latest = wristDeliveries[0];
  const timeline = [
    { label: 'Early', time: '0 ms', angle: 72 },
    { label: 'Load', time: '180 ms', angle: 76 },
    { label: 'Release', time: '342 ms', angle: 84 },
    { label: 'Follow-through', time: '510 ms', angle: 79 },
  ];
  const points = timeline.map((point, index) => `${70 + index * 170},${214 - (point.angle - 65) * 5}`).join(' ');
  const filteredDeliveries = wristDeliveries.filter((item) => {
    const matchesDate = dateFilter === 'all' || (dateFilter === 'week' ? item.date >= '2025-08-15' : item.date < '2025-08-15');
    return matchesDate;
  });
  const difference = latest.releaseAngle - latest.expectedAngle;

  return (
    <div className="wrist-status animate-fade-in">
      <section className="wrist-hero">
        <div>
          <span className="eyebrow">Component status / wrist mechanics</span>
          <h3>Wrist angle, measured through release</h3>
          <p>Understand how your wrist position changes from the start of a delivery to the ball-release moment.</p>
          <div className="wrist-hero-meta"><span className="badge badge-green"><div className="pulse-dot" />Latest delivery {latest.id}</span><span>21 Aug 2025 · {latest.session}</span></div>
        </div>
        <div className="wrist-hero-metrics">
          <div><span>Release wrist angle</span><strong>{latest.releaseAngle}<small>°</small></strong><em>At ball release</em></div>
          <div><span>Early wrist angle</span><strong>{latest.earlyAngle}<small>°</small></strong><em>At delivery start</em></div>
          <div><span>Angle change</span><strong className="positive">+{latest.change}<small>°</small></strong><em>Early to release</em></div>
        </div>
      </section>

      <section className="wrist-section glass-card" aria-labelledby="timeline-title">
        <div className="wrist-section-heading"><div><span className="eyebrow">Latest delivery / {latest.id}</span><h4 id="timeline-title">Wrist movement timeline</h4><p>Wrist-angle change throughout this delivery. The release marker identifies the detected ball-release moment.</p></div><span className="badge badge-teal">342 ms capture</span></div>
        <div className="wrist-chart-wrap">
          <div className="wrist-chart-y-labels"><span>90°</span><span>80°</span><span>70°</span><span>60°</span></div>
          <svg className="wrist-chart" viewBox="0 0 620 270" role="img" aria-label="Wrist angle timeline from early measurement to follow-through">
            <defs><linearGradient id="wristArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".24" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs>
            {[64, 114, 164, 214].map((y) => <line key={y} x1="70" y1={y} x2="580" y2={y} className="chart-grid-line" />)}
            <line x1="360" y1="42" x2="360" y2="224" className="release-line" />
            <polygon points={`70,224 ${points} 580,224`} fill="url(#wristArea)" />
            <polyline points={points} className="wrist-chart-line" />
            {timeline.map((point, index) => <g key={point.label}><circle cx={70 + index * 170} cy={214 - (point.angle - 65) * 5} r="6" className={point.label === 'Release' ? 'chart-point release-point' : 'chart-point'} /><text x={70 + index * 170} y="246" textAnchor="middle" className="chart-axis-label">{point.time}</text></g>)}
            <rect x="374" y="38" width="124" height="30" rx="8" className="release-label-bg" /><text x="386" y="58" className="release-label">BALL RELEASE · 84°</text>
          </svg>
        </div>
        <div className="wrist-chart-legend"><span><i className="legend-dot early" />Early measurement · {latest.earlyAngle}°</span><span><i className="legend-dot release" />Detected release · {latest.releaseAngle}°</span><span><i className="legend-line" />Angle path</span></div>
      </section>

      <section className="wrist-section glass-card" aria-labelledby="baseline-title">
        <div className="wrist-section-heading"><div><span className="eyebrow">Validated against your delivery history</span><h4 id="baseline-title">Personal baseline comparison</h4><p>Your baseline is calculated from 42 normal deliveries in the last 30 days, not from a universal ideal.</p></div><span className="badge badge-purple">42 deliveries</span></div>
        <div className="baseline-grid"><div className="baseline-score"><span>Release angle fit</span><strong>{Math.abs(difference) <= 3 ? 'Within baseline' : 'Needs review'}</strong><p>{Math.abs(difference)}° from your expected release angle</p><div className="baseline-bar"><span style={{ width: `${Math.max(12, 100 - Math.abs(difference) * 12)}%` }} /></div></div><BaselineMetric label="Expected angle" value={`${latest.expectedAngle}°`} detail="Historical normal" accent="purple" /><BaselineMetric label="Actual angle" value={`${latest.releaseAngle}°`} detail="Latest delivery" accent="teal" /><BaselineMetric label="Difference" value={`${difference > 0 ? '+' : ''}${difference}°`} detail="Actual vs expected" accent={difference > 0 ? 'orange' : 'green'} /></div>
      </section>

      <section className="wrist-section glass-card" aria-labelledby="history-title">
        <div className="wrist-section-heading history-heading"><div><span className="eyebrow">Pattern review</span><h4 id="history-title">Wrist history and trends</h4><p>Review past deliveries and spot recurring wrist-angle patterns across sessions.</p></div><div className="trend-summary"><strong>+2.4°</strong><span>average release change<br />over 30 days</span></div></div>
        <div className="history-filters"><label>Date<select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="all">All dates</option><option value="week">Last 7 days</option><option value="older">Older deliveries</option></select></label></div>
        <div className="history-table-wrap"><table className="wrist-history-table"><thead><tr><th>Delivery</th><th>Date</th><th>Early</th><th>Release</th><th>Change</th><th>Baseline</th></tr></thead><tbody>{filteredDeliveries.map((item) => <tr key={item.id}><td><strong>{item.id}</strong><span>Delivery {item.delivery}</span></td><td>{item.date}</td><td>{item.earlyAngle}°</td><td className="release-value">{item.releaseAngle}°</td><td>+{item.change}°</td><td><span className={`history-status ${item.status === 'On baseline' ? 'status-good' : item.status === 'Above baseline' ? 'status-high' : 'status-low'}`}>{item.status}</span></td></tr>)}</tbody></table>{filteredDeliveries.length === 0 && <p className="empty-history">No deliveries match these filters.</p>}</div>
      </section>
    </div>
  );
}

function BaselineMetric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
  return <div className={`baseline-metric baseline-${accent}`}><span>{label}</span><strong>{value}</strong><em>{detail}</em></div>;
}
