'use client';

import { useState } from 'react';
import type { BowlingSession } from './types';
import GeneralRecommendations from './GeneralRecommendations';
import { CompletedBadge, formatDate, Icon, Measurements, SessionMetrics, SpeedChart, Steps, SummaryCards } from './ui';
import styles from './styles';

interface SessionActions {
  sessions: BowlingSession[];
  onDetails: (session: BowlingSession) => void;
  onGenerate: (session?: BowlingSession) => void;
}

export function Overview({ sessions, onDetails, onGenerate, onHistory }: SessionActions & { onHistory: () => void }) {
  return <>
    <SummaryCards sessions={sessions} />
    <p className={styles.context}>Delivery-weighted averages across completed sessions.</p>
    <section className={styles.banner}>
      <div><h4>Ready for your next training insight?</h4><p>Choose a completed bowling session to review your performance and receive personalized practice guidance.</p></div>
      <button type="button" className={styles.primaryButton} onClick={() => onGenerate()}>Get Personalized Recommendations <span aria-hidden="true">→</span></button>
    </section>
    <div className={styles.overviewGrid}>
      <section className={styles.card}>
        <div className={styles.cardHeading}><div><h4>Bowling Speed Trend</h4><p>Average speed across your last five sessions</p></div><span className={styles.tag}>Last 5 sessions</span></div>
        <SpeedChart sessions={sessions} />
      </section>
      <section className={styles.card}>
        <div className={styles.cardHeading}><div><h4>Recent Sessions</h4><p>Your latest completed practice</p></div><Icon name="sessions" /></div>
        <div className={styles.recentList}>{!sessions.length && <p className={styles.muted}>No sessions available yet.</p>}{sessions.slice(0, 3).map(s => <article className={styles.recentSession} key={s.id}>
          <div className={styles.row}><strong>{s.id}</strong><CompletedBadge /></div>
          <p className={styles.muted}>{formatDate(s.date)} <span aria-hidden="true">·</span> {s.deliveryCount} deliveries</p>
          <div className={styles.row}><span className={styles.cyanText}>{s.averageSpeed.toFixed(1)} <span className={styles.muted}>km/h avg.</span></span><button type="button" className={styles.textButton} onClick={() => onDetails(s)} aria-label={`View Details for ${s.id}`}>View Details <span aria-hidden="true">→</span></button></div>
        </article>)}</div>
        <button type="button" className={styles.fullButton} onClick={onHistory}>View All Sessions <span aria-hidden="true">→</span></button>
      </section>
    </div>
  </>;
}

export function SessionHistory({ sessions, onDetails, onGenerate }: SessionActions) {
  const [recordingUnavailable, setRecordingUnavailable] = useState(false);

  return <>
    <section className={styles.card} aria-labelledby="history-new-practice-session-title">
      <div className={styles.cardHeading}><h4 id="history-new-practice-session-title">New Practice Session</h4></div>
      <p className={styles.bodyText}>Start a new bowling practice session using your connected IoT device. Each session can last up to 2 hours.</p>
      <dl className={styles.sessionInformation}>
        <div><dt>Maximum session duration</dt><dd>2 hours</dd></div>
        <div><dt>Recording source</dt><dd>IoT smart glove</dd></div>
        <div><dt>Performance analysis</dt><dd>After session completion</dd></div>
      </dl>
      <div className={styles.cardFooter}><button type="button" className={styles.primaryButton} onClick={() => setRecordingUnavailable(true)}>Start New Session <span aria-hidden="true">→</span></button></div>
      {recordingUnavailable && <p className={styles.trend} role="status">Session recording is not available yet. No recording has started.</p>}
    </section>
    <h4>Session History</h4>
    <div className={styles.sessionList}>{!sessions.length && <p className={styles.muted}>No sessions available yet.</p>}{sessions.map(s => <article className={styles.card} key={s.id}>
    <div className={styles.cardHeading}><div className={styles.sessionIdentity}><span className={`${styles.metricIcon} ${styles.purple}`}><Icon name="sessions" /></span><div><h4>{s.id}</h4><p>{formatDate(s.date)}</p></div></div><CompletedBadge /></div>
    <SessionMetrics session={s} />
    <div className={styles.cardFooter}><button type="button" className={styles.secondaryButton} onClick={() => onDetails(s)}>View Session<span className={styles.srOnly}> {s.id}</span></button><button type="button" className={styles.primaryButton} onClick={() => onGenerate(s)}>Get Recommendations<span className={styles.srOnly}> for {s.id}</span><span aria-hidden="true">→</span></button></div>
  </article>)}</div>
  </>;
}

