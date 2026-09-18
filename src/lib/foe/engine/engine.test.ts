/**
 * Tests for the monitoring framework.
 *
 * The failure modes these guard against are the quiet ones: a page that looks
 * "changed" every hour because of a timestamp, a bot wall counted as a
 * successful check that found nothing, a sweep that hammers one domain, a
 * broken parser whose collapsing yield nobody notices.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { analyseChange, contentHash, extractText, hasClosedSignal, hasLiveApplicationAction, normaliseForHash } from "./content";
import { detectBlockPage } from "./fetcher";
import { domainOf, interleaveByDomain, runQueue } from "./queue";
import { cronLooksMissed, healthAfterFailure, healthAfterSuccess, isAbnormallyLow, severityFor, FAILING_AFTER } from "./health";
import { genericPageAdapter, inferEligibleYears, inferRecruitmentYear, inferRolling } from "./adapters";

// ---------------------------------------------------------------------------
// Content hashing and change detection
// ---------------------------------------------------------------------------

test("markup is stripped down to comparable text", () => {
  const text = extractText('<div><script>var x=1</script><h1>Spring Week</h1><p>Apply&nbsp;now</p></div>');
  assert.equal(text, "Spring Week Apply now");
  assert.doesNotMatch(text, /var x/);
});

test("volatile noise does not make an unchanged page look changed", () => {
  const a = 'Spring Week 2027. Apply now. Generated at 14:32:07. token=9f2b41c8aa77de01. 412 views';
  const b = 'Spring Week 2027. Apply now. Generated at 09:04:51. token=0a11bb22cc33dd44. 418 views';
  assert.equal(contentHash(a), contentHash(b), "timestamps, tokens and counters must not defeat the hash");
});

test("a real wording change does change the hash", () => {
  const before = "Spring Week 2027. Applications will open in September.";
  const after = "Spring Week 2027. Apply now.";
  assert.notEqual(contentHash(before), contentHash(after));
});

test("normalisation is case- and whitespace-insensitive", () => {
  assert.equal(normaliseForHash("  Spring   WEEK  "), normaliseForHash("spring week"));
});

test("an appearing apply button is detected as an opening", () => {
  const result = analyseChange(
    "Spring Week 2027. Applications will open in September.",
    "Spring Week 2027. Apply now to join us.",
  );
  assert.equal(result.changed, true);
  assert.ok(result.signals.includes("APPLICATION_OPENED"));
  assert.equal(result.actionable, true);
});

test("a disappearing apply button is detected as a closure", () => {
  const result = analyseChange("Spring Week 2027. Apply now.", "Spring Week 2027. Thanks for your interest.");
  assert.ok(result.signals.includes("APPLICATION_CLOSED"));
});

test("explicit closure wording is detected", () => {
  const result = analyseChange(
    "Spring Week 2027. Apply now.",
    "Spring Week 2027. Applications are closed for this cycle.",
  );
  assert.ok(result.signals.includes("APPLICATION_CLOSED"));
  assert.equal(result.actionable, true);
});

test("cosmetic churn is changed but not actionable", () => {
  const result = analyseChange(
    "Spring Week 2027. Our people love it here.",
    "Spring Week 2027. Our colleagues love it here.",
  );
  assert.equal(result.changed, true);
  assert.deepEqual(result.signals, ["COSMETIC"]);
  assert.equal(result.actionable, false, "cosmetic edits must not trigger expensive analysis");
});

test("an unchanged page short-circuits", () => {
  const text = "Spring Week 2027. Apply now.";
  const result = analyseChange(text, text);
  assert.equal(result.changed, false);
  assert.equal(result.actionable, false);
});

test("a first sighting is a change but proves nothing about what moved", () => {
  const result = analyseChange(null, "Spring Week 2027. Applications open in September.");
  assert.equal(result.changed, true);
  assert.ok(!result.signals.includes("APPLICATION_OPENED"));
});

test("live and closed application signals are read independently", () => {
  assert.equal(hasLiveApplicationAction("Apply now for our Spring Week"), true);
  assert.equal(hasLiveApplicationAction("Applications will open in September"), false);
  assert.equal(hasClosedSignal("Applications are closed for 2027"), true);
  assert.equal(hasClosedSignal("Apply now"), false);
});

// ---------------------------------------------------------------------------
// Bot walls: a 200 that is really a failure
// ---------------------------------------------------------------------------

test("a Cloudflare interstitial is a failure, not an empty careers page", () => {
  const block = detectBlockPage("Just a moment... Checking your browser before accessing.");
  assert.ok(block);
  assert.equal(block.kind, "BLOCKED");
});

test("a CAPTCHA page is a failure", () => {
  const block = detectBlockPage("Please complete the reCAPTCHA to continue.");
  assert.ok(block);
  assert.equal(block.kind, "CAPTCHA");
});

test("a real careers page that happens to mention Cloudflare is not a block", () => {
  const page = `Spring Week 2027. Apply now. ${"We hire engineers across infrastructure, including Cloudflare and AWS. ".repeat(60)}`;
  assert.equal(detectBlockPage(page), null, "length and context matter — this page has real content");
});

// ---------------------------------------------------------------------------
// Queue: concurrency, politeness, isolation
// ---------------------------------------------------------------------------

test("the queue respects its concurrency ceiling", async () => {
  let inFlight = 0;
  let peak = 0;
  const tasks = Array.from({ length: 20 }, (_, i) => ({
    domain: `d${i}.example`,
    run: async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return i;
    },
  }));

  const results = await runQueue(tasks, { concurrency: 4, perDomainDelayMs: 0 });
  assert.equal(results.length, 20);
  assert.ok(peak <= 4, `peak concurrency was ${peak}, expected at most 4`);
});

test("requests to one domain are spaced out", async () => {
  const starts: number[] = [];
  const tasks = Array.from({ length: 3 }, () => ({
    domain: "same.example",
    run: async () => {
      starts.push(Date.now());
      return 1;
    },
  }));

  await runQueue(tasks, { concurrency: 3, perDomainDelayMs: 40 });
  starts.sort((a, b) => a - b);
  assert.ok(starts[1] - starts[0] >= 30, "second request to the same host came too soon");
  assert.ok(starts[2] - starts[1] >= 30, "third request to the same host came too soon");
});

test("one failing source does not stop the sweep", async () => {
  const results = await runQueue(
    [
      { domain: "a.example", run: async () => "ok-1" },
      {
        domain: "b.example",
        run: async () => {
          throw new Error("careers page exploded");
        },
      },
      { domain: "c.example", run: async () => "ok-2" },
    ],
    { concurrency: 3, perDomainDelayMs: 0 },
  );

  assert.equal(results[0].value, "ok-1");
  assert.ok(results[1].error instanceof Error);
  assert.equal(results[2].value, "ok-2", "work after a failure must still run");
});

test("the run budget abandons leftover work instead of overrunning", async () => {
  const tasks = Array.from({ length: 10 }, (_, i) => ({
    domain: `d${i}.example`,
    run: async () => {
      await new Promise((r) => setTimeout(r, 30));
      return i;
    },
  }));

  const results = await runQueue(tasks, { concurrency: 1, perDomainDelayMs: 0, budgetMs: 60 });
  assert.ok(results.some((r) => r.skipped), "expected some tasks to be skipped once the budget ran out");
  assert.equal(results.length, 10, "skipped work is still accounted for, not silently dropped");
});

test("interleaving spreads consecutive work across domains", () => {
  const tasks = [
    { domain: "a", run: async () => 1 },
    { domain: "a", run: async () => 2 },
    { domain: "a", run: async () => 3 },
    { domain: "b", run: async () => 4 },
    { domain: "b", run: async () => 5 },
  ];
  const order = interleaveByDomain(tasks).map((t) => t.domain);
  assert.deepEqual(order, ["a", "b", "a", "b", "a"]);
});

test("domains ignore the www prefix", () => {
  assert.equal(domainOf("https://www.goldmansachs.com/careers"), domainOf("https://goldmansachs.com/students"));
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

test("success clears a failure streak", () => {
  assert.deepEqual(healthAfterSuccess(), { health: "HEALTHY", consecutiveFailures: 0 });
});

test("repeated failures escalate to FAILING", () => {
  let state = { consecutiveFailures: 0 };
  let health = healthAfterFailure(state, "FETCH_ERROR");
  assert.equal(health.health, "DEGRADED");

  for (let i = 1; i < FAILING_AFTER; i++) {
    state = { consecutiveFailures: health.consecutiveFailures };
    health = healthAfterFailure(state, "FETCH_ERROR");
  }
  assert.equal(health.health, "FAILING");
});

test("a bot wall is BLOCKED on the first failure", () => {
  assert.equal(healthAfterFailure({ consecutiveFailures: 0 }, "BLOCKED").health, "BLOCKED");
  assert.equal(healthAfterFailure({ consecutiveFailures: 0 }, "CAPTCHA").health, "BLOCKED");
});

test("a missing careers URL is failing immediately, not after three tries", () => {
  assert.equal(healthAfterFailure({ consecutiveFailures: 0 }, "CAREERS_URL_MISSING").health, "FAILING");
});

test("infrastructure failures are always critical", () => {
  for (const kind of ["CRON_MISSED", "QUEUE_STALLED", "DATABASE_ERROR", "ABNORMALLY_LOW_RESULTS"] as const) {
    assert.equal(severityFor(kind, 1, false), "CRITICAL");
  }
});

test("a broken Tier 1 source shouts louder than a Tier 3 one", () => {
  assert.equal(severityFor("CAREERS_URL_MISSING", 1, true), "CRITICAL");
  assert.equal(severityFor("CAREERS_URL_MISSING", 1, false), "WARNING");
});

test("a collapsing result count is flagged", () => {
  assert.equal(isAbnormallyLow(2, [40, 38, 41, 39, 42]), true, "a parser break must not pass as a quiet week");
  assert.equal(isAbnormallyLow(38, [40, 38, 41, 39, 42]), false);
});

test("a low count with no baseline is not flagged", () => {
  assert.equal(isAbnormallyLow(0, []), false, "a new install has no baseline to be abnormal against");
  assert.equal(isAbnormallyLow(0, [1, 2, 1]), false, "a genuinely quiet source is not a failure");
});

test("a skipped scheduled run is noticed", () => {
  const now = new Date("2026-09-18T15:00:00Z");
  assert.equal(cronLooksMissed(new Date("2026-09-18T14:05:00Z"), now, 60), false, "a few minutes of jitter is fine");
  assert.equal(cronLooksMissed(new Date("2026-09-18T11:00:00Z"), now, 60), true, "four hours of silence is not");
  assert.equal(cronLooksMissed(null, now, 60), false, "never having run is not a missed run");
});

// ---------------------------------------------------------------------------
// Adapter inference
// ---------------------------------------------------------------------------

test("recruitment year runs a cycle ahead in autumn", () => {
  assert.equal(inferRecruitmentYear("Spring Week", new Date("2026-09-18")), 2027, "autumn 2026 recruits the 2027 cohort");
  assert.equal(inferRecruitmentYear("Spring Week", new Date("2026-03-01")), 2026);
});

test("an explicit year on the page beats the inference", () => {
  assert.equal(inferRecruitmentYear("Spring Insight Programme 2027 applications", new Date("2026-03-01")), 2027);
});

test("an implausible year is ignored", () => {
  assert.equal(inferRecruitmentYear("Founded in 2003. Spring Week.", new Date("2026-09-18")), 2027);
});

test("rolling wording is recognised", () => {
  assert.equal(inferRolling("Applications are assessed on a rolling basis, so apply early."), true);
  assert.equal(inferRolling("The deadline is 31 October."), false);
});

test("eligibility years are read only when stated", () => {
  assert.deepEqual(inferEligibleYears("Open to first-year students"), [1]);
  assert.deepEqual(inferEligibleYears("Open to year 1 and year 2 students"), [1, 2]);
  assert.deepEqual(inferEligibleYears("Open to undergraduates"), [], "an unstated criterion must stay unstated");
  assert.deepEqual(inferEligibleYears("Penultimate year students"), [], "penultimate depends on a degree length we do not have");
});

// ---------------------------------------------------------------------------
// Generic adapter
// ---------------------------------------------------------------------------

const FIRM = { id: "f1", name: "Example Bank", websiteDomain: "examplebank.com", atsProvider: "PROPRIETARY" as const };
const SOURCE = { id: "s1", kind: "OFFICIAL_CAREERS_PAGE" as const, url: "https://examplebank.com/careers", atsProvider: null };

function parse(text: string, now = new Date("2026-09-18")) {
  return genericPageAdapter.parse({ firm: FIRM, source: SOURCE, text, url: SOURCE.url, now });
}

test("a page with no programme vocabulary yields nothing", () => {
  assert.deepEqual(parse("We are a bank. We do banking things."), []);
});

test("a spring week page yields one candidate with its context", () => {
  const candidates = parse(
    "Our Spring Insight Programme in Investment Banking is based in London. Apply now — applications are assessed on a rolling basis. Open to first-year students.",
  );
  assert.equal(candidates.length, 1);
  const c = candidates[0];
  assert.equal(c.category, "SPRING_INSIGHT");
  assert.equal(c.area, "INVESTMENT_BANKING");
  assert.equal(c.location, "London");
  assert.equal(c.rolling, true);
  assert.equal(c.applicationLive, true);
  assert.deepEqual(c.eligibleYears, [1]);
  assert.equal(c.recruitmentYear, 2027);
});

test("a page advertising two programme families yields two candidates, not twelve", () => {
  const candidates = parse("We run a Spring Week and a Summer Internship. Apply now.");
  assert.equal(candidates.length, 2);
  const categories = candidates.map((c) => c.category).sort();
  assert.deepEqual(categories, ["SPRING_WEEK", "SUMMER_INTERNSHIP"]);
});

test("the generic adapter never claims to have found the application link", () => {
  const [candidate] = parse("Spring Week. Apply now.");
  assert.equal(candidate.applicationUrl, null, "only verification resolves a real application URL");
});

test("a page saying applications are closed carries that signal", () => {
  const [candidate] = parse("Spring Week 2027. Applications are closed for this cycle.");
  assert.equal(candidate.closedSignal, true);
  assert.equal(candidate.applicationLive, false);
});

test("overlapping vocabulary does not double-count one programme", () => {
  // "Spring Insight Programme" contains both "spring insight" and "insight
  // programme". That is one programme, not two.
  const candidates = parse("Our Spring Insight Programme opens in September. Apply now.");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].category, "SPRING_INSIGHT", "the more specific phrase should win the span");
});

test("the same programme named twice on a page is still one candidate", () => {
  const candidates = parse("Spring Week 2027. Read about the Spring Week. Apply now to our Spring Week.");
  assert.equal(candidates.length, 1);
});
