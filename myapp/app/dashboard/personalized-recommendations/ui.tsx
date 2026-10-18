import { useId } from 'react';
import type { BowlingSession } from './types';
import { classificationRate } from './report-engine';
import styles from './styles';

export type IconName = 'overview' | 'sessions' | 'speed' | 'grip' | 'wrist' | 'report' | 'compare' | 'spark';

export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    sessions: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 11h16m-12 5 2 2 5-4" /></>,
    speed: <><path d="M4 19a10 10 0 1 1 16 0M12 13l5-5M5 13h2m10 0h2M12 3v2" /><circle cx="12" cy="13" r="1.5" /></>,
    grip: <><path d="M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v8c0 4-3 7-7 7h-1c-3 0-5-2-7-5l-2-3a2 2 0 0 1 3-2l2 2" /></>,
    wrist: <><circle cx="12" cy="12" r="9" /><path d="M12 5v7l5 3M7 17l5-5" /></>,
    report: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8m-8 4h5" /></>,
    compare: <><path d="M4 19V5m0 14h17M8 15l4-5 4 2 5-7" /><path d="M17 5h4v4" /></>,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4m-2-2h4" /></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
}

export function CompletedBadge() {
  return <span className={styles.completed}><span aria-hidden="true">✓</span> Completed</span>;
}

export function SummaryCards({ sessions, single = false }: { sessions: BowlingSession[]; single?: boolean }) {
  const count = sessions.reduce((sum, s) => sum + s.deliveryCount, 0);
  const average = (key: 'averageSpeed' | 'averageGrip' | 'averageWristAngle') =>
    count ? sessions.reduce((sum, s) => sum + s[key] * s.deliveryCount, 0) / count : null;
  const metrics: { label: string; value: string; unit: string; icon: IconName; accent: string }[] = [
    { label: single ? 'Completed Deliveries' : 'Completed Sessions', value: String(single ? count : sessions.length), unit: single ? 'deliveries' : 'sessions', icon: 'sessions', accent: styles.purple },
    { label: 'Average Bowling Speed', value: average('averageSpeed')?.toFixed(1) ?? '—', unit: 'km/h', icon: 'speed', accent: styles.cyan },
    { label: 'Average Grip Pressure', value: average('averageGrip')?.toFixed(1) ?? '—', unit: 'sensor index', icon: 'grip', accent: styles.orange },
    { label: 'Average Wrist Angle', value: average('averageWristAngle')?.toFixed(1) ?? '—', unit: 'degrees', icon: 'wrist', accent: styles.lilac },
  ];
  return <div className={styles.kpiGrid}>{metrics.map(m => <article className={styles.kpiCard} key={m.label}>
    <span className={`${styles.metricIcon} ${m.accent}`}><Icon name={m.icon} /></span>
    <p className={styles.metricLabel}>{m.label}</p>
    <p className={styles.metricValue} aria-label={m.value === '—' ? 'No measurements available' : undefined}>{m.value}<span>{m.unit}</span></p>
  </article>)}</div>;
}

export function SessionMetrics({ session }: { session: BowlingSession }) {
  return <dl className={styles.sessionMetrics}>
    <div><dt>Deliveries</dt><dd>{session.deliveryCount}</dd></div>
    <div><dt>Avg. speed</dt><dd className={styles.cyanText}>{session.averageSpeed.toFixed(1)} <span>km/h</span></dd></div>
    <div><dt>Avg. grip</dt><dd className={styles.orangeText}>{session.averageGrip} <span>index</span></dd></div>
    <div><dt>Avg. wrist</dt><dd className={styles.lilacText}>{session.averageWristAngle}°</dd></div>
  </dl>;
}

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  return <ol className={styles.steps} aria-label="Report generation progress">{['Select Session', 'Analyze', 'View Report'].map((label, i) =>
    <li key={label} className={i + 1 <= current ? styles.stepActive : undefined} aria-current={i + 1 === current ? 'step' : undefined}>
      <span>{i + 1 < current ? '✓' : i + 1}</span>{label}
    </li>)}</ol>;
}

