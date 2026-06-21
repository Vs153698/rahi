/**
 * Dead-man's-switch timing (Task 6.4). Pure scheduling logic: the app asks "you
 * OK?" every interval; if the rider doesn't acknowledge within a grace window,
 * it escalates to SOS. Kept pure so the escalation rule is testable.
 */
export interface DeadmanState {
  /** Epoch ms of the last acknowledged check-in. */
  lastAckMs: number;
  /** How often to prompt (ms). */
  intervalMs: number;
  /** Extra time after a prompt before escalating (ms). */
  graceMs: number;
}

/** True when a prompt is due (interval elapsed since last ack). */
export function isCheckInDue(state: DeadmanState, now: number): boolean {
  return now - state.lastAckMs >= state.intervalMs;
}

/** True when the grace window after a due prompt has lapsed → escalate to SOS. */
export function shouldEscalate(state: DeadmanState, now: number): boolean {
  return now - state.lastAckMs >= state.intervalMs + state.graceMs;
}

/** Ms until the next check-in prompt (0 if already due). */
export function msUntilNextCheckIn(state: DeadmanState, now: number): number {
  return Math.max(0, state.lastAckMs + state.intervalMs - now);
}
