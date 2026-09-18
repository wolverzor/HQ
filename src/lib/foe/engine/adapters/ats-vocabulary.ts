/**
 * Early-career vocabulary for ATS job titles.
 *
 * Separate from src/lib/foe/taxonomy.ts on purpose. That file matches prose on
 * a careers page, where "spring week" appearing anywhere is a useful signal.
 * A job title is a different kind of text: short, structured, and written to
 * describe one role. Matching it needs both a wider net (firms name the same
 * thing "Graduate Trader", "Trading Intern" or "2027 – Internship, Quantitative
 * Research") and a tighter filter, because the obvious keywords also appear in
 * senior staff roles.
 *
 * Every pattern here was checked against live board data. The exclusions in
 * particular are not hypothetical: "Campus Recruiter", "Swag Program Manager"
 * and "Programming Language Engineer" are real titles that a naive /program|
 * campus/ match would have filed as student opportunities.
 */

import type { OpportunityCategory } from "@prisma/client";

interface TitlePattern {
  pattern: RegExp;
  category: OpportunityCategory;
}

/**
 * Ordered most specific first: a title matching several patterns takes the
 * first, so "Spring Insight Internship" is a spring insight rather than a
 * generic internship.
 */
const TITLE_PATTERNS: TitlePattern[] = [
  { pattern: /\bspring\s*(week|insight|programme|program)\b/i, category: "SPRING_WEEK" },
  { pattern: /\bspring\s+(analyst|intern)/i, category: "SPRING_WEEK" },
  // Year-of-study wording outranks the generic programme words that usually
  // accompany it: "First-Year Insight Day" is filed as a first-year programme,
  // because for this audience the year is the load-bearing detail.
  { pattern: /\bfirst[-\s]?year\b/i, category: "FIRST_YEAR_PROGRAMME" },
  { pattern: /\b(freshman|sophomore)\b/i, category: "FIRST_YEAR_PROGRAMME" },
  { pattern: /\binsight\s*(programme|program|week|day|series|experience)\b/i, category: "INSIGHT_PROGRAMME" },
  { pattern: /\bearly\s+(careers?|insight)\b/i, category: "EARLY_INSIGHT" },
  { pattern: /\b(discover|discovery|explore)\s+(programme|program|day|week)\b/i, category: "INSIGHT_PROGRAMME" },
  { pattern: /\boff[-\s]?cycle\b/i, category: "OFF_CYCLE_INTERNSHIP" },
  { pattern: /\b(industrial\s+placement|placement\s+year|year[-\s]in[-\s]industry)\b/i, category: "INDUSTRIAL_PLACEMENT" },
  { pattern: /\bplacement\b/i, category: "INDUSTRIAL_PLACEMENT" },
  { pattern: /\bnetworking\s+(event|evening|session)\b/i, category: "NETWORKING_EVENT" },
  { pattern: /\b(case|trading|markets)\s+competition\b/i, category: "COMPETITION" },
  { pattern: /\bscholarship\b/i, category: "SCHOLARSHIP" },
  { pattern: /\bsummer\s*(analyst|internship|intern|programme|program|associate)\b/i, category: "SUMMER_INTERNSHIP" },
  { pattern: /\bintern(ship)?\b/i, category: "SUMMER_INTERNSHIP" },
  { pattern: /\b(graduate|new\s*grad)\b/i, category: "GRADUATE_PROGRAMME" },
  { pattern: /\bapprentice(ship)?\b/i, category: "GRADUATE_PROGRAMME" },
  { pattern: /\bacademy\b/i, category: "INSIGHT_PROGRAMME" },
  { pattern: /\bcampus\s+(programme|program|hire|recruitment\s+programme)\b/i, category: "GRADUATE_PROGRAMME" },
];

/**
 * Titles that contain early-career words but describe a permanent staff role —
 * usually the person who runs the programme, or an unrelated use of "program".
 *
 * Checked before the positive patterns. Each entry corresponds to a real title
 * observed on a live board.
 */
const EXCLUSIONS: RegExp[] = [
  // The people who hire students are not student opportunities.
  /\b(recruiter|recruiting|recruitment)\b/i,
  /\btalent\s+(acquisition|partner|manager)\b/i,
  // A talent pool signup is a mailing list, not an opportunity with a deadline
  // — "2027 EU Campus Programme Talent Community" is a real example.
  /\btalent\s+(community|pool|network|pipeline)\b/i,
  // "Program/Programme Manager", "Technical Program Manager", "Swag Program Manager".
  /\b(technical\s+)?program(me)?\s+(manager|director|lead|coordinator)\b/i,
  // "Programming Language Engineer" — "programming" is not "programme".
  /\bprogramming\b/i,
  // Senior roles that merely mention a programme. "Technology Director - QRT
  // Academy" is a director's job, not a place on the academy.
  /\b(director|vice\s+president|principal|chief|partner)\b/i,
  /\bhead\s+of\b/i,
  /\b(senior|staff|lead)\s+(manager|engineer|analyst|developer|researcher|scientist)\b/i,
  /\b(intern|graduate)\s+(programme|program)\s+(manager|lead|owner)\b/i,
  // Experienced-hire wording that overrides an otherwise matching title.
  /\bexperienced\s+hire\b/i,
];

export interface TitleMatch {
  category: OpportunityCategory;
  /** The phrase that matched, for the evidence excerpt. */
  matched: string;
}

/**
 * Classifies an ATS job title, or returns null when it is not an early-career
 * opportunity.
 *
 * Returning null readily is correct here: an ATS board is mostly full-time
 * roles, and a false positive puts a senior engineering job on a student's
 * dashboard, which erodes trust in everything next to it. The careers-page
 * adapter remains the high-recall net.
 */
export function classifyJobTitle(title: string): TitleMatch | null {
  if (!title.trim()) return null;

  for (const exclusion of EXCLUSIONS) {
    if (exclusion.test(title)) return null;
  }

  for (const { pattern, category } of TITLE_PATTERNS) {
    const m = title.match(pattern);
    if (m) return { category, matched: m[0] };
  }

  return null;
}

/**
 * Whether a location string is somewhere the user could plausibly apply from.
 *
 * Boards are global, and a London student does not need Jane Street's Hong Kong
 * internship on their dashboard. This filters for display; nothing is deleted,
 * and the region filter in the UI remains the user's own control.
 */
const RELEVANT_LOCATION = /\b(london|uk|united kingdom|england|scotland|wales|europe|emea|dublin|paris|frankfurt|amsterdam|zurich|geneva|milan|madrid|munich|stockholm|luxembourg)\b/i;

export function isRelevantLocation(location: string | null | undefined): boolean {
  if (!location) return true; // Unknown location is not a reason to drop a lead.
  return RELEVANT_LOCATION.test(location);
}

/** Pulls a four-digit recruitment year out of a title, when one is stated. */
export function yearFromTitle(title: string, now: Date): number | null {
  const years = [...title.matchAll(/\b(20\d{2})\b/g)]
    .map((m) => Number(m[1]))
    .filter((y) => y >= now.getFullYear() && y <= now.getFullYear() + 3);
  return years.length > 0 ? Math.min(...years) : null;
}
