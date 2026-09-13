import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/lib/constants";
import type { Division, ProgrammeType } from "@prisma/client";

// -----------------------------------------------------------------------------
// Opportunity discovery — V1 "manual check" implementation.
//
// This performs a lightweight, honest keyword scan of a company's public
// careers page. It never invents deadlines, opening dates, or application
// links, and it never marks anything "Confirmed Open" — that verification
// step is reserved for a human confirming details on the employer's own site
// (see VerificationStatus in the schema). Its only job is to surface
// candidates worth a human looking at, tagged "Needs Verification", so this
// architecture (CheckRun log + verification status) can later be wired up to
// a scheduled job without changing how results are recorded — see
// src/app/api/cron/check-all/route.ts, which does exactly that, hourly.
//
// A note on "first-year eligible": there is no reliable way to determine a
// specific programme's year-of-study eligibility from a plain-text keyword
// scan. Spring Weeks, Insight Programmes, Insight Days and First-Year /
// Off-Cycle Internships are the industry-standard first-year-eligible
// programme types, so those are matched with `likelyFirstYear: true`.
// Standard "Summer Analyst" / "Summer Internship" programmes are
// conventionally reserved for penultimate-year students (feeding into a
// full-time offer) — they're still surfaced here, since they're worth
// knowing about, but flagged `likelyFirstYear: false` and the generated
// opportunity's notes say so explicitly rather than asserting eligibility
// the scan can't actually confirm.
// -----------------------------------------------------------------------------

const TYPE_KEYWORDS: {
  phrase: string;
  programmeType: ProgrammeType;
  likelyFirstYear: boolean;
}[] = [
  { phrase: "spring week", programmeType: "SPRING_WEEK", likelyFirstYear: true },
  { phrase: "spring programme", programmeType: "SPRING_WEEK", likelyFirstYear: true },
  { phrase: "spring program", programmeType: "SPRING_WEEK", likelyFirstYear: true },
  { phrase: "springboard", programmeType: "SPRING_WEEK", likelyFirstYear: true },
  { phrase: "spring insight", programmeType: "INSIGHT_PROGRAMME", likelyFirstYear: true },
  { phrase: "insight programme", programmeType: "INSIGHT_PROGRAMME", likelyFirstYear: true },
  { phrase: "insight program", programmeType: "INSIGHT_PROGRAMME", likelyFirstYear: true },
  { phrase: "insight day", programmeType: "INSIGHT_PROGRAMME", likelyFirstYear: true },
  { phrase: "early insight", programmeType: "INSIGHT_PROGRAMME", likelyFirstYear: true },
  { phrase: "discovery programme", programmeType: "INSIGHT_PROGRAMME", likelyFirstYear: true },
  { phrase: "discovery program", programmeType: "INSIGHT_PROGRAMME", likelyFirstYear: true },
  { phrase: "explore programme", programmeType: "INSIGHT_PROGRAMME", likelyFirstYear: true },
  { phrase: "first-year internship", programmeType: "FIRST_YEAR_INTERNSHIP", likelyFirstYear: true },
  { phrase: "first year internship", programmeType: "FIRST_YEAR_INTERNSHIP", likelyFirstYear: true },
  { phrase: "first year programme", programmeType: "FIRST_YEAR_INTERNSHIP", likelyFirstYear: true },
  { phrase: "first year scheme", programmeType: "FIRST_YEAR_INTERNSHIP", likelyFirstYear: true },
  { phrase: "off-cycle internship", programmeType: "FIRST_YEAR_INTERNSHIP", likelyFirstYear: true },
  { phrase: "off cycle internship", programmeType: "FIRST_YEAR_INTERNSHIP", likelyFirstYear: true },
  { phrase: "summer analyst", programmeType: "OTHER", likelyFirstYear: false },
  { phrase: "summer internship", programmeType: "OTHER", likelyFirstYear: false },
  { phrase: "summer program", programmeType: "OTHER", likelyFirstYear: false },
  { phrase: "summer programme", programmeType: "OTHER", likelyFirstYear: false },
];

const DIVISION_KEYWORDS: { phrase: string; division: Division }[] = [
  { phrase: "sales and trading", division: "SALES_AND_TRADING" },
  { phrase: "sales & trading", division: "SALES_AND_TRADING" },
  { phrase: "global markets", division: "SALES_AND_TRADING" },
  { phrase: "quantitative", division: "QUANTITATIVE_FINANCE" },
  { phrase: "asset management", division: "ASSET_MANAGEMENT" },
  { phrase: "investment management", division: "ASSET_MANAGEMENT" },
  { phrase: "private equity", division: "PRIVATE_EQUITY" },
  { phrase: "hedge fund", division: "HEDGE_FUNDS" },
  { phrase: "investment banking", division: "INVESTMENT_BANKING" },
];

