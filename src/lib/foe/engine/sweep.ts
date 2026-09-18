/**
 * The sweep.
 *
 * Two entry points, one machine:
 *
 *   runFullSweep()  — every active source in the universe, hourly.
 *   runHotWatch()   — only sources on hot watch, every 10 minutes, for
 *                     programmes that are about to open (or should already
 *                     have).
 *
 * The shape of a source check is always the same: fetch conditionally, compare
 * the content hash, stop if nothing moved, otherwise parse with the source's
 * adapter and ingest the candidates. Failures are recorded against the source,
 * never converted into "no opportunities found".
 */

import type { FailureKind, PrismaClient, ScanKind } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { HOT_WATCH_LOCK_KEY, HOT_WATCH_LEASE_MINUTES, SWEEP_LEASE_MINUTES, SWEEP_LOCK_KEY } from "../scan-lock";
import { HOT_WATCH_INTERVAL_MINUTES, SWEEP_INTERVAL_MINUTES, shouldHotWatch } from "../expected-window";
import { acquireLease, releaseLease } from "./lock";
import { domainOf, interleaveByDomain, runQueue, type QueueTask } from "./queue";
import { fetchSource } from "./fetcher";
import { analyseChange, contentHash } from "./content";
import { adapterFor, type AdapterFirm, type AdapterSource } from "./adapters";
import { ingestCandidate } from "./dedupe";
import { cronLooksMissed, healthAfterFailure, healthAfterSuccess, isAbnormallyLow, severityFor } from "./health";

export interface SweepOptions {
  prisma?: PrismaClient;
  kind?: ScanKind;
  concurrency?: number;
  perDomainDelayMs?: number;
  /** Abandon remaining sources after this long, so a run cannot overrun its slot. */
  budgetMs?: number;
  holder?: string;
}

export interface SweepSummary {
  runId: string | null;
  skipped: boolean;
  reason?: string;
  firmsScanned: number;
  sourcesScanned: number;
  sourcesChanged: number;
  sourcesFailed: number;
  candidatesFound: number;
  opportunitiesOpened: number;
  /** Opportunities that became OPEN in this run — the alert pipeline's input. */
  openedOpportunityIds: string[];
  durationMs: number;
}

interface SourceCheckOutcome {
  firmId: string;
  sourceId: string;
  url: string;
  ok: boolean;
  httpStatus: number | null;
  changed: boolean;
  contentHash: string | null;
  candidates: number;
  message: string;
  openedOpportunityIds: string[];
}

