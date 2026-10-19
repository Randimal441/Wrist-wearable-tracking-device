import { useState } from 'react';
import type { BowlingSession, RecommendationReport, TrainingRecommendation } from './types';
import { classificationRate, signed } from './report-engine';
import { formatDate, Icon, Measurements, SpeedChart, Steps } from './ui';
import styles from './styles';

function Practice({ activity }: { activity: TrainingRecommendation }) {
  return <div className={styles.practice}>
    <h5>{activity.title}</h5><p><strong>Objective:</strong> {activity.objective}</p>
    <ol>{activity.instructions.map(instruction => <li key={instruction}>{instruction}</li>)}</ol>
    <p><strong>Reassess:</strong> {activity.reassessment}</p>
  </div>;
}

export function ReportView({ report, onHistory, onCompare }: {
  report: RecommendationReport; onHistory: () => void; onCompare: () => void;
}) {
  const [tab, setTab] = useState('Detailed Guidance');
  return <>
    <Steps current={3} />
    <section className={styles.card}>
      <div className={styles.cardHeading}><div><span className={styles.eyebrow}>Report {report.id}</span><h4>{report.mainFocus}</h4></div><span className={styles.tag}>{report.status}</span></div>
      <dl className={styles.reportMetadata}>
        <div><dt>Session</dt><dd>{report.session.id}</dd></div>
        <div><dt>Session date</dt><dd>{formatDate(report.session.date)}</dd></div>
        <div><dt>Generated</dt><dd>{formatDate(report.generatedAt)}</dd></div>
        <div><dt>Analysis method</dt><dd>{report.analysisMethod}</dd></div>
      </dl>
      <p className={styles.context}>Review the supplied session measurements and recommendations.</p>
    </section>
    <nav className={styles.reportTabs} aria-label="Report sections">{['Detailed Guidance', 'Measurements', 'Training Plan'].map(label =>
      <button type="button" key={label} className={tab === label ? styles.reportTabActive : styles.reportTab} aria-pressed={tab === label} onClick={() => setTab(label)}>{label}</button>)}</nav>
    {tab === 'Detailed Guidance' && <div className={styles.guidanceList}>{report.observations.map(o => <article className={styles.card} key={o.category}>
      <div className={styles.cardHeading}><div className={styles.sessionIdentity}><span className={`${styles.metricIcon} ${o.category === 'speed' ? styles.cyan : o.category === 'grip' ? styles.orange : styles.lilac}`}><Icon name={o.category} /></span><div><h4>{o.title}</h4><p>{o.measurement}</p></div></div><span className={o.status === 'Practice focus' ? styles.focusBadge : styles.tag}>{o.status}</span></div>
      <p className={styles.bodyText}>{o.observation}</p><p className={styles.trend}>{o.trend}</p><p className={styles.muted}>{o.explanation}</p>
      <details className={styles.practiceDetails}><summary>Practice guidance<span aria-hidden="true">+</span></summary><Practice activity={o.practice} /></details>
    </article>)}</div>}
    {tab === 'Measurements' && <section className={styles.card}><div className={styles.cardHeading}><div><h4>Session Measurements</h4><p>Processed session data for {report.session.id}</p></div></div><Measurements session={report.session} /></section>}
    {tab === 'Training Plan' && <div className={styles.guidanceList}>{report.trainingPlan.map((activity, i) => <article className={styles.card} key={activity.id}><span className={styles.eyebrow}>Practice activity {String(i + 1).padStart(2, '0')}</span><Practice activity={activity} /></article>)}</div>}
    <div className={styles.toolbar}><button type="button" className={styles.secondaryButton} onClick={onHistory}>Recommendation History</button><button type="button" className={styles.primaryButton} onClick={onCompare}>Progress Comparison →</button></div>
  </>;
}

