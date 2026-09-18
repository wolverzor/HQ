/**
 * Turning candidates into canonical opportunities.
 *
 * This is where the "one programme, however many sources" rule is actually
 * enforced. A candidate arrives from the ATS, another from the careers page,
 * another from a search result; all three must land on one `FoeOpportunity`
 * row with three `OpportunitySource` rows hanging off it.
 *
 * It is also where the verification gate lives on the write path: this module
 * can create and enrich a candidate, and it can move a row to OPEN *only* by
 * asking `canMarkOpen`. There is no other route into that state.
 */

import type { OpportunityState, PrismaClient, SourceKind } from "@prisma/client";
import { isSameOpportunity, opportunityFingerprint, programmeKey, canonicalUrl } from "../fingerprint";
import { canMarkOpen, canTransition, shouldBeClosingSoon, type Evidence } from "../status";
import { confidenceForKind, isOfficialSource } from "../sources";
import type { Candidate } from "./adapters";

export interface IngestContext {
  prisma: PrismaClient;
  firmId: string;
  firmName: string;
  firmDomain: string | null;
  sourceKind: SourceKind;
  firmSourceId: string | null;
  now: Date;
}

export interface IngestResult {
  opportunityId: string;
  created: boolean;
  /** State before this ingest, so the caller can raise the right alert. */
  previousState: OpportunityState | null;
  state: OpportunityState;
  /** True when this ingest is what verified the opening. */
  newlyOpened: boolean;
  reason: string;
}

/**
 * Finds the canonical row for a candidate, creating it if this is genuinely
 * new.
 *
 * The fingerprint index does most of the work. The extra `isSameOpportunity`
 * pass catches the near-miss the fingerprint cannot: the same programme found
 * once with a location and once without, which would otherwise become two rows
 * and, later, two alerts.
 */
async function findCanonical(ctx: IngestContext, candidate: Candidate) {
  const fingerprint = opportunityFingerprint({
    firmName: ctx.firmName,
    programmeName: candidate.programmeName,
    recruitmentYear: candidate.recruitmentYear,
    category: candidate.category,
    location: candidate.location,
  });

  const exact = await ctx.prisma.foeOpportunity.findUnique({ where: { fingerprint } });
  if (exact) return { row: exact, fingerprint };

  // Same firm, same cycle, same family — check for a location-blind match.
  const siblings = await ctx.prisma.foeOpportunity.findMany({
    where: {
      firmId: ctx.firmId,
      recruitmentYear: candidate.recruitmentYear,
      category: candidate.category,
      duplicateOfId: null,
    },
  });

  const match = siblings.find((s) =>
    isSameOpportunity(
      {
        firmName: s.firmName,
        programmeName: s.programmeName,
        recruitmentYear: s.recruitmentYear,
        category: s.category,
        location: s.location,
      },
      {
        firmName: ctx.firmName,
        programmeName: candidate.programmeName,
        recruitmentYear: candidate.recruitmentYear,
        category: candidate.category,
        location: candidate.location,
      },
    ),
  );

  return { row: match ?? null, fingerprint };
}

/** Attaches (or refreshes) the evidence row for this sighting. */
async function recordSource(ctx: IngestContext, opportunityId: string, candidate: Candidate) {
  const url = canonicalUrl(candidate.sourceUrl);
  const official = isOfficialSource(ctx.sourceKind);

  await ctx.prisma.opportunitySource.upsert({
    where: { opportunityId_url: { opportunityId, url } },
    create: {
      opportunityId,
      firmSourceId: ctx.firmSourceId,
      kind: ctx.sourceKind,
      url,
      title: candidate.programmeName,
      excerpt: candidate.excerpt,
      isOfficial: official,
      confidence: confidenceForKind(ctx.sourceKind),
      discoveredAt: ctx.now,
      lastSeenAt: ctx.now,
    },
    update: { lastSeenAt: ctx.now, excerpt: candidate.excerpt },
  });
}

/**
 * Ingests one candidate.
 *
 * Deliberately conservative about state: a new candidate starts at DISCOVERED,
 * and only the evidence-weighing in `canMarkOpen` can take it further. A
 * candidate from an aggregator with a giant "APPLY NOW" button still lands at
 * DISCOVERED, which is the entire point.
 */
