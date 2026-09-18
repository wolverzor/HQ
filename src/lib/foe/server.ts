/**
 * Server-side assembly of FOE views.
 *
 * The canonical opportunity rows are global; everything personal (eligibility,
 * priority, watch state, application progress) is computed here per request so
 * the client never has to re-derive it — and so the same rules apply whether a
 * row is rendered in the UI or fed to the alert pipeline.
 */

import { prisma } from "@/lib/prisma";
import { classifyEligibility, type EligibilityProfile } from "./eligibility";
import { computePriority, comparePriority, compareUpcoming, tiebreakFor } from "./priority";
import { DEFAULT_SUBSCRIPTIONS } from "./alerts";
import { regionForLocation } from "./taxonomy";
import type {
  EngineHealthDTO,
  FoeOpportunityDTO,
  FoePreferencesDTO,
  FoeSummaryDTO,
  OpeningSoonDTO,
  WatchlistItemDTO,
} from "./types";
import type { FoePreferences, Prisma } from "@prisma/client";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** States a user should see on the main list. DUPLICATE/REJECTED are engine bookkeeping. */
const VISIBLE_STATES = [
  "OPEN",
  "CLOSING_SOON",
  "ANNOUNCED",
  "EXPECTED",
  "DISCOVERED",
  "VERIFYING",
  "MANUAL_REVIEW",
  "UNREACHABLE",
  "CLOSED",
] as const;

export async function getOrCreatePreferences(userId: string): Promise<FoePreferences> {
  const existing = await prisma.foePreferences.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.foePreferences.create({ data: { userId } });
}

function toProfile(p: FoePreferences | null): EligibilityProfile | null {
  if (!p) return null;
  return {
    currentYear: p.currentYear,
    graduationYear: p.graduationYear,
    degreeLengthYears: p.degreeLengthYears,
    workEligibility: p.workEligibility,
    preferredRegions: p.preferredRegions,
  };
}

const opportunityInclude = {
  sources: { orderBy: { confidence: "desc" } },
} satisfies Prisma.FoeOpportunityInclude;

/**
 * Every opportunity worth showing, with per-user annotations, sorted by the
 * default priority rules. Filtering happens client-side so the counts shown on
 * the summary cards and the "N hidden by filters" notice stay honest.
 */
