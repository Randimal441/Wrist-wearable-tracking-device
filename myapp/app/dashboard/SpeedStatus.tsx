'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReleaseSpeeds, type ReleaseSpeedsData } from './ReleaseSpeed';

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

interface LiveBall {
    ballNo: number;
    delivery: { speedKmh: number; aMagG: number; saturated: boolean } | null;
}

interface LiveData {
    balls: LiveBall[];
    waiting: boolean;
    uncounted: number;
}

type BaselineStatus = 'On baseline' | 'Above baseline' | 'Below baseline';

const LIVE_POLL_MS = 2000;
// A session within ±3 km/h of the player's average counts as "on baseline".
const BASELINE_TOLERANCE = 3;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DELIVERIES_SHOWN = 100;

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

function formatSigned(value: number) {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

function stdDev(values: number[]) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

// Average speed across sessions, weighted by how many deliveries each had.
function weightedAverage(sessions: SessionSummary[]) {
    const deliveries = sessions.reduce((sum, s) => sum + s.deliveries_count, 0);
    if (deliveries === 0) return 0;
    return sessions.reduce((sum, s) => sum + s.avg_speed * s.deliveries_count, 0) / deliveries;
}

function baselineStatus(speed: number, baseline: number): BaselineStatus {
    const diff = speed - baseline;
    if (Math.abs(diff) <= BASELINE_TOLERANCE) return 'On baseline';
    return diff > 0 ? 'Above baseline' : 'Below baseline';
}

const STATUS_CLASS: Record<BaselineStatus, string> = {
    'On baseline': 'status-good',
    'Above baseline': 'status-high',
    'Below baseline': 'status-low',
};

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data as T;
}

