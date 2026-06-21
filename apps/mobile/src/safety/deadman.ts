import {
  isCheckInDue,
  shouldEscalate,
  msUntilNextCheckIn,
  type DeadmanState,
} from '@rahi/shared';

/**
 * Dead-man's-switch controller (Task 6.4). Prompts "you OK?" every interval; if
 * the rider doesn't acknowledge within the grace window, it escalates to SOS via
 * the provided callback. The timing rules live in shared (pure, tested); this
 * wraps them with timers + acknowledgement. Pro-gated by the caller.
 */
export interface DeadmanHandle {
  acknowledge: () => void;
  stop: () => void;
}

export function startDeadman(
  opts: { intervalMs?: number; graceMs?: number },
  callbacks: { onPrompt: () => void; onEscalate: () => void },
): DeadmanHandle {
  let state: DeadmanState = {
    lastAckMs: Date.now(),
    intervalMs: opts.intervalMs ?? 10 * 60 * 1000,
    graceMs: opts.graceMs ?? 2 * 60 * 1000,
  };
  let promptedThisCycle = false;

  const id = setInterval(() => {
    const now = Date.now();
    if (shouldEscalate(state, now)) {
      callbacks.onEscalate();
      state = { ...state, lastAckMs: now }; // reset after escalation
      promptedThisCycle = false;
    } else if (isCheckInDue(state, now) && !promptedThisCycle) {
      promptedThisCycle = true;
      callbacks.onPrompt();
    }
  }, 15_000);

  return {
    acknowledge: () => {
      state = { ...state, lastAckMs: Date.now() };
      promptedThisCycle = false;
    },
    stop: () => clearInterval(id),
  };
}

export { msUntilNextCheckIn };
