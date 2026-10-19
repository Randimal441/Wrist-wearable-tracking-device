'use client';

import { useEffect, useState } from 'react';
import { getPerformanceSessions, getSessionInstructions, PerformanceApiError, TECHNIQUE_LABELS } from './performance-api';
import type { PerformanceSession, SessionInstructionsResult } from './performance-api';
import { formatDate, Icon } from './ui';
import styles from './styles';

export default function SessionInstructions() {
  const [sessionsVersion, setSessionsVersion] = useState(0);
  const [sessionsResult, setSessionsResult] = useState<{
    version: number; data?: PerformanceSession[]; error?: PerformanceApiError;
  } | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [ballNumber, setBallNumber] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [instructionsResult, setInstructionsResult] = useState<{
    key: string; data?: SessionInstructionsResult; error?: PerformanceApiError;
  } | null>(null);
  const sessions = sessionsResult?.version === sessionsVersion ? sessionsResult : null;
  const selectedSession = sessions?.data?.find(session => session.id === sessionId);
  const key = JSON.stringify([selectedSession?.id, refresh]);
  const instructions = instructionsResult?.key === key ? instructionsResult : null;
  const loadingInstructions = Boolean(selectedSession && !instructions);
  const balls = instructions?.data?.balls ?? [];
  const selectedIndex = Math.max(0, balls.findIndex(ball => String(ball.ballNumber) === ballNumber));
  const selectedBall = balls[selectedIndex];

  useEffect(() => {
    const controller = new AbortController();
    getPerformanceSessions(controller.signal).then(
      data => { if (!controller.signal.aborted) setSessionsResult({ version: sessionsVersion, data }); },
      error => { if (!controller.signal.aborted) setSessionsResult({ version: sessionsVersion, error }); },
    );
    return () => controller.abort();
  }, [sessionsVersion]);

  useEffect(() => {
    if (!selectedSession) return;
    const controller = new AbortController();
    getSessionInstructions(selectedSession.id, controller.signal).then(
      data => { if (!controller.signal.aborted) setInstructionsResult({ key, data }); },
      error => { if (!controller.signal.aborted) setInstructionsResult({ key, error }); },
    );
    return () => controller.abort();
  }, [selectedSession, key]);

  function refreshSessions() {
    setSessionId('');
    setBallNumber('');
    setSessionsVersion(value => value + 1);
  }

  return <div className={styles.performanceView}>
    <section className={styles.card} aria-labelledby="instruction-session-title">
      <div className={styles.cardHeading}><div><h4 id="instruction-session-title">Training Session</h4><p>Select a recorded session to review its ball-by-ball instructions.</p></div><button type="button" className={styles.secondaryButton} disabled={!sessions} onClick={refreshSessions}>Refresh sessions</button></div>
      <div className={styles.selectLabel}><label htmlFor="performance-training-session">Select training session</label><select id="performance-training-session" value={selectedSession?.id ?? ''} disabled={!sessions?.data?.length} onChange={event => { setSessionId(event.target.value); setBallNumber(''); setRefresh(value => value + 1); }}>
        <option value="">Choose a session</option>
        {sessions?.data?.map(session => <option key={session.id} value={session.id}>{session.label} · {formatDate(session.startedAt)} · {session.ballCount} {session.ballCount === 1 ? 'ball' : 'balls'}</option>)}
      </select></div>
    </section>
    <div className={styles.guidanceList} aria-live="polite" aria-busy={!sessions || loadingInstructions}>
      {!sessions ? <div className={styles.notice} role="status"><p>Loading training sessions…</p></div>
        : sessions.error ? <div className={`${styles.card} ${styles.emptyState}`} role={sessions.error.kind === 'error' ? 'alert' : 'status'}><Icon name="sessions" /><h4>{sessions.error.kind === 'unavailable' ? 'Training sessions unavailable' : 'Unable to load training sessions'}</h4><p>{sessions.error.message}</p><button type="button" className={styles.secondaryButton} onClick={refreshSessions}>Try again</button></div>
          : !sessions.data?.length ? <div className={`${styles.card} ${styles.emptyState}`}><Icon name="sessions" /><h4>No recorded training sessions</h4><p>Your training sessions will appear here when performance records are available.</p></div>
            : !selectedSession ? <div className={`${styles.card} ${styles.emptyState}`}><Icon name="sessions" /><h4>Choose a training session</h4><p>Select a session above to review the grip status, wrist angle status, and instruction for each recorded ball.</p></div>
              : loadingInstructions ? <div className={styles.notice} role="status"><p>Loading ball instructions…</p></div>
                : instructions?.error ? <div className={`${styles.card} ${styles.emptyState}`} role={instructions.error.kind === 'error' ? 'alert' : 'status'}><Icon name="report" /><h4>{instructions.error.kind === 'unavailable' ? 'Ball instructions unavailable' : 'Unable to load ball instructions'}</h4><p>{instructions.error.message}</p><button type="button" className={styles.secondaryButton} onClick={() => setRefresh(value => value + 1)}>Try again</button></div>
                  : !selectedBall ? <div className={`${styles.card} ${styles.emptyState}`}><Icon name="sessions" /><h4>No recorded balls in this session</h4><p>Refresh the instructions after ball records become available.</p><button type="button" className={styles.secondaryButton} onClick={() => setRefresh(value => value + 1)}>Refresh instructions</button></div>
                    : <>
                      <section className={styles.card}>
                        <div className={styles.cardHeading}><div><h4>{selectedSession.label}</h4><p>{formatDate(selectedSession.startedAt)} · {balls.length} recorded {balls.length === 1 ? 'ball' : 'balls'}</p></div><button type="button" className={styles.secondaryButton} onClick={() => setRefresh(value => value + 1)}>Refresh instructions</button></div>
                        <div className={styles.ballNavigation}>
                          <div className={styles.selectLabel}><label htmlFor="performance-instruction-ball">Ball number</label><select id="performance-instruction-ball" value={selectedBall.ballNumber} onChange={event => setBallNumber(event.target.value)}>{balls.map(ball => <option key={ball.ballNumber} value={ball.ballNumber}>Ball {ball.ballNumber}</option>)}</select></div>
                          <div className={styles.toolbar}><button type="button" className={styles.secondaryButton} disabled={selectedIndex === 0} onClick={() => setBallNumber(String(balls[selectedIndex - 1].ballNumber))}>Previous ball</button><button type="button" className={styles.secondaryButton} disabled={selectedIndex === balls.length - 1} onClick={() => setBallNumber(String(balls[selectedIndex + 1].ballNumber))}>Next ball</button></div>
                        </div>
                      </section>
                      <section className={styles.card} aria-labelledby="ball-instruction-title">
                        <div className={styles.cardHeading}><h4 id="ball-instruction-title">Ball {selectedBall.ballNumber}</h4><span className={styles.tag}>Individual ball instruction</span></div>
                        <dl className={styles.ballStatuses}>
                          <div><dt>Grip status</dt><dd><span className={styles.techniqueStatus} data-status={selectedBall.gripStatus}>{TECHNIQUE_LABELS[selectedBall.gripStatus]}</span></dd></div>
                          <div><dt>Wrist angle status</dt><dd><span className={styles.techniqueStatus} data-status={selectedBall.wristAngleStatus}>{TECHNIQUE_LABELS[selectedBall.wristAngleStatus]}</span></dd></div>
                        </dl>
                        <div className={styles.instruction}><span className={styles.eyebrow}>Instruction</span><p>{selectedBall.instruction ?? 'Instruction not available for this ball.'}</p></div>
                      </section>
                    </>}
    </div>
  </div>;
}
