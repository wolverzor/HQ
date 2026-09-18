/**
 * Content extraction, hashing and change detection.
 *
 * The economics of the sweep depend on this module. Hundreds of firms times
 * several sources times 24 sweeps a day is a lot of pages, and almost none of
 * them change in any given hour. So: fetch, clean, hash, compare — and stop
 * there when the hash matches. Only a changed page is worth analysing, and only
 * an *interestingly* changed page is worth an expensive model call.
 *
 * Everything here is deterministic and pure, which is the point: hashing,
 * diffing and deciding "did the apply button appear" are not jobs for an LLM.
 */

import { createHash } from "node:crypto";

/** Strips markup, scripts, styles and boilerplate down to comparable text. */
export function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalises away the parts of a page that change on every request but mean
 * nothing: timestamps, CSRF tokens, cache-busting query strings, view counters,
 * session ids. Without this, every page looks "changed" every hour and the
 * whole hash optimisation — and the change-detection signal — is worthless.
 */
export function normaliseForHash(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}t[\d:.]+z?\b/g, " ")
    .replace(/\b[0-9a-f]{16,}\b/g, " ")
    .replace(/[?&](_|v|t|ts|cb|cache|nonce|token|sid|session)=[^\s&"']+/g, " ")
    .replace(/\b\d+\s+(views?|applicants?|people)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function contentHash(text: string): string {
  return createHash("sha256").update(normaliseForHash(text)).digest("hex").slice(0, 32);
}

// ---------------------------------------------------------------------------
// Change classification
// ---------------------------------------------------------------------------

/** The kinds of change worth acting on. Anything else is noise. */
export type ChangeSignal =
  | "APPLICATION_OPENED"
  | "APPLICATION_CLOSED"
  | "DEADLINE_CHANGED"
  | "NEW_PROGRAMME_MENTION"
  | "ELIGIBILITY_CHANGED"
  | "LOCATION_CHANGED"
  | "COSMETIC";

const OPEN_MARKERS = [
  "apply now",
  "apply here",
  "start your application",
  "begin your application",
  "applications are open",
  "applications open now",
  "now accepting applications",
  "submit your application",
  "apply online",
];

const CLOSED_MARKERS = [
  "applications are closed",
  "applications have closed",
  "no longer accepting",
  "this role is closed",
  "closed for applications",
  "this posting has expired",
  "position filled",
  "applications will open",
  "check back",
];

const DEADLINE_MARKERS = ["deadline", "closing date", "closes on", "apply by", "applications close"];
const ELIGIBILITY_MARKERS = ["eligibility", "graduation year", "year of study", "penultimate", "first year", "first-year"];
const LOCATION_MARKERS = ["london", "new york", "frankfurt", "paris", "hong kong", "singapore", "dublin", "zurich"];

function present(text: string, markers: string[]): Set<string> {
  const lower = text.toLowerCase();
  return new Set(markers.filter((m) => lower.includes(m)));
}

function added(before: Set<string>, after: Set<string>): string[] {
  return [...after].filter((m) => !before.has(m));
}

export interface ChangeAnalysis {
  changed: boolean;
  signals: ChangeSignal[];
  /** Short human summary stored on the snapshot. */
  summary: string;
  /**
   * Whether this change is worth escalating to verification (and, for genuinely
   * ambiguous wording, an AI classification). Cosmetic churn is not.
   */
  actionable: boolean;
}

/**
 * Compares two versions of a page's text.
 *
 * `previousText` is null the first time a source is seen, which counts as a
 * change but not as an opening — a page FOE has never read before proves
 * nothing about what changed on it.
 */
export function analyseChange(previousText: string | null, currentText: string): ChangeAnalysis {
  if (previousText === null) {
    const hasProgramme = present(currentText, OPEN_MARKERS).size > 0;
    return {
      changed: true,
      signals: ["NEW_PROGRAMME_MENTION"],
      summary: "First time this source has been read.",
      actionable: hasProgramme,
    };
  }

  if (contentHash(previousText) === contentHash(currentText)) {
    return { changed: false, signals: [], summary: "No change.", actionable: false };
  }

  const signals: ChangeSignal[] = [];
  const parts: string[] = [];

  const openBefore = present(previousText, OPEN_MARKERS);
  const openAfter = present(currentText, OPEN_MARKERS);
  const newOpen = added(openBefore, openAfter);
  if (newOpen.length > 0) {
    signals.push("APPLICATION_OPENED");
    parts.push(`application action appeared ("${newOpen[0]}")`);
  }

  const closedBefore = present(previousText, CLOSED_MARKERS);
  const closedAfter = present(currentText, CLOSED_MARKERS);
  const newClosed = added(closedBefore, closedAfter);
  if (newClosed.length > 0) {
    signals.push("APPLICATION_CLOSED");
    parts.push(`closure wording appeared ("${newClosed[0]}")`);
  }

  // An apply action disappearing is also a closure signal.
  if (openBefore.size > 0 && openAfter.size === 0) {
    signals.push("APPLICATION_CLOSED");
    parts.push("application action disappeared");
  }

  if (added(present(previousText, DEADLINE_MARKERS), present(currentText, DEADLINE_MARKERS)).length > 0) {
    signals.push("DEADLINE_CHANGED");
    parts.push("deadline wording changed");
  }
  if (added(present(previousText, ELIGIBILITY_MARKERS), present(currentText, ELIGIBILITY_MARKERS)).length > 0) {
    signals.push("ELIGIBILITY_CHANGED");
    parts.push("eligibility wording changed");
  }
  if (added(present(previousText, LOCATION_MARKERS), present(currentText, LOCATION_MARKERS)).length > 0) {
    signals.push("LOCATION_CHANGED");
    parts.push("locations changed");
  }

  if (signals.length === 0) {
    return {
      changed: true,
      signals: ["COSMETIC"],
      summary: "Page changed, but no application, deadline or eligibility wording moved.",
      actionable: false,
    };
  }

  return {
    changed: true,
    signals,
    summary: parts.join("; "),
    actionable: true,
  };
}

/** Whether the page currently looks like it has a live application action. */
export function hasLiveApplicationAction(text: string): boolean {
  return present(text, OPEN_MARKERS).size > 0;
}

/** Whether the page says, in so many words, that applications are shut. */
export function hasClosedSignal(text: string): boolean {
  return present(text, CLOSED_MARKERS).size > 0;
}
