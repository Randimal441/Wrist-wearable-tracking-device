'use client';

import { useCallback, useEffect, useState } from 'react';

export interface SessionSummary {
    session_no: number;
    started_at: string;
    ended_at: string;
    deliveries_count: number;
    avg_speed: number;
    max_speed: number;
    min_speed: number;
}

export interface SessionDetail extends SessionSummary {
    deliveries: { delivery_no: number; speed_kmh: number }[];
}

type View = 'overview' | 'live' | 'detail';

const LIVE_INTERVAL_MS = 2500;
const BASE_SPEED_MIN = 112;
const BASE_SPEED_RANGE = 14;

export function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDuration(startIso: string, endIso: string) {
    const secs = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000));
    return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
}

function stdDev(values: number[]) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

export default function SpeedStatus() {
    const [view, setView] = useState<View>('overview');
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<SessionDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadSessions = useCallback(() => {
        fetch('/api/user/sessions')
            .then((res) => res.json())
            .then((json) => {
                if (!json.success) throw new Error(json.message);
                setSessions(json.data);
                setError('');
            })
            .catch(() => setError('Could not load your sessions.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const openSession = async (sessionNo: number) => {
        setView('detail');
        setSelected(null);
        setDetailLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/user/sessions/${sessionNo}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.message);
            setSelected(json.data);
        } catch {
            setError('Could not load this session.');
        } finally {
            setDetailLoading(false);
        }
    };

    const backToOverview = () => {
        setView('overview');
        setSelected(null);
        setError('');
    };

    if (view === 'live') {
        return (
            <LiveSession
                onFinished={() => {
                    setView('overview');
                    loadSessions();
                }}
            />
        );
    }

    if (view === 'detail') {
        return (
            <SessionDetailView
                session={selected}
                loading={detailLoading}
                error={error}
                onBack={backToOverview}
            />
        );
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <section className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <span className="eyebrow">Bowling speed</span>
                    <h3 className="rec-section-title">Live Session</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Start a session to track every delivery&apos;s speed as you bowl.
                    </p>
                </div>
                <button type="button" id="start-live-session" className="btn-primary" onClick={() => setView('live')}>
                    Start Live Session
                </button>
            </section>

            <section className="glass-card" style={{ padding: '1.5rem' }} aria-labelledby="prev-sessions-title">
                <div className="rec-section-header" style={{ marginBottom: '0.75rem' }}>
                    <div>
                        <span className="eyebrow">History</span>
                        <h3 id="prev-sessions-title" className="rec-section-title">Previous Sessions</h3>
                    </div>
                </div>

                {loading && <p style={{ color: 'var(--text-muted)' }}>Loading sessions…</p>}
                {error && <p style={{ color: 'var(--accent-red)' }}>{error}</p>}
                {!loading && !error && sessions.length === 0 && (
                    <p style={{ color: 'var(--text-muted)' }}>No sessions yet. Start a live session to record your first one.</p>
                )}

                {sessions.length > 0 && (
                    <div className="history-table-wrap">
                        <table className="wrist-history-table speed-sessions-table">
                            <thead>
                                <tr>
                                    <th>Session</th>
                                    <th>Date</th>
                                    <th>Duration</th>
                                    <th>Deliveries</th>
                                    <th>Avg (km/h)</th>
                                    <th>Max (km/h)</th>
                                    <th>Min (km/h)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((s) => (
                                    <tr
                                        key={s.session_no}
                                        tabIndex={0}
                                        role="button"
                                        onClick={() => openSession(s.session_no)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                openSession(s.session_no);
                                            }
                                        }}
                                    >
                                        <td><strong>#{s.session_no}</strong></td>
                                        <td>{formatDateTime(s.started_at)}</td>
                                        <td>{formatDuration(s.started_at, s.ended_at)}</td>
                                        <td>{s.deliveries_count}</td>
                                        <td style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>{s.avg_speed.toFixed(1)}</td>
                                        <td>{s.max_speed.toFixed(1)}</td>
                                        <td>{s.min_speed.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function LiveSession({ onFinished }: { onFinished: () => void }) {
    const [speeds, setSpeeds] = useState<number[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [startedAt] = useState(() => new Date());
    const [baseSpeed] = useState(() => BASE_SPEED_MIN + Math.random() * BASE_SPEED_RANGE);

    // Mock glove data: replace with real device readings once the glove can send them.
    useEffect(() => {
        const timer = setInterval(() => {
            const next = baseSpeed + (Math.random() - 0.5) * 12;
            setSpeeds((prev) => [...prev, Math.round(next * 10) / 10]);
        }, LIVE_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [baseSpeed]);

    const endSession = async () => {
        if (speeds.length === 0) {
            onFinished();
            return;
        }
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/user/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startedAt: startedAt.toISOString(),
                    endedAt: new Date().toISOString(),
                    speeds,
                }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.message);
            onFinished();
        } catch {
            setError('Could not save the session. Try ending it again.');
            setSaving(false);
        }
    };

    const current = speeds[speeds.length - 1];
    const avg = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
    const max = speeds.length ? Math.max(...speeds) : null;

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <section className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <div className="badge badge-green" style={{ marginBottom: '0.5rem' }}>
                        <div className="pulse-dot" />
                        Live
                    </div>
                    <h3 className="rec-section-title">Session in progress</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Started {formatDateTime(startedAt.toISOString())} · a new delivery appears every few seconds.
                    </p>
                </div>
                <button type="button" id="end-live-session" className="btn-primary" onClick={endSession} disabled={saving}>
                    {saving ? 'Saving…' : 'End Session'}
                </button>
            </section>

            {error && <p style={{ color: 'var(--accent-red)' }}>{error}</p>}

            <div className="rec-kpi-grid">
                <KpiCard label="Current speed" value={current?.toFixed(1)} accent="var(--accent-teal)" />
                <KpiCard label="Average" value={avg?.toFixed(1)} accent="var(--accent-primary)" />
                <KpiCard label="Top speed" value={max?.toFixed(1)} accent="var(--accent-green)" />
                <KpiCard label="Deliveries" value={String(speeds.length)} accent="var(--accent-orange)" unit="" />
            </div>

            <section className="rec-chart-section glass-card" aria-labelledby="live-graph-title">
                <div className="rec-section-header" style={{ marginBottom: '0.35rem' }}>
                    <div>
                        <span className="eyebrow">Live</span>
                        <h3 id="live-graph-title" className="rec-section-title">Bowling Speed</h3>
                    </div>
                </div>
                <SpeedLineChart speeds={speeds} />
            </section>
        </div>
    );
}

export function SessionDetailView({
    session,
    loading,
    error,
    onBack,
}: {
    session: SessionDetail | null;
    loading: boolean;
    error: string;
    onBack: () => void;
}) {
    const speeds = session?.deliveries.map((d) => d.speed_kmh) ?? [];

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
                <button type="button" className="btn-ghost" onClick={onBack}>
                    ← Back to sessions
                </button>
            </div>

            {loading && <p style={{ color: 'var(--text-muted)' }}>Loading session…</p>}
            {error && <p style={{ color: 'var(--accent-red)' }}>{error}</p>}

            {session && (
                <>
                    <section className="glass-card" style={{ padding: '1.5rem' }}>
                        <span className="eyebrow">Session #{session.session_no}</span>
                        <h3 className="rec-section-title">{formatDateTime(session.started_at)}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            Duration {formatDuration(session.started_at, session.ended_at)}
                        </p>
                    </section>

                    <div className="rec-kpi-grid">
                        <KpiCard label="Deliveries" value={String(session.deliveries_count)} accent="var(--accent-orange)" unit="" />
                        <KpiCard label="Average" value={session.avg_speed.toFixed(1)} accent="var(--accent-teal)" />
                        <KpiCard label="Top speed" value={session.max_speed.toFixed(1)} accent="var(--accent-green)" />
                        <KpiCard label="Lowest" value={session.min_speed.toFixed(1)} accent="var(--accent-primary)" />
                        <KpiCard label="Consistency (±)" value={stdDev(speeds).toFixed(1)} accent="var(--accent-secondary)" />
                    </div>

                    <section className="rec-chart-section glass-card" aria-labelledby="detail-graph-title">
                        <div className="rec-section-header" style={{ marginBottom: '0.35rem' }}>
                            <div>
                                <span className="eyebrow">This session</span>
                                <h3 id="detail-graph-title" className="rec-section-title">Bowling Speed</h3>
                            </div>
                        </div>
                        <SpeedLineChart speeds={speeds} />
                    </section>

                    <section className="glass-card" style={{ padding: '1.5rem' }} aria-labelledby="detail-table-title">
                        <h3 id="detail-table-title" className="rec-section-title" style={{ marginBottom: '0.75rem' }}>
                            Deliveries
                        </h3>
                        <div className="history-table-wrap">
                            <table className="wrist-history-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Speed (km/h)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {session.deliveries.map((d) => (
                                        <tr key={d.delivery_no}>
                                            <td>{d.delivery_no}</td>
                                            <td style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>
                                                {d.speed_kmh.toFixed(1)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

function KpiCard({
    label,
    value,
    accent,
    unit = 'km/h',
}: {
    label: string;
    value?: string;
    accent: string;
    unit?: string;
}) {
    return (
        <div className="rec-kpi-card glass-card" style={{ borderTop: `3px solid ${accent}` }}>
            <div className="rec-kpi-value" style={{ color: accent }}>
                {value ?? '--'}
                {value !== undefined && unit && <span className="rec-kpi-unit">{unit}</span>}
            </div>
            <div className="rec-kpi-label">{label}</div>
        </div>
    );
}

function SpeedLineChart({ speeds }: { speeds: number[] }) {
    const W = 520, H = 180;
    const padL = 40, padR = 14, padT = 10, padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    if (speeds.length === 0) {
        return (
            <div className="rec-chart-wrap" style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Waiting for the first delivery…</p>
            </div>
        );
    }

    const minS = Math.floor(Math.min(...speeds) - 2);
    const maxS = Math.ceil(Math.max(...speeds) + 2);

    const toX = (i: number) =>
        speeds.length === 1 ? padL + chartW / 2 : padL + (i / (speeds.length - 1)) * chartW;
    const toY = (v: number) => padT + chartH - ((v - minS) / (maxS - minS)) * chartH;

    const pts = speeds.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`);
    const areaPoints = [
        `${padL},${padT + chartH}`,
        ...pts,
        `${toX(speeds.length - 1).toFixed(1)},${padT + chartH}`,
    ].join(' ');

    const yTicks = [minS, Math.round((minS + maxS) / 2), maxS];
    // Keep x labels readable: at most ~10 labels.
    const labelStep = Math.max(1, Math.ceil(speeds.length / 10));

    return (
        <>
            <div className="rec-chart-wrap">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    width="100%"
                    role="img"
                    aria-label={`Bowling speed across ${speeds.length} deliveries, from ${Math.min(...speeds)} to ${Math.max(...speeds)} km/h`}
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="speedStatusArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.20" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {yTicks.map((v) => (
                        <g key={v}>
                            <line x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} className="chart-grid-line" />
                            <text x={padL - 6} y={toY(v) + 4} textAnchor="end" className="chart-axis-label">
                                {v}
                            </text>
                        </g>
                    ))}

                    {speeds.length > 1 && <polygon points={areaPoints} fill="url(#speedStatusArea)" />}
                    {speeds.length > 1 && <polyline points={pts.join(' ')} className="wrist-chart-line" />}

                    {speeds.map((v, i) => (
                        <g key={i}>
                            <circle cx={toX(i)} cy={toY(v)} r={4} className="chart-point">
                                <title>{`Delivery ${i + 1}: ${v.toFixed(1)} km/h`}</title>
                            </circle>
                            {i % labelStep === 0 && (
                                <text x={toX(i)} y={H - 8} textAnchor="middle" className="chart-axis-label">
                                    {i + 1}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>
            </div>
            <div className="rec-chart-footer">
                <span className="rec-chart-legend-item">
                    <i className="legend-line" aria-hidden="true" />
                    Speed (km/h) by delivery
                </span>
            </div>
        </>
    );
}
