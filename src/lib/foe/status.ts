/**
 * Opportunity state rules.
 *
 * Three invariants this module exists to enforce:
 *
 *  1. Only official evidence can produce OPEN. A tracker, a search result or a
 *     community post is discovery, never verification.
 *  2. EXPECTED (predicted from history), ANNOUNCED (employer said so) and OPEN
 *     (verified live application) are distinct and never collapse into each
 *     other.
 *  3. A source we failed to check is UNREACHABLE, not CLOSED. Silence is not
 *     evidence of absence.
 */

import type { OpportunityState, SourceKind, VerificationMethod } from "@prisma/client";
import { confidenceForKind, isEmployerControlledUrl, isOfficialSource, verificationMethodForKind } from "./sources";

/** Confidence an opportunity must reach before it may be shown as OPEN. */
export const OPEN_CONFIDENCE_THRESHOLD = 70;

export interface Evidence {
  kind: SourceKind;
  url: string;
  /** Did the fetch that produced this evidence actually succeed? */
  reachable?: boolean;
  /** Did the page show a live application action (an Apply button/live form)? */
  applicationLive?: boolean;
  /** Did the page say applications are closed or the posting has expired? */
  closedSignal?: boolean;
}

export interface OpenDecision {
  allowed: boolean;
  /** Plain-English reason, surfaced in the detail drawer and the admin view. */
  reason: string;
  confidence: number;
  method: VerificationMethod;
  /** URL of the evidence that justified the decision, when there is one. */
  verifiedByUrl: string | null;
}

/**
 * Decides whether a set of evidence is enough to mark an opportunity OPEN.
 *
 * `firmDomain` is checked so a link merely *labelled* official still has to
 * live on the employer's domain or a known ATS.
 */
export function canMarkOpen(evidence: Evidence[], firmDomain?: string | null): OpenDecision {
  const deny = (reason: string): OpenDecision => ({
    allowed: false,
    reason,
    confidence: 0,
    method: "NONE",
    verifiedByUrl: null,
  });

  if (evidence.length === 0) return deny("No evidence at all.");

  const closed = evidence.find((e) => e.closedSignal);
  if (closed) {
    return deny("An official source says applications are closed or the posting has expired.");
  }

  const official = evidence.filter(
    (e) => isOfficialSource(e.kind) && e.reachable !== false && isEmployerControlledUrl(e.url, firmDomain),
  );

  if (official.length === 0) {
    const thirdParty = evidence.filter((e) => !isOfficialSource(e.kind));
    if (thirdParty.length > 0) {
      return deny(
        "Only third-party sources so far. A tracker or search result can raise a candidate but never verify an opening.",
      );
    }
    return deny("No reachable official source on the employer's own domain or ATS.");
  }

  const live = official.filter((e) => e.applicationLive);
  if (live.length === 0) {
    return deny("Official source reached, but no live application action was found on it.");
  }

  const best = live.reduce((a, b) => (confidenceForKind(a.kind) >= confidenceForKind(b.kind) ? a : b));
  const confidence = confidenceForKind(best.kind);

  if (confidence < OPEN_CONFIDENCE_THRESHOLD) {
    return deny(`Official source confidence ${confidence} is below the ${OPEN_CONFIDENCE_THRESHOLD} threshold.`);
  }

  return {
    allowed: true,
    reason: "Live application verified on an official employer source.",
    confidence,
    method: verificationMethodForKind(best.kind),
    verifiedByUrl: best.url,
  };
}

/** States that still want the user's attention. */
const ACTIVE_STATES: ReadonlySet<OpportunityState> = new Set<OpportunityState>([
  "DISCOVERED",
  "VERIFYING",
  "EXPECTED",
  "ANNOUNCED",
  "OPEN",
  "CLOSING_SOON",
  "UNREACHABLE",
  "MANUAL_REVIEW",
]);

export function isActiveState(state: OpportunityState): boolean {
  return ACTIVE_STATES.has(state);
}

/** States that mean "you can apply right now". */
export function isApplyable(state: OpportunityState): boolean {
  return state === "OPEN" || state === "CLOSING_SOON";
}

/** States with a future date attached rather than a live application. */
export function isUpcoming(state: OpportunityState): boolean {
  return state === "ANNOUNCED" || state === "EXPECTED";
}

/**
 * The date shown for an upcoming opportunity, and where it came from.
 * ANNOUNCED yields a confirmed date; EXPECTED yields a window and is always
 * labelled as a prediction.
 */
export type OpeningDateKind = "confirmed" | "expected" | "none";

export function openingDateKind(o: {
  state: OpportunityState;
  openingDate: Date | string | null;
  expectedOpeningStart: Date | string | null;
}): OpeningDateKind {
  if (o.state === "ANNOUNCED" && o.openingDate) return "confirmed";
  if (o.state === "EXPECTED" && o.expectedOpeningStart) return "expected";
  if (o.openingDate && o.state !== "EXPECTED") return "confirmed";
  return "none";
}

/**
 * Whether an OPEN opportunity should read as CLOSING_SOON. Rolling programmes
 * are excluded: they have no deadline to run out, and the urgency there is
 * "apply before the cohort fills", which the priority engine handles.
 */
export function shouldBeClosingSoon(deadline: Date | null, now: Date, withinDays = 7): boolean {
  if (!deadline) return false;
  const ms = deadline.getTime() - now.getTime();
  return ms > 0 && ms <= withinDays * 24 * 60 * 60 * 1000;
}

/**
 * The state a failed check should produce.
 *
 * This is the guard against the worst silent failure mode in the whole system:
 * a scraper breaking and the UI reporting "no opportunities" as though that
 * were a finding. A failed fetch never changes an opportunity's state to
 * CLOSED — at most it marks it UNREACHABLE, and only when it was not already
 * verified open.
 */
export function stateAfterFailedCheck(current: OpportunityState): OpportunityState {
  if (current === "OPEN" || current === "CLOSING_SOON") return current;
  if (current === "CLOSED" || current === "REJECTED" || current === "DUPLICATE") return current;
  return "UNREACHABLE";
}

/**
 * Whether a state transition is allowed. Used by the verification worker; the
 * important entries are the ones that refuse to happen.
 */
export function canTransition(from: OpportunityState, to: OpportunityState): boolean {
  if (from === to) return true;
  // Never silently downgrade a verified opening to a prediction.
  if ((from === "OPEN" || from === "CLOSING_SOON") && (to === "EXPECTED" || to === "ANNOUNCED" || to === "DISCOVERED")) {
    return false;
  }
  // A prediction can never jump straight to OPEN without going through
  // verification — canMarkOpen is the only route in.
  if (from === "EXPECTED" && to === "OPEN") return false;
  return true;
}
