/**
 * FOE vocabulary — the single place programme terms, divisions and regions are
 * defined.
 *
 * Deliberately data, not code: adapters, the discovery engine and the UI all
 * read from here, so widening FOE beyond spring weeks (asset management, quant,
 * summer internships, scholarships, competitions...) is an edit to this file
 * rather than a hunt for keywords scattered across the codebase.
 *
 * Nothing here searches for the literal phrase "spring week" alone — that is the
 * single most common way to miss a programme.
 */

import type { FinanceArea, FirmCategory, OpportunityCategory } from "@prisma/client";

// ---------------------------------------------------------------------------
// Programme terminology
// ---------------------------------------------------------------------------

export interface ProgrammeTerm {
  /** Lowercase phrase to match against cleaned page text. */
  phrase: string;
  category: OpportunityCategory;
  /**
   * Whether this programme family is conventionally open to first years.
   * `false` does not exclude it — it only stops FOE implying an eligibility it
   * has not actually verified.
   */
  firstYearFamily: boolean;
}

export const PROGRAMME_TERMS: ProgrammeTerm[] = [
  // Spring weeks and their many aliases
  { phrase: "spring week", category: "SPRING_WEEK", firstYearFamily: true },
  { phrase: "spring weeks", category: "SPRING_WEEK", firstYearFamily: true },
  { phrase: "spring programme", category: "SPRING_WEEK", firstYearFamily: true },
  { phrase: "spring program", category: "SPRING_WEEK", firstYearFamily: true },
  { phrase: "springboard", category: "SPRING_WEEK", firstYearFamily: true },
  { phrase: "spring insight", category: "SPRING_INSIGHT", firstYearFamily: true },
  { phrase: "spring insight programme", category: "SPRING_INSIGHT", firstYearFamily: true },

  // Insight programmes
  { phrase: "insight programme", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "insight program", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "insight week", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "insight day", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "insight experience", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "insight series", category: "INSIGHT_PROGRAMME", firstYearFamily: true },

  // Early insight
  { phrase: "early insight", category: "EARLY_INSIGHT", firstYearFamily: true },
  { phrase: "early careers insight", category: "EARLY_INSIGHT", firstYearFamily: true },
  { phrase: "pre-internship programme", category: "EARLY_INSIGHT", firstYearFamily: true },
  { phrase: "pre-internship program", category: "EARLY_INSIGHT", firstYearFamily: true },

  // Discovery / explore branding
  { phrase: "discovery programme", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "discovery program", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "discover programme", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "discover program", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "explore programme", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "explore program", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "career discovery", category: "INSIGHT_PROGRAMME", firstYearFamily: true },

  // First year / freshman
  { phrase: "first year programme", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },
  { phrase: "first-year programme", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },
  { phrase: "first year program", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },
  { phrase: "first-year program", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },
  { phrase: "first year internship", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },
  { phrase: "first-year internship", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },
  { phrase: "first year scheme", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },
  { phrase: "freshman programme", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },
  { phrase: "freshman program", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },
  { phrase: "sophomore programme", category: "FIRST_YEAR_PROGRAMME", firstYearFamily: true },

  // Diversity / women's programmes (first-year eligible at most firms)
  { phrase: "women's insight", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "womens insight", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "women in banking", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "women in finance", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "future women leaders", category: "INSIGHT_PROGRAMME", firstYearFamily: true },
  { phrase: "diversity insight", category: "INSIGHT_PROGRAMME", firstYearFamily: true },

  // Adjacent families — surfaced, never asserted as first-year eligible
  { phrase: "summer analyst", category: "SUMMER_INTERNSHIP", firstYearFamily: false },
  { phrase: "summer internship", category: "SUMMER_INTERNSHIP", firstYearFamily: false },
  { phrase: "summer programme", category: "SUMMER_INTERNSHIP", firstYearFamily: false },
  { phrase: "summer program", category: "SUMMER_INTERNSHIP", firstYearFamily: false },
  { phrase: "off-cycle internship", category: "OFF_CYCLE_INTERNSHIP", firstYearFamily: true },
  { phrase: "off cycle internship", category: "OFF_CYCLE_INTERNSHIP", firstYearFamily: true },
  { phrase: "industrial placement", category: "INDUSTRIAL_PLACEMENT", firstYearFamily: false },
  { phrase: "placement year", category: "INDUSTRIAL_PLACEMENT", firstYearFamily: false },
  { phrase: "graduate programme", category: "GRADUATE_PROGRAMME", firstYearFamily: false },
  { phrase: "graduate scheme", category: "GRADUATE_PROGRAMME", firstYearFamily: false },
  { phrase: "scholarship", category: "SCHOLARSHIP", firstYearFamily: true },
  { phrase: "bursary", category: "SCHOLARSHIP", firstYearFamily: true },
  { phrase: "networking event", category: "NETWORKING_EVENT", firstYearFamily: true },
  { phrase: "networking evening", category: "NETWORKING_EVENT", firstYearFamily: true },
  { phrase: "trading competition", category: "COMPETITION", firstYearFamily: true },
  { phrase: "case competition", category: "COMPETITION", firstYearFamily: true },
];

/** Programme families FOE focuses on first. Everything else stays supported. */
export const FOCUS_CATEGORIES: OpportunityCategory[] = [
  "SPRING_WEEK",
  "SPRING_INSIGHT",
  "INSIGHT_PROGRAMME",
  "FIRST_YEAR_PROGRAMME",
  "EARLY_INSIGHT",
];