export async function listOpportunities(userId: string): Promise<{
  opportunities: FoeOpportunityDTO[];
  summary: FoeSummaryDTO;
}> {
  const prefs = await getOrCreatePreferences(userId);
  const profile = toProfile(prefs);
  const now = new Date();

  const [rows, watches, applications] = await Promise.all([
    prisma.foeOpportunity.findMany({
      where: { state: { in: [...VISIBLE_STATES] }, duplicateOfId: null },
      include: opportunityInclude,
    }),
    prisma.watchlistItem.findMany({ where: { userId }, select: { opportunityId: true, firmId: true } }),
    prisma.application.findMany({ where: { userId }, select: { id: true, opportunityId: true, stage: true, appliedAt: true } }),
  ]);

  const watchedOpportunities = new Set(watches.map((w) => w.opportunityId).filter(Boolean) as string[]);
  const watchedFirms = new Set(watches.map((w) => w.firmId).filter(Boolean) as string[]);
  const applicationByOpportunity = new Map(applications.filter((a) => a.opportunityId).map((a) => [a.opportunityId as string, a]));

  const opportunities: FoeOpportunityDTO[] = rows.map((o) => {
    const eligibility = classifyEligibility(
      { category: o.category, eligibleYears: o.eligibleYears, eligibilityText: o.eligibilityText },
      profile,
    );
    const application = applicationByOpportunity.get(o.id) ?? null;
    const isWatched = watchedOpportunities.has(o.id) || watchedFirms.has(o.firmId);

    const priority = computePriority(
      {
        state: o.state,
        rolling: o.rolling,
        area: o.area,
        deadline: o.deadline,
        firstVerifiedOpenAt: o.firstVerifiedOpenAt,
        openingDate: o.openingDate,
        eligibility: eligibility.verdict,
        hasApplied: application != null,
        isWatched,
      },
      { now, interests: prefs.interests },
    );

    return {
      id: o.id,
      fingerprint: o.fingerprint,
      firmId: o.firmId,
      firmName: o.firmName,
      programmeId: o.programmeId,
      programmeName: o.programmeName,
      recruitmentYear: o.recruitmentYear,
      category: o.category,
      area: o.area,
      location: o.location,
      region: o.region ?? regionForLocation(o.location),
      description: o.description,
      state: o.state,
      rolling: o.rolling,
      announcedAt: iso(o.announcedAt),
      openingDate: iso(o.openingDate),
      expectedOpeningStart: iso(o.expectedOpeningStart),
      expectedOpeningEnd: iso(o.expectedOpeningEnd),
      expectedOpeningLabel: o.expectedOpeningLabel,
      deadline: iso(o.deadline),
      applicationUrl: o.applicationUrl,
      officialInfoUrl: o.officialInfoUrl,
      applicationVerifiedAt: iso(o.applicationVerifiedAt),
      verificationMethod: o.verificationMethod,
      verificationConfidence: o.verificationConfidence,
      eligibilityText: o.eligibilityText,
      firstDiscoveredAt: o.firstDiscoveredAt.toISOString(),
      firstVerifiedOpenAt: iso(o.firstVerifiedOpenAt),
      lastCheckedAt: iso(o.lastCheckedAt),
      lastChangedAt: iso(o.lastChangedAt),
      isDemo: o.isDemo,
      eligibility,
      priority: { bucket: priority.bucket, reasons: priority.reasons },
      isWatched,
      application: application ? { id: application.id, stage: application.stage, appliedAt: application.appliedAt.toISOString() } : null,
      sources: o.sources.map((s) => ({
        id: s.id,
        kind: s.kind,
        url: s.url,
        title: s.title,
        isOfficial: s.isOfficial,
        confidence: s.confidence,
        discoveredAt: s.discoveredAt.toISOString(),
        lastSeenAt: s.lastSeenAt.toISOString(),
      })),
      officialSourceCount: o.sources.filter((s) => s.isOfficial).length,
    };
  });

  // Default order: the documented priority rules.
  opportunities.sort((a, b) =>
    comparePriority(
      { bucket: a.priority.bucket, reasons: a.priority.reasons, tiebreak: dtoTiebreak(a, now) },
      { bucket: b.priority.bucket, reasons: b.priority.reasons, tiebreak: dtoTiebreak(b, now) },
    ),
  );

  return { opportunities, summary: summarise(opportunities, now) };
}

/** Recomputes the tie-break from the DTO so sorting does not need the row again. */
function dtoTiebreak(o: FoeOpportunityDTO, now: Date): number {
  return tiebreakFor(o.priority.bucket, {
    deadlineDays: o.deadline ? (new Date(o.deadline).getTime() - now.getTime()) / 864e5 : null,
    openedHours: o.firstVerifiedOpenAt ? (now.getTime() - new Date(o.firstVerifiedOpenAt).getTime()) / 36e5 : null,
    hasApplied: o.application != null,
  });
}

function summarise(opportunities: FoeOpportunityDTO[], now: Date): FoeSummaryDTO {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const in7Days = new Date(now.getTime() + 7 * 864e5);

  let open = 0;
  let newToday = 0;
  let openingSoon = 0;
  let urgent = 0;

  for (const o of opportunities) {
    const isOpen = o.state === "OPEN" || o.state === "CLOSING_SOON";
    if (isOpen) open += 1;
    if (o.firstVerifiedOpenAt && new Date(o.firstVerifiedOpenAt) >= startOfToday) newToday += 1;

    if (o.state === "ANNOUNCED" || o.state === "EXPECTED") {
      // Use the END of a predicted window, not its start: a window that opened
      // last week and has not produced an opening yet is the most imminent
      // thing on the list, not something to drop off the count.
      const when = o.openingDate ?? o.expectedOpeningEnd ?? o.expectedOpeningStart;
      if (when && new Date(when) >= startOfToday) openingSoon += 1;
    }

    // Urgent = open, deadline inside a week, and not yet applied. Rolling
    // programmes with no deadline are urgent in a different way and are
    // surfaced by the priority engine instead of inflating this count.
    if (isOpen && !o.application && o.deadline) {
      const d = new Date(o.deadline);
      if (d >= now && d <= in7Days) urgent += 1;
    }
  }

  return { open, newToday, openingSoon, urgent };
}

