/**
 * Source adapters.
 *
 * Every source — an ATS API, a careers search endpoint, a plain HTML programme
 * page — is reduced to the same thing: a list of `Candidate`s. That single
 * normalisation is what lets Greenhouse, Workday and a hand-rolled careers site
 * feed one pipeline.
 *
 * Phase 3 ships the seam plus the generic text adapter that works everywhere
 * without credentials. Phase 4 adds the structured ATS adapters, which are
 * strictly better where they apply — a Greenhouse board gives titles, locations
 * and deadlines as data instead of guesses from prose — and which register here
 * without any other part of the engine changing.
 *
 * A candidate is a *lead*, never a verified opening. Nothing here can set
 * `OPEN`; that decision belongs to `canMarkOpen` in src/lib/foe/status.ts.
 */

import type { AtsProvider, FinanceArea, OpportunityCategory, SourceKind } from "@prisma/client";
import { matchArea, matchProgrammeTerms, regionForLocation } from "../taxonomy";
import { hasClosedSignal, hasLiveApplicationAction } from "./content";

export interface AdapterSource {
  id: string;
  kind: SourceKind;
  url: string;
  atsProvider: AtsProvider | null;
}

export interface AdapterFirm {
  id: string;
  name: string;
  websiteDomain: string | null;
  atsProvider: AtsProvider;
}

export interface AdapterContext {
  firm: AdapterFirm;
  source: AdapterSource;
  /** Cleaned page text (or raw body, for adapters that parse structure). */
  text: string;
  /** The URL actually fetched, after redirects. */
  url: string;
  now: Date;
}

export interface Candidate {
  programmeName: string;
  category: OpportunityCategory;
  area: FinanceArea;
  location: string | null;
  region: string | null;
  recruitmentYear: number;
  /** Where the candidate was found. Not automatically an application link. */
  sourceUrl: string;
  applicationUrl: string | null;
  officialInfoUrl: string | null;
  rolling: boolean;
  deadline: Date | null;
  eligibleYears: number[];
  /** Did this source show a live application action? Input to verification. */
  applicationLive: boolean;
  /** Did it say applications are shut? */
  closedSignal: boolean;
  excerpt: string | null;
}

export interface SourceAdapter {
  id: string;
  /** Whether this adapter can handle the source. First match wins. */
  supports: (source: AdapterSource, firm: AdapterFirm) => boolean;
  parse: (context: AdapterContext) => Candidate[];
}

// ---------------------------------------------------------------------------
// Shared inference helpers
// ---------------------------------------------------------------------------

/**
 * The recruitment year a programme found today belongs to.
 *
 * Finance recruiting runs a year ahead: a spring week advertised in September
 * 2026 is the 2027 cycle. Getting this wrong does not just mislabel a row — it
 * breaks deduplication, because the year is part of the fingerprint, and the
 * same programme would split into two entries across the new year.
 */