export function RecommendationHistory({ reports, onGenerate, onView, onCompare }: {
  reports: RecommendationReport[]; onGenerate: () => void;
  onView: (report: RecommendationReport) => void; onCompare: (report: RecommendationReport) => void;
}) {
  return <>
    <div className={styles.toolbar}><p className={styles.muted}>{reports.length} {reports.length === 1 ? 'report' : 'reports'} generated · available during this visit</p><button type="button" className={styles.primaryButton} onClick={onGenerate}>Generate New Report +</button></div>
    {!reports.length ? <EmptyState title="No recommendation available yet" description="Your session reports will appear here when recommendations are available." onGenerate={onGenerate} /> :
      <div className={styles.historyGrid}>{reports.map(report => <article className={styles.card} key={report.id}>
        <div className={styles.cardHeading}><span className={`${styles.metricIcon} ${styles.purple}`}><Icon name="report" /></span><span className={styles.tag}>{report.status}</span></div>
        <span className={styles.eyebrow}>{report.id}</span><h4 className={styles.historyTitle}>{report.mainFocus}</h4>
        <dl className={styles.historyMetadata}><div><dt>Session</dt><dd>{report.session.id} · {formatDate(report.session.date)}</dd></div><div><dt>Generated</dt><dd>{formatDate(report.generatedAt)}</dd></div><div><dt>Review status</dt><dd>{report.status}</dd></div></dl>
        <div className={styles.cardFooter}><button type="button" className={styles.primaryButton} onClick={() => onView(report)}>View Report<span className={styles.srOnly}> {report.id}</span> →</button><button type="button" className={styles.secondaryButton} onClick={() => onCompare(report)}>Compare<span className={styles.srOnly}> {report.id}</span></button></div>
      </article>)}</div>}
  </>;
}

function EmptyState({ title, description, onGenerate }: { title: string; description: string; onGenerate: () => void }) {
  return <div className={`${styles.card} ${styles.emptyState}`}><span className={`${styles.metricIcon} ${styles.purple}`}><Icon name="report" /></span><h4>{title}</h4><p>{description}</p><button type="button" className={styles.primaryButton} onClick={onGenerate}>Get Recommendations →</button></div>;
}

export function ProgressComparison({ reports, sessions, earlierId, laterId, onEarlier, onLater, onGenerate }: {
  reports: RecommendationReport[]; sessions: BowlingSession[]; earlierId: string; laterId: string;
  onEarlier: (id: string) => void; onLater: (id: string) => void; onGenerate: () => void;
}) {
  const earlier = reports.find(r => r.id === earlierId);
  const later = reports.find(r => r.id === laterId);
  const distinctCount = new Set(reports.map(r => r.session.id)).size;
  const valid = earlier && later && earlier.session.id !== later.session.id && earlier.session.date < later.session.date;
  const sorted = [...reports].sort((a, b) => a.session.date.localeCompare(b.session.date) || a.id.localeCompare(b.id));
  const selectionError = earlier && later
    ? earlier.session.id === later.session.id ? 'Choose reports from two different sessions.'
      : earlier.session.date >= later.session.date ? 'The baseline session must be earlier than the follow-up session.' : ''
    : '';
  return <>
    {distinctCount < 2 && <div className={styles.notice}><div><strong>{reports.length ? 'One more session to compare' : 'Start your progress comparison'}</strong><p>Generate reports for two different completed sessions to compare their measurements.</p></div><button type="button" className={styles.secondaryButton} onClick={onGenerate}>Generate a Report →</button></div>}
    <section className={styles.card} aria-label="Choose comparison reports"><div className={styles.selectorGrid}>
      {([{ label: 'Earlier Report', value: earlierId, update: onEarlier }, { label: 'Later Report', value: laterId, update: onLater }]).map(({ label, value, update }) => <label className={styles.selectLabel} key={label}>{label}<select value={value} onChange={e => update(e.target.value)} aria-invalid={selectionError ? true : undefined} aria-describedby={selectionError ? 'comparison-error' : undefined}>
        <option value="">Select a report</option>{sorted.map(r => <option key={r.id} value={r.id}>{r.id} · {r.session.id} · {formatDate(r.session.date)}</option>)}
      </select><span>{label === 'Earlier Report' ? 'Baseline session' : 'Follow-up session'}</span></label>)}
    </div>{selectionError && <p className={styles.error} id="comparison-error" role="alert">{selectionError}</p>}</section>
    {valid ? <ComparisonResults earlier={earlier} later={later} sessions={sessions} /> :
      <div className={`${styles.card} ${styles.emptyState}`}><span className={`${styles.metricIcon} ${styles.purple}`}><Icon name="compare" /></span><h4>Choose your baseline and follow-up</h4><p>Compare reports from different sessions in date order. Reports generated again for the same session remain in your history.</p></div>}
  </>;
}

