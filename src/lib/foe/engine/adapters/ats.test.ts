/**
 * ATS title classification.
 *
 * Every title in here is real, taken from a live Greenhouse board while
 * building this adapter. That matters: the failure mode is not exotic inputs,
 * it is ordinary job titles that happen to contain "programme" or "campus". A
 * senior engineering role on a student's dashboard undermines confidence in
 * every genuine row beside it.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { classifyJobTitle, isRelevantLocation, yearFromTitle } from "./ats-vocabulary";
import { cleanTitle, greenhouseToken, greenhouseJobsUrl } from "./greenhouse";
import { greenhouseAdapter } from "./greenhouse";

// ---------------------------------------------------------------------------
// Titles that must be rejected
// ---------------------------------------------------------------------------

test("the people who recruit students are not student opportunities", () => {
  assert.equal(classifyJobTitle("Campus Recruiter, Technology"), null);
  assert.equal(classifyJobTitle("Campus Recruiter, Early Careers Partnerships & Initiatives"), null);
  assert.equal(classifyJobTitle("Talent Acquisition Partner"), null);
});

test("'program' in an unrelated sense does not make a programme", () => {
  assert.equal(classifyJobTitle("Swag Program Manager"), null);
  assert.equal(classifyJobTitle("Technical Program Manager"), null);
  assert.equal(classifyJobTitle("Programming Language Engineer"), null, "'programming' is not 'programme'");
});

test("a senior role that merely mentions a programme is rejected", () => {
  assert.equal(classifyJobTitle("Technology Director - QRT Academy"), null);
  assert.equal(classifyJobTitle("Head of Early Careers"), null);
  assert.equal(classifyJobTitle("Vice President, Graduate Recruitment"), null);
});

test("a talent pool is a mailing list, not an opportunity", () => {
  assert.equal(classifyJobTitle("2027 EU Campus Programme Talent Community"), null);
  assert.equal(classifyJobTitle("Graduate Talent Pool"), null);
});

// ---------------------------------------------------------------------------
// Titles that must be accepted, however they are worded
// ---------------------------------------------------------------------------

test("the same thing named six ways is still found", () => {
  const cases: [string, string][] = [
    ["Spring Insight Programme 2027", "SPRING_WEEK"],
    ["2027 - Internship, Quantitative Research and Trading", "SUMMER_INTERNSHIP"],
    ["Trading Intern", "SUMMER_INTERNSHIP"],
    ["Graduate Trader", "GRADUATE_PROGRAMME"],
    ["2027 Graduate Software Engineer", "GRADUATE_PROGRAMME"],
    ["C++ Software Engineer, Early Careers", "EARLY_INSIGHT"],
    ["First-Year Insight Day", "FIRST_YEAR_PROGRAMME"],
    ["Off-Cycle Internship, M&A", "OFF_CYCLE_INTERNSHIP"],
    ["Industrial Placement, Markets", "INDUSTRIAL_PLACEMENT"],
  ];
  for (const [title, category] of cases) {
    const match = classifyJobTitle(title);
    assert.ok(match, `"${title}" should have matched`);
    assert.equal(match.category, category, `"${title}"`);
  }
});

test("the most specific category wins", () => {
  // Contains both "spring insight" and "internship".
  assert.equal(classifyJobTitle("Spring Insight Internship")?.category, "SPRING_WEEK");
});

// ---------------------------------------------------------------------------
// Title cleaning — the fingerprint depends on it
// ---------------------------------------------------------------------------

test("the year and location are stripped from the programme name", () => {
  assert.equal(cleanTitle("2027 – Internship, Quantitative Research and Trading"), "Internship, Quantitative Research and Trading");
  assert.equal(cleanTitle("2027 Point72 Academy Summer Internship Program - Hong Kong"), "Point72 Academy Summer Internship Program");
});

test("stripping the year does not leave its brackets behind", () => {
  assert.equal(cleanTitle("Graduate Software Engineer (2026)"), "Graduate Software Engineer");
});

test("the same programme in consecutive years cleans to one name", () => {
  assert.equal(cleanTitle("2026 Graduate Trader"), cleanTitle("2027 Graduate Trader"));
});

test("a stated year is read from the title", () => {
  const now = new Date("2026-09-18");
  assert.equal(yearFromTitle("2027 Graduate Trader", now), 2027);
  assert.equal(yearFromTitle("Graduate Trader", now), null);
  assert.equal(yearFromTitle("Founded 2003 - Graduate Trader", now), null, "an implausible year is ignored");
});

// ---------------------------------------------------------------------------
// Location relevance
// ---------------------------------------------------------------------------

test("locations are filtered to somewhere the user could apply", () => {
  assert.equal(isRelevantLocation("London, United Kingdom"), true);
  assert.equal(isRelevantLocation("Amsterdam, Netherlands"), true);
  assert.equal(isRelevantLocation("Hong Kong"), false);
  assert.equal(isRelevantLocation("New York, New York, United States"), false);
});

test("an unknown location is kept, not dropped", () => {
  assert.equal(isRelevantLocation(null), true, "missing data is not a reason to lose a lead");
  assert.equal(isRelevantLocation(""), true);
});

// ---------------------------------------------------------------------------
// The adapter itself
// ---------------------------------------------------------------------------

test("a Greenhouse board URL is recognised in its various forms", () => {
  assert.equal(greenhouseToken("https://boards.greenhouse.io/janestreet"), "janestreet");
  assert.equal(greenhouseToken("https://boards-api.greenhouse.io/v1/boards/point72/jobs"), "point72");
  assert.equal(greenhouseToken("https://www.example.com/careers"), null);
});

test("the adapter turns a board payload into candidates", () => {
  const payload = JSON.stringify({
    jobs: [
      { id: 1, title: "2027 Spring Insight Programme", absolute_url: "https://boards.greenhouse.io/x/jobs/1", location: { name: "London, UK" } },
      { id: 2, title: "Campus Recruiter", absolute_url: "https://boards.greenhouse.io/x/jobs/2", location: { name: "London, UK" } },
      { id: 3, title: "Graduate Trader", absolute_url: "https://boards.greenhouse.io/x/jobs/3", location: { name: "Hong Kong" } },
    ],
  });

  const candidates = greenhouseAdapter.parse({
    firm: { id: "f", name: "Example", websiteDomain: "example.com", atsProvider: "GREENHOUSE" },
    source: { id: "s", kind: "ATS", url: greenhouseJobsUrl("x"), atsProvider: "GREENHOUSE" },
    text: payload,
    url: greenhouseJobsUrl("x"),
    now: new Date("2026-09-18"),
  });

  assert.equal(candidates.length, 1, "the recruiter and the Hong Kong role should both be dropped");
  const [c] = candidates;
  assert.equal(c.programmeName, "Spring Insight Programme");
  assert.equal(c.recruitmentYear, 2027);
  assert.equal(c.location, "London, UK");
  // A live board posting IS the application, which is what makes this source
  // verifiable rather than a lead.
  assert.equal(c.applicationUrl, "https://boards.greenhouse.io/x/jobs/1");
  assert.equal(c.applicationLive, true);
});

test("a board that returns HTML instead of JSON yields nothing rather than throwing", () => {
  const candidates = greenhouseAdapter.parse({
    firm: { id: "f", name: "Example", websiteDomain: null, atsProvider: "GREENHOUSE" },
    source: { id: "s", kind: "ATS", url: greenhouseJobsUrl("x"), atsProvider: "GREENHOUSE" },
    text: "Just a moment... Checking your browser",
    url: greenhouseJobsUrl("x"),
    now: new Date(),
  });
  assert.deepEqual(candidates, []);
});