export async function ingestCandidate(ctx: IngestContext, candidate: Candidate): Promise<IngestResult> {
  const { prisma, now } = ctx;
  const { row, fingerprint } = await findCanonical(ctx, candidate);

  let opportunityId: string;
  let previousState: OpportunityState | null = null;
  let created = false;

  if (!row) {
    // Attach to a recurring programme identity so history accumulates.
    const key = programmeKey({
      programmeName: candidate.programmeName,
      category: candidate.category,
      location: candidate.location,
    });
    const programme = await prisma.programme.upsert({
      where: { firmId_canonicalKey: { firmId: ctx.firmId, canonicalKey: key } },
      create: {
        firmId: ctx.firmId,
        name: candidate.programmeName,
        canonicalKey: key,
        category: candidate.category,
        area: candidate.area,
        location: candidate.location,
      },
      update: {},
    });

    const createdRow = await prisma.foeOpportunity.create({
      data: {
        fingerprint,
        firmId: ctx.firmId,
        programmeId: programme.id,
        firmName: ctx.firmName,
        programmeName: candidate.programmeName,
        recruitmentYear: candidate.recruitmentYear,
        category: candidate.category,
        area: candidate.area,
        location: candidate.location,
        region: candidate.region,
        state: "DISCOVERED",
        rolling: candidate.rolling,
        deadline: candidate.deadline,
        officialInfoUrl: candidate.officialInfoUrl,
        eligibleYears: candidate.eligibleYears,
        firstDiscoveredAt: now,
        lastCheckedAt: now,
        lastChangedAt: now,
      },
    });
    opportunityId = createdRow.id;
    created = true;
  } else {
    opportunityId = row.id;
    previousState = row.state;

    // Enrich without overwriting anything better that is already known.
    await prisma.foeOpportunity.update({
      where: { id: row.id },
      data: {
        lastCheckedAt: now,
        location: row.location ?? candidate.location,
        region: row.region ?? candidate.region,
        rolling: row.rolling || candidate.rolling,
        deadline: row.deadline ?? candidate.deadline,
        officialInfoUrl: row.officialInfoUrl ?? candidate.officialInfoUrl,
        eligibleYears: row.eligibleYears.length > 0 ? row.eligibleYears : candidate.eligibleYears,
      },
    });
  }

  await recordSource(ctx, opportunityId, candidate);

  // --- Verification ------------------------------------------------------
  // Weigh ALL evidence on the row, not just this sighting: an opening is
  // verified by the best source that has ever seen it, within this cycle.
  const sources = await prisma.opportunitySource.findMany({ where: { opportunityId } });
  const evidence: Evidence[] = sources.map((s) => ({
    kind: s.kind,
    url: s.url,
    reachable: true,
    // Only the sighting currently being processed carries live-application and
    // closure observations; stored rows record where, not what the page said
    // at some earlier point.
    applicationLive: s.url === canonicalUrl(candidate.sourceUrl) ? candidate.applicationLive : false,
    closedSignal: s.url === canonicalUrl(candidate.sourceUrl) ? candidate.closedSignal : false,
  }));

  const decision = canMarkOpen(evidence, ctx.firmDomain);
  const current = await prisma.foeOpportunity.findUniqueOrThrow({ where: { id: opportunityId } });

  let nextState: OpportunityState = current.state;
  let newlyOpened = false;

  if (decision.allowed) {
    const target: OpportunityState = shouldBeClosingSoon(current.deadline, now) ? "CLOSING_SOON" : "OPEN";
    // EXPECTED must pass through VERIFYING rather than jumping to OPEN, so the
    // distinction between a prediction and a verified opening survives.
    if (current.state === "EXPECTED") {
      nextState = "VERIFYING";
    } else if (canTransition(current.state, target)) {
      nextState = target;
      newlyOpened = current.state !== "OPEN" && current.state !== "CLOSING_SOON";
    }
  } else if (candidate.closedSignal && isOfficialSource(ctx.sourceKind)) {
    if (canTransition(current.state, "CLOSED")) nextState = "CLOSED";
  }

  if (nextState !== current.state || decision.allowed) {
    await prisma.foeOpportunity.update({
      where: { id: opportunityId },
      data: {
        state: nextState,
        lastChangedAt: nextState !== current.state ? now : current.lastChangedAt,
        applicationUrl: decision.allowed ? (decision.verifiedByUrl ?? current.applicationUrl) : current.applicationUrl,
        applicationVerifiedAt: decision.allowed ? now : current.applicationVerifiedAt,
        verificationMethod: decision.allowed ? decision.method : current.verificationMethod,
        verificationConfidence: decision.allowed ? decision.confidence : current.verificationConfidence,
        firstVerifiedOpenAt: newlyOpened ? now : current.firstVerifiedOpenAt,
        closedAt: nextState === "CLOSED" ? now : current.closedAt,
      },
    });

    if (nextState !== current.state) {
      await prisma.opportunitySnapshot.create({
        data: {
          opportunityId,
          state: nextState,
          changeKind: newlyOpened ? "APPLICATION_OPENED" : nextState,
          summary: decision.reason,
        },
      });
    }
  }

  return {
    opportunityId,
    created,
    previousState,
    state: nextState,
    newlyOpened,
    reason: decision.reason,
  };
}

/**
 * Merges a duplicate into a canonical row, moving its evidence across.
 *
 * Used when two rows are found to describe the same programme after the fact —
 * for instance once a location finally appears on one of them.
 */
export async function mergeDuplicate(prisma: PrismaClient, duplicateId: string, canonicalId: string) {
  if (duplicateId === canonicalId) return;

  const sources = await prisma.opportunitySource.findMany({ where: { opportunityId: duplicateId } });
  for (const s of sources) {
    await prisma.opportunitySource.upsert({
      where: { opportunityId_url: { opportunityId: canonicalId, url: s.url } },
      create: {
        opportunityId: canonicalId,
        firmSourceId: s.firmSourceId,
        kind: s.kind,
        url: s.url,
        title: s.title,
        excerpt: s.excerpt,
        isOfficial: s.isOfficial,
        confidence: s.confidence,
        discoveredAt: s.discoveredAt,
        lastSeenAt: s.lastSeenAt,
      },
      update: { lastSeenAt: s.lastSeenAt },
    });
  }

  await prisma.foeOpportunity.update({
    where: { id: duplicateId },
    data: { state: "DUPLICATE", duplicateOfId: canonicalId },
  });
}