export function SpeedChart({ sessions, highlighted = [] }: { sessions: BowlingSession[]; highlighted?: string[] }) {
  const id = useId();
  const data = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  if (!data.length) return <p className={styles.muted}>No sessions to display.</p>;
  const min = Math.floor(Math.min(...data.map(s => s.averageSpeed)) - 1);
  const max = Math.ceil(Math.max(...data.map(s => s.averageSpeed)) + 1);
  const x = (i: number) => 48 + i / Math.max(data.length - 1, 1) * 480;
  const y = (n: number) => 192 - (n - min) / (max - min) * 150;
  const points = data.map((s, i) => `${x(i)},${y(s.averageSpeed)}`).join(' ');
  return <figure className={styles.chart}>
    <svg viewBox="0 0 560 240" width="560" height="240" role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>Average bowling speed by session</title>
      <desc id={`${id}-description`}>{data.map(s => `${s.id}: ${s.averageSpeed} km/h`).join('; ')}. Vertical axis in km/h.</desc>
      {[min, (min + max) / 2, max].map(tick => <g key={tick}>
        <line x1="48" x2="528" y1={y(tick)} y2={y(tick)} className={styles.chartGrid} />
        <text x="36" y={y(tick) + 4} textAnchor="end">{tick.toFixed(0)}</text>
      </g>)}
      <text x="48" y="20">km/h</text>
      <polygon points={`48,192 ${points} ${x(data.length - 1)},192`} className={styles.chartArea} />
      <polyline points={points} className={styles.chartLine} />
      {data.map((s, i) => <g key={s.id}>
        <circle cx={x(i)} cy={y(s.averageSpeed)} r={highlighted.includes(s.id) ? 6 : 4} className={highlighted.includes(s.id) ? styles.chartSelected : styles.chartPoint}>
          <title>{s.id} · {formatDate(s.date)} · {s.averageSpeed.toFixed(1)} km/h</title>
        </circle>
        <text x={x(i)} y="220" textAnchor="middle">{s.id}</text>
      </g>)}
    </svg>
    <figcaption><span className={styles.chartLegend}>Average speed</span><span>{formatDate(data[0].date)} – {formatDate(data[data.length - 1].date)}</span></figcaption>
  </figure>;
}

export function Measurements({ session }: { session: BowlingSession }) {
  const rows = [
    ['Average bowling speed', `${session.averageSpeed.toFixed(1)} km/h`, 'Mean across completed deliveries'],
    ['Average grip pressure', `${session.averageGrip.toFixed(1)} sensor index`, 'Dimensionless sensor reading'],
    ['Average wrist angle', `${session.averageWristAngle.toFixed(1)}°`, 'Mean recorded angle'],
    ['Wrist classification frequency', `${classificationRate(session.wristClassifiedCount, session.deliveryCount).toFixed(1)}%`, `${session.wristClassifiedCount} of ${session.deliveryCount} deliveries · possible wrist fault`],
    ['Grip classification frequency', `${classificationRate(session.gripClassifiedCount, session.deliveryCount).toFixed(1)}%`, `${session.gripClassifiedCount} of ${session.deliveryCount} deliveries · possible grip fault`],
  ];
  return <div className={styles.tableWrap} role="region" aria-label="Processed session measurements" tabIndex={0}>
    <table className={styles.table}><caption className={styles.srOnly}>Processed measurements for {session.id}</caption>
      <thead><tr><th scope="col">Measurement</th><th scope="col">Value</th><th scope="col">Context</th></tr></thead>
      <tbody>{rows.map(([label, value, context]) => <tr key={label}><th scope="row">{label}</th><td className={styles.numeric}>{value}</td><td>{context}</td></tr>)}</tbody>
    </table>
  </div>;
}
