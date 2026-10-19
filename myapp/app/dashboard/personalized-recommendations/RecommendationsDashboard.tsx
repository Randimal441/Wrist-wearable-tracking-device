'use client';

import { useEffect, useRef, useState } from 'react';
import { DEMO_SESSIONS } from './demo-data';
import { Overview, SessionHistory, SessionDetails, GetRecommendations } from './SessionViews';
import { RecommendationHistory, ReportView, ProgressComparison } from './ReportViews';
import GeneralRecommendations from './GeneralRecommendations';
import SessionInstructions from './SessionInstructions';
import { Icon, type IconName } from './ui';
import type { BowlingSession, RecommendationReport } from './types';
import styles from './styles';

type Tab = 'overview' | 'sessions' | 'generate' | 'history' | 'compare' | 'period' | 'instructions';
type Screen = Tab | 'session' | 'report';

const NAVIGATION: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'sessions', label: 'Sessions', icon: 'sessions' },
  { id: 'generate', label: 'Get Recommendations', icon: 'spark' },
  { id: 'history', label: 'Recommendation History', icon: 'report' },
  { id: 'compare', label: 'Progress Comparison', icon: 'compare' },
];

const HEADINGS: Record<Screen, [string, string]> = {
  period: ['General Personalized Recommendations', 'Review your performance and recommendations for a selected period.'],
  instructions: ['Session-Wise Instructions', 'Review short instructions for each recorded ball in a training session.'],
  overview: ['Performance Overview', 'Review your recent bowling performance and get personalized training guidance.'],
  sessions: ['Sessions', 'Your five most recent completed bowling sessions.'],
  generate: ['Get Recommendations', 'Choose how you want to analyze your bowling performance.'],
  history: ['Recommendation History', 'Review previously generated training reports.'],
  compare: ['Progress Comparison', 'Compare your performance across two recommendation reports.'],
  session: ['Session Details', 'Review session summaries and delivery-level measurements.'],
  report: ['Personalized Training Report', 'Practice guidance based on recorded session data.'],
};

export default function RecommendationsDashboard() {
  const [screen, setScreen] = useState<Screen>('overview');
  const [selectedId, setSelectedId] = useState('');
  const [generateVisit, setGenerateVisit] = useState(0);
  const [session, setSession] = useState<BowlingSession | null>(null);
  const [reports] = useState<RecommendationReport[]>([]);
  const [reportId, setReportId] = useState('');
  const [earlierId, setEarlierId] = useState('');
  const [laterId, setLaterId] = useState('');
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const report = reports.find(r => r.id === reportId);
  const activeTab = screen === 'session' ? 'sessions' : screen === 'report' ? 'history'
    : screen === 'period' || screen === 'instructions' ? 'generate' : screen;

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'nearest' });
  }, [screen]);

  function openGenerate(preselected?: BowlingSession) {
    setSelectedId(preselected?.id ?? '');
    setGenerateVisit(value => value + 1);
    setError('');
    setScreen('generate');
  }

  function openDetails(selected: BowlingSession) {
    setSession(selected);
    setScreen('session');
  }

  function openReport(selected: RecommendationReport) {
    setReportId(selected.id);
    setScreen('report');
  }

  function openComparison(selected?: RecommendationReport) {
    const sorted = [...reports].sort((a, b) => a.session.date.localeCompare(b.session.date));
    const target = selected ?? sorted[sorted.length - 1];
    if (target) {
      const older = sorted.filter(r => r.session.date < target.session.date).at(-1);
      const newer = sorted.find(r => r.session.date > target.session.date);
      setEarlierId(older?.id ?? target.id);
      setLaterId(older ? target.id : newer?.id ?? '');
    }
    setScreen('compare');
  }

  function analyze() {
    setError('No recommendation available yet. Session analysis is not connected.');
  }

  function selectTab(tab: Tab) {
    if (tab === 'compare') { openComparison(); return; }
    if (tab === 'generate') { openGenerate(); return; }
    setScreen(tab);
  }

  return <div className={styles.dashboard}>
    <nav className={styles.navigation} aria-label="Personalized recommendations screens">{NAVIGATION.map(tab =>
      <button type="button" key={tab.id} className={activeTab === tab.id ? styles.navActive : styles.navButton} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => selectTab(tab.id)}><Icon name={tab.icon} />{tab.label}</button>
    )}</nav>
    <section className={styles.screen} aria-labelledby="recommendations-screen-heading">
      <div className={styles.screenHeading}><h3 id="recommendations-screen-heading" tabIndex={-1} ref={heading}>{HEADINGS[screen][0]}</h3><p>{HEADINGS[screen][1]}</p></div>
      {(screen === 'period' || screen === 'instructions') && <div className={styles.toolbar}><button type="button" className={styles.secondaryButton} onClick={() => setScreen('generate')}>← Back to Get Recommendations</button></div>}
      {screen === 'period' && <GeneralRecommendations />}
      {screen === 'instructions' && <SessionInstructions />}
      {screen === 'overview' && <Overview sessions={DEMO_SESSIONS} onDetails={openDetails} onGenerate={openGenerate} onHistory={() => setScreen('sessions')} />}
      {screen === 'sessions' && <SessionHistory sessions={DEMO_SESSIONS} onDetails={openDetails} onGenerate={openGenerate} />}
      {screen === 'session' && session && <SessionDetails session={session} onBack={() => setScreen('sessions')} onGenerate={() => openGenerate(session)} />}
      {screen === 'generate' && <GetRecommendations key={generateVisit} sessions={DEMO_SESSIONS} selectedId={selectedId} onSelect={id => { setSelectedId(id); setError(''); }} onAnalyze={analyze} error={error} onSessionInstructions={() => setScreen('instructions')} />}
      {screen === 'report' && report && <ReportView key={report.id} report={report} onHistory={() => setScreen('history')} onCompare={() => openComparison(report)} />}
      {screen === 'history' && <RecommendationHistory reports={reports} onGenerate={openGenerate} onView={openReport} onCompare={openComparison} />}
      {screen === 'compare' && <ProgressComparison reports={reports} sessions={DEMO_SESSIONS} earlierId={earlierId} laterId={laterId} onEarlier={setEarlierId} onLater={setLaterId} onGenerate={openGenerate} />}
    </section>
  </div>;
}
