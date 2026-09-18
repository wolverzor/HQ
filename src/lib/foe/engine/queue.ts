/**
 * Concurrency with per-domain politeness.
 *
 * The sweep must not walk the universe one firm at a time — a single slow or
 * hanging source would hold up every firm behind it, and an hourly sweep that
 * takes longer than an hour stops being hourly. So work runs on a bounded pool.
 *
 * The other half is the opposite constraint: parallelism must not turn into
 * hammering one employer's site. Each domain gets its own minimum gap between
 * requests, independent of the global pool.
 *
 * Deliberately in-process. A real queue service (Redis, SQS) is the right answer
 * at a much larger universe, but adding one now would be infrastructure the
 * first version has to operate without any benefit it can use yet.
 */

export interface QueueOptions {
  /** Maximum tasks in flight across all domains. */
  concurrency?: number;
  /** Minimum milliseconds between two requests to the same domain. */
  perDomainDelayMs?: number;
  /** Hard ceiling for the whole run; remaining tasks are abandoned, not failed. */
  budgetMs?: number;
}

export interface QueueTask<T> {
  /** Used for per-domain rate limiting. */
  domain: string;
  run: () => Promise<T>;
}

export interface QueueResult<T> {
  domain: string;
  /** Undefined when the task threw or the budget ran out. */
  value?: T;
  error?: unknown;
  /** True when the run budget expired before this task started. */
  skipped: boolean;
  durationMs: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * Runs tasks with bounded concurrency and per-domain spacing.
 *
 * A task that throws does not stop the run: its error is captured in its result
 * and the pool carries on. One broken careers page must never end a sweep — the
 * whole design principle is that a failure is recorded, not propagated.
 */
export async function runQueue<T>(tasks: QueueTask<T>[], options: QueueOptions = {}): Promise<QueueResult<T>[]> {
  const concurrency = Math.max(1, options.concurrency ?? 8);
  const perDomainDelayMs = options.perDomainDelayMs ?? 1_500;
  const deadline = options.budgetMs ? Date.now() + options.budgetMs : Infinity;

  const results: QueueResult<T>[] = new Array(tasks.length);
  /**
   * The earliest time the next request to a domain may start.
   *
   * A slot is *reserved* synchronously at claim time rather than stamped after
   * the wait. Recording "when I started" instead would let two workers both
   * read the same timestamp before either wrote one, wait the same interval and
   * then hit the host together — defeating the rate limit precisely when
   * concurrency is highest.
   */
  const nextAllowedByDomain = new Map<string, number>();
  let next = 0;

  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= tasks.length) return;
      const task = tasks[index];

      if (Date.now() >= deadline) {
        results[index] = { domain: task.domain, skipped: true, durationMs: 0 };
        continue;
      }

      // Reserve this domain's next slot before yielding, so concurrent workers
      // on the same host queue behind each other rather than colliding.
      const claimedAt = Date.now();
      const earliest = Math.max(claimedAt, nextAllowedByDomain.get(task.domain) ?? 0);
      nextAllowedByDomain.set(task.domain, earliest + perDomainDelayMs);

      const wait = earliest - claimedAt;
      if (wait > 0) await sleep(wait);

      const startedAt = Date.now();
      try {
        const value = await task.run();
        results[index] = { domain: task.domain, value, skipped: false, durationMs: Date.now() - startedAt };
      } catch (error) {
        results[index] = { domain: task.domain, error, skipped: false, durationMs: Date.now() - startedAt };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

/**
 * Orders tasks so that no two consecutive entries share a domain where it can
 * be helped. With sources grouped by firm, the naive order makes every worker
 * hit the same host at once and then sit in the rate-limit delay.
 */
export function interleaveByDomain<T>(tasks: QueueTask<T>[]): QueueTask<T>[] {
  const byDomain = new Map<string, QueueTask<T>[]>();
  for (const task of tasks) {
    if (!byDomain.has(task.domain)) byDomain.set(task.domain, []);
    byDomain.get(task.domain)!.push(task);
  }

  const queues = [...byDomain.values()];
  const out: QueueTask<T>[] = [];
  let remaining = tasks.length;

  while (remaining > 0) {
    for (const queue of queues) {
      const task = queue.shift();
      if (task) {
        out.push(task);
        remaining--;
      }
    }
  }

  return out;
}
