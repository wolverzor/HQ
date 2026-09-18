/**
 * Priority — explainable ordering, not a mystery number.
 *
 * The point of FOE is reducing the delay between an application opening and the
 * user submitting it. Ordering therefore favours "you can act on this right
 * now, and waiting costs you something".
 *
 * Every opportunity carries the list of reasons it ranked where it did, and the
 * UI shows those words. There is deliberately no "97/100 AI score": a rank the
 * user cannot interrogate is a rank they cannot trust.
 */

import type { EligibilityVerdict, FinanceArea, OpportunityState } from "@prisma/client";
import { AREA_LABEL } from "./labels";

/** Coarse buckets, in the documented default order. Lower sorts first. */
export enum PriorityBucket {
  NewlyOpenedRolling = 0,
  NewlyOpened = 1,
  Rolling = 2,
  DeadlineSoon = 3,
  OtherActive = 4,
  Upcoming = 5,
  Inactive = 6,
}

export const BUCKET_LABEL: Record<PriorityBucket, string> = {
  [PriorityBucket.NewlyOpenedRolling]: "Just opened, rolling",
  [PriorityBucket.NewlyOpened]: "Just opened",
  [PriorityBucket.Rolling]: "Rolling",
  [PriorityBucket.DeadlineSoon]: "Deadline soon",
  [PriorityBucket.OtherActive]: "Open",
  [PriorityBucket.Upcoming]: "Upcoming",
  [PriorityBucket.Inactive]: "Inactive",
};

export interface PriorityInput {
  state: OpportunityState;
  rolling: boolean;
  area: FinanceArea;
  deadline: Date | null;
  firstVerifiedOpenAt: Date | null;
  openingDate: Date | null;
  eligibility: EligibilityVerdict;
  hasApplied: boolean;
  isWatched: boolean;
}

export interface PriorityResult {
  bucket: PriorityBucket;
  /** Human-readable reasons, most important first. Shown in the UI verbatim. */
  reasons: string[];
  /** Tie-break only, never displayed as a score. */
  tiebreak: number;
}

const NEWLY_OPENED_HOURS = 48;
const DEADLINE_SOON_DAYS = 7;

function hoursSince(date: Date | null, now: Date): number | null {
  if (!date) return null;
  return (now.getTime() - date.getTime()) / 36e5;
}

function daysUntil(date: Date | null, now: Date): number | null {
  if (!date) return null;
  return (date.getTime() - now.getTime()) / 864e5;
}

export function computePriority(
  o: PriorityInput,
  context: { now: Date; interests: FinanceArea[] },
): PriorityResult {
  const { now, interests } = context;
  const reasons: string[] = [];

  const openedHours = hoursSince(o.firstVerifiedOpenAt, now);
  const isNewlyOpened =
    (o.state === "OPEN" || o.state === "CLOSING_SOON") && openedHours !== null && openedHours <= NEWLY_OPENED_HOURS;
  const deadlineDays = daysUntil(o.deadline, now);
  const deadlineSoon = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= DEADLINE_SOON_DAYS;

  let bucket: PriorityBucket;

  if (o.state === "OPEN" || o.state === "CLOSING_SOON") {
    if (isNewlyOpened && o.rolling) bucket = PriorityBucket.NewlyOpenedRolling;
    else if (isNewlyOpened) bucket = PriorityBucket.NewlyOpened;
    else if (o.rolling) bucket = PriorityBucket.Rolling;
    else if (deadlineSoon) bucket = PriorityBucket.DeadlineSoon;
    else bucket = PriorityBucket.OtherActive;
  } else if (o.state === "ANNOUNCED" || o.state === "EXPECTED") {
    bucket = PriorityBucket.Upcoming;
  } else if (o.state === "DISCOVERED" || o.state === "VERIFYING" || o.state === "MANUAL_REVIEW" || o.state === "UNREACHABLE") {
    bucket = PriorityBucket.OtherActive;
  } else {
    bucket = PriorityBucket.Inactive;
  }

  // Reasons, ordered by how much they should influence what the user does next.
  if (isNewlyOpened && openedHours !== null) {
    reasons.push(openedHours < 1 ? "Opened in the last hour" : `Opened ${Math.round(openedHours)} hours ago`);
  }
  if (o.rolling && (o.state === "OPEN" || o.state === "CLOSING_SOON")) {
    reasons.push("Rolling deadline — assessed as applications arrive");
  }
  if (deadlineSoon && deadlineDays !== null) {
    reasons.push(deadlineDays < 1 ? "Deadline today" : `Deadline in ${Math.round(deadlineDays)} days`);
  }
  if (interests.includes(o.area)) {
    reasons.push(`Matches your interest in ${AREA_LABEL[o.area]}`);
  }
  if (o.eligibility === "ELIGIBLE") reasons.push("You are eligible");
  else if (o.eligibility === "LIKELY_ELIGIBLE") reasons.push("You are likely eligible");
  else if (o.eligibility === "UNCLEAR") reasons.push("Eligibility unconfirmed — worth checking rather than skipping");
  if (o.isWatched) reasons.push("On your watchlist");
  if (o.hasApplied) reasons.push("You have already applied");

  return { bucket, reasons, tiebreak: tiebreakFor(bucket, { openedHours, deadlineDays, hasApplied: o.hasApplied }) };
}

/**
 * Tie-break within a bucket. Ascending, so smaller sorts first.
 *
 * The metric depends on the bucket, because "most urgent" means different
 * things in each: in the newly-opened buckets it is recency (the whole point is
 * applying before everyone else), and elsewhere it is the deadline. Mixing the
 * two units in one expression is what made a six-hour-old opening outrank a
 * forty-minute-old one.
 */
export function tiebreakFor(
  bucket: PriorityBucket,
  o: { openedHours: number | null; deadlineDays: number | null; hasApplied: boolean },
): number {
  let t: number;

  if (bucket === PriorityBucket.NewlyOpenedRolling || bucket === PriorityBucket.NewlyOpened || bucket === PriorityBucket.Rolling) {
    // Most recently opened first.
    t = o.openedHours ?? 10_000;
  } else if (o.deadlineDays !== null && o.deadlineDays >= 0) {
    // Soonest deadline first.
    t = o.deadlineDays;
  } else if (o.openedHours !== null) {
    t = 1_000 + o.openedHours;
  } else {
    t = 10_000;
  }

  // Already applied sinks to the bottom of its bucket without being removed.
  if (o.hasApplied) t += 100_000;
  return t;
}

export function comparePriority(a: PriorityResult, b: PriorityResult): number {
  if (a.bucket !== b.bucket) return a.bucket - b.bucket;
  return a.tiebreak - b.tiebreak;
}

/**
 * Upcoming opportunities sort by how soon they open, with employer-confirmed
 * dates ahead of predicted windows on the same day — a confirmed 23 September
 * is more actionable than a guess at "late September".
 */
export function compareUpcoming(
  a: { openingDate: Date | null; expectedOpeningStart: Date | null; state: OpportunityState },
  b: { openingDate: Date | null; expectedOpeningStart: Date | null; state: OpportunityState },
): number {
  const da = a.openingDate ?? a.expectedOpeningStart;
  const db = b.openingDate ?? b.expectedOpeningStart;
  if (da && db) {
    const diff = da.getTime() - db.getTime();
    if (diff !== 0) return diff;
  } else if (da) return -1;
  else if (db) return 1;

  if (a.state !== b.state) {
    if (a.state === "ANNOUNCED") return -1;
    if (b.state === "ANNOUNCED") return 1;
  }
  return 0;
}
