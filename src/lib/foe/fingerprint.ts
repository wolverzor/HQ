/**
 * Canonical identity and deduplication.
 *
 * The same spring week will be found through the ATS, the careers page, Google,
 * an aggregator, a university page and last year's URL. All six must collapse
 * into ONE canonical opportunity, or the user gets five WhatsApp messages for
 * one programme.
 *
 * Deliberately deterministic string work — no model call belongs anywhere near
 * deduplication.
 */

import type { OpportunityCategory } from "@prisma/client";

/**
 * Stripped from the end of a firm name, longest first so "and co" is removed
 * before the bare "co" inside it.
 */
const LEGAL_SUFFIXES = [
  "incorporated",
  "corporation",
  "international",
  "and company",
  "and partners",
  "partners",
  "holdings",
  "company",
  "limited",
  "and co",
  "group",
  "gmbh",
  "corp",
  "plc",
  "llc",
  "llp",
  "ltd",
  "inc",
  "lp",
  "sa",
  "ag",
  "nv",
  "bv",
  "spa",
  "pty",
  "co",
].sort((a, b) => b.length - a.length);

/**
 * A firm's lookup key: lowercase, accent-stripped, punctuation-free, with
 * common legal suffixes and a leading "the" removed.
 *
 * "Rothschild & Co" / "Rothschild and Co." / "ROTHSCHILD & CO PLC"
 *   -> "rothschild"
 */
export function canonicalFirmName(name: string): string {
  let s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Decode the handful of entities that reach us from scraped HTML, before
    // "&" becomes a word.
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    // Drop full stops first so "J.P." collapses to "jp" and "L.P." to "lp",
    // rather than splitting into single letters.
    .replace(/\./g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (s.startsWith("the ")) s = s.slice(4);

  // Strip trailing legal suffixes repeatedly: "rothschild and co plc" needs
  // several passes, and a dangling "and" can be left behind by "x and co".
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (s.endsWith(` ${suffix}`)) {
        s = s.slice(0, -(suffix.length + 1)).trim();
        changed = true;
        break;
      }
    }
    if (s.endsWith(" and")) {
      s = s.slice(0, -4).trim();
      changed = true;
    }
  }

  return s || name.toLowerCase().trim();
}

/** Normalises a location for fingerprinting. Empty locations collapse together. */
function canonicalLocation(location: string | null | undefined): string {
  if (!location) return "";
  return location
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Strips year numbers and marketing noise from a programme name so that
 * "Spring Insight Programme 2027" and "Spring Insight Programme (2027 intake)"
 * produce the same key.
 */
export function canonicalProgrammeName(programme: string): string {
  return programme
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/\b(intake|cohort|cycle|applications?|apply now|programme|program)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable per-firm key for a recurring programme identity. */
export function programmeKey(input: {
  programmeName: string;
  category: OpportunityCategory;
  location?: string | null;
}): string {
  const parts = [canonicalProgrammeName(input.programmeName), input.category.toLowerCase(), canonicalLocation(input.location)];
  return parts
    .filter(Boolean)
    .join("-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * The canonical fingerprint for one real-world opportunity.
 *
 * firm + programme + recruitment year + category + location. Two rows with the
 * same fingerprint are the same programme and must be merged, whatever route
 * they were discovered through.
 */
export function opportunityFingerprint(input: {
  firmName: string;
  programmeName: string;
  recruitmentYear: number;
  category: OpportunityCategory;
  location?: string | null;
}): string {
  return [
    canonicalFirmName(input.firmName),
    canonicalProgrammeName(input.programmeName),
    String(input.recruitmentYear),
    input.category.toLowerCase(),
    canonicalLocation(input.location),
  ]
    .join("|")
    .replace(/\s+/g, "-");
}

/**
 * Whether two candidates describe the same opportunity. Used before writing, so
 * a near-miss (same firm, same programme, same year, one missing a location)
 * merges instead of creating a second row.
 */
export function isSameOpportunity(
  a: { firmName: string; programmeName: string; recruitmentYear: number; category: OpportunityCategory; location?: string | null },
  b: { firmName: string; programmeName: string; recruitmentYear: number; category: OpportunityCategory; location?: string | null },
): boolean {
  if (opportunityFingerprint(a) === opportunityFingerprint(b)) return true;

  // Same firm, programme, year and category, but one side has no location yet.
  const sameCore =
    canonicalFirmName(a.firmName) === canonicalFirmName(b.firmName) &&
    canonicalProgrammeName(a.programmeName) === canonicalProgrammeName(b.programmeName) &&
    a.recruitmentYear === b.recruitmentYear &&
    a.category === b.category;

  if (!sameCore) return false;

  const la = canonicalLocation(a.location);
  const lb = canonicalLocation(b.location);
  return la === "" || lb === "";
}

/**
 * Normalises a URL for source-level dedupe: drops the fragment, tracking
 * parameters and a trailing slash, so the same posting linked three ways is one
 * source row.
 */
const TRACKING_PARAMS = /^(utm_|gclid|fbclid|mc_cid|mc_eid|ref|source)/i;

export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    const keep = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      if (!TRACKING_PARAMS.test(k)) keep.append(k, v);
    }
    u.search = keep.toString();
    let out = u.toString();
    if (out.endsWith("/")) out = out.slice(0, -1);
    return out;
  } catch {
    return raw.trim();
  }
}
