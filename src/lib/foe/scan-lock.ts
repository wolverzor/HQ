/**
 * Overlap protection for scheduled sweeps.
 *
 * The hourly sweep can run long (hundreds of firms, several sources each). If
 * the next hour's trigger fires while the previous run is still going, two
 * sweeps hammer the same domains, double-count candidates and can race each
 * other into duplicate alerts.
 *
 * A lock row with an expiry is enough: it survives process death (the lease
 * simply expires) without needing a separate queue service.
 */

export const SWEEP_LOCK_KEY = "foe:full-sweep";
export const HOT_WATCH_LOCK_KEY = "foe:hot-watch";

/** A sweep lease. Long enough for a slow run, short enough to self-heal. */
export const SWEEP_LEASE_MINUTES = 55;
export const HOT_WATCH_LEASE_MINUTES = 9;

export interface LockRow {
  key: string;
  expiresAt: Date;
  holder: string | null;
}

/**
 * Whether an existing lock still blocks a new run.
 *
 * An expired lease does not block: that is the self-healing path for a worker
 * that died mid-sweep. The expiry itself is worth surfacing as a
 * QUEUE_STALLED failure so a repeatedly crashing sweep is visible rather than
 * quietly retried forever.
 */
export function isLockHeld(lock: LockRow | null, now: Date): boolean {
  if (!lock) return false;
  return lock.expiresAt.getTime() > now.getTime();
}

export function leaseUntil(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * 60_000);
}

/** True when a lock was taken over from a dead holder rather than acquired cleanly. */
export function wasStolen(previous: LockRow | null, now: Date): boolean {
  return previous != null && previous.expiresAt.getTime() <= now.getTime();
}
