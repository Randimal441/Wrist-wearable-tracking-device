'use client';

import { useEffect, useState } from 'react';
import { dateRangeError, getPeriodRecommendations, PerformanceApiError, TECHNIQUE_LABELS } from './performance-api';
import type { PeriodRecommendations } from './performance-api';
import { formatDate, Icon } from './ui';
import styles from './styles';

const PRIORITY_LABELS: Record<PeriodRecommendations['priorityArea'], string> = {
  grip: 'Grip', wrist: 'Wrist angle', both: 'Grip and wrist angle',
  none: 'No significant issue detected', unavailable: 'Not available',
};

export default function GeneralRecommendations({ historical = false }: { historical?: boolean }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string; data?: PeriodRecommendations | null; error?: PerformanceApiError;
  } | null>(null);
  const validation = dateRangeError(startDate, endDate);
  const key = `${startDate}/${endDate}/${refresh}`;
  const active = result?.key === key ? result : null;
  const loading = !validation && !active;

  useEffect(() => {
    if (validation) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getPeriodRecommendations(startDate, endDate, controller.signal).then(
        data => { if (!controller.signal.aborted) setResult({ key, data }); },
        error => { if (!controller.signal.aborted) setResult({ key, error }); },
      );
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [startDate, endDate, validation, key]);

  const data = active?.data;
  return <div className={styles.performanceView}>
    <section className={styles.card} aria-labelledby="performance-period-title">
      <div className={styles.cardHeading}><div><h4 id="performance-period-title">{historical ? 'Select Historical Time Period' : 'Performance Period'}</h4><p>Choose the dates you want to review.</p></div></div>
      <div className={styles.selectorGrid}>
        <label className={styles.selectLabel}>Start date<input className={styles.dateInput} type="date" value={startDate} max={endDate || undefined} onChange={event => { setStartDate(event.target.value); setRefresh(value => value + 1); }} aria-describedby="performance-period-help performance-period-error" /></label>
        <label className={styles.selectLabel}>End date<input className={styles.dateInput} type="date" value={endDate} min={startDate || undefined} onChange={event => { setEndDate(event.target.value); setRefresh(value => value + 1); }} aria-describedby="performance-period-help performance-period-error" aria-invalid={Boolean(startDate && endDate && validation)} /></label>
      </div>
      {historical && <div className={styles.modeInfo}><span className={styles.cyanText}><Icon name="sessions" /></span><div><strong>Historical Session Analysis</strong><p>Include all completed sessions within the selected date range, then compare recurring wrist, grip and speed patterns.</p></div></div>}
      <p id="performance-period-help" className={styles.trend}>Results update automatically when both dates are selected. Both dates are included (UTC).</p>
      <div id="performance-period-error">{startDate && endDate && validation && <p className={styles.error} role="alert">{validation}</p>}</div>
      {!validation && <div className={styles.row}><span className={styles.muted}>Selected period: {formatDate(startDate)} – {formatDate(endDate)}</span><button type="button" className={historical ? styles.primaryButton : styles.secondaryButton} disabled={loading} onClick={() => setRefresh(value => value + 1)}>{historical ? 'Analyze Selected Period' : 'Refresh results'}</button></div>}
      {historical && validation && <button type="button" className={styles.primaryButton} disabled>Analyze Selected Period</button>}
    </section>
    <div className={styles.guidanceList} aria-live="polite" aria-busy={loading}>
      {validation ? (!startDate || !endDate) && !historical && <div className={`${styles.card} ${styles.emptyState}`}><Icon name="report" /><h4>Select your performance period</h4><p>Choose a start date and an end date to view your recorded performance and personalized recommendations.</p></div>
        : loading ? <div className={styles.notice} role="status"><p>Loading performance recommendations…</p></div>
          : active?.error ? <div className={`${styles.card} ${styles.emptyState}`} role={active.error.kind === 'error' ? 'alert' : 'status'}><Icon name="report" /><h4>{active.error.kind === 'unavailable' ? 'Recommendations unavailable' : 'Unable to load recommendations'}</h4><p>{active.error.message}</p><button type="button" className={styles.secondaryButton} onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
            : !data || data.ballCount === 0 ? <div className={`${styles.card} ${styles.emptyState}`}><Icon name="sessions" /><h4>No performance records for this period</h4><p>Choose another date range to review your recorded performance.</p></div>
              : <>
                <section className={styles.card}>
                  <div className={styles.cardHeading}><h4>Performance Summary</h4><span className={styles.tag}>{data.sessionCount} {data.sessionCount === 1 ? 'session' : 'sessions'} · {data.ballCount} {data.ballCount === 1 ? 'ball' : 'balls'}</span></div>
                  <p className={styles.bodyText}>{data.summary}</p>
                  <div className={styles.notice}><div><strong>Priority improvement area</strong><p>{PRIORITY_LABELS[data.priorityArea]}</p></div></div>
                </section>
                <div className={styles.selectorGrid}>{([
                  ['Grip', data.grip, 'grip'], ['Wrist Angle', data.wristAngle, 'wrist'],
                ] as const).map(([label, technique, icon]) => <section className={styles.card} key={label}>
                  <div className={styles.cardHeading}><div className={styles.sessionIdentity}><span className={`${styles.metricIcon} ${icon === 'grip' ? styles.orange : styles.lilac}`}><Icon name={icon} /></span><h4>{label} Performance</h4></div><span className={styles.techniqueStatus} data-status={technique.status}>{TECHNIQUE_LABELS[technique.status]}</span></div>
                  <p className={styles.bodyText}>{technique.summary ?? 'Performance details are not available for this measurement.'}</p>
                </section>)}</div>
                <section className={styles.card}>
                  <div className={styles.cardHeading}><div><h4>Contribution to Detected Issues</h4><p>Available estimates for the selected period.</p></div></div>
                  {data.contributions ? <div className={styles.guidanceList}>{([
                    ['Grip', data.contributions.grip], ['Wrist angle', data.contributions.wristAngle],
                  ] as const).map(([label, value]) => <div key={label}><div className={styles.row}><span>{label}</span><strong>{value}%</strong></div><div className={styles.contributionTrack} role="meter" aria-label={`${label} contribution`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div></div>)}</div>
                    : <p className={styles.muted}>Contribution estimates have not been provided for this period.</p>}
                </section>
                <section className={styles.card}>
                  <div className={styles.cardHeading}><h4>Personalized Recommendations</h4></div>
                  {data.recommendations.length ? <ol className={styles.recommendationList}>{data.recommendations.map((recommendation, index) => <li key={index}>{recommendation}</li>)}</ol>
                    : <p className={styles.muted}>No recommendations were returned for this period.</p>}
                </section>
              </>}
    </div>
  </div>;
}
