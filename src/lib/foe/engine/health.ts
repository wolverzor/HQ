/**
 * Source health transitions.
 *
 * Pure functions, so the rule "three strikes and a source is FAILING" is
 * testable without a database or a network.
 *
 * The rule this encodes, and the reason the module exists: a source that has
 * failed repeatedly has NOT told us there are no opportunities. It has told us
 * nothing. Health is how that distinction reaches the dashboard.
 */

import type { FailureKind, FailureSeverity, SourceHealth } from "@prisma/client";

/** Failures after which a source is considered degraded, then failing. */
export const DEGRADED_AFTER = 1;
export const FAILING_AFTER = 3;

export interface HealthInput {
  consecutiveFailures: number;
  lastFailureKind?: FailureKind | null;
}

/** Health after a successful check: success always clears the streak. */
export function healthAfterSuccess(): { health: SourceHealth; consecutiveFailures: number } {
  return { health: "HEALTHY", consecutiveFailures: 0 };
}

export function healthAfterFailure(
  previous: HealthInput,
  kind: FailureKind,
): { health: SourceHealth; consecutiveFailures: number } {
  const consecutiveFailures = previous.consecutiveFailures + 1;

  // A bot wall or CAPTCHA is BLOCKED immediately — it is a different problem
  // from flakiness and needs a different fix (a new URL, an ATS endpoint, or a
  // human). Waiting three sweeps to say so helps nobody.
  if (kind === "BLOCKED" || kind === "CAPTCHA") {
    return { health: "BLOCKED", consecutiveFailures };
  }

  if (kind === "CAREERS_URL_MISSING") {
    return { health: "FAILING", consecutiveFailures };
  }

  if (consecutiveFailures >= FAILING_AFTER) return { health: "FAILING", consecutiveFailures };
  if (consecutiveFailures >= DEGRADED_AFTER) return { health: "DEGRADED", consecutiveFailures };
  return { health: "HEALTHY", consecutiveFailures };
}

/**
 * How loudly to complain. CRITICAL is reserved for things that mean FOE is
 * blind to a firm rather than merely inconvenienced.
 */
export function severityFor(kind: FailureKind, consecutiveFailures: number, tierOneFirm: boolean): FailureSeverity {
  switch (kind) {
    case "CRON_MISSED":
    case "QUEUE_STALLED":
    case "DATABASE_ERROR":
    case "ABNORMALLY_LOW_RESULTS":
      return "CRITICAL";
    case "CAREERS_URL_MISSING":
    case "ATS_FORMAT_CHANGE":
      return tierOneFirm ? "CRITICAL" : "WARNING";
    case "BLOCKED":
    case "CAPTCHA":
      return tierOneFirm && consecutiveFailures >= FAILING_AFTER ? "CRITICAL" : "WARNING";
    case "SEARCH_QUOTA_EXHAUSTED":
    case "NOTIFICATION_FAILURE":
      return "WARNING";
    case "RATE_LIMITED":
      return consecutiveFailures >= FAILING_AFTER ? "WARNING" : "INFO";
    default:
      return consecutiveFailures >= FAILING_AFTER ? "WARNING" : "INFO";
  }
}

/**
 * Whether a sweep's result count is suspiciously low against its own history.
 *
 * The scenario: a change at a big ATS breaks the parser, every source still
 * returns 200, and FOE quietly reports zero openings all week. Nothing else in
 * the pipeline notices, because every individual check "succeeded". Comparing
 * against the recent baseline is the only thing that catches it.
 */
export function isAbnormallyLow(current: number, recentCounts: number[], floor = 5): boolean {
  if (recentCounts.length < 3) return false;
  const median = [...recentCounts].sort((a, b) => a - b)[Math.floor(recentCounts.length / 2)];
  if (median < floor) return false;
  return current < median * 0.4;
}

/** Whether a scheduled run was skipped, based on when the last one started. */
export function cronLooksMissed(lastRunStartedAt: Date | null, now: Date, expectedIntervalMinutes: number): boolean {
  if (!lastRunStartedAt) return false;
  const elapsedMinutes = (now.getTime() - lastRunStartedAt.getTime()) / 60_000;
  // Two missed slots, to tolerate the few minutes of jitter scheduled runners
  // routinely add without crying wolf every time.
  return elapsedMinutes > expectedIntervalMinutes * 2.5;
}