function BaselineMetric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
    return <div className={`baseline-metric baseline-${accent}`}><span>{label}</span><strong>{value}</strong><em>{detail}</em></div>;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SPEED STATUS PAGE — latest session, personal baseline, session history
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function SpeedStatus({ onGoToLive, onGoToProfile }: { onGoToLive?: () => void; onGoToProfile?: () => void }) {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [latest, setLatest] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const deliveries = useReleaseSpeeds(DELIVERIES_SHOWN);
    const [weekAgo] = useState(() => Date.now() - WEEK_MS);

    const [selected, setSelected] = useState<SessionDetail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    useEffect(() => {
        let cancelled = false;
        fetchJson<SessionSummary[]>('/api/user/sessions')
            .then(async (list) => {
                if (cancelled) return;
                setSessions(list);
                if (list.length > 0) {
                    const detail = await fetchJson<SessionDetail>(`/api/user/sessions/${list[0].session_no}`);
                    if (!cancelled) setLatest(detail);
                }
            })
            .catch(() => { if (!cancelled) setError('Could not load your sessions.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const openSession = async (sessionNo: number) => {
        setDetailOpen(true);
        setSelected(null);
        setDetailError('');
        setDetailLoading(true);
        try {
            setSelected(await fetchJson<SessionDetail>(`/api/user/sessions/${sessionNo}`));
        } catch {
            setDetailError('Could not load this session.');
        } finally {
            setDetailLoading(false);
        }
    };

    if (detailOpen) {
        return (
            <SessionDetailView
                session={selected}
                loading={detailLoading}
                error={detailError}
                onBack={() => setDetailOpen(false)}
            />
        );
    }

    if (loading) {
        return <div className="wrist-status animate-fade-in"><p className="empty-history">Loading your speed sessions…</p></div>;
    }

    if (error) {
        return <div className="wrist-status animate-fade-in"><p className="empty-history" style={{ color: 'var(--accent-red)' }}>{error}</p></div>;
    }

    const newest = sessions[0];
    const previous = sessions[1];
    const oldest = sessions[sessions.length - 1];
    const baseline = weightedAverage(sessions);
    const totalDeliveries = sessions.reduce((sum, s) => sum + s.deliveries_count, 0);
    const difference = newest ? newest.avg_speed - baseline : 0;
    const changeFromPrevious = newest && previous ? newest.avg_speed - previous.avg_speed : null;
    const trend = newest && sessions.length > 1 ? newest.avg_speed - oldest.avg_speed : null;

    const filteredSessions = sessions.filter((s) => {
        const started = new Date(s.started_at).getTime();
        return dateFilter === 'all' || (dateFilter === 'week' ? started >= weekAgo : started < weekAgo);
    });

    return (
        <div className="wrist-status animate-fade-in">
            <section className="wrist-hero speed-hero">
                <div>
                    <span className="eyebrow">Component status / bowling speed</span>
                    <h3>Bowling speed, tracked every delivery</h3>
                    <p>See how fast each delivery is and how every session compares with your own average speed.</p>
                    <div className="wrist-hero-meta">
                        {newest ? (
                            <>
                                <span className="badge badge-green"><div className="pulse-dot" />Latest session #{newest.session_no}</span>
                                <span>{formatDateTime(newest.started_at)} · {newest.deliveries_count} deliveries</span>
                            </>
                        ) : (
                            <>
                                <span className="badge badge-purple">No sessions yet</span>
                                {onGoToLive && <button type="button" className="btn-primary" onClick={onGoToLive}>Start a live session</button>}
                            </>
                        )}
                    </div>
                </div>
                <div className="wrist-hero-metrics">
                    <div><span>Average speed</span><strong>{newest ? newest.avg_speed.toFixed(1) : '--'}<small>km/h</small></strong><em>Latest session</em></div>
                    <div><span>Top speed</span><strong>{newest ? newest.max_speed.toFixed(1) : '--'}<small>km/h</small></strong><em>Fastest delivery</em></div>
                    <div>
                        <span>Change</span>
                        <strong className={changeFromPrevious !== null && changeFromPrevious >= 0 ? 'positive' : undefined}>
                            {changeFromPrevious !== null ? formatSigned(changeFromPrevious) : '--'}<small>km/h</small>
                        </strong>
                        <em>{previous ? `vs session #${previous.session_no}` : 'Needs two sessions'}</em>
                    </div>
                </div>
            </section>

            {!newest ? (
                <section className="wrist-section glass-card">
                    <p className="empty-history">
                        No speed sessions yet. Start a live session on the Delivery Performance page and your speed will show up here.
                    </p>
                </section>
            ) : (
                <>
                    <section className="wrist-section glass-card" aria-labelledby="speed-timeline-title">
                        <div className="wrist-section-heading">
                            <div>
                                <span className="eyebrow">Latest session / #{newest.session_no}</span>
                                <h4 id="speed-timeline-title">Speed by delivery</h4>
                                <p>The speed of every delivery in this session. The marker shows your fastest ball.</p>
                            </div>
                            <span className="badge badge-teal">{newest.deliveries_count} deliveries</span>
                        </div>
                        {latest ? <SpeedChart speeds={latest.deliveries.map((d) => d.speed_kmh)} /> : <p className="empty-history">Loading deliveries…</p>}
                    </section>

                    <section className="wrist-section glass-card" aria-labelledby="speed-baseline-title">
                        <div className="wrist-section-heading">
                            <div>
                                <span className="eyebrow">Validated against your session history</span>
                                <h4 id="speed-baseline-title">Personal baseline comparison</h4>
                                <p>
                                    Your baseline is your average speed across {totalDeliveries} deliveries in {sessions.length}{' '}
                                    {sessions.length === 1 ? 'session' : 'sessions'}, not a universal target.
                                </p>
                            </div>
                            <span className="badge badge-purple">{totalDeliveries} deliveries</span>
                        </div>
                        <div className="baseline-grid">
                            <div className="baseline-score">
                                <span>Speed fit</span>
                                <strong style={difference < -BASELINE_TOLERANCE ? { color: 'var(--accent-orange)' } : undefined}>
                                    {Math.abs(difference) <= BASELINE_TOLERANCE
                                        ? 'Within baseline'
                                        : difference > 0 ? 'Faster than usual' : 'Slower than usual'}
                                </strong>
                                <p>{Math.abs(difference).toFixed(1)} km/h from your average speed</p>
                                <div className="baseline-bar"><span style={{ width: `${Math.max(12, 100 - Math.abs(difference) * 12)}%` }} /></div>
                            </div>
                            <BaselineMetric label="Expected speed" value={`${baseline.toFixed(1)} km/h`} detail="Your average" accent="purple" />
                            <BaselineMetric label="Actual speed" value={`${newest.avg_speed.toFixed(1)} km/h`} detail="Latest session" accent="teal" />
                            <BaselineMetric label="Difference" value={`${formatSigned(difference)} km/h`} detail="Actual vs expected" accent={difference >= 0 ? 'green' : 'orange'} />
                        </div>
                    </section>

                    <section className="wrist-section glass-card" aria-labelledby="speed-history-title">
                        <div className="wrist-section-heading history-heading">
                            <div>
                                <span className="eyebrow">Pattern review</span>
                                <h4 id="speed-history-title">Speed history and trends</h4>
                                <p>Review your past sessions. Select a session to see the speed of every delivery.</p>
                            </div>
                            <div className="trend-summary">
                                <strong>{trend !== null ? `${formatSigned(trend)} km/h` : '--'}</strong>
                                <span>average speed change<br />first to latest session</span>
                            </div>
                        </div>
                        <div className="history-filters">
                            <label>
                                Date
                                <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                                    <option value="all">All dates</option>
                                    <option value="week">Last 7 days</option>
                                    <option value="older">Older sessions</option>
                                </select>
                            </label>
                        </div>
                        <div className="history-table-wrap">
                            <table className="wrist-history-table speed-sessions-table">
                                <thead>
                                    <tr><th>Session</th><th>Date</th><th>Average</th><th>Top</th><th>Lowest</th><th>Baseline</th></tr>
                                </thead>
                                <tbody>
                                    {filteredSessions.map((s) => {
                                        const status = baselineStatus(s.avg_speed, baseline);
                                        return (
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
                                                <td><strong>Session #{s.session_no}</strong><span>{s.deliveries_count} deliveries</span></td>
                                                <td>{formatDateTime(s.started_at)}</td>
                                                <td className="release-value">{s.avg_speed.toFixed(1)} km/h</td>
                                                <td>{s.max_speed.toFixed(1)} km/h</td>
                                                <td>{s.min_speed.toFixed(1)} km/h</td>
                                                <td><span className={`history-status ${STATUS_CLASS[status]}`}>{status}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredSessions.length === 0 && <p className="empty-history">No sessions match these filters.</p>}
                        </div>
                    </section>
                </>
            )}

            <DeliveriesSection data={deliveries.data} failed={deliveries.failed} onGoToProfile={onGoToProfile} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ALL DELIVERIES — every delivery the glove sent, in a live session or not
   ═══════════════════════════════════════════════════════════════════════════════ */

function formatDeliveryTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function DeliveriesSection({
    data,
    failed,
    onGoToProfile,
}: {
    data: ReleaseSpeedsData | null;
    failed: boolean;
    onGoToProfile?: () => void;
}) {
    const [filter, setFilter] = useState('all');

    const all = data?.deliveries ?? [];
    const shown = all.filter((d) => filter === 'all' || (filter === 'session' ? d.sessionNo !== null : d.sessionNo === null));

    return (
        <section className="wrist-section glass-card" aria-labelledby="all-deliveries-title">
            <div className="wrist-section-heading history-heading">
                <div>
                    <span className="eyebrow">Every delivery from your glove</span>
                    <h4 id="all-deliveries-title">All deliveries</h4>
                    <p>
                        Includes deliveries you bowled outside a live session. Release speed is calculated from your wrist
                        accelerometer and your arm length.
                    </p>
                </div>
                {data && !data.armLengthRequired && <span className="badge badge-purple">{all.length} shown</span>}
            </div>

            {failed && !data && <p className="empty-history" style={{ color: 'var(--accent-red)' }}>Could not load your deliveries.</p>}
            {!failed && !data && <p className="empty-history">Loading deliveries…</p>}

            {data?.armLengthRequired && (
                <div className="speed-release-notice">
                    <p>Please update your arm length in your profile to see your delivery speeds.</p>
                    {onGoToProfile && <button type="button" className="btn-primary" onClick={onGoToProfile}>Go to profile</button>}
                </div>
            )}

            {data && !data.armLengthRequired && all.length === 0 && (
                <p className="empty-history">No deliveries yet. They appear here as soon as your glove sends one.</p>
            )}

            {data && !data.armLengthRequired && all.length > 0 && (
                <>
                    <div className="history-filters">
                        <label>
                            Show
                            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                                <option value="all">All deliveries</option>
                                <option value="session">In a live session</option>
                                <option value="none">Outside a session</option>
                            </select>
                        </label>
                    </div>
                    <div className="history-table-wrap">
                        <table className="wrist-history-table">
                            <thead>
                                <tr><th>Delivery</th><th>Released</th><th>Session</th><th>Acceleration</th><th>Speed</th></tr>
                            </thead>
                            <tbody>
                                {shown.map((d) => (
                                    <tr key={d.deliveryId}>
                                        <td><strong>Delivery {d.deliveryId}</strong></td>
                                        <td>{formatDeliveryTime(d.releasedAt)}</td>
                                        <td>
                                            {d.sessionNo !== null
                                                ? `Session #${d.sessionNo} · ball ${d.ballNo}`
                                                : <span className="history-status status-low" style={{ background: 'rgba(148,163,184,.12)', color: 'var(--text-muted)' }}>Not in a session</span>}
                                        </td>
                                        <td>{d.aMagG.toFixed(2)} g</td>
                                        <td className="release-value">
                                            {d.saturated ? '≥ ' : ''}{d.speedKmh.toFixed(1)} km/h
                                            {d.saturated && <span className="history-status status-high" style={{ marginLeft: '.5rem' }}>Sensor limit</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {shown.length === 0 && <p className="empty-history">No deliveries match this filter.</p>}
                    </div>
                    {all.length >= DELIVERIES_SHOWN && (
                        <p className="empty-history">Showing your latest {DELIVERIES_SHOWN} deliveries.</p>
                    )}
                </>
            )}
        </section>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SESSION DETAIL — one session (also used by the admin dashboard)
   ═══════════════════════════════════════════════════════════════════════════════ */

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
        <div className="wrist-status animate-fade-in">
            <div>
                <button type="button" className="btn-ghost" onClick={onBack}>
                    ← Back to sessions
                </button>
            </div>

            {loading && <p className="empty-history">Loading session…</p>}
            {error && <p className="empty-history" style={{ color: 'var(--accent-red)' }}>{error}</p>}

            {session && (
                <>
                    <section className="wrist-hero speed-hero">
                        <div>
                            <span className="eyebrow">Speed status / session #{session.session_no}</span>
                            <h3>{formatDateTime(session.started_at)}</h3>
                            <p>Every delivery recorded in this session, with its speed.</p>
                            <div className="wrist-hero-meta">
                                <span className="badge badge-teal">{session.deliveries_count} deliveries</span>
                                <span>Duration {formatDuration(session.started_at, session.ended_at)}</span>
                            </div>
                        </div>
                        <div className="wrist-hero-metrics">
                            <div><span>Average speed</span><strong>{session.avg_speed.toFixed(1)}<small>km/h</small></strong><em>This session</em></div>
                            <div><span>Top speed</span><strong className="positive">{session.max_speed.toFixed(1)}<small>km/h</small></strong><em>Fastest delivery</em></div>
                            <div><span>Consistency</span><strong>±{stdDev(speeds).toFixed(1)}<small>km/h</small></strong><em>Spread of speeds</em></div>
                        </div>
                    </section>

                    <section className="wrist-section glass-card" aria-labelledby="detail-chart-title">
                        <div className="wrist-section-heading">
                            <div>
                                <span className="eyebrow">Session #{session.session_no}</span>
                                <h4 id="detail-chart-title">Speed by delivery</h4>
                                <p>The marker shows the fastest delivery of the session.</p>
                            </div>
                            <span className="badge badge-purple">Lowest {session.min_speed.toFixed(1)} km/h</span>
                        </div>
                        <SpeedChart speeds={speeds} />
                    </section>

                    <section className="wrist-section glass-card" aria-labelledby="detail-table-title">
                        <div className="wrist-section-heading">
                            <div>
                                <span className="eyebrow">Delivery log</span>
                                <h4 id="detail-table-title">Deliveries</h4>
                                <p>Each delivery compared with this session&apos;s average speed.</p>
                            </div>
                        </div>
                        <div className="history-table-wrap">
                            <table className="wrist-history-table">
                                <thead>
                                    <tr><th>Delivery</th><th>Speed</th><th>vs session average</th></tr>
                                </thead>
                                <tbody>
                                    {session.deliveries.map((d) => (
                                        <tr key={d.delivery_no}>
                                            <td><strong>Delivery {d.delivery_no}</strong></td>
                                            <td className="release-value">{d.speed_kmh.toFixed(1)} km/h</td>
                                            <td>{formatSigned(d.speed_kmh - session.avg_speed)} km/h</td>
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

/* ═══════════════════════════════════════════════════════════════════════════════
   LIVE SESSION — shown on the Delivery Performance page
   ═══════════════════════════════════════════════════════════════════════════════ */

export function LiveSessionPanel({ onGoToProfile }: { onGoToProfile?: () => void }) {
    const [session, setSession] = useState<{ sessionNo: number; startedAt: string } | null>(null);
    const [savedSessionNo, setSavedSessionNo] = useState<number | null>(null);
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState('');
    const [needsArmLength, setNeedsArmLength] = useState(false);

    // Opening the session is what lets the glove's readings be stored against it.
    const startSession = async () => {
        setStarting(true);
        setStartError('');
        try {
            const res = await fetch('/api/user/sessions', { method: 'POST' });
            const json = await res.json();
            if (json.code === 'ARM_LENGTH_REQUIRED') {
                setNeedsArmLength(true);
                return;
            }
            if (!json.success) throw new Error(json.message);
            setSession(json.data);
        } catch {
            setStartError('Could not start the session. Try again.');
        } finally {
            setStarting(false);
        }
    };

    if (session) {
        return (
            <LiveSession
                sessionNo={session.sessionNo}
                startedAt={session.startedAt}
                onFinished={(sessionNo) => {
                    setSession(null);
                    setSavedSessionNo(sessionNo);
                }}
            />
        );
    }

    return (
        <>
            <section className="wrist-section glass-card speed-live-panel" aria-labelledby="live-start-title">
                <div className="wrist-section-heading speed-live-heading">
                    <div>
                        <span className="eyebrow">Live session / bowling speed</span>
                        <h4 id="live-start-title">Track a live bowling session</h4>
                        <p>
                            {savedSessionNo !== null
                                ? `Session #${savedSessionNo} saved. Review it under Speed Status, or start another session.`
                                : 'Start a session, then bowl. Your glove sends each delivery, and you click Next ball before every ball after the first.'}
                        </p>
                        {startError && <p style={{ color: 'var(--accent-red)', marginTop: '.5rem' }}>{startError}</p>}
                    </div>
                    <button type="button" id="start-live-session" className="btn-primary" onClick={startSession} disabled={starting}>
                        {starting ? 'Starting…' : 'Start Live Session'}
                    </button>
                </div>
            </section>

            {needsArmLength && createPortal(
                <div className="speed-modal-backdrop" onClick={() => setNeedsArmLength(false)}>
                    <div
                        className="speed-modal glass-card"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="arm-length-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h4 id="arm-length-title">Arm length needed</h4>
                        <p>Please update your arm length in your profile. Your release speed can&apos;t be calculated without it.</p>
                        <div className="speed-modal-actions">
                            <button type="button" className="btn-ghost" onClick={() => setNeedsArmLength(false)}>Close</button>
                            {onGoToProfile && (
                                <button
                                    type="button"
                                    id="go-to-profile"
                                    className="btn-primary"
                                    onClick={() => { setNeedsArmLength(false); onGoToProfile(); }}
                                >
                                    Go to profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                // Rendered on <body> so no page section's stacking context can paint over it.
                document.body
            )}
        </>
    );
}

function LiveSession({
    sessionNo,
    startedAt,
    onFinished,
}: {
    sessionNo: number;
    startedAt: string;
    onFinished: (sessionNo: number | null) => void;
}) {
    const [live, setLive] = useState<LiveData | null>(null);
    const [arming, setArming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Each delivery the glove sends appears here: the server links it to the armed ball.
    useEffect(() => {
        let cancelled = false;
        const poll = () => {
            fetchJson<LiveData>(`/api/user/sessions/${sessionNo}/live`)
                .then((data) => { if (!cancelled) setLive(data); })
                .catch(() => {});
        };
        poll();
        const timer = setInterval(poll, LIVE_POLL_MS);
        return () => { cancelled = true; clearInterval(timer); };
    }, [sessionNo]);

    const nextBall = async () => {
        setArming(true);
        setError('');
        try {
            const res = await fetch(`/api/user/sessions/${sessionNo}/next-ball`, { method: 'POST' });
            const json = await res.json();
            if (!json.success) {
                setError(json.message || 'Could not get the next ball ready.');
                return;
            }
            setLive(json.data);
        } catch {
            setError('Could not get the next ball ready. Try again.');
        } finally {
            setArming(false);
        }
    };

    const endSession = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/user/sessions/${sessionNo}/end`, { method: 'POST' });
            const json = await res.json();
            if (!json.success) throw new Error(json.message);
            onFinished(json.data.discarded ? null : sessionNo);
        } catch {
            setError('Could not save the session. Try ending it again.');
            setSaving(false);
        }
    };

    const bowled = (live?.balls ?? []).filter((b) => b.delivery !== null);
    const speeds = bowled.map((b) => b.delivery!.speedKmh);
    const latest = bowled[bowled.length - 1];
    const waiting = live?.waiting ?? true;
    const currentBall = live ? live.balls[live.balls.length - 1]?.ballNo ?? 1 : 1;
    const kmh = (value?: number) => (value === undefined ? '--' : `${value.toFixed(1)} km/h`);

    return (
        <section className="wrist-section glass-card speed-live-panel" aria-labelledby="live-title">
            <div className="wrist-section-heading speed-live-heading">
                <div>
                    <span className="badge badge-green"><div className="pulse-dot" />Live</span>
                    <h4 id="live-title">Session #{sessionNo} in progress</h4>
                    <p>Started {formatDateTime(startedAt)}</p>
                </div>
                <div className="speed-live-actions">
                    <button
                        type="button"
                        id="next-ball"
                        className="btn-primary"
                        onClick={nextBall}
                        disabled={waiting || arming || saving}
                    >
                        {arming ? 'Getting ready…' : 'Next ball'}
                    </button>
                    <button type="button" id="end-live-session" className="btn-ghost" onClick={endSession} disabled={saving}>
                        {saving ? 'Saving…' : 'End Session'}
                    </button>
                </div>
            </div>

            <div className={`speed-ball-status ${waiting ? 'is-waiting' : 'is-done'}`} role="status" aria-live="polite">
                {waiting ? (
                    <>
                        <strong>Ball {currentBall}: bowl now</strong>
                        <span>Your glove is ready and waiting for the delivery…</span>
                    </>
                ) : (
                    <>
                        <strong>
                            Ball {latest?.ballNo}: {latest?.delivery?.saturated ? '≥ ' : ''}{latest?.delivery?.speedKmh.toFixed(1)} km/h
                        </strong>
                        <span>Click Next ball before you bowl the next one.</span>
                    </>
                )}
            </div>

            {error && <p className="empty-history" style={{ color: 'var(--accent-red)' }}>{error}</p>}
            {live && live.uncounted > 0 && (
                <p className="speed-release-warning" role="status">
                    {live.uncounted === 1 ? 'A delivery was' : `${live.uncounted} deliveries were`} received without a ready ball and
                    not counted. Click Next ball before you bowl.
                </p>
            )}

            <div className="speed-live-metrics speed-live-metrics-2">
                <BaselineMetric label="Latest ball" value={kmh(latest?.delivery?.speedKmh)} detail={latest ? `Ball ${latest.ballNo}` : 'Waiting for ball 1'} accent="teal" />
                <BaselineMetric label="Balls bowled" value={String(speeds.length)} detail="Counted this session" accent="orange" />
            </div>
        </section>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SPEED CHART — same look as the wrist movement timeline
   ═══════════════════════════════════════════════════════════════════════════════ */

const CHART_LEFT = 70;
const CHART_RIGHT = 580;
const CHART_TOP = 64;
const CHART_BOTTOM = 214;
const CHART_FLOOR = 224;
const LABEL_WIDTH = 132;

function SpeedChart({ speeds }: { speeds: number[] }) {
    const gradientId = useId();

    if (speeds.length === 0) {
        return <p className="empty-history">Waiting for the first ball…</p>;
    }

    const min = Math.min(...speeds);
    const max = Math.max(...speeds);
    // Four gridlines with whole-number labels: make the range a multiple of 3.
    const lo = Math.floor(min - 2);
    const hi = lo + 3 * Math.max(2, Math.ceil((max + 2 - lo) / 3));
    const step = (hi - lo) / 3;
    const ticks = [hi, hi - step, hi - 2 * step, lo];

    const x = (i: number) =>
        speeds.length === 1 ? (CHART_LEFT + CHART_RIGHT) / 2 : CHART_LEFT + (i * (CHART_RIGHT - CHART_LEFT)) / (speeds.length - 1);
    const y = (v: number) => CHART_BOTTOM - ((v - lo) / (hi - lo)) * (CHART_BOTTOM - CHART_TOP);

    const points = speeds.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const topIndex = speeds.indexOf(max);
    const markerX = x(topIndex);
    const labelX = markerX + 14 + LABEL_WIDTH > 610 ? markerX - 14 - LABEL_WIDTH : markerX + 14;
    const labelStep = Math.max(1, Math.ceil(speeds.length / 10));
    const pointRadius = speeds.length > 40 ? 3.5 : 6;

    return (
        <>
            <div className="wrist-chart-wrap">
                <svg className="wrist-chart" viewBox="0 0 620 270" role="img" aria-label={`Bowling speed across ${speeds.length} deliveries, top speed ${max.toFixed(1)} km/h`}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity=".24" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    {/* Gridlines with their km/h labels drawn in the SVG so they stay aligned at any width */}
                    {ticks.map((t) => (
                        <g key={t}>
                            <line x1={CHART_LEFT} y1={y(t)} x2={CHART_RIGHT} y2={y(t)} className="chart-grid-line" />
                            <text x={CHART_LEFT - 12} y={y(t) + 4} textAnchor="end" className="chart-axis-label">{t}</text>
                        </g>
                    ))}
                    <line x1={markerX} y1="42" x2={markerX} y2={CHART_FLOOR} className="release-line" />
                    {speeds.length > 1 && (
                        <>
                            <polygon points={`${CHART_LEFT},${CHART_FLOOR} ${points} ${x(speeds.length - 1).toFixed(1)},${CHART_FLOOR}`} fill={`url(#${gradientId})`} />
                            <polyline points={points} className="wrist-chart-line" />
                        </>
                    )}
                    {speeds.map((v, i) => (
                        <g key={i}>
                            <circle cx={x(i)} cy={y(v)} r={pointRadius} className={i === topIndex ? 'chart-point release-point' : 'chart-point'}>
                                <title>{`Delivery ${i + 1}: ${v.toFixed(1)} km/h`}</title>
                            </circle>
                            {(i % labelStep === 0 || i === speeds.length - 1) && (
                                <text x={x(i)} y="246" textAnchor="middle" className="chart-axis-label">{i + 1}</text>
                            )}
                        </g>
                    ))}
                    <rect x={labelX} y="38" width={LABEL_WIDTH} height="30" rx="8" className="release-label-bg" />
                    <text x={labelX + 12} y="58" className="release-label">{`TOP SPEED · ${max.toFixed(1)}`}</text>
                </svg>
            </div>
            <div className="wrist-chart-legend">
                <span><i className="legend-dot early" />Delivery speed (km/h)</span>
                <span><i className="legend-dot release" />Top speed · {max.toFixed(1)} km/h</span>
                <span><i className="legend-line" />Speed path · x-axis is delivery number</span>
            </div>
        </>
    );
}
