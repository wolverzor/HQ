/**
 * Eligibility classification.
 *
 * The governing rule: a false negative (hiding a programme the user could have
 * applied to) is far worse than a false positive. So this returns UNCLEAR
 * readily, and UNCLEAR is a visible, first-class verdict — never a reason to
 * drop a row from a list.
 *
 * Every verdict carries a human-readable reason. There is no opaque score.
 */

import type { EligibilityVerdict, OpportunityCategory } from "@prisma/client";

export interface EligibilityProfile {
  currentYear?: number | null;
  graduationYear?: number | null;
  degreeLengthYears?: number | null;
  workEligibility?: string | null;
  preferredRegions?: string[];
}

export interface EligibilityInput {
  category: OpportunityCategory;
  /** Years of study the employer states, when FOE has actually read them. */
  eligibleYears?: number[];
  /** Free text from the posting, if any. */
  eligibilityText?: string | null;
}

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  /** One sentence the UI shows verbatim. */
  reason: string;
}

/** Families conventionally open to first years. */
const FIRST_YEAR_FAMILIES: ReadonlySet<OpportunityCategory> = new Set<OpportunityCategory>([
  "SPRING_WEEK",
  "SPRING_INSIGHT",
  "INSIGHT_PROGRAMME",
  "FIRST_YEAR_PROGRAMME",
  "EARLY_INSIGHT",
]);

/** Families conventionally reserved for penultimate-year students. */
const PENULTIMATE_FAMILIES: ReadonlySet<OpportunityCategory> = new Set<OpportunityCategory>([
  "SUMMER_INTERNSHIP",
  "INDUSTRIAL_PLACEMENT",
]);

export function classifyEligibility(
  opportunity: EligibilityInput,
  profile: EligibilityProfile | null | undefined,
): EligibilityResult {
  if (!profile || profile.currentYear == null) {
    return {
      verdict: "UNCLEAR",
      reason: "Add your university year in settings and FOE can judge eligibility for you.",
    };
  }

  const year = profile.currentYear;

  // Strongest signal: the employer stated the years explicitly and FOE read it.
  if (opportunity.eligibleYears && opportunity.eligibleYears.length > 0) {
    if (opportunity.eligibleYears.includes(year)) {
      return {
        verdict: "ELIGIBLE",
        reason: `The employer states this is open to year ${opportunity.eligibleYears.join(", ")} students, and you are in year ${year}.`,
      };
    }
    return {
      verdict: "NOT_ELIGIBLE",
      reason: `The employer states this is for year ${opportunity.eligibleYears.join(", ")} students. You are in year ${year}.`,
    };
  }

  // Next: conventions by programme family. Stated as a convention, not a fact.
  if (FIRST_YEAR_FAMILIES.has(opportunity.category)) {
    if (year === 1) {
      return {
        verdict: "LIKELY_ELIGIBLE",
        reason: "This programme family is normally open to first years, but the employer has not stated its criteria here.",
      };
    }
    if (year === 2 && profile.degreeLengthYears != null && profile.degreeLengthYears >= 4) {
      return {
        verdict: "LIKELY_ELIGIBLE",
        reason: "On a four-year degree, second years are usually still eligible for first-year programmes.",
      };
    }
    return {
      verdict: "UNCLEAR",
      reason: `Normally aimed at first years, and you are in year ${year}. Some firms still accept later years, so this is worth checking.`,
    };
  }

  if (PENULTIMATE_FAMILIES.has(opportunity.category)) {
    const penultimate = profile.degreeLengthYears != null ? profile.degreeLengthYears - 1 : null;
    if (penultimate != null && year === penultimate) {
      return {
        verdict: "LIKELY_ELIGIBLE",
        reason: `Summer programmes usually target penultimate-year students, which is year ${penultimate} on your degree.`,
      };
    }
    return {
      verdict: "UNCLEAR",
      reason: "Summer programmes are usually penultimate-year only, but the employer has not stated its criteria here.",
    };
  }

  return {
    verdict: "UNCLEAR",
    reason: "FOE could not confirm the year-of-study criteria for this programme.",
  };
}

/** Verdicts the user sees by default. NOT_ELIGIBLE is the only one hidden, and only on request. */
export const DEFAULT_VISIBLE_VERDICTS: EligibilityVerdict[] = ["ELIGIBLE", "LIKELY_ELIGIBLE", "UNCLEAR"];

/**
 * Applies an eligibility filter.
 *
 * Note what this does NOT do: there is no filter option that drops UNCLEAR
 * while keeping everything else "for tidiness". The `Eligible only` chip is an
 * explicit, reversible user choice, and the UI tells the user how many rows it
 * is hiding.
 */
export function matchesEligibilityFilter(
  verdict: EligibilityVerdict,
  filter: "all" | "eligible" | "eligible_plus_likely" | "unclear",
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "eligible":
      return verdict === "ELIGIBLE";
    case "eligible_plus_likely":
      return verdict === "ELIGIBLE" || verdict === "LIKELY_ELIGIBLE";
    case "unclear":
      return verdict === "UNCLEAR";
  }
}
