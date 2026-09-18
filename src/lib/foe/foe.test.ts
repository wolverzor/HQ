/**
 * Tests for the rules FOE's honesty depends on.
 *
 * These are the invariants that, if they broke silently, would make the engine
 * confidently wrong: a tracker post becoming "OPEN", a prediction rendered as a
 * confirmed date, a dead scraper reported as "no opportunities", or one
 * programme sending six WhatsApp messages.
 *
 * Run with `npm test`.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { canMarkOpen, stateAfterFailedCheck, canTransition, openingDateKind, shouldBeClosingSoon } from "./status";
import { isOfficialSource, isEmployerControlledUrl } from "./sources";
import { opportunityFingerprint, isSameOpportunity, canonicalFirmName, canonicalUrl, programmeKey } from "./fingerprint";
import { deriveExpectedWindow, shouldHotWatch } from "./expected-window";
import { classifyEligibility, matchesEligibilityFilter, DEFAULT_VISIBLE_VERDICTS } from "./eligibility";
import { computePriority, comparePriority, PriorityBucket } from "./priority";
import { alertDedupeKey, eventForTransition, composeAlertBody } from "./alerts";
import { canMoveTo, nextStages, isTerminalStage } from "./applications";
import { isLockHeld, leaseUntil, wasStolen } from "./scan-lock";
import { matchCategory, matchArea, regionForLocation } from "./taxonomy";

const FIRM_DOMAIN = "goldmansachs.com";
const OFFICIAL_URL = "https://www.goldmansachs.com/careers/students/programs/spring-insight";
const ATS_URL = "https://boards.greenhouse.io/examplefirm/jobs/12345";

// ---------------------------------------------------------------------------
// A third-party discovery can never, on its own, mark something OPEN
// ---------------------------------------------------------------------------

test("an aggregator alone cannot mark an opportunity OPEN", () => {
  const decision = canMarkOpen(
    [{ kind: "AGGREGATOR", url: "https://the-trackr.com/spring-weeks", applicationLive: true, reachable: true }],
    FIRM_DOMAIN,
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /third-party/i);
});

test("a search engine result alone cannot mark an opportunity OPEN", () => {
  const decision = canMarkOpen(
    [{ kind: "SEARCH_ENGINE", url: "https://www.google.com/search?q=spring+week", applicationLive: true, reachable: true }],
    FIRM_DOMAIN,
  );
  assert.equal(decision.allowed, false);
});

test("several third-party sources still cannot mark an opportunity OPEN", () => {
  const decision = canMarkOpen(
    [
      { kind: "AGGREGATOR", url: "https://the-trackr.com/x", applicationLive: true, reachable: true },
      { kind: "UNIVERSITY_PAGE", url: "https://careers.example.ac.uk/x", applicationLive: true, reachable: true },
      { kind: "COMMUNITY", url: "https://reddit.com/r/x", applicationLive: true, reachable: true },
    ],
    FIRM_DOMAIN,
  );
  assert.equal(decision.allowed, false, "volume of unofficial evidence is not verification");
});

test("a manual paste is discovery, not verification", () => {
  assert.equal(isOfficialSource("MANUAL"), false);
  const decision = canMarkOpen([{ kind: "MANUAL", url: OFFICIAL_URL, applicationLive: true, reachable: true }], FIRM_DOMAIN);
  assert.equal(decision.allowed, false);
});

// ---------------------------------------------------------------------------
// An official, verified opening can
// ---------------------------------------------------------------------------

test("an official employer page with a live application marks OPEN", () => {
  const decision = canMarkOpen(
    [{ kind: "OFFICIAL_PROGRAMME_PAGE", url: OFFICIAL_URL, applicationLive: true, reachable: true }],
    FIRM_DOMAIN,
  );
  assert.equal(decision.allowed, true);
  assert.equal(decision.method, "OFFICIAL_PROGRAMME_PAGE");
  assert.equal(decision.verifiedByUrl, OFFICIAL_URL);
  assert.ok(decision.confidence >= 70);
});

test("a known ATS domain counts as employer-controlled", () => {
  assert.equal(isEmployerControlledUrl(ATS_URL, "examplefirm.com"), true);
  const decision = canMarkOpen([{ kind: "ATS", url: ATS_URL, applicationLive: true, reachable: true }], "examplefirm.com");
  assert.equal(decision.allowed, true);
});

test("a link labelled official but hosted elsewhere does not verify", () => {
  const decision = canMarkOpen(
    [{ kind: "OFFICIAL_CAREERS_PAGE", url: "https://jobs-aggregator.example/gs-spring", applicationLive: true, reachable: true }],
    FIRM_DOMAIN,
  );
  assert.equal(decision.allowed, false);
});

test("an official page without a live application does not verify", () => {
  const decision = canMarkOpen(
    [{ kind: "OFFICIAL_PROGRAMME_PAGE", url: OFFICIAL_URL, applicationLive: false, reachable: true }],
    FIRM_DOMAIN,
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /no live application/i);
});

test("an explicit closed signal beats an otherwise valid opening", () => {
  const decision = canMarkOpen(
    [
      { kind: "ATS", url: ATS_URL, applicationLive: true, reachable: true },
      { kind: "OFFICIAL_PROGRAMME_PAGE", url: OFFICIAL_URL, closedSignal: true, reachable: true },
    ],
    "examplefirm.com",
  );
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /closed|expired/i);
});

// ---------------------------------------------------------------------------
// A failed check is never a negative result
// ---------------------------------------------------------------------------

test("a failed scraper never turns an opportunity into CLOSED", () => {
  assert.equal(stateAfterFailedCheck("DISCOVERED"), "UNREACHABLE");
  assert.equal(stateAfterFailedCheck("ANNOUNCED"), "UNREACHABLE");
  assert.equal(stateAfterFailedCheck("EXPECTED"), "UNREACHABLE");
  assert.notEqual(stateAfterFailedCheck("ANNOUNCED"), "CLOSED");
});

test("a failed check does not revoke an already-verified opening", () => {
  assert.equal(stateAfterFailedCheck("OPEN"), "OPEN");
  assert.equal(stateAfterFailedCheck("CLOSING_SOON"), "CLOSING_SOON");
});

test("a verified opening cannot be downgraded to a prediction", () => {
  assert.equal(canTransition("OPEN", "EXPECTED"), false);
  assert.equal(canTransition("OPEN", "ANNOUNCED"), false);
  assert.equal(canTransition("CLOSING_SOON", "DISCOVERED"), false);
  assert.equal(canTransition("OPEN", "CLOSED"), true);
});

// ---------------------------------------------------------------------------
// ANNOUNCED, EXPECTED and OPEN never blur
// ---------------------------------------------------------------------------

test("a prediction cannot jump straight to OPEN without verification", () => {
  assert.equal(canTransition("EXPECTED", "OPEN"), false);
  assert.equal(canTransition("EXPECTED", "VERIFYING"), true);
  assert.equal(canTransition("VERIFYING", "OPEN"), true);
});

test("an announced date reads as confirmed, an expected window does not", () => {
  const announced = openingDateKind({
    state: "ANNOUNCED",
    openingDate: new Date("2026-09-23"),
    expectedOpeningStart: null,
  });
  assert.equal(announced, "confirmed");

  const expected = openingDateKind({
    state: "EXPECTED",
    openingDate: null,
    expectedOpeningStart: new Date("2026-09-18"),
  });
  assert.equal(expected, "expected");
});

test("historical data produces a hedged window, never a confirmed date", () => {
  const window = deriveExpectedWindow(
    [
      { recruitmentYear: 2024, openedAt: new Date("2024-09-19T09:00:00Z") },
      { recruitmentYear: 2025, openedAt: new Date("2025-09-18T09:00:00Z") },
    ],
    2026,
  );
  assert.ok(window);
  assert.equal(window.predicted, true);
  assert.equal(window.basedOn, 2);
  assert.match(window.label, /September/);
  // A window, not a point.
  assert.ok(window.end.getTime() > window.start.getTime());
  // And it does not claim a specific day.
  assert.doesNotMatch(window.label, /\d/);
});

test("no history produces no prediction at all", () => {
  assert.equal(deriveExpectedWindow([], 2026), null);
  assert.equal(deriveExpectedWindow([{ recruitmentYear: 2024, openedAt: null }], 2026), null);
});

test("a single past cycle yields a wider window than three agreeing ones", () => {
  const one = deriveExpectedWindow([{ recruitmentYear: 2025, openedAt: new Date("2025-09-18T00:00:00Z") }], 2026);
  const three = deriveExpectedWindow(
    [
      { recruitmentYear: 2023, openedAt: new Date("2023-09-18T00:00:00Z") },
      { recruitmentYear: 2024, openedAt: new Date("2024-09-18T00:00:00Z") },
      { recruitmentYear: 2025, openedAt: new Date("2025-09-18T00:00:00Z") },
    ],
    2026,
  );
  assert.ok(one && three);
  const oneWidth = one.end.getTime() - one.start.getTime();
  const threeWidth = three.end.getTime() - three.start.getTime();
  assert.ok(oneWidth > threeWidth, "one data point should be hedged more widely");
});

// ---------------------------------------------------------------------------
// Hot watch
// ---------------------------------------------------------------------------

test("an announced opening within the lead window goes on hot watch", () => {
  const now = new Date("2026-09-21T10:00:00Z");
  const result = shouldHotWatch(
    { state: "ANNOUNCED", openingDate: new Date("2026-09-23T08:00:00Z"), expectedOpeningStart: null, expectedOpeningEnd: null },
    now,
  );
  assert.equal(result.hot, true);
  assert.match(result.reason ?? "", /imminent/i);
});

test("an announced opening still days away stays on the normal sweep", () => {
  const now = new Date("2026-09-10T10:00:00Z");
  const result = shouldHotWatch(
    { state: "ANNOUNCED", openingDate: new Date("2026-09-23T08:00:00Z"), expectedOpeningStart: null, expectedOpeningEnd: null },
    now,
  );
  assert.equal(result.hot, false);
});

test("an announced date that has passed without an opening stays hot", () => {
  const now = new Date("2026-09-24T10:00:00Z");
  const result = shouldHotWatch(
    { state: "ANNOUNCED", openingDate: new Date("2026-09-23T08:00:00Z"), expectedOpeningStart: null, expectedOpeningEnd: null },
    now,
  );
  assert.equal(result.hot, true);
  assert.match(result.reason ?? "", /passed/i);
});

test("an expected window that has passed without an opening stays hot", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  const result = shouldHotWatch(
    {
      state: "EXPECTED",
      openingDate: null,
      expectedOpeningStart: new Date("2026-09-15T00:00:00Z"),
      expectedOpeningEnd: new Date("2026-09-30T00:00:00Z"),
    },
    now,
  );
  assert.equal(result.hot, true);
  assert.match(result.reason ?? "", /passed/i);
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

test("the same programme found six ways produces one fingerprint", () => {
  const base = { recruitmentYear: 2027, category: "SPRING_INSIGHT" as const, location: "London" };
  const variants = [
    { firmName: "Rothschild & Co", programmeName: "Spring Insight Programme 2027", ...base },
    { firmName: "Rothschild and Co.", programmeName: "Spring Insight Programme", ...base },
    { firmName: "ROTHSCHILD & CO PLC", programmeName: "Spring Insight Programme (2027 intake)", ...base },
    { firmName: "Rothschild &amp; Co", programmeName: "spring insight programme 2027", ...base },
  ];
  const prints = new Set(variants.map(opportunityFingerprint));
  assert.equal(prints.size, 1, `expected one canonical fingerprint, got ${[...prints].join(" | ")}`);
});

test("canonical firm names strip legal suffixes and articles", () => {
  assert.equal(canonicalFirmName("Rothschild & Co"), "rothschild");
  assert.equal(canonicalFirmName("J.P. Morgan"), canonicalFirmName("JP Morgan"));
  assert.equal(canonicalFirmName("The Blackstone Group L.P."), canonicalFirmName("Blackstone Group"));
  assert.equal(canonicalFirmName("Evercore Partners Inc."), canonicalFirmName("Evercore"));
});

test("different years are different opportunities", () => {
  const a = opportunityFingerprint({
    firmName: "Goldman Sachs",
    programmeName: "Spring Insight",
    recruitmentYear: 2026,
    category: "SPRING_INSIGHT",
    location: "London",
  });
  const b = opportunityFingerprint({
    firmName: "Goldman Sachs",
    programmeName: "Spring Insight",
    recruitmentYear: 2027,
    category: "SPRING_INSIGHT",
    location: "London",
  });
  assert.notEqual(a, b);
});

test("different firms never merge", () => {
  const a = { firmName: "Lazard", programmeName: "Spring Insight", recruitmentYear: 2027, category: "SPRING_INSIGHT" as const, location: "London" };
  const b = { firmName: "Rothschild & Co", programmeName: "Spring Insight", recruitmentYear: 2027, category: "SPRING_INSIGHT" as const, location: "London" };
  assert.equal(isSameOpportunity(a, b), false);
});

test("a candidate with no location merges into the same programme with one", () => {
  const withLocation = {
    firmName: "J.P. Morgan",
    programmeName: "Early Insights Programme",
    recruitmentYear: 2027,
    category: "EARLY_INSIGHT" as const,
    location: "London",
  };
  const withoutLocation = { ...withLocation, location: null };
  assert.equal(isSameOpportunity(withLocation, withoutLocation), true);
});

test("tracking parameters do not create duplicate sources", () => {
  assert.equal(
    canonicalUrl("https://example.com/jobs/123?utm_source=trackr&gclid=abc#apply"),
    canonicalUrl("https://example.com/jobs/123"),
  );
});

test("programme keys are stable across years and cosmetic wording", () => {
  assert.equal(
    programmeKey({ programmeName: "Spring Insight Programme 2027", category: "SPRING_INSIGHT", location: "London" }),
    programmeKey({ programmeName: "Spring Insight Programme", category: "SPRING_INSIGHT", location: "London" }),
  );
});

// ---------------------------------------------------------------------------
// Eligibility: UNCLEAR must survive
// ---------------------------------------------------------------------------

test("UNCLEAR is visible by default", () => {
  assert.ok(DEFAULT_VISIBLE_VERDICTS.includes("UNCLEAR"));
  assert.equal(matchesEligibilityFilter("UNCLEAR", "all"), true);
});

test("UNCLEAR is only hidden by an explicit eligible-only choice", () => {
  assert.equal(matchesEligibilityFilter("UNCLEAR", "eligible"), false);
  assert.equal(matchesEligibilityFilter("UNCLEAR", "eligible_plus_likely"), false);
  assert.equal(matchesEligibilityFilter("UNCLEAR", "all"), true);
});

test("an unknown profile yields UNCLEAR, never NOT_ELIGIBLE", () => {
  const result = classifyEligibility({ category: "SPRING_WEEK" }, null);
  assert.equal(result.verdict, "UNCLEAR");
  assert.ok(result.reason.length > 0);
});

test("a stated year range is respected in both directions", () => {
  const eligible = classifyEligibility({ category: "SPRING_WEEK", eligibleYears: [1, 2] }, { currentYear: 1 });
  assert.equal(eligible.verdict, "ELIGIBLE");

  const not = classifyEligibility({ category: "SPRING_WEEK", eligibleYears: [3] }, { currentYear: 1 });
  assert.equal(not.verdict, "NOT_ELIGIBLE");
});

test("a first year on a spring week is likely eligible, and told why", () => {
  const result = classifyEligibility({ category: "SPRING_WEEK" }, { currentYear: 1 });
  assert.equal(result.verdict, "LIKELY_ELIGIBLE");
  assert.match(result.reason, /first year/i);
});

test("a later year on a spring week is UNCLEAR rather than excluded", () => {
  const result = classifyEligibility({ category: "SPRING_WEEK" }, { currentYear: 3, degreeLengthYears: 3 });
  assert.equal(result.verdict, "UNCLEAR", "must not be filtered out — some firms still accept later years");
});

// ---------------------------------------------------------------------------
// Priority ordering
// ---------------------------------------------------------------------------

function priorityFor(overrides: Partial<Parameters<typeof computePriority>[0]>) {
  const now = new Date("2026-09-18T12:00:00Z");
  const base = {
    state: "OPEN" as const,
    rolling: false,
    area: "INVESTMENT_BANKING" as const,
    deadline: null,
    firstVerifiedOpenAt: null,
    openingDate: null,
    eligibility: "ELIGIBLE" as const,
    hasApplied: false,
    isWatched: false,
  };
  return computePriority({ ...base, ...overrides }, { now, interests: ["INVESTMENT_BANKING"] });
}

test("newly opened and rolling outranks everything else", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  const newRolling = priorityFor({ rolling: true, firstVerifiedOpenAt: new Date(now.getTime() - 36e5) });
  const newOnly = priorityFor({ firstVerifiedOpenAt: new Date(now.getTime() - 36e5) });
  const rollingOnly = priorityFor({ rolling: true, firstVerifiedOpenAt: new Date("2026-08-01T12:00:00Z") });
  const deadlineSoon = priorityFor({ deadline: new Date("2026-09-21T12:00:00Z"), firstVerifiedOpenAt: new Date("2026-08-01T12:00:00Z") });

  assert.equal(newRolling.bucket, PriorityBucket.NewlyOpenedRolling);
  assert.equal(newOnly.bucket, PriorityBucket.NewlyOpened);
  assert.equal(rollingOnly.bucket, PriorityBucket.Rolling);
  assert.equal(deadlineSoon.bucket, PriorityBucket.DeadlineSoon);

  const sorted = [deadlineSoon, rollingOnly, newOnly, newRolling].sort(comparePriority);
  assert.deepEqual(
    sorted.map((s) => s.bucket),
    [PriorityBucket.NewlyOpenedRolling, PriorityBucket.NewlyOpened, PriorityBucket.Rolling, PriorityBucket.DeadlineSoon],
  );
});

test("within the newly-opened bucket the most recent opening comes first", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  const fresh = priorityFor({ rolling: true, firstVerifiedOpenAt: new Date(now.getTime() - 40 * 60_000) });
  const older = priorityFor({ rolling: true, firstVerifiedOpenAt: new Date(now.getTime() - 6 * 36e5) });

  assert.equal(fresh.bucket, older.bucket, "both are newly opened and rolling");
  assert.ok(
    comparePriority(fresh, older) < 0,
    "a 40-minute-old opening must outrank a 6-hour-old one — beating other applicants is the entire point",
  );
});

test("within a deadline bucket the soonest deadline comes first", () => {
  const opened = new Date("2026-08-01T12:00:00Z");
  const soon = priorityFor({ deadline: new Date("2026-09-20T12:00:00Z"), firstVerifiedOpenAt: opened });
  const later = priorityFor({ deadline: new Date("2026-09-24T12:00:00Z"), firstVerifiedOpenAt: opened });
  assert.equal(soon.bucket, later.bucket);
  assert.ok(comparePriority(soon, later) < 0);
});

test("priority always explains itself in words", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  const result = priorityFor({ rolling: true, firstVerifiedOpenAt: new Date(now.getTime() - 36e5), deadline: new Date("2026-09-21T12:00:00Z") });
  assert.ok(result.reasons.length >= 2);
  assert.ok(result.reasons.some((r) => /rolling/i.test(r)));
  assert.ok(result.reasons.some((r) => /deadline/i.test(r)));
});

test("an already-applied opportunity sinks but is never removed", () => {
  const applied = priorityFor({ hasApplied: true, rolling: true });
  const notApplied = priorityFor({ rolling: true });
  assert.equal(applied.bucket, notApplied.bucket);
  assert.ok(applied.tiebreak > notApplied.tiebreak);
  assert.ok(applied.reasons.some((r) => /already applied/i.test(r)));
});

test("an unclear-eligibility opportunity still gets a reason, not a demotion", () => {
  const result = priorityFor({ eligibility: "UNCLEAR", rolling: true });
  assert.equal(result.bucket, PriorityBucket.Rolling);
  assert.ok(result.reasons.some((r) => /unconfirmed/i.test(r)));
});

test("closing-soon only applies inside the window", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  assert.equal(shouldBeClosingSoon(new Date("2026-09-21T12:00:00Z"), now), true);
  assert.equal(shouldBeClosingSoon(new Date("2026-10-30T12:00:00Z"), now), false);
  assert.equal(shouldBeClosingSoon(new Date("2026-09-01T12:00:00Z"), now), false, "a past deadline is not 'closing soon'");
  assert.equal(shouldBeClosingSoon(null, now), false);
});

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

test("one programme, one opening, one alert per channel", () => {
  const key = { userId: "u1", opportunityId: "o1", event: "APPLICATIONS_OPENED" as const, channel: "WHATSAPP" as const };
  assert.equal(alertDedupeKey(key), alertDedupeKey({ ...key }));
  // Different channel is a genuinely different message.
  assert.notEqual(alertDedupeKey(key), alertDedupeKey({ ...key, channel: "IN_APP" }));
  // Different event about the same programme is allowed.
  assert.notEqual(alertDedupeKey(key), alertDedupeKey({ ...key, event: "DEADLINE_SOON" }));
});

test("only a genuine state change raises an alert", () => {
  assert.equal(eventForTransition("ANNOUNCED", "OPEN"), "APPLICATIONS_OPENED");
  assert.equal(eventForTransition("EXPECTED", "ANNOUNCED"), "PROGRAMME_ANNOUNCED");
  assert.equal(eventForTransition("OPEN", "OPEN"), null);
  assert.equal(eventForTransition("OPEN", "CLOSED"), null);
  assert.equal(eventForTransition("DISCOVERED", "VERIFYING"), null, "internal churn must not alert");
});

test("an opening message carries the official link and the detection time", () => {
  const body = composeAlertBody(
    "APPLICATIONS_OPENED",
    {
      firmName: "Goldman Sachs",
      programmeName: "Spring Insight Programme",
      recruitmentYear: 2027,
      area: "INVESTMENT_BANKING",
      location: "London",
      state: "OPEN",
      rolling: true,
      applicationUrl: OFFICIAL_URL,
      officialInfoUrl: null,
      deadline: null,
      openingDate: null,
      expectedOpeningLabel: null,
    },
    "ELIGIBLE",
    new Date("2026-09-18T14:07:00"),
  );
  assert.match(body, /Goldman Sachs/);
  assert.match(body, /Spring Insight Programme 2027/);
  assert.match(body, /Rolling: Yes/);
  assert.match(body, /Eligibility: Eligible/);
  assert.ok(body.includes(OFFICIAL_URL));
  assert.match(body, /14:07/);
});

test("an expected-opening message says the date is not confirmed", () => {
  const body = composeAlertBody(
    "SEVEN_DAYS_BEFORE_OPENING",
    {
      firmName: "Lazard",
      programmeName: "Spring Insight Programme",
      recruitmentYear: 2027,
      area: "INVESTMENT_BANKING",
      location: "London",
      state: "EXPECTED",
      rolling: false,
      applicationUrl: null,
      officialInfoUrl: "https://www.lazard.com/careers",
      deadline: null,
      openingDate: null,
      expectedOpeningLabel: "Late September",
    },
    "LIKELY_ELIGIBLE",
    new Date("2026-09-18T09:00:00"),
  );
  assert.match(body, /not confirmed by the employer/i);
});

// ---------------------------------------------------------------------------
// Application progress
// ---------------------------------------------------------------------------

test("applications move forward and can skip stages", () => {
  assert.equal(canMoveTo("APPLIED", "ONLINE_ASSESSMENT"), true);
  assert.equal(canMoveTo("APPLIED", "INTERVIEW"), true, "not every process has an OA");
  assert.equal(canMoveTo("APPLIED", "OFFER"), true);
});

test("applications do not move backwards by accident", () => {
  assert.equal(canMoveTo("INTERVIEW", "APPLIED"), false);
  assert.equal(canMoveTo("OFFER", "INTERVIEW"), false);
});

test("a terminal stage is terminal", () => {
  assert.equal(isTerminalStage("REJECTED"), true);
  assert.equal(isTerminalStage("WITHDRAWN"), true);
  assert.equal(isTerminalStage("OFFER"), true);
  assert.deepEqual(nextStages("REJECTED"), []);
  assert.equal(canMoveTo("REJECTED", "INTERVIEW"), false);
});

test("rejection and withdrawal are reachable from any live stage", () => {
  for (const stage of ["APPLIED", "ONLINE_ASSESSMENT", "HIREVUE", "INTERVIEW", "ASSESSMENT_CENTRE"] as const) {
    assert.equal(canMoveTo(stage, "REJECTED"), true);
    assert.equal(canMoveTo(stage, "WITHDRAWN"), true);
  }
});

// ---------------------------------------------------------------------------
// Sweep overlap protection
// ---------------------------------------------------------------------------

test("a live lease blocks a second concurrent sweep", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  const lock = { key: "foe:full-sweep", holder: "worker-1", expiresAt: leaseUntil(now, 55) };
  assert.equal(isLockHeld(lock, now), true);
  assert.equal(isLockHeld(lock, new Date(now.getTime() + 10 * 60_000)), true);
});

test("an expired lease self-heals instead of blocking forever", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  const lock = { key: "foe:full-sweep", holder: "dead-worker", expiresAt: new Date(now.getTime() - 60_000) };
  assert.equal(isLockHeld(lock, now), false);
  assert.equal(wasStolen(lock, now), true, "taking over a dead lease should be visible, not silent");
});

test("no lock means no block", () => {
  assert.equal(isLockHeld(null, new Date()), false);
});

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

test("programme detection is not limited to the literal phrase 'spring week'", () => {
  assert.equal(matchCategory("Applications are open for our Spring Insight Programme"), "SPRING_INSIGHT");
  assert.equal(matchCategory("Our Early Careers Insight series"), "EARLY_INSIGHT");
  assert.equal(matchCategory("Discover Programme for first years"), "INSIGHT_PROGRAMME");
  assert.equal(matchCategory("Future Women Leaders event"), "INSIGHT_PROGRAMME");
  assert.equal(matchCategory("First-Year Internship"), "FIRST_YEAR_PROGRAMME");
});

test("the most specific division wins", () => {
  assert.equal(matchArea("Sales and Trading division"), "SALES_AND_TRADING");
  assert.equal(matchArea("Equity Capital Markets"), "EQUITY_CAPITAL_MARKETS");
  assert.equal(matchArea("Global Advisory"), "ADVISORY");
});

test("locations map to filterable regions", () => {
  assert.equal(regionForLocation("London"), "London");
  assert.equal(regionForLocation("Manchester"), "UK");
  assert.equal(regionForLocation("Frankfurt"), "Europe");
  assert.equal(regionForLocation("New York"), "International");
  assert.equal(regionForLocation(null), null);
});

// ---------------------------------------------------------------------------
// Recruitment year vs calendar year
// ---------------------------------------------------------------------------

test("an expected window lands on the cycle that is actually next, not the cohort year", () => {
  // The 2027 cohort's spring weeks open in autumn 2026.
  const now = new Date("2026-09-18T12:00:00Z");
  const window = deriveExpectedWindow(
    [
      { recruitmentYear: 2025, openedAt: new Date("2024-09-19T09:00:00Z") },
      { recruitmentYear: 2026, openedAt: new Date("2025-09-18T09:00:00Z") },
    ],
    2027,
    now,
  );
  assert.ok(window);
  assert.equal(window.start.getUTCFullYear(), 2026, "predicting autumn 2027 would be a year late");
  assert.ok(window.end.getTime() >= now.getTime(), "the window must not already be over");
});

test("a window that has fully passed rolls forward to the next year", () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const window = deriveExpectedWindow([{ recruitmentYear: 2026, openedAt: new Date("2025-09-18T09:00:00Z") }], 2027, now);
  assert.ok(window);
  assert.ok(window.end.getTime() >= now.getTime());
  assert.equal(window.start.getUTCFullYear(), 2027);
});
