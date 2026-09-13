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
// a scheduled job without changing how results are recorded.
// -----------------------------------------------------------------------------

const KEYWORDS: { phrase: string; programmeType: ProgrammeType; division: Division }[] = [
  { phrase: "spring week", programmeType: "SPRING_WEEK", division: "OTHER" },
  { phrase: "spring programme", programmeType: "SPRING_WEEK", division: "OTHER" },
  { phrase: "spring program", programmeType: "SPRING_WEEK", division: "OTHER" },
  { phrase: "spring insight", programmeType: "INSIGHT_PROGRAMME", division: "OTHER" },
  { phrase: "insight programme", programmeType: "INSIGHT_PROGRAMME", division: "OTHER" },
  { phrase: "insight program", programmeType: "INSIGHT_PROGRAMME", division: "OTHER" },
  { phrase: "first-year internship", programmeType: "FIRST_YEAR_INTERNSHIP", division: "OTHER" },
  { phrase: "first year internship", programmeType: "FIRST_YEAR_INTERNSHIP", division: "OTHER" },
  { phrase: "off-cycle internship", programmeType: "FIRST_YEAR_INTERNSHIP", division: "OTHER" },
  { phrase: "off cycle internship", programmeType: "FIRST_YEAR_INTERNSHIP", division: "OTHER" },
  { phrase: "sales and trading", programmeType: "OTHER", division: "SALES_AND_TRADING" },
  { phrase: "sales & trading", programmeType: "OTHER", division: "SALES_AND_TRADING" },
  { phrase: "quantitative", programmeType: "OTHER", division: "QUANTITATIVE_FINANCE" },
  { phrase: "asset management", programmeType: "OTHER", division: "ASSET_MANAGEMENT" },
  { phrase: "private equity", programmeType: "OTHER", division: "PRIVATE_EQUITY" },
  { phrase: "hedge fund", programmeType: "OTHER", division: "HEDGE_FUNDS" },
  { phrase: "investment banking", programmeType: "OTHER", division: "INVESTMENT_BANKING" },
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

  const matched = KEYWORDS.filter((k) => text.includes(k.phrase));
  const now = new Date();

  for (const match of matched) {
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
      await prisma.opportunity.create({
        data: {
          userId: DEMO_USER_ID,
          companyId,
          companyName: company.name,
          programme: `${titleCase(match.phrase)} (auto-detected)`,
          division: match.division,
          programmeType: match.programmeType,
          status: "NOT_OPEN",
          source: "Automatic keyword scan",
          sourceUrl: company.careersUrl,
          verificationStatus: "NEEDS_VERIFICATION",
          lastCheckedAt: now,
          notes: `Detected the phrase "${match.phrase}" on the careers page. Opening date, deadline and application link were not set automatically — verify on the official site before relying on this.`,
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
      matchCount: matched.length,
      message:
        matched.length > 0
          ? `Found ${matched.length} relevant mention${matched.length === 1 ? "" : "s"} on the careers page (${matched
              .map((m) => m.phrase)
              .join(", ")}). Marked as Needs Verification — confirm details on the official site.`
          : "No relevant keywords found on the careers page right now.",
    },
  });
}