export function inferRecruitmentYear(text: string, now: Date): number {
  const cycleYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();

  // An explicit year on the page wins, when it is plausible.
  const years = [...text.matchAll(/\b(20\d{2})\b/g)]
    .map((m) => Number(m[1]))
    .filter((y) => y >= now.getFullYear() && y <= now.getFullYear() + 2);

  if (years.length > 0) {
    // The most frequently mentioned plausible year.
    const counts = new Map<number, number>();
    for (const y of years) counts.set(y, (counts.get(y) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  return cycleYear;
}

const LOCATION_CANDIDATES = [
  "London",
  "Birmingham",
  "Manchester",
  "Edinburgh",
  "Glasgow",
  "Dublin",
  "Paris",
  "Frankfurt",
  "Milan",
  "Madrid",
  "Amsterdam",
  "Zurich",
  "Geneva",
  "Munich",
  "Stockholm",
  "New York",
  "Hong Kong",
  "Singapore",
  "Dubai",
];

export function inferLocation(text: string): string | null {
  const lower = text.toLowerCase();
  for (const city of LOCATION_CANDIDATES) {
    if (lower.includes(city.toLowerCase())) return city;
  }
  return null;
}

const ROLLING_MARKERS = [
  "rolling basis",
  "on a rolling",
  "reviewed as they are received",
  "assessed on a rolling",
  "apply early",
  "applications are reviewed as",
];

export function inferRolling(text: string): boolean {
  const lower = text.toLowerCase();
  return ROLLING_MARKERS.some((m) => lower.includes(m));
}

/**
 * Years of study, only when the page states them in a form worth trusting.
 * Returning nothing is correct far more often than guessing: an unstated
 * criterion must reach the user as UNCLEAR, not as a fabricated restriction.
 */
export function inferEligibleYears(text: string): number[] {
  const lower = text.toLowerCase();
  const years = new Set<number>();

  if (/\bfirst[-\s]year\b|\byear 1\b|\b1st year\b|\bfreshman\b/.test(lower)) years.add(1);
  if (/\bsecond[-\s]year\b|\byear 2\b|\b2nd year\b|\bsophomore\b/.test(lower)) years.add(2);
  if (/\bthird[-\s]year\b|\byear 3\b|\b3rd year\b/.test(lower)) years.add(3);

  // "penultimate year" is relative to a degree length we do not know here, so
  // it is deliberately not turned into a number.
  return [...years].sort();
}

function excerptAround(text: string, phrase: string, radius = 160): string | null {
  const index = text.toLowerCase().indexOf(phrase);
  if (index < 0) return null;
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + phrase.length + radius);
  return `${start > 0 ? "..." : ""}${text.slice(start, end).trim()}${end < text.length ? "..." : ""}`;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Generic page adapter
// ---------------------------------------------------------------------------

/**
 * Reads any HTML page as text and looks for the configured programme
 * vocabulary. Low precision by design: it exists to make sure nothing is missed
 * on a site no structured adapter covers, and every candidate it raises still
 * has to survive verification before the user is told anything is open.
 */
export const genericPageAdapter: SourceAdapter = {
  id: "generic-page",
  supports: () => true,
  parse({ text, url, firm, source, now }) {
    const terms = matchProgrammeTerms(text);
    if (terms.length === 0) return [];

    const recruitmentYear = inferRecruitmentYear(text, now);
    const location = inferLocation(text);
    const rolling = inferRolling(text);
    const eligibleYears = inferEligibleYears(text);
    const applicationLive = hasLiveApplicationAction(text);
    const closedSignal = hasClosedSignal(text);

    // One candidate per distinct programme family. Two problems to avoid:
    // matching every phrase would give twelve candidates for one page, and
    // overlapping vocabulary would double-count a single programme —
    // "Spring Insight Programme" contains both "spring insight" and "insight
    // programme", which are different categories but the same programme.
    //
    // `terms` arrives longest-first, so claiming the text each match occupies
    // lets the most specific phrase win the span and shorter phrases inside it
    // are skipped.
    const lower = text.toLowerCase();
    const claimed: [number, number][] = [];
    const byCategory = new Map<OpportunityCategory, { phrase: string }>();

    for (const term of terms) {
      const at = lower.indexOf(term.phrase);
      if (at < 0) continue;
      const span: [number, number] = [at, at + term.phrase.length];

      const overlapsClaimed = claimed.some(([start, end]) => span[0] < end && span[1] > start);
      if (overlapsClaimed) continue;

      claimed.push(span);
      if (!byCategory.has(term.category)) byCategory.set(term.category, { phrase: term.phrase });
    }

    const candidates: Candidate[] = [];
    for (const [category, { phrase }] of byCategory) {
      const excerpt = excerptAround(text, phrase);
      const area = (excerpt ? matchArea(excerpt) : null) ?? matchArea(text) ?? inferAreaFromFirm(firm);

      candidates.push({
        programmeName: titleCase(phrase),
        category,
        area,
        location,
        region: regionForLocation(location),
        recruitmentYear,
        sourceUrl: url,
        // The generic adapter never claims to have found the application link
        // itself: it only saw the words on a page. Verification resolves the
        // real one.
        applicationUrl: null,
        officialInfoUrl: source.kind.startsWith("OFFICIAL") || source.kind === "ATS" ? url : null,
        rolling,
        deadline: null,
        eligibleYears,
        applicationLive,
        closedSignal,
        excerpt,
      });
    }

    return candidates;
  },
};

function inferAreaFromFirm(firm: AdapterFirm): FinanceArea {
  void firm;
  return "OTHER";
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Adapters in priority order. Structured adapters (Phase 4) go in front of the
 * generic one, which stays last as the catch-all.
 */
const REGISTRY: SourceAdapter[] = [genericPageAdapter];

export function registerAdapter(adapter: SourceAdapter) {
  REGISTRY.unshift(adapter);
}

export function adapterFor(source: AdapterSource, firm: AdapterFirm): SourceAdapter {
  return REGISTRY.find((a) => a.supports(source, firm)) ?? genericPageAdapter;
}

export function registeredAdapterIds(): string[] {
  return REGISTRY.map((a) => a.id);
}