function ComparisonResults({ earlier, later, sessions }: { earlier: RecommendationReport; later: RecommendationReport; sessions: BowlingSession[] }) {
  const a = earlier.session;
  const b = later.session;
  const wristA = classificationRate(a.wristClassifiedCount, a.deliveryCount);
  const wristB = classificationRate(b.wristClassifiedCount, b.deliveryCount);
  const gripA = classificationRate(a.gripClassifiedCount, a.deliveryCount);
  const gripB = classificationRate(b.gripClassifiedCount, b.deliveryCount);
  const rows = [
    { label: 'Average speed', a: a.averageSpeed, b: b.averageSpeed, unit: 'km/h', differenceUnit: 'km/h' },
    { label: 'Average grip pressure', a: a.averageGrip, b: b.averageGrip, unit: 'index', differenceUnit: 'index' },
    { label: 'Average wrist angle', a: a.averageWristAngle, b: b.averageWristAngle, unit: '°', differenceUnit: '°' },
    { label: 'Wrist classification frequency', a: wristA, b: wristB, unit: '%', differenceUnit: 'pp' },
    { label: 'Grip classification frequency', a: gripA, b: gripB, unit: '%', differenceUnit: 'pp' },
  ];
  return <>
    <div className={styles.comparisonSummary}>{[{ report: earlier, label: 'Baseline' }, { report: later, label: 'Follow-up' }].map(({ report, label }) => <article className={styles.card} key={label}><span className={styles.eyebrow}>{label}</span><h4>{report.session.id} <span className={styles.muted}>· {report.id}</span></h4><p className={styles.muted}>{formatDate(report.session.date)} · {report.session.deliveryCount} deliveries</p></article>)}</div>
    <section className={styles.card}><div className={styles.cardHeading}><div><h4>Measurement Comparison</h4><p>Difference = follow-up minus baseline · pp = percentage points</p></div></div>
      <div className={styles.tableWrap} role="region" aria-label="Measurement comparison" tabIndex={0}><table className={styles.table}>
        <caption className={styles.srOnly}>Comparison of baseline {a.id} with follow-up {b.id}</caption>
        <thead><tr><th scope="col">Measurement</th><th scope="col">Earlier · {a.id}</th><th scope="col">Later · {b.id}</th><th scope="col">Difference</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td className={styles.numeric}>{row.a.toFixed(1)} {row.unit}</td><td className={styles.numeric}>{row.b.toFixed(1)} {row.unit}</td><td className={styles.difference}>{signed(row.b - row.a)} {row.differenceUnit}</td></tr>)}</tbody>
      </table></div>
    </section>
    <section className={styles.card}><div className={styles.cardHeading}><div><h4>Historical Speed Trend</h4><p>Completed sessions · selected baseline and follow-up marked in purple</p></div></div><SpeedChart sessions={sessions} highlighted={[a.id, b.id]} /></section>
    <section className={styles.card}><div className={styles.cardHeading}><h4>Progress Summary</h4><Icon name="compare" /></div>
      <p className={styles.bodyText}>From {a.id} to {b.id}, average speed changed by {signed(b.averageSpeed - a.averageSpeed)} km/h, grip by {signed(b.averageGrip - a.averageGrip)} sensor index, and wrist angle by {signed(b.averageWristAngle - a.averageWristAngle)}°. Wrist classification frequency changed by {signed(wristB - wristA)} percentage points and grip classification frequency by {signed(gripB - gripA)} percentage points.</p>
      <p className={styles.muted}>Session sizes and practice conditions may differ. Review delivery patterns and context with your coach before drawing conclusions.</p>
    </section>
  </>;
}
