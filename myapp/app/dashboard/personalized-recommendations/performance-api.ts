// Frontend contract for the future performance service. No results are generated here.
export type TechniqueStatus = 'correct' | 'incorrect' | 'unavailable';

export const TECHNIQUE_LABELS: Record<TechniqueStatus, string> = {
  correct: 'Correct', incorrect: 'Incorrect', unavailable: 'Not available',
};

export interface TechniqueResult {
  status: TechniqueStatus;
  summary: string | null;
}

export interface PeriodRecommendations {
  playerId: number;
  period: { startDate: string; endDate: string };
  sessionCount: number;
  ballCount: number;
  summary: string;
  grip: TechniqueResult;
  wristAngle: TechniqueResult;
  contributions: { grip: number; wristAngle: number } | null;
  priorityArea: 'grip' | 'wrist' | 'both' | 'none' | 'unavailable';
  recommendations: string[];
}

export interface PerformanceSession {
  id: string;
  label: string;
  startedAt: string;
  ballCount: number;
}

export interface BallInstruction {
  ballNumber: number;
  gripStatus: TechniqueStatus;
  wristAngleStatus: TechniqueStatus;
  instruction: string | null;
}

export interface SessionInstructionsResult {
  playerId: number;
  sessionId: string;
  balls: BallInstruction[];
}

export class PerformanceApiError extends Error {
  constructor(public readonly kind: 'error' | 'unavailable', message: string) {
    super(message);
    this.name = 'PerformanceApiError';
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const optionalText = (value: unknown): value is string | null => value === null || text(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
const status = (value: unknown): value is TechniqueStatus =>
  value === 'correct' || value === 'incorrect' || value === 'unavailable';
const technique = (value: unknown): value is TechniqueResult =>
  record(value) && status(value.status) && optionalText(value.summary);
const percentage = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

function invalidResponse(): never {
  throw new PerformanceApiError('error', 'The performance service returned an unexpected response. Please try again.');
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dateRangeError(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return 'Choose both a start date and an end date.';
  if (!validDate(startDate) || !validDate(endDate)) return 'Enter valid calendar dates.';
  if (startDate > endDate) return 'The end date must be on or after the start date.';
  return null;
}

// Requests use the existing HttpOnly cookie. Cancellation and a finite timeout
// cover both the existing profile endpoint and the future performance endpoints.
async function getData(path: string, signal: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) controller.abort();
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await fetch(path, {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (response.status === 401) throw new PerformanceApiError('error', 'Your session has expired. Please sign in again.');
    if (response.status === 403) throw new PerformanceApiError('error', 'You do not have access to these performance records.');
    if ([404, 501, 503].includes(response.status)) {
      throw new PerformanceApiError('unavailable', 'Performance results are not available yet. Please try again later.');
    }
    if (!response.ok) throw new PerformanceApiError('error', 'Performance results could not be loaded. Please try again.');
    const body: unknown = await response.json();
    if (!record(body)) invalidResponse();
    if (body.success !== true) {
      if (body.code === 'MODEL_UNAVAILABLE') {
        throw new PerformanceApiError('unavailable', 'Performance results are not available yet. Please try again later.');
      }
      invalidResponse();
    }
    if (!('data' in body)) invalidResponse();
    return body.data;
  } catch (cause) {
    if (signal.aborted) throw cause;
    if (cause instanceof PerformanceApiError) throw cause;
    if (controller.signal.aborted) throw new PerformanceApiError('error', 'The request timed out. Please try again.');
    if (cause instanceof SyntaxError) invalidResponse();
    throw new PerformanceApiError('error', 'Unable to connect. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

async function getPlayerId(signal: AbortSignal): Promise<number> {
  const profile = await getData('/api/user/profile', signal);
  if (!record(profile) || !count(profile.id) || profile.id === 0) invalidResponse();
  return profile.id;
}

export async function getPeriodRecommendations(
  startDate: string, endDate: string, signal: AbortSignal,
): Promise<PeriodRecommendations | null> {
  const error = dateRangeError(startDate, endDate);
  if (error) throw new PerformanceApiError('error', error);
  const playerId = await getPlayerId(signal);
  const query = new URLSearchParams({ playerId: String(playerId), startDate, endDate });
  const data = await getData(`/api/performance/recommendations?${query}`, signal);
  if (data === null) return null;
  if (!record(data) || data.playerId !== playerId || !record(data.period)
    || data.period.startDate !== startDate || data.period.endDate !== endDate
    || !count(data.sessionCount) || !count(data.ballCount) || !text(data.summary)
    || !technique(data.grip) || !technique(data.wristAngle)
    || !['grip', 'wrist', 'both', 'none', 'unavailable'].includes(String(data.priorityArea))
    || !Array.isArray(data.recommendations) || !data.recommendations.every(text)) invalidResponse();
  // An absent or invalid optional estimate stays unavailable; never infer a value.
  const contributions = record(data.contributions) && percentage(data.contributions.grip)
    && percentage(data.contributions.wristAngle)
    ? { grip: data.contributions.grip, wristAngle: data.contributions.wristAngle } : null;
  return {
    playerId, period: { startDate, endDate }, sessionCount: data.sessionCount,
    ballCount: data.ballCount, summary: data.summary, grip: data.grip,
    wristAngle: data.wristAngle, contributions,
    priorityArea: data.priorityArea as PeriodRecommendations['priorityArea'],
    recommendations: data.recommendations,
  };
}

export async function getPerformanceSessions(signal: AbortSignal): Promise<PerformanceSession[]> {
  const playerId = await getPlayerId(signal);
  const data = await getData(`/api/performance/sessions?${new URLSearchParams({ playerId: String(playerId) })}`, signal);
  if (!record(data) || data.playerId !== playerId || !Array.isArray(data.sessions)) invalidResponse();
  const ids = new Set<string>();
  for (const session of data.sessions) {
    if (!record(session) || !text(session.id) || !text(session.label) || !text(session.startedAt)
      || !Number.isFinite(new Date(session.startedAt).getTime()) || !count(session.ballCount)
      || ids.has(session.id)) invalidResponse();
    ids.add(session.id);
  }
  return data.sessions as PerformanceSession[];
}

export async function getSessionInstructions(
  sessionId: string, signal: AbortSignal,
): Promise<SessionInstructionsResult> {
  if (!text(sessionId)) throw new PerformanceApiError('error', 'Choose a training session.');
  const playerId = await getPlayerId(signal);
  const query = new URLSearchParams({ playerId: String(playerId) });
  const data = await getData(`/api/performance/sessions/${encodeURIComponent(sessionId)}/instructions?${query}`, signal);
  if (!record(data) || data.playerId !== playerId || data.sessionId !== sessionId || !Array.isArray(data.balls)) invalidResponse();
  const numbers = new Set<number>();
  for (const ball of data.balls) {
    if (!record(ball) || !count(ball.ballNumber) || ball.ballNumber === 0 || numbers.has(ball.ballNumber)
      || !status(ball.gripStatus) || !status(ball.wristAngleStatus) || !optionalText(ball.instruction)) invalidResponse();
    numbers.add(ball.ballNumber);
  }
  return { playerId, sessionId, balls: (data.balls as BallInstruction[]).sort((a, b) => a.ballNumber - b.ballNumber) };
}