// ---------------------------------------------------------------------------
// Divisions / finance areas
// ---------------------------------------------------------------------------

export interface AreaTerm {
  phrase: string;
  area: FinanceArea;
}

/** Longest phrases first so "sales and trading" wins over "trading". */
export const AREA_TERMS: AreaTerm[] = [
  { phrase: "mergers and acquisitions", area: "MERGERS_AND_ACQUISITIONS" },
  { phrase: "mergers & acquisitions", area: "MERGERS_AND_ACQUISITIONS" },
  { phrase: "m&a", area: "MERGERS_AND_ACQUISITIONS" },
  { phrase: "equity capital markets", area: "EQUITY_CAPITAL_MARKETS" },
  { phrase: "debt capital markets", area: "DEBT_CAPITAL_MARKETS" },
  { phrase: "leveraged finance", area: "LEVERAGED_FINANCE" },
  { phrase: "capital markets", area: "CAPITAL_MARKETS" },
  { phrase: "corporate finance", area: "CORPORATE_FINANCE" },
  { phrase: "global advisory", area: "ADVISORY" },
  { phrase: "restructuring", area: "RESTRUCTURING" },
  { phrase: "sales and trading", area: "SALES_AND_TRADING" },
  { phrase: "sales & trading", area: "SALES_AND_TRADING" },
  { phrase: "global markets", area: "GLOBAL_MARKETS" },
  { phrase: "investment banking", area: "INVESTMENT_BANKING" },
  { phrase: "private equity", area: "PRIVATE_EQUITY" },
  { phrase: "asset management", area: "ASSET_MANAGEMENT" },
  { phrase: "investment management", area: "ASSET_MANAGEMENT" },
  { phrase: "wealth management", area: "ASSET_MANAGEMENT" },
  { phrase: "hedge fund", area: "HEDGE_FUND" },
  { phrase: "quantitative", area: "QUANTITATIVE" },
  { phrase: "fixed income", area: "FIXED_INCOME" },
  { phrase: "equity research", area: "RESEARCH" },
  { phrase: "equities", area: "EQUITIES" },
  { phrase: "research", area: "RESEARCH" },
  { phrase: "advisory", area: "ADVISORY" },
  { phrase: "investments", area: "INVESTMENTS" },
  { phrase: "markets", area: "MARKETS" },
];

/**
 * The areas offered as filter chips and interest toggles. The enum is wider;
 * these are the ones worth putting in front of a user.
 */
export const PRIMARY_AREAS: FinanceArea[] = [
  "INVESTMENT_BANKING",
  "PRIVATE_EQUITY",
  "SALES_AND_TRADING",
  "ASSET_MANAGEMENT",
  "HEDGE_FUND",
  "QUANTITATIVE",
];

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

export const REGIONS = ["London", "UK", "Europe", "International"] as const;
export type Region = (typeof REGIONS)[number];

/** Rough location -> region mapping for filtering. Recall over precision. */
export function regionForLocation(location: string | null | undefined): Region | null {
  if (!location) return null;
  const l = location.toLowerCase();
  if (l.includes("london")) return "London";
  if (
    ["uk", "united kingdom", "england", "scotland", "wales", "birmingham", "manchester", "edinburgh", "glasgow", "leeds", "bristol"].some(
      (t) => l.includes(t),
    )
  ) {
    return "UK";
  }
  if (
    ["europe", "emea", "paris", "frankfurt", "milan", "madrid", "amsterdam", "dublin", "zurich", "geneva", "stockholm", "munich"].some(
      (t) => l.includes(t),
    )
  ) {
    return "Europe";
  }
  return "International";
}

// ---------------------------------------------------------------------------
// Firm categories
// ---------------------------------------------------------------------------

export const FIRM_CATEGORY_GROUPS: { label: string; categories: FirmCategory[] }[] = [
  { label: "Banks", categories: ["BULGE_BRACKET", "ELITE_BOUTIQUE", "INVESTMENT_BANK", "MIDDLE_MARKET_BANK"] },
  { label: "Buy side", categories: ["PRIVATE_EQUITY", "ASSET_MANAGER", "HEDGE_FUND", "ALTERNATIVE_ASSET_MANAGER", "INSTITUTIONAL_INVESTOR"] },
  { label: "Trading", categories: ["MARKET_MAKER", "PROPRIETARY_TRADING", "QUANT"] },
  { label: "Other", categories: ["OTHER_FINANCE"] },
];

// ---------------------------------------------------------------------------
// Matching helpers (deterministic — no AI needed for this part)
// ---------------------------------------------------------------------------

/** Every programme term present in a blob of text, longest match first. */
export function matchProgrammeTerms(text: string): ProgrammeTerm[] {
  const haystack = text.toLowerCase();
  const hits = PROGRAMME_TERMS.filter((t) => haystack.includes(t.phrase));
  return hits.sort((a, b) => b.phrase.length - a.phrase.length);
}

/** The most specific finance area mentioned, or null. */
export function matchArea(text: string): FinanceArea | null {
  const haystack = text.toLowerCase();
  for (const term of [...AREA_TERMS].sort((a, b) => b.phrase.length - a.phrase.length)) {
    if (haystack.includes(term.phrase)) return term.area;
  }
  return null;
}

/** The most specific programme category mentioned, or null. */
export function matchCategory(text: string): OpportunityCategory | null {
  return matchProgrammeTerms(text)[0]?.category ?? null;
}