/** One source, start to finish. Never throws: every failure becomes a record. */
async function checkSource(
  prisma: PrismaClient,
  sourceId: string,
  now: Date,
): Promise<SourceCheckOutcome> {
  const source = await prisma.firmSource.findUnique({ where: { id: sourceId }, include: { firm: true } });
  if (!source) {
    return {
      firmId: "",
      sourceId,
      url: "",
      ok: false,
      httpStatus: null,
      changed: false,
      contentHash: null,
      candidates: 0,
      message: "Source no longer exists.",
      openedOpportunityIds: [],
    };
  }

  const base = { firmId: source.firmId, sourceId, url: source.url, openedOpportunityIds: [] as string[] };

  await prisma.firmSource.update({ where: { id: sourceId }, data: { lastAttemptedAt: now } });

  const result = await fetchSource(source.url, {
    etag: source.parserStatus?.startsWith("etag:") ? source.parserStatus.slice(5) : null,
    lastModified: null,
  });

  // --- Failure path: recorded, never silently treated as "nothing found" ---
  if (!result.ok) {
    await recordFailure(prisma, source.id, source.firmId, source.firm.tier === "TIER_1", result.kind, result.message, result.status, now);
    return { ...base, ok: false, httpStatus: result.status, changed: false, contentHash: null, candidates: 0, message: result.message };
  }

  const { health, consecutiveFailures } = healthAfterSuccess();

  // --- 304: cheapest possible outcome --------------------------------------
  if (result.notModified) {
    await prisma.firmSource.update({
      where: { id: sourceId },
      data: { lastSucceededAt: now, lastStatusCode: 304, health, consecutiveFailures },
    });
    await resolveFailures(prisma, sourceId, now);
    return { ...base, ok: true, httpStatus: 304, changed: false, contentHash: source.lastContentHash, candidates: 0, message: "Not modified." };
  }

  const hash = contentHash(result.text);
  const unchanged = source.lastContentHash === hash;

  await prisma.firmSource.update({
    where: { id: sourceId },
    data: {
      lastSucceededAt: now,
      lastStatusCode: result.status,
      health,
      consecutiveFailures,
      lastContentHash: hash,
      lastChangedAt: unchanged ? source.lastChangedAt : now,
      parserStatus: result.etag ? `etag:${result.etag}` : null,
      blockedReason: null,
    },
  });
  await resolveFailures(prisma, sourceId, now);

  if (unchanged) {
    return { ...base, ok: true, httpStatus: result.status, changed: false, contentHash: hash, candidates: 0, message: "No change." };
  }

  // --- Changed: parse and ingest -------------------------------------------
  const adapterSource: AdapterSource = {
    id: source.id,
    kind: source.kind,
    url: source.url,
    atsProvider: source.atsProvider,
  };
  const adapterFirm: AdapterFirm = {
    id: source.firm.id,
    name: source.firm.name,
    websiteDomain: source.firm.websiteDomain,
    atsProvider: source.firm.atsProvider,
  };

  const adapter = adapterFor(adapterSource, adapterFirm);
  const candidates = adapter.parse({
    firm: adapterFirm,
    source: adapterSource,
    text: result.text,
    url: result.finalUrl,
    now,
  });

  const opened: string[] = [];
  for (const candidate of candidates) {
    try {
      const ingest = await ingestCandidate(
        {
          prisma,
          firmId: source.firmId,
          firmName: source.firm.name,
          firmDomain: source.firm.websiteDomain,
          sourceKind: source.kind,
          firmSourceId: source.id,
          now,
        },
        candidate,
      );
      if (ingest.newlyOpened) opened.push(ingest.opportunityId);
    } catch (error) {
      await recordFailure(
        prisma,
        source.id,
        source.firmId,
        source.firm.tier === "TIER_1",
        "DATABASE_ERROR",
        `Could not save a candidate: ${error instanceof Error ? error.message : "unknown error"}`,
        null,
        now,
      );
    }
  }

  await prisma.firm.update({
    where: { id: source.firmId },
    data: { lastScanAttemptedAt: now, lastScanSucceededAt: now, lastSourceChangeAt: now, health: "HEALTHY", consecutiveFailures: 0 },
  });

  const analysis = analyseChange(null, result.text);
  return {
    ...base,
    ok: true,
    httpStatus: result.status,
    changed: true,
    contentHash: hash,
    candidates: candidates.length,
    message: `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}. ${analysis.summary}`,
    openedOpportunityIds: opened,
  };
}

async function recordFailure(
  prisma: PrismaClient,
  sourceId: string,
  firmId: string,
  tierOne: boolean,
  kind: FailureKind,
  message: string,
  httpStatus: number | null,
  now: Date,
) {
  const source = await prisma.firmSource.findUnique({ where: { id: sourceId } });
  const { health, consecutiveFailures } = healthAfterFailure(
    { consecutiveFailures: source?.consecutiveFailures ?? 0 },
    kind,
  );

  await prisma.firmSource.update({
    where: { id: sourceId },
    data: {
      health,
      consecutiveFailures,
      lastStatusCode: httpStatus,
      blockedReason: health === "BLOCKED" ? message : null,
    },
  });

  await prisma.firm.update({
    where: { id: firmId },
    data: { lastScanAttemptedAt: now, health: health === "BLOCKED" ? "BLOCKED" : health },
  });

  // One open failure row per source per kind: repeated failures update the
  // existing row rather than filling the health view with duplicates.
  const open = await prisma.sourceFailure.findFirst({ where: { firmSourceId: sourceId, kind, resolvedAt: null } });
  if (open) {
    await prisma.sourceFailure.update({
      where: { id: open.id },
      data: { message, httpStatus, severity: severityFor(kind, consecutiveFailures, tierOne) },
    });
  } else {
    await prisma.sourceFailure.create({
      data: {
        firmId,
        firmSourceId: sourceId,
        kind,
        severity: severityFor(kind, consecutiveFailures, tierOne),
        message,
        httpStatus,
        detectedAt: now,
      },
    });
  }
}

/** A successful check closes any open failures for that source. */
async function resolveFailures(prisma: PrismaClient, sourceId: string, now: Date) {
  await prisma.sourceFailure.updateMany({
    where: { firmSourceId: sourceId, resolvedAt: null },
    data: { resolvedAt: now },
  });
}

/**
 * Refreshes hot watch flags.
 *
 * Anything announced-and-imminent, inside its predicted window, or overdue gets
 * its firm's sources marked for 10-minute checks. Run before the sweep so a
 * date that arrived overnight is picked up immediately.
 */
