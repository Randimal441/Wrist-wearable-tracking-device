'use client';

import { useState } from 'react';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// IMPORTANT: Synthetic data for development and model-training pipeline testing only.
// Session statuses, observations, fault categories, and training recommendations
// are demonstration results and do NOT represent trained model outputs or actual
// IoT measurements. Replace with real API responses when backend integration is ready.
// ─────────────────────────────────────────────────────────────────────────────

interface SummaryData {
    avgSpeed: number;      // km/h
    avgGrip: number;       // sensor index (dimensionless)
    avgWristAngle: number; // degrees
    faultRate: number;     // % of deliveries — must equal sum of non-Normal fault categories below
}

// faultRate (26.0%) = Possible Grip Fault (16%) + Possible Wrist Fault (10%)
// from MOCK_FAULT_DIST — kept in sync for internal consistency.
const MOCK_SUMMARY: SummaryData = {
    avgSpeed: 128.4,
    avgGrip: 68,
    avgWristAngle: 81,
    faultRate: 26.0,
};

interface SpeedPoint {
    session: string;
    date: string;
    avgSpeed: number; // km/h
}

const MOCK_SPEED_TREND_ALL: SpeedPoint[] = [
    { session: 'S-01', date: '2025-07-05', avgSpeed: 122.1 },
    { session: 'S-02', date: '2025-07-12', avgSpeed: 124.8 },
    { session: 'S-03', date: '2025-07-19', avgSpeed: 123.5 },
    { session: 'S-04', date: '2025-07-26', avgSpeed: 126.2 },
    { session: 'S-05', date: '2025-08-02', avgSpeed: 125.7 },
    { session: 'S-06', date: '2025-08-08', avgSpeed: 127.4 },
    { session: 'S-07', date: '2025-08-11', avgSpeed: 129.1 },
    { session: 'S-08', date: '2025-08-15', avgSpeed: 128.0 },
    { session: 'S-09', date: '2025-08-18', avgSpeed: 130.6 },
    { session: 'S-10', date: '2025-08-21', avgSpeed: 128.4 },
];

type SessionStatus = 'Normal' | 'Possible Grip Fault' | 'Possible Wrist Fault';

interface SessionRow {
    id: string;
    date: string;
    deliveries: number;
    avgSpeed: number;  // km/h
    avgGrip: number;   // sensor index
    avgWrist: number;  // degrees
    faults: number;
    status: SessionStatus;
}

const MOCK_SESSIONS: SessionRow[] = [
    { id: 'S-10', date: '2025-08-21', deliveries: 24, avgSpeed: 128.4, avgGrip: 68, avgWrist: 81, faults: 6, status: 'Normal' },
    { id: 'S-09', date: '2025-08-18', deliveries: 22, avgSpeed: 130.6, avgGrip: 65, avgWrist: 79, faults: 7, status: 'Possible Grip Fault' },
    { id: 'S-08', date: '2025-08-15', deliveries: 20, avgSpeed: 128.0, avgGrip: 71, avgWrist: 83, faults: 4, status: 'Normal' },
    { id: 'S-07', date: '2025-08-11', deliveries: 26, avgSpeed: 129.1, avgGrip: 66, avgWrist: 77, faults: 9, status: 'Possible Wrist Fault' },
    { id: 'S-06', date: '2025-08-08', deliveries: 18, avgSpeed: 127.4, avgGrip: 70, avgWrist: 82, faults: 3, status: 'Normal' },
    { id: 'S-05', date: '2025-08-02', deliveries: 25, avgSpeed: 125.7, avgGrip: 64, avgWrist: 78, faults: 8, status: 'Possible Grip Fault' },
];

interface FaultCategory {
    label: string;
    value: number; // % of deliveries
    color: string;
}

// Sum of non-Normal values = 16 + 10 = 26.0% → matches MOCK_SUMMARY.faultRate
const MOCK_FAULT_DIST: FaultCategory[] = [
    { label: 'Normal', value: 74, color: 'var(--accent-green)' },
    { label: 'Possible Grip Fault', value: 16, color: 'var(--accent-orange)' },
    { label: 'Possible Wrist Fault', value: 10, color: 'var(--accent-secondary)' },
];

