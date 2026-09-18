/**
 * Historical programme memory -> expected opening window.
 *
 * If a programme opened on 19 September 2024 and 18 September 2025, FOE should
 * be watching it in mid-September 2026 rather than finding out a week late.
 *
 * The output is always a WINDOW with a hedged label ("mid-to-late September"),
 * never a date. Presenting a prediction as a confirmed date is the exact
 * failure this module is built to avoid — that is what ANNOUNCED is for.
 */

export interface HistoryPoint {
  recruitmentYear: number;
  openedAt: Date | null;
}

export interface ExpectedWindow {
  start: Date;
  end: Date;
  /** Hedged, human phrasing for the UI, e.g. "Late September". */
  label: string;
  /** How many past cycles the window is based on. */
  basedOn: number;
  /** Always true — a reminder at every call site that this is not confirmed. */
  predicted: true;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "Early" (1-10), "Mid" (11-20), "Late" (21-end). */
function partOfMonth(day: number): "Early" | "Mid" | "Late" {
  if (day <= 10) return "Early";
  if (day <= 20) return "Mid";
  return "Late";
}

function phraseFor(start: Date, end: Date): string {
  const sMonth = start.getUTCMonth();
  const eMonth = end.getUTCMonth();
  const sPart = partOfMonth(start.getUTCDate());
  const ePart = partOfMonth(end.getUTCDate());

  if (sMonth === eMonth) {
    if (sPart === ePart) return `${sPart} ${MONTHS[sMonth]}`;
    return `${sPart}-to-${ePart.toLowerCase()} ${MONTHS[sMonth]}`;
  }
  return `${sPart} ${MONTHS[sMonth]} to ${ePart.toLowerCase()} ${MONTHS[eMonth]}`;
}

/** Day-of-year, ignoring leap-day drift — good enough for a two-week window. */
function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 864e5);
}

/**
 * Derives the window a programme is expected to open in for `targetYear`.
 *
 * Returns null when there is no usable history: FOE says nothing rather than
 * inventing a date. A single past cycle still produces a window, just a wider
 * one, because one data point is weak evidence rather than no evidence.
 */
export function deriveExpectedWindow(
  history: HistoryPoint[],
  targetYear: number,
  /**
   * When supplied, the window is rolled forward to the next occurrence at or
   * after this moment.
   *
   * This matters because a recruitment year is not a calendar year: the 2027
   * spring week cycle opens in autumn 2026. Passing the cohort year alone would
   * put every prediction twelve months late — which, for a product whose whole
   * job is not being late, is the worst possible off-by-one.
   */
  now?: Date,
): ExpectedWindow | null {
  const points = history
    .filter((h) => h.openedAt != null && h.recruitmentYear < targetYear)
    .map((h) => ({ year: h.recruitmentYear, day: dayOfYear(h.openedAt as Date) }))
    .sort((a, b) => b.year - a.year)
    .slice(0, 5);

  if (points.length === 0) return null;

  const days = points.map((p) => p.day);
  const mean = days.reduce((a, b) => a + b, 0) / days.length;

  // Spread: the observed range, widened by an uncertainty floor that shrinks as
  // more cycles agree. One data point gets +/- 10 days; three or more get +/- 5.
  const min = Math.min(...days);
  const max = Math.max(...days);
  const floor = points.length === 1 ? 10 : points.length === 2 ? 7 : 5;
  const half = Math.max(floor, (max - min) / 2 + 3);

  let year = targetYear;
  if (now) {
    // Walk back to the first calendar year whose window has not already ended,
    // starting from the cohort year, then forward if that is still in the past.
    for (let candidate = targetYear; candidate >= targetYear - 2; candidate--) {
      const endOfCandidate = Date.UTC(candidate, 0, 1) + (mean + half) * 864e5;
      if (endOfCandidate >= now.getTime()) year = candidate;
      else break;
    }
    while (Date.UTC(year, 0, 1) + (mean + half) * 864e5 < now.getTime()) year += 1;
  }

  const centre = Date.UTC(year, 0, 1) + mean * 864e5;
  const start = new Date(centre - half * 864e5);
  const end = new Date(centre + half * 864e5);

  return {
    start,
    end,
    label: phraseFor(start, end),
    basedOn: points.length,
    predicted: true,
  };
}

/**
 * Should this programme be on the high-frequency hot watch?
 *
 * Three triggers, per the monitoring model:
 *   - an employer-announced opening date is imminent;
 *   - a predicted window is imminent or already running;
 *   - an expected opening date has passed with no opening detected (the firm
 *     may have opened quietly, which is precisely when late detection hurts).
 */
export function shouldHotWatch(
  o: {
    state: string;
    openingDate: Date | null;
    expectedOpeningStart: Date | null;
    expectedOpeningEnd: Date | null;
  },
  now: Date,
  leadDays = 3,
): { hot: boolean; reason: string | null } {
  const leadMs = leadDays * 864e5;

  if (o.state === "ANNOUNCED" && o.openingDate) {
    const untilOpen = o.openingDate.getTime() - now.getTime();
    if (untilOpen <= leadMs) {
      return {
        hot: true,
        reason: untilOpen >= 0 ? "Confirmed opening date is imminent" : "Confirmed opening date has passed without an opening being detected",
      };
    }
    return { hot: false, reason: null };
  }

  if (o.state === "EXPECTED" && o.expectedOpeningStart) {
    const untilWindow = o.expectedOpeningStart.getTime() - now.getTime();
    if (untilWindow <= leadMs) {
      const end = o.expectedOpeningEnd;
      if (end && now.getTime() > end.getTime()) {
        return { hot: true, reason: "Expected opening window has passed without an opening being detected" };
      }
      return { hot: true, reason: "Inside the expected opening window" };
    }
  }

  return { hot: false, reason: null };
}

/** Normal sweep is hourly; anything hot is checked every 10 minutes. */
export const SWEEP_INTERVAL_MINUTES = 60;
export const HOT_WATCH_INTERVAL_MINUTES = 10;