export function SessionDetails({ session, onBack, onGenerate }: { session: BowlingSession; onBack: () => void; onGenerate: () => void }) {
  return <>
    <div className={styles.toolbar}><button type="button" className={styles.secondaryButton} onClick={onBack}>← Back to Session History</button><button type="button" className={styles.primaryButton} onClick={onGenerate}>Get Recommendations →</button></div>
    <section className={styles.card}><div className={styles.cardHeading}><div><h4>{session.id} · {formatDate(session.date)}</h4><p>Bowling session · {session.deliveryCount} deliveries</p></div><CompletedBadge /></div><SummaryCards sessions={[session]} single /></section>
    <section className={styles.card}><div className={styles.cardHeading}><div><h4>Processed Measurements</h4><p>Recorded session summaries and classification labels</p></div></div><Measurements session={session} /></section>
    <section className={styles.card}><div className={styles.cardHeading}><div><h4>Delivery Measurements</h4><p>Recorded readings and classification labels.</p></div><span className={styles.tag}>{session.deliveries.length} deliveries</span></div>
      {session.deliveries.length ? <div className={styles.tableWrap} role="region" aria-label="Delivery measurements" tabIndex={0}><table className={styles.table}>
        <caption className={styles.srOnly}>Delivery-level measurements for {session.id}</caption>
        <thead><tr><th scope="col">Delivery</th><th scope="col">Speed (km/h)</th><th scope="col">Grip (index)</th><th scope="col">Wrist (°)</th><th scope="col">Wrist label</th><th scope="col">Grip label</th></tr></thead>
        <tbody>{session.deliveries.map(d => <tr key={d.id}><th scope="row">{String(d.id).padStart(2, '0')}</th><td className={styles.cyanText}>{d.speed.toFixed(1)}</td><td>{d.grip}</td><td>{d.wristAngle}°</td><td>{d.wristClassification}</td><td>{d.gripClassification}</td></tr>)}</tbody>
      </table></div> : <p className={styles.muted}>Delivery-level measurements are unavailable for this session.</p>}
    </section>
  </>;
}

interface CompletedSessionProps {
  sessions: BowlingSession[]; selectedId: string; onSelect: (id: string) => void; onAnalyze: () => void; error: string;
}