const FETCH_TIMEOUT_MS = 8000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function runCompanyCheck(companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: DEMO_USER_ID },
  });
  if (!company) throw new Error("Company not found");

  const startedAt = new Date();

  if (!company.careersUrl) {
    return prisma.checkRun.create({
      data: {
        companyId,
        startedAt,
        finishedAt: new Date(),
        success: false,
        message: "No careers URL configured for this company — add one to enable checks.",
        matchCount: 0,
      },
    });
  }

  let text: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(company.careersUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HQOpportunityBot/1.0; +https://example.com)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return prisma.checkRun.create({
        data: {
          companyId,
          startedAt,
          finishedAt: new Date(),
          success: false,
          message: `Careers page responded with HTTP ${res.status}. It may block automated requests — check manually.`,
          matchCount: 0,
        },
      });
    }
    const html = await res.text();
    text = stripHtml(html).toLowerCase();
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown error";
    return prisma.checkRun.create({
      data: {
        companyId,
        startedAt,
        finishedAt: new Date(),
        success: false,
        message: `Could not reach the careers page (${reason}). Check the URL, or verify manually.`,
        matchCount: 0,
      },
    });
  }

  const matchedTypes = TYPE_KEYWORDS.filter((k) => text.includes(k.phrase));
  const matchedDivisions = DIVISION_KEYWORDS.filter((k) => text.includes(k.phrase));
  const inferredDivision: Division = matchedDivisions[0]?.division ?? "OTHER";
  const now = new Date();

  for (const match of matchedTypes) {
    const existing = await prisma.opportunity.findFirst({
      where: {
        userId: DEMO_USER_ID,
        companyId,
        programme: { contains: titleCase(match.phrase) },
      },
    });

    if (existing) {
      await prisma.opportunity.update({
        where: { id: existing.id },
        data: {
          lastCheckedAt: now,
          verificationStatus:
            existing.verificationStatus === "CONFIRMED_OPEN" ? "CONFIRMED_OPEN" : "NEEDS_VERIFICATION",
        },
      });
    } else {
      const eligibilityNote = match.likelyFirstYear
        ? "This programme type is normally first-year eligible, but confirm on the official page."
        : "This reads as a standard Summer internship — those are usually reserved for penultimate-year students, not first years. Verify eligibility before relying on this.";

      await prisma.opportunity.create({
        data: {
          userId: DEMO_USER_ID,
          companyId,
          companyName: company.name,
          programme: `${titleCase(match.phrase)} (auto-detected)`,
          division: inferredDivision,
          programmeType: match.programmeType,
          status: "NOT_OPEN",
          source: "Automatic keyword scan",
          sourceUrl: company.careersUrl,
          verificationStatus: "NEEDS_VERIFICATION",
          lastCheckedAt: now,
          notes: `Detected the phrase "${match.phrase}" on the careers page. ${eligibilityNote} Opening date, deadline and application link were not set automatically.`,
        },
      });
    }
  }

  return prisma.checkRun.create({
    data: {
      companyId,
      startedAt,
      finishedAt: new Date(),
      success: true,
      matchCount: matchedTypes.length,
      message:
        matchedTypes.length > 0
          ? `Found ${matchedTypes.length} relevant mention${matchedTypes.length === 1 ? "" : "s"} on the careers page (${matchedTypes
              .map((m) => m.phrase)
              .join(", ")}). Marked as Needs Verification — confirm details on the official site.`
          : "No relevant keywords found on the careers page right now.",
    },
  });
}

const CHECK_CONCURRENCY = 6;

/**
 * Runs a check against every enabled, watched company for the demo user.
 * Used by both the manual "check all" action and the hourly cron job.
 * Runs with limited concurrency (rather than one-at-a-time or all-at-once)
 * so a watchlist of dozens of companies finishes in a few seconds instead of
 * minutes, and stays comfortably under a serverless function's time limit.
 */
export async function runAllEnabledChecks() {
  const companies = await prisma.company.findMany({
    where: { userId: DEMO_USER_ID, enabled: true, careersUrl: { not: null } },
  });

  const results: { companyId: string; companyName: string; success: boolean; matchCount: number }[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < companies.length) {
      const company = companies[cursor++];
      try {
        const run = await runCompanyCheck(company.id);
        results.push({ companyId: company.id, companyName: company.name, success: run.success, matchCount: run.matchCount });
      } catch {
        results.push({ companyId: company.id, companyName: company.name, success: false, matchCount: 0 });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CHECK_CONCURRENCY, companies.length) }, worker));
  return results;
}