/**
 * Confirmed and predicted future openings. The two kinds are returned in one
 * list but always carry `kind`, because the UI must never render them alike.
 */
export async function listOpeningSoon(userId: string): Promise<OpeningSoonDTO[]> {
  const now = new Date();
  const [rows, watches] = await Promise.all([
    prisma.foeOpportunity.findMany({
      where: { state: { in: ["ANNOUNCED", "EXPECTED"] }, duplicateOfId: null },
      include: { programme: { include: { history: true } } },
    }),
    prisma.watchlistItem.findMany({ where: { userId }, select: { opportunityId: true, firmId: true } }),
  ]);

  const watchedOpportunities = new Set(watches.map((w) => w.opportunityId).filter(Boolean) as string[]);
  const watchedFirms = new Set(watches.map((w) => w.firmId).filter(Boolean) as string[]);

  return rows
    .sort((a, b) => compareUpcoming(a, b))
    .map((o) => {
      const target = o.openingDate ?? o.expectedOpeningStart;
      // An expected window whose start has passed but whose end has not is
      // "any time now" — not "-17 days". This is also precisely the case the
      // hot watch exists for, so it must not read as stale.
      const windowOpenNow =
        o.state === "EXPECTED" &&
        o.expectedOpeningStart != null &&
        o.expectedOpeningStart <= now &&
        (o.expectedOpeningEnd == null || o.expectedOpeningEnd >= now);
      const rawDays = target ? Math.ceil((target.getTime() - now.getTime()) / 864e5) : null;
      const daysUntil = windowOpenNow ? 0 : rawDays;
      return {
        id: o.id,
        firmId: o.firmId,
        firmName: o.firmName,
        programmeName: o.programmeName,
        area: o.area,
        location: o.location,
        kind: o.state === "ANNOUNCED" ? "CONFIRMED" : "EXPECTED",
        openingDate: iso(o.openingDate),
        expectedOpeningLabel: o.expectedOpeningLabel,
        expectedOpeningStart: iso(o.expectedOpeningStart),
        expectedOpeningEnd: iso(o.expectedOpeningEnd),
        daysUntil,
        isWatched: watchedOpportunities.has(o.id) || watchedFirms.has(o.firmId),
        officialInfoUrl: o.officialInfoUrl,
        windowOpenNow,
        basedOnCycles: o.state === "EXPECTED" ? (o.programme?.history.length ?? 0) : null,
        isDemo: o.isDemo,
      } satisfies OpeningSoonDTO;
    });
}