interface ObservationItem {
    icon: string;
    title: string;
    detail: string;
}

const MOCK_OBSERVATIONS: ObservationItem[] = [
    {
        icon: '📊',
        title: 'Grip pressure varies most in early sessions',
        detail:
            'Sensor index drops below 67 in 3 of the 6 recent sessions, suggesting grip inconsistency during the run-up phase.',
    },
    {
        icon: '🎯',
        title: 'Wrist angle is lower in high-speed deliveries',
        detail:
            'Sessions with average speed above 129 km/h show wrist angles below 80°, which may correspond to the observed possible wrist fault pattern.',
    },
    {
        icon: '📈',
        title: 'Average speed is trending upward across sessions',
        detail:
            'Bowling speed has increased by approximately 6.3 km/h over the last 10 sessions, indicating consistent physical development.',
    },
];

interface RecommendationItem {
    priority: 'High' | 'Medium' | 'Low';
    title: string;
    detail: string;
    category: string;
}

const MOCK_RECOMMENDATIONS: RecommendationItem[] = [
    {
        priority: 'High',
        title: 'Improve grip consistency during the run-up',
        detail:
            'Grip sensor index falls below the session average in a significant proportion of deliveries. Structured drills focusing on maintaining a stable grip from the start of the approach to the release point may help reduce the possible grip fault rate.',
        category: 'Grip',
    },
    {
        priority: 'Medium',
        title: 'Reinforce wrist position at the point of release',
        detail:
            'Wrist angle measurements indicate a downward trend during high-intensity deliveries. Targeted wrist-stability exercises and slower-pace repetition drills may reduce the rate of possible wrist faults.',
        category: 'Wrist Mechanics',
    },
    {
        priority: 'Low',
        title: 'Maintain current speed and build gradually',
        detail:
            'Bowling speed is improving steadily across sessions. Avoid aggressive speed increases until grip and wrist consistency metrics have stabilised, to avoid raising the overall fault rate.',
        category: 'Speed',
    },
];

// ─── TIME-RANGE CONFIG ────────────────────────────────────────────────────────

type TimeRange = 'last5' | 'last10';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: 'last5', label: 'Last 5 Sessions' },
    { value: 'last10', label: 'Last 10 Sessions' },
];