export async function refreshHotWatch(prisma: PrismaClient, now: Date = new Date()): Promise<number> {
  const upcoming = await prisma.foeOpportunity.findMany({
    where: { state: { in: ["ANNOUNCED", "EXPECTED"] }, duplicateOfId: null, isDemo: false },
    select: { id: true, firmId: true, state: true, openingDate: true, expectedOpeningStart: true, expectedOpeningEnd: true },
  });

  const hotFirmIds = new Set<string>();
  for (const o of upcoming) {
    const { hot } = shouldHotWatch(o, now);
    if (hot) hotFirmIds.add(o.firmId);
  }

  // Clear expired flags first so a firm drops off the fast lane once its
  // programme has opened.
  await prisma.firmSource.updateMany({
    where: { hotWatchUntil: { lte: now } },
    data: { hotWatchUntil: null },
  });

  if (hotFirmIds.size > 0) {
    await prisma.firmSource.updateMany({
      where: { firmId: { in: [...hotFirmIds] }, active: true },
      data: { hotWatchUntil: new Date(now.getTime() + 24 * 3_600_000) },
    });
  }

  return hotFirmIds.size;
}

async function runSweep(options: SweepOptions, hotWatchOnly: boolean): Promise<SweepSummary> {
  const prisma = options.prisma ?? defaultPrisma;
  const now = new Date();
  const startedAt = Date.now();
  const kind: ScanKind = options.kind ?? (hotWatchOnly ? "HOT_WATCH" : "FULL_SWEEP");
  const lockKey = hotWatchOnly ? HOT_WATCH_LOCK_KEY : SWEEP_LOCK_KEY;
  const leaseMinutes = hotWatchOnly ? HOT_WATCH_LEASE_MINUTES : SWEEP_LEASE_MINUTES;
  const holder = options.holder ?? `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

  const empty: SweepSummary = {
    runId: null,
    skipped: true,
    firmsScanned: 0,
    sourcesScanned: 0,
    sourcesChanged: 0,
    sourcesFailed: 0,
    candidatesFound: 0,
    opportunitiesOpened: 0,
    openedOpportunityIds: [],
    durationMs: 0,
  };

  const lease = await acquireLease(prisma, lockKey, holder, leaseMinutes, now);
  if (!lease.acquired) {
    return { ...empty, reason: `A ${kind} is already running (lease held until ${lease.heldUntil?.toISOString() ?? "unknown"}).` };
  }

  // Taking over a dead worker's lease is a real signal, not a detail.
  if (lease.stolenFrom) {
    await prisma.sourceFailure.create({
      data: {
        kind: "QUEUE_STALLED",
        severity: "CRITICAL",
        message: `Took over an expired ${kind} lease from ${lease.stolenFrom} — the previous run did not finish.`,
        detectedAt: now,
      },
    });
  }

  const run = await prisma.scanRun.create({ data: { kind, status: "RUNNING", startedAt: now } });

  try {
    if (!hotWatchOnly) await refreshHotWatch(prisma, now);

    const sources = await prisma.firmSource.findMany({
      where: {
        active: true,
        firm: { active: true, isDemo: false },
        ...(hotWatchOnly ? { hotWatchUntil: { gt: now } } : {}),
      },
      select: { id: true, url: true, firmId: true, priority: true },
      orderBy: { priority: "asc" },
    });

    const firmIds = new Set(sources.map((s) => s.firmId));
    await prisma.scanRun.update({ where: { id: run.id }, data: { firmsPlanned: firmIds.size } });

    const tasks: QueueTask<SourceCheckOutcome>[] = sources.map((s) => ({
      domain: domainOf(s.url),
      run: () => checkSource(prisma, s.id, now),
    }));

    const results = await runQueue(interleaveByDomain(tasks), {
      concurrency: options.concurrency ?? 8,
      perDomainDelayMs: options.perDomainDelayMs ?? 1_500,
      budgetMs: options.budgetMs ?? (hotWatchOnly ? 5 * 60_000 : 45 * 60_000),
    });

    let sourcesScanned = 0;
    let sourcesChanged = 0;
    let sourcesFailed = 0;
    let candidatesFound = 0;
    const openedOpportunityIds: string[] = [];
    const scannedFirms = new Set<string>();

    for (const result of results) {
      if (result.skipped || !result.value) {
        if (result.error) sourcesFailed += 1;
        continue;
      }
      const outcome = result.value;
      sourcesScanned += 1;
      if (outcome.changed) sourcesChanged += 1;
      if (!outcome.ok) sourcesFailed += 1;
      candidatesFound += outcome.candidates;
      openedOpportunityIds.push(...outcome.openedOpportunityIds);
      if (outcome.firmId) scannedFirms.add(outcome.firmId);

      await prisma.scanResult.create({
        data: {
          scanRunId: run.id,
          firmId: outcome.firmId || null,
          firmSourceId: outcome.sourceId,
          url: outcome.url,
          ok: outcome.ok,
          httpStatus: outcome.httpStatus,
          changed: outcome.changed,
          contentHash: outcome.contentHash,
          candidates: outcome.candidates,
          durationMs: result.durationMs,
          message: outcome.message,
        },
      });
    }

    // A run where most sources failed is a run whose silence means nothing.
    const status = sourcesFailed > sourcesScanned / 2 && sourcesScanned > 0 ? "PARTIAL" : "COMPLETED";

    await prisma.scanRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        firmsScanned: scannedFirms.size,
        sourcesScanned,
        sourcesChanged,
        sourcesFailed,
        candidatesFound,
        opportunitiesOpened: openedOpportunityIds.length,
        message: `${sourcesScanned} sources, ${sourcesChanged} changed, ${sourcesFailed} failed.`,
      },
    });

    await flagAbnormallyLowResults(prisma, kind, candidatesFound);

    return {
      runId: run.id,
      skipped: false,
      firmsScanned: scannedFirms.size,
      sourcesScanned,
      sourcesChanged,
      sourcesFailed,
      candidatesFound,
      opportunitiesOpened: openedOpportunityIds.length,
      openedOpportunityIds,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    await prisma.scanRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  } finally {
    await releaseLease(prisma, lockKey, holder);
  }
}

/**
 * Compares this run's yield against recent history.
 *
 * Catches the failure mode nothing else can see: every source returns 200, no
 * failure is recorded, and the candidate count quietly collapses because a
 * parser broke.
 */
async function flagAbnormallyLowResults(prisma: PrismaClient, kind: ScanKind, candidatesFound: number) {
  const recent = await prisma.scanRun.findMany({
    where: { kind, status: { in: ["COMPLETED", "PARTIAL"] } },
    orderBy: { startedAt: "desc" },
    take: 8,
    select: { candidatesFound: true },
  });

  if (!isAbnormallyLow(candidatesFound, recent.map((r) => r.candidatesFound))) return;

  const open = await prisma.sourceFailure.findFirst({ where: { kind: "ABNORMALLY_LOW_RESULTS", resolvedAt: null } });
  const message = `This ${kind} found ${candidatesFound} candidates, far below the recent norm. A parser or ATS format may have changed.`;
  if (open) {
    await prisma.sourceFailure.update({ where: { id: open.id }, data: { message } });
  } else {
    await prisma.sourceFailure.create({
      data: { kind: "ABNORMALLY_LOW_RESULTS", severity: "CRITICAL", message },
    });
  }
}

export function runFullSweep(options: SweepOptions = {}) {
  return runSweep(options, false);
}

export function runHotWatch(options: SweepOptions = {}) {
  return runSweep(options, true);
}

/**
 * Notices that a scheduled run did not happen.
 *
 * Called at the start of each run: if the gap since the previous one is far
 * larger than the interval, the scheduler itself missed a slot, which is
 * invisible from inside any single run.
 */
export async function checkScheduleHealth(prisma: PrismaClient = defaultPrisma, now: Date = new Date()) {
  for (const [kind, interval] of [
    ["FULL_SWEEP", SWEEP_INTERVAL_MINUTES],
    ["HOT_WATCH", HOT_WATCH_INTERVAL_MINUTES],
  ] as const) {
    const last = await prisma.scanRun.findFirst({ where: { kind }, orderBy: { startedAt: "desc" } });
    if (!last || !cronLooksMissed(last.startedAt, now, interval)) continue;

    const open = await prisma.sourceFailure.findFirst({ where: { kind: "CRON_MISSED", resolvedAt: null } });
    const message = `No ${kind} has run since ${last.startedAt.toISOString()} — the schedule expects one every ${interval} minutes.`;
    if (open) {
      await prisma.sourceFailure.update({ where: { id: open.id }, data: { message, detectedAt: now } });
    } else {
      await prisma.sourceFailure.create({ data: { kind: "CRON_MISSED", severity: "CRITICAL", message, detectedAt: now } });
    }
  }
}
