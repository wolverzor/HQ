/**
 * Inference helpers shared by every adapter.
 *
 * Deliberately conservative: each of these returns nothing rather than guessing
 * when a page does not actually say. An invented eligibility rule or location is
 * worse than an absent one, because the UI presents it with the same confidence
 * as a fact FOE really read.
 */

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