function getSpeedData(range: TimeRange): SpeedPoint[] {
    if (range === 'last5') return MOCK_SPEED_TREND_ALL.slice(-5);
    return MOCK_SPEED_TREND_ALL;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function priorityBadgeClass(priority: 'High' | 'Medium' | 'Low'): string {
    if (priority === 'High') return 'badge badge-red';
    if (priority === 'Medium') return 'badge badge-orange';
    return 'badge badge-teal';
}

function sessionStatusClass(status: SessionStatus): string {
    if (status === 'Normal') return 'history-status status-good';
    if (status === 'Possible Grip Fault') return 'history-status status-high';
    return 'history-status status-low';
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function RecDataNotice() {
    return (
        <div className="rec-data-notice" role="note">
            <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true" style={{ flexShrink: 0 }}
            >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Demonstration data only — not connected to IoT device or trained model. For development and pipeline testing purposes.
        </div>
    );
}

function PerformanceSummary() {
    const cards: Array<{
        id: string;
        label: string;
        value: string;
        unit: string;
        accent: string;
        accentBg: string;
        icon: React.ReactNode;
    }> = [
            {
                id: 'kpi-avg-speed',
                label: 'Avg Speed',
                value: MOCK_SUMMARY.avgSpeed.toFixed(1),
                unit: 'km/h',
                accent: 'var(--accent-teal)',
                accentBg: 'rgba(34,211,238,0.12)',
                icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 14 16 10" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /><path d="M12 2v2" />
                    </svg>
                ),
            },
            {
                id: 'kpi-avg-grip',
                label: 'Avg Grip Pressure',
                value: `${MOCK_SUMMARY.avgGrip}`,
                unit: 'index',
                accent: 'var(--accent-orange)',
                accentBg: 'rgba(251,146,60,0.12)',
                icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 11V5a2 2 0 1 1 4 0v5" />
                        <path d="M12 10V3a2 2 0 1 1 4 0v8" />
                        <path d="M16 10V6a2 2 0 1 1 4 0v8c0 4-2 7-7 7h-1c-3 0-5-1-7-4l-2-3a2 2 0 0 1 3-2l2 2V8a2 2 0 1 1 4 0v3" />
                    </svg>
                ),
            },
            {
                id: 'kpi-avg-wrist',
                label: 'Avg Wrist Angle',
                value: `${MOCK_SUMMARY.avgWristAngle}`,
                unit: '°',
                accent: 'var(--accent-secondary)',
                accentBg: 'rgba(167,139,250,0.12)',
                icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 3v9l6 3" />
                        <path d="M12 12 8 7" />
                    </svg>
                ),
            },
            {
                id: 'kpi-fault-rate',
                label: 'Fault Rate',
                value: MOCK_SUMMARY.faultRate.toFixed(1),
                unit: '% of deliveries',
                accent: 'var(--accent-red)',
                accentBg: 'rgba(248,113,113,0.12)',
                icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3 2.5 20h19L12 3Z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                    </svg>
                ),
            },
        ];

    return (
        <section aria-labelledby="kpi-section-title">
            <div className="rec-section-header">
                <div>
                    <span className="eyebrow">Session averages · last 6 sessions</span>
                    <h3 id="kpi-section-title" className="rec-section-title">Performance Summary</h3>
                </div>
            </div>
            <div className="rec-kpi-grid">
                {cards.map((card, i) => (
                    <div
                        key={card.id}
                        id={card.id}
                        className="rec-kpi-card glass-card animate-fade-in-up"
                        style={{ animationDelay: `${i * 0.07}s`, borderTop: `3px solid ${card.accent}` }}
                    >
                        <div className="rec-kpi-icon" style={{ color: card.accent, background: card.accentBg }}>
                            {card.icon}
                        </div>
                        <div className="rec-kpi-value" style={{ color: card.accent }}>
                            {card.value}
                            <span className="rec-kpi-unit">{card.unit}</span>
                        </div>
                        <div className="rec-kpi-label">{card.label}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function SpeedTrendChart() {
    const [timeRange, setTimeRange] = useState<TimeRange>('last5');
    const data = getSpeedData(timeRange);

    // Chart geometry
    const W = 520, H = 155;
    const padL = 40, padR = 14, padT = 8, padB = 26;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const speeds = data.map((d) => d.avgSpeed);
    const minS = Math.floor(Math.min(...speeds) - 1.5);
    const maxS = Math.ceil(Math.max(...speeds) + 1.5);

    const toX = (i: number) =>
        data.length === 1 ? padL + chartW / 2 : padL + (i / (data.length - 1)) * chartW;
    const toY = (v: number) =>
        padT + chartH - ((v - minS) / (maxS - minS)) * chartH;

    const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.avgSpeed).toFixed(1)}`);
    const linePoints = pts.join(' ');
    const areaPoints = [
        `${padL},${padT + chartH}`,
        ...pts,
        `${toX(data.length - 1).toFixed(1)},${padT + chartH}`,
    ].join(' ');

    const yTicks = [minS, Math.round((minS + maxS) / 2), maxS];

    return (
        <section className="rec-chart-section glass-card" aria-labelledby="speed-trend-title">
            <div className="rec-section-header" style={{ marginBottom: '0.35rem' }}>
                <div>
                    <span className="eyebrow">Session history</span>
                    <h3 id="speed-trend-title" className="rec-section-title">Bowling Speed Trend</h3>
                </div>
                <div className="rec-range-btns" role="group" aria-label="Time range selector">
                    {TIME_RANGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            id={`speed-range-${opt.value}`}
                            type="button"
                            className={`rec-range-btn${timeRange === opt.value ? ' active' : ''}`}
                            onClick={() => setTimeRange(opt.value)}
                            aria-pressed={timeRange === opt.value}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rec-chart-wrap">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    width="100%"
                    role="img"
                    aria-label={`Bowling speed trend showing ${data.length} sessions from ${data[0]?.date} to ${data[data.length - 1]?.date}`}
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <linearGradient id="recSpeedArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.20" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Y-axis grid lines + labels */}
                    {yTicks.map((v) => (
                        <g key={v}>
                            <line
                                x1={padL} y1={toY(v)}
                                x2={W - padR} y2={toY(v)}
                                className="chart-grid-line"
                            />
                            <text x={padL - 6} y={toY(v) + 4} textAnchor="end" className="chart-axis-label">
                                {v}
                            </text>
                        </g>
                    ))}

                    {/* Area fill */}
                    <polygon points={areaPoints} fill="url(#recSpeedArea)" />

                    {/* Line */}
                    <polyline points={linePoints} className="wrist-chart-line" />

                    {/* Data points + X-axis labels */}
                    {data.map((d, i) => (
                        <g key={d.session}>
                            <circle
                                cx={toX(i)}
                                cy={toY(d.avgSpeed)}
                                r={4.5}
                                className="chart-point"
                                aria-label={`${d.session}: ${d.avgSpeed} km/h`}
                            />
                            <text
                                x={toX(i)}
                                y={H - 7}
                                textAnchor="middle"
                                className="chart-axis-label"
                            >
                                {d.session}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            <div className="rec-chart-footer">
                <span className="rec-chart-legend-item">
                    <i className="legend-line" aria-hidden="true" />
                    Avg speed (km/h)
                </span>
                <span className="rec-chart-date-range">
                    {data[0]?.date} – {data[data.length - 1]?.date}
                </span>
            </div>
        </section>
    );
}

function RecentSessions() {
    return (
        <section className="rec-sessions-section glass-card" aria-labelledby="sessions-title">
            <div className="rec-section-header" style={{ marginBottom: '0.75rem' }}>
                <div>
                    <span className="eyebrow">Last 6 sessions</span>
                    <h3 id="sessions-title" className="rec-section-title">Recent Sessions</h3>
                </div>
            </div>
            <div className="history-table-wrap">
                <table className="wrist-history-table rec-sessions-table">
                    <thead>
                        <tr>
                            <th>Session</th>
                            <th>Date</th>
                            <th>Del.</th>
                            <th>Speed (km/h)</th>
                            <th>Grip (idx)</th>
                            <th>Wrist (°)</th>
                            <th>Faults</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_SESSIONS.map((s) => (
                            <tr key={s.id}>
                                <td><strong>{s.id}</strong></td>
                                <td>{s.date}</td>
                                <td>{s.deliveries}</td>
                                <td style={{ color: 'var(--accent-teal)', fontWeight: 700 }}>
                                    {s.avgSpeed.toFixed(1)}
                                </td>
                                <td>{s.avgGrip}</td>
                                <td>{s.avgWrist}°</td>
                                <td>{s.faults}</td>
                                <td>
                                    <span className={sessionStatusClass(s.status)}>{s.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function DonutChart() {
    // SVG donut via stroke-dasharray on stacked <circle> elements.
    // Each segment is positioned by strokeDashoffset = circumference - cumulativePriorLength.
    // All circles are rotated -90deg so the first segment starts at 12 o'clock.
    const cx = 80, cy = 80, r = 54;
    const circ = 2 * Math.PI * r;

    let cumulative = 0;
    const segments = MOCK_FAULT_DIST.map((cat) => {
        const length = (cat.value / 100) * circ;
        const offset = circ - cumulative;
        cumulative += length;
        return { ...cat, length, gap: circ - length, offset };
    });

    const normalCat = MOCK_FAULT_DIST[0];

    return (
        <div className="rec-donut-wrap">
            <svg
                viewBox="0 0 160 160"
                width="160"
                height="160"
                role="img"
                aria-label="Delivery classification donut chart"
                style={{ flexShrink: 0 }}
            >
                {/* Background ring */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="20" />

                {/* Coloured segments */}
                {segments.map((seg, i) => (
                    <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="20"
                        strokeDasharray={`${seg.length.toFixed(3)} ${seg.gap.toFixed(3)}`}
                        strokeDashoffset={seg.offset.toFixed(3)}
                        strokeLinecap="butt"
                        style={{
                            transform: 'rotate(-90deg)',
                            transformOrigin: `${cx}px ${cy}px`,
                        }}
                    />
                ))}

                {/* Centre label — shows the largest category */}
                <text x={cx} y={cy - 6} textAnchor="middle" className="rec-donut-center-pct">
                    {normalCat.value}%
                </text>
                <text x={cx} y={cy + 11} textAnchor="middle" className="rec-donut-center-label">
                    Normal
                </text>
            </svg>

            <div className="rec-donut-legend">
                {MOCK_FAULT_DIST.map((cat) => (
                    <div key={cat.label} className="rec-donut-legend-item">
                        <span className="rec-donut-dot" style={{ background: cat.color }} />
                        <span className="rec-donut-legend-label">{cat.label}</span>
                        <span className="rec-donut-legend-pct">{cat.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function KeyObservations() {
    return (
        <div className="rec-observations-wrap">
            <div className="rec-section-header" style={{ marginBottom: '0.75rem' }}>
                <div>
                    <span className="eyebrow">Pattern findings</span>
                    <h3 className="rec-section-title">Key Observations</h3>
                </div>
            </div>
            <div className="rec-observations-list">
                {MOCK_OBSERVATIONS.map((obs, i) => (
                    <div
                        key={i}
                        className="rec-observation-card glass-card animate-fade-in-up"
                        style={{ animationDelay: `${i * 0.09}s` }}
                    >
                        <span className="rec-obs-icon" aria-hidden="true">{obs.icon}</span>
                        <div>
                            <div className="rec-obs-title">{obs.title}</div>
                            <p className="rec-obs-detail">{obs.detail}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PerformanceStateSection() {
    return (
        <section className="rec-state-section glass-card" aria-labelledby="perf-state-title">
            <div className="rec-section-header">
                <div>
                    <span className="eyebrow">Delivery classification · 135 deliveries</span>
                    <h3 id="perf-state-title" className="rec-section-title">Performance State</h3>
                </div>
                <span className="badge badge-purple">Across 6 sessions</span>
            </div>
            <div className="rec-state-row">
                <DonutChart />
                <KeyObservations />
            </div>
        </section>
    );
}

function TrainingRecommendations() {
    return (
        <section aria-labelledby="training-rec-title">
            <div className="rec-section-header">
                <div>
                    <span className="eyebrow">Based on session patterns</span>
                    <h3 id="training-rec-title" className="rec-section-title">Training Recommendations</h3>
                </div>
            </div>
            <div className="rec-rec-list">
                {MOCK_RECOMMENDATIONS.map((rec, i) => (
                    <div
                        key={i}
                        id={`rec-card-${rec.priority.toLowerCase()}`}
                        className="rec-rec-card glass-card animate-fade-in-up"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="rec-priority-header">
                            <span className={priorityBadgeClass(rec.priority)}>{rec.priority} Priority</span>
                            <h4 className="rec-rec-title">{rec.title}</h4>
                        </div>
                        <p className="rec-rec-detail">{rec.detail}</p>
                        <div className="rec-rec-footer">
                            <span className="rec-rec-category">
                                <svg
                                    width="11" height="11" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                                    <line x1="7" y1="7" x2="7.01" y2="7" />
                                </svg>
                                {rec.category}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export default function PersonalizedRecommendation() {
    return (
        <div className="rec-dashboard animate-fade-in">
            <PerformanceSummary />
            <div className="rec-row-2">
                <SpeedTrendChart />
                <RecentSessions />
            </div>
            <PerformanceStateSection />
            <TrainingRecommendations />
        </div>
    );
}