export async function listWatchlist(userId: string): Promise<WatchlistItemDTO[]> {
  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    include: { firm: true, programme: true, opportunity: true },
    orderBy: { createdAt: "desc" },
  });

  return items.map((w) => {
    let title = "Unknown";
    let subtitle: string | null = null;
    let openingLabel: string | null = null;

    if (w.opportunity) {
      title = `${w.opportunity.firmName} — ${w.opportunity.programmeName}`;
      subtitle = w.opportunity.location;
      openingLabel =
        w.opportunity.state === "ANNOUNCED" && w.opportunity.openingDate
          ? `Opens ${w.opportunity.openingDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
          : w.opportunity.expectedOpeningLabel
            ? `Expected ${w.opportunity.expectedOpeningLabel}`
            : null;
    } else if (w.programme) {
      title = w.programme.name;
      subtitle = w.programme.location;
    } else if (w.firm) {
      title = w.firm.name;
      subtitle = "All programmes at this firm";
    }

    return {
      id: w.id,
      targetType: w.targetType,
      firmId: w.firmId,
      programmeId: w.programmeId,
      opportunityId: w.opportunityId,
      title,
      subtitle,
      state: w.opportunity?.state ?? null,
      openingLabel,
      notifyWhatsApp: w.notifyWhatsApp,
      notifyInApp: w.notifyInApp,
      notifyEmail: w.notifyEmail,
      createdAt: w.createdAt.toISOString(),
    };
  });
}

export async function getPreferences(userId: string): Promise<FoePreferencesDTO> {
  const prefs = await getOrCreatePreferences(userId);
  const stored = await prisma.alertSubscription.findMany({ where: { userId } });

  // Merge stored rows over the defaults so a new account still sees the full
  // matrix of channels and events.
  const byKey = new Map(stored.map((s) => [`${s.channel}:${s.event}`, s.enabled]));
  const subscriptions = DEFAULT_SUBSCRIPTIONS.map((d) => ({
    channel: d.channel,
    event: d.event,
    enabled: byKey.get(`${d.channel}:${d.event}`) ?? d.enabled,
  }));

  return {
    university: prefs.university,
    degree: prefs.degree,
    degreeLengthYears: prefs.degreeLengthYears,
    currentYear: prefs.currentYear,
    graduationYear: prefs.graduationYear,
    nationality: prefs.nationality,
    workEligibility: prefs.workEligibility,
    preferredRegions: prefs.preferredRegions,
    interests: prefs.interests,
    categories: prefs.categories,
    showUnclear: prefs.showUnclear,
    whatsappNumber: prefs.whatsappNumber,
    whatsappOptInAt: iso(prefs.whatsappOptInAt),
    subscriptions,
  };
}

/**
 * Engine health for the small dashboard indicator.
 *
 * The distinction this exists to preserve: "we checked and found nothing" reads
 * very differently from "we could not check". A failing sweep must be visible
 * on the dashboard, not buried in a log.
 */
export async function getEngineHealth(): Promise<EngineHealthDTO> {
  const [lastRun, firmCount, sourceCounts, failures, hotWatchCount, liveCount, demoCount] = await Promise.all([
    prisma.scanRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.firm.count({ where: { active: true } }),
    prisma.firmSource.groupBy({ by: ["health"], _count: true, where: { active: true } }),
    prisma.sourceFailure.findMany({
      where: { resolvedAt: null },
      include: { firm: { select: { name: true } } },
      orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
      take: 20,
    }),
    prisma.firmSource.count({ where: { hotWatchUntil: { gt: new Date() } } }),
    prisma.foeOpportunity.count({ where: { isDemo: false } }),
    prisma.foeOpportunity.count({ where: { isDemo: true } }),
  ]);

  const sourcesTotal = sourceCounts.reduce((sum, s) => sum + s._count, 0);
  const sourcesHealthy = sourceCounts.find((s) => s.health === "HEALTHY")?._count ?? 0;
  const sourcesFailing = sourceCounts
    .filter((s) => s.health === "FAILING" || s.health === "BLOCKED")
    .reduce((sum, s) => sum + s._count, 0);

  const critical = failures.filter((f) => f.severity === "CRITICAL").length;

  let status: EngineHealthDTO["status"];
  if (!lastRun) status = "NEVER_RUN";
  else if (critical > 0 || sourcesFailing > sourcesTotal * 0.2) status = "FAILING";
  else if (failures.length > 0 || sourcesFailing > 0) status = "DEGRADED";
  else status = "HEALTHY";

  const time = lastRun ? lastRun.startedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null;
  const statusLine = !lastRun
    ? "Monitoring not started yet"
    : status === "HEALTHY"
      ? `Last scan ${time} · All critical sources healthy`
      : status === "DEGRADED"
        ? `Last scan ${time} · ${failures.length} source issue${failures.length === 1 ? "" : "s"}`
        : `Last scan ${time} · ${critical} critical failure${critical === 1 ? "" : "s"}`;

  return {
    lastScanAt: iso(lastRun?.startedAt ?? null),
    lastScanKind: lastRun?.kind ?? null,
    nextSweepDueAt: lastRun ? new Date(lastRun.startedAt.getTime() + 60 * 60_000).toISOString() : null,
    firmsInUniverse: firmCount,
    sourcesTotal,
    sourcesHealthy,
    sourcesFailing,
    hotWatchCount,
    openFailures: failures.map((f) => ({
      id: f.id,
      kind: f.kind,
      severity: f.severity,
      message: f.message,
      detectedAt: f.detectedAt.toISOString(),
      firmName: f.firm?.name ?? null,
    })),
    demoDataOnly: liveCount === 0 && demoCount > 0,
    status,
    statusLine,
  };
}
