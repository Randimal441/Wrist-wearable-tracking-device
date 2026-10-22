'use client';

import { useEffect, useState } from 'react';

interface WristDelivery {
  deliveryId: number;
  createdAt: string;
  startTimestamp: number;
  endTimestamp: number;
  startAngle: number | null;
  actualAngle: number | null;
}

function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(value)); }
function formatTime(value: string) { return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)); }
function angle(value: number | null | undefined) { return value === null || value === undefined ? '—' : `${value.toFixed(2)}°`; }

export default function WristAngleStatusPage() {
  const [dateFilter, setDateFilter] = useState('all');
  const [deliveries, setDeliveries] = useState<WristDelivery[]>([]);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/wrist-angle', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || `Request failed (${response.status})`);
        return payload;
      })
      .then((payload: { data?: Array<{ delivery_id: number | string; created_at: string; start_timestamp_ms: number | string; end_timestamp_ms: number | string; wrist_angle_start_deg: number | string | null; wrist_angle_release_deg: number | string | null }> }) => {
        if (cancelled) return;
        setDeliveries((payload.data ?? []).map((row) => ({
          deliveryId: Number(row.delivery_id), createdAt: row.created_at,
          startTimestamp: Number(row.start_timestamp_ms), endTimestamp: Number(row.end_timestamp_ms),
          startAngle: row.wrist_angle_start_deg === null ? null : Number(row.wrist_angle_start_deg),
          actualAngle: row.wrist_angle_release_deg === null ? null : Number(row.wrist_angle_release_deg),
        })));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Could not load wrist angle history:', error);
        setHistoryError('Could not load wrist angle history. Please refresh the page.');
      });
    return () => { cancelled = true; };
  }, []);

  const latest = deliveries[0] ?? null;
  const filteredDeliveries = deliveries.filter((item) => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    const itemDate = new Date(item.createdAt);
    return dateFilter === 'all' || (dateFilter === 'week' ? itemDate >= cutoff : itemDate < cutoff);
  });
  const trend = [...deliveries].reverse().filter((item): item is WristDelivery & { actualAngle: number } => item.actualAngle !== null);
  const values = trend.map((item) => item.actualAngle);
  const minAngle = values.length ? Math.min(...values) : 0;
  const maxAngle = values.length ? Math.max(...values) : 1;
  const range = Math.max(1, maxAngle - minAngle);
  const x = (index: number) => trend.length <= 1 ? 325 : 70 + (index * 510) / (trend.length - 1);
  const y = (value: number) => 214 - ((value - minAngle) / range) * 150;
  const actualPoints = trend.map((item, index) => `${x(index)},${y(item.actualAngle)}`).join(' ');

  return (
    <div className="wrist-status animate-fade-in">
      <section className="wrist-hero"><div><span className="eyebrow">Component status / wrist mechanics</span><h3>Wrist angle, measured through release</h3><p>Understand how your wrist position changes from the start of a delivery to the ball-release moment.</p><div className="wrist-hero-meta"><span className="badge badge-green"><div className="pulse-dot" />Latest delivery {latest?.deliveryId ?? '—'}</span><span>{latest ? formatDate(latest.createdAt) : 'No delivery data'}</span></div></div><div className="wrist-hero-metrics"><div><span>Actual angle</span><strong>{angle(latest?.actualAngle)}</strong><em>Latest delivery</em></div><div><span>Expected angle</span><strong>—</strong><em>Not available</em></div><div><span>Difference</span><strong className="positive">—</strong><em>Not available</em></div></div></section>

      <section className="wrist-section glass-card" aria-labelledby="timeline-title"><div className="wrist-section-heading"><div><span className="eyebrow">Delivery trend</span><h4 id="timeline-title">Wrist movement timeline</h4><p>Actual release angle trends across deliveries. Expected angle is not available yet.</p></div><span className="badge badge-teal">{deliveries.length} deliveries</span></div><div className="wrist-chart-wrap"><div className="wrist-chart-y-labels"><span>{maxAngle.toFixed(0)}°</span><span>{(minAngle + range * 0.67).toFixed(0)}°</span><span>{(minAngle + range * 0.33).toFixed(0)}°</span><span>{minAngle.toFixed(0)}°</span></div><svg className="wrist-chart" viewBox="0 0 620 270" role="img" aria-label="Actual wrist angle trend by delivery"><defs><linearGradient id="wristArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".24" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs>{[64, 114, 164, 214].map((lineY) => <line key={lineY} x1="70" y1={lineY} x2="580" y2={lineY} className="chart-grid-line" />)}{trend.length > 1 && <polygon points={`70,224 ${actualPoints} 580,224`} fill="url(#wristArea)" />}{trend.length > 1 && <polyline points={actualPoints} className="wrist-chart-line" />}{trend.map((item, index) => <g key={item.deliveryId}><circle cx={x(index)} cy={y(item.actualAngle)} r="6" className="chart-point release-point" /><text x={x(index)} y="246" textAnchor="middle" className="chart-axis-label">{item.deliveryId}</text></g>)}</svg></div><div className="wrist-chart-legend"><span><i className="legend-dot release" />Actual angle</span><span><i className="legend-dot early" />Expected angle — unavailable</span></div></section>


      <section className="wrist-section glass-card" aria-labelledby="history-title"><div className="wrist-section-heading history-heading"><div><span className="eyebrow">Pattern review</span><h4 id="history-title">Wrist history and trends</h4><p>Review past deliveries and spot recurring wrist-angle patterns across sessions.</p></div></div><div className="history-filters"><label>Date<select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="all">All dates</option><option value="week">Last 7 days</option><option value="older">Older deliveries</option></select></label></div><div className="history-table-wrap"><table className="wrist-history-table"><thead><tr><th>Deliver</th><th>Date</th><th>Time</th><th>Actual angle</th><th>Expected angle</th><th>Difference</th></tr></thead><tbody>{filteredDeliveries.map((item) => <tr key={item.deliveryId}><td>{item.deliveryId}</td><td>{formatDate(item.createdAt)}</td><td>{formatTime(item.createdAt)}</td><td className="release-value">{angle(item.actualAngle)}</td><td></td><td></td></tr>)}</tbody></table>{historyError ? <p className="empty-history">{historyError}</p> : filteredDeliveries.length === 0 && <p className="empty-history">No deliveries match these filters.</p>}</div></section>
    </div>
  );
}