export function GetRecommendations({ onSessionInstructions, ...sessionProps }: CompletedSessionProps & {
  onSessionInstructions: () => void;
}) {
  const [mode, setMode] = useState<'session' | 'period' | null>(null);
  const [preview, setPreview] = useState(false);

  return <>
    <fieldset className={styles.selectionFieldset}>
      <legend className={styles.srOnly}>Recommendation type</legend>
      <div className={styles.modeGrid}>
        <label className={`${styles.modeCard} ${mode === 'session' ? styles.selectedCard : ''}`}>
          <input className={styles.srOnly} type="radio" name="recommendation-type" value="session" checked={mode === 'session'} onChange={() => { setMode('session'); setPreview(false); }} aria-label="Start a Session" aria-controls="recommendation-type-panel" />
          <span className={`${styles.modeIcon} ${styles.lilac}`}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" fill="currentColor" strokeLinejoin="round" /></svg></span>
          {mode === 'session' && <span className={styles.modeSelected} aria-hidden="true">✓ Selected</span>}
          <strong className={styles.modeTitle}>Start a Session</strong>
          <span className={styles.modeDescription}>Record a new bowling practice session. Maximum 2 hours.</span>
        </label>
        <label className={`${styles.modeCard} ${mode === 'period' ? styles.selectedCard : ''}`}>
          <input className={styles.srOnly} type="radio" name="recommendation-type" value="period" checked={mode === 'period'} onChange={() => { setMode('period'); setPreview(false); }} aria-label="Select Time Period" aria-controls="recommendation-type-panel" />
          <span className={`${styles.modeIcon} ${styles.cyan}`}><Icon name="sessions" /></span>
          {mode === 'period' && <span className={styles.modeSelected} aria-hidden="true">✓ Selected</span>}
          <strong className={styles.modeTitle}>Select Time Period</strong>
          <span className={styles.modeDescription}>Analyze historical sessions and performance trends.</span>
        </label>
      </div>
    </fieldset>
    <div id="recommendation-type-panel" className={styles.guidanceList}>
      {mode === 'session' && <>
        <section className={styles.card} aria-labelledby="new-practice-session-title">
          <div className={styles.cardHeading}><h4 id="new-practice-session-title">New Practice Session</h4><span className={styles.focusBadge}>Maximum 2h</span></div>
          <div className={styles.modeInfo}><p>Your IoT device must be connected before starting a recording session. Recommendations are generated after the session is completed and analyzed.</p></div>
          <h5 className={styles.sessionInfoTitle}>Session Information</h5>
          <dl className={styles.sessionInformation}>
            <div><dt>Duration limit</dt><dd>02:00:00</dd></div>
            <div><dt>Recording method</dt><dd>IoT smart glove</dd></div>
            <div><dt>Analysis</dt><dd>After completion</dd></div>
          </dl>
          <div className={styles.cardFooter}><button type="button" className={styles.primaryButton} onClick={() => setPreview(true)}>Preview Start Session <span aria-hidden="true">→</span></button><button type="button" className={styles.secondaryButton} onClick={onSessionInstructions}>Review recorded sessions</button></div>
          {preview && <p className={styles.trend} role="status">Preview only. Device recording is not connected, and no recording has started.</p>}
        </section>
        <details className={styles.card}>
          <summary className={styles.archiveSummary}>Completed session analysis</summary>
          <div className={styles.guidanceList}>
            <p className={styles.muted}>No recommendation available yet. Recorded session analysis is not connected.</p>
            <CompletedSessionRecommendations {...sessionProps} />
          </div>
        </details>
      </>}
      {mode === 'period' && <GeneralRecommendations historical />}
    </div>
  </>;
}

function CompletedSessionRecommendations({ sessions, selectedId, onSelect, onAnalyze, error }: CompletedSessionProps) {
  return <>
    <Steps current={selectedId ? 2 : 1} />
    <fieldset className={styles.selectionFieldset}><legend>Choose a session <span>· five most recent completed sessions</span></legend>
      <div className={styles.selectionGrid}>{!sessions.length && <p className={styles.muted}>No completed sessions available yet.</p>}{sessions.map(s => <label key={s.id} className={`${styles.selectableCard} ${selectedId === s.id ? styles.selectedCard : ''}`}>
        <div className={styles.cardHeading}><div><h4>{s.id}</h4><p>{formatDate(s.date)}</p></div><input type="radio" name="recommendation-session" value={s.id} checked={selectedId === s.id} onChange={() => onSelect(s.id)} aria-label={`Select session ${s.id}`} /></div>
        <SessionMetrics session={s} />
        <div className={styles.selectionFooter}><CompletedBadge /><span className={selectedId === s.id ? styles.selectedLabel : styles.muted}>{selectedId === s.id ? 'Selected' : 'Select session'}</span></div>
      </label>)}</div>
    </fieldset>
    <div className={styles.generateFooter}><div><strong>{selectedId ? `${selectedId} selected` : 'Select one session to continue'}</strong><p>Recommendations will appear when recorded session analysis is connected.</p></div><button type="button" className={styles.primaryButton} onClick={onAnalyze} disabled={!sessions.length} aria-describedby={error ? 'generation-error' : undefined}>Analyze &amp; Generate Report <span aria-hidden="true">→</span></button></div>
    {error && <p id="generation-error" className={styles.error} role="alert">{error}</p>}
  </>;
}
