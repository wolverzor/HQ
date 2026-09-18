/**
 * Source hierarchy.
 *
 * The rule the whole engine hangs on: a third-party source (Google, an
 * aggregator, a university page, a Discord post) may CREATE a candidate, but it
 * can never on its own make an opportunity OPEN. Only the employer's own domain
 * or its ATS can do that. Everything else is discovery.
 */

import type { SourceKind, VerificationMethod } from "@prisma/client";

/** Lower rank = higher confidence. Mirrors the documented source hierarchy. */
export const SOURCE_RANK: Record<SourceKind, number> = {
  // Official — may verify an opening
  ATS: 1,
  OFFICIAL_CAREERS_PAGE: 2,
  OFFICIAL_EARLY_CAREERS_PAGE: 3,
  OFFICIAL_PROGRAMME_PAGE: 3,
  OFFICIAL_ANNOUNCEMENT: 4,
  // Discovery / supporting only
  SITEMAP: 5,
  HISTORICAL_URL: 6,
  SEARCH_ENGINE: 7,
  AGGREGATOR: 8,
  UNIVERSITY_PAGE: 9,
  COMMUNITY: 10,
  MANUAL: 4,
};

const OFFICIAL_KINDS: ReadonlySet<SourceKind> = new Set<SourceKind>([
  "ATS",
  "OFFICIAL_CAREERS_PAGE",
  "OFFICIAL_EARLY_CAREERS_PAGE",
  "OFFICIAL_PROGRAMME_PAGE",
  "OFFICIAL_ANNOUNCEMENT",
]);

/**
 * Whether evidence of this kind counts as coming from the employer.
 *
 * MANUAL is intentionally NOT official: a human pasting a link is trusted for
 * discovery, but the verification worker still has to confirm it against the
 * employer's own site before the opportunity shows as OPEN.
 */
export function isOfficialSource(kind: SourceKind): boolean {
  return OFFICIAL_KINDS.has(kind);
}

/** Baseline confidence (0-100) contributed by a single piece of evidence. */
export function confidenceForKind(kind: SourceKind): number {
  switch (kind) {
    case "ATS":
      return 95;
    case "OFFICIAL_CAREERS_PAGE":
      return 90;
    case "OFFICIAL_EARLY_CAREERS_PAGE":
    case "OFFICIAL_PROGRAMME_PAGE":
      return 85;
    case "OFFICIAL_ANNOUNCEMENT":
      return 70;
    case "SITEMAP":
      return 40;
    case "HISTORICAL_URL":
      return 35;
    case "MANUAL":
      return 30;
    case "SEARCH_ENGINE":
      return 25;
    case "AGGREGATOR":
      return 20;
    case "UNIVERSITY_PAGE":
      return 20;
    case "COMMUNITY":
      return 10;
  }
}

export function verificationMethodForKind(kind: SourceKind): VerificationMethod {
  switch (kind) {
    case "ATS":
      return "ATS_PAGE";
    case "OFFICIAL_CAREERS_PAGE":
      return "OFFICIAL_CAREERS_PAGE";
    case "OFFICIAL_EARLY_CAREERS_PAGE":
    case "OFFICIAL_PROGRAMME_PAGE":
      return "OFFICIAL_PROGRAMME_PAGE";
    case "OFFICIAL_ANNOUNCEMENT":
      return "OFFICIAL_ANNOUNCEMENT";
    case "MANUAL":
      return "MANUAL";
    default:
      return "NONE";
  }
}

/** Sorts evidence best-first for display and for picking a verifying source. */
export function bySourceRank<T extends { kind: SourceKind }>(a: T, b: T): number {
  return SOURCE_RANK[a.kind] - SOURCE_RANK[b.kind];
}

/**
 * Whether a URL belongs to the employer (or its ATS) rather than a third party.
 * Used by the verification worker to catch an aggregator link mislabelled as
 * official.
 */
const ATS_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "myworkdaysite.com",
  "smartrecruiters.com",
  "icims.com",
  "taleo.net",
  "avature.net",
  "successfactors.com",
  "workday.com",
];

export function isEmployerControlledUrl(url: string, firmDomain: string | null | undefined): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }
  if (ATS_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  if (!firmDomain) return false;
  const domain = firmDomain.toLowerCase().replace(/^www\./, "");
  return host === domain || host.endsWith(`.${domain}`);
}
