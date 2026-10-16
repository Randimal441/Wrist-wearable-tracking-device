'use client';

import { useState } from 'react';

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

function BaselineMetric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
  return <div className={`baseline-metric baseline-${accent}`}><span>{label}</span><strong>{value}</strong><em>{detail}</em></div>;
}

export default function WristAngleStatusPage() {
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
    return dateFilter === 'all' || (dateFilter === 'week' ? item.date >= '2025-08-15' : item.date < '2025-08-15');
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
