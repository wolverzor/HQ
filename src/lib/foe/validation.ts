/**
 * Request validation for the FOE API. Mirrors the zod conventions already used
 * in src/lib/validation.ts.
 */

import { z } from "zod";

export const financeAreaEnum = z.enum([
  "INVESTMENT_BANKING",
  "MERGERS_AND_ACQUISITIONS",
  "ADVISORY",
  "CORPORATE_FINANCE",
  "CAPITAL_MARKETS",
  "EQUITY_CAPITAL_MARKETS",
  "DEBT_CAPITAL_MARKETS",
  "LEVERAGED_FINANCE",
  "RESTRUCTURING",
  "MARKETS",
  "SALES_AND_TRADING",
  "GLOBAL_MARKETS",
  "PRIVATE_EQUITY",
  "ASSET_MANAGEMENT",
  "INVESTMENTS",
  "EQUITIES",
  "FIXED_INCOME",
  "RESEARCH",
  "HEDGE_FUND",
  "QUANTITATIVE",
  "OTHER",
]);

export const opportunityCategoryEnum = z.enum([
  "SPRING_WEEK",
  "SPRING_INSIGHT",
  "INSIGHT_PROGRAMME",
  "FIRST_YEAR_PROGRAMME",
  "EARLY_INSIGHT",
  "SUMMER_INTERNSHIP",
  "OFF_CYCLE_INTERNSHIP",
  "INDUSTRIAL_PLACEMENT",
  "GRADUATE_PROGRAMME",
  "SCHOLARSHIP",
  "NETWORKING_EVENT",
  "COMPETITION",
  "OTHER",
]);

export const alertChannelEnum = z.enum(["WHATSAPP", "IN_APP", "EMAIL", "PUSH"]);
export const alertEventEnum = z.enum([
  "PROGRAMME_ANNOUNCED",
  "APPLICATIONS_OPENED",
  "SEVEN_DAYS_BEFORE_OPENING",
  "ONE_DAY_BEFORE_OPENING",
  "DEADLINE_SOON",
]);
export const applicationStageEnum = z.enum([
  "APPLIED",
  "ONLINE_ASSESSMENT",
  "HIREVUE",
  "INTERVIEW",
  "ASSESSMENT_CENTRE",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]);

const nullableString = z
  .string()
  .transform((v) => (v.trim() === "" ? null : v.trim()))
  .nullable()
  .optional();

/** Watch/unwatch a firm, programme or opportunity. */
export const watchSchema = z
  .object({
    opportunityId: z.string().optional(),
    firmId: z.string().optional(),
    programmeId: z.string().optional(),
    watching: z.boolean(),
    notifyWhatsApp: z.boolean().optional(),
    notifyInApp: z.boolean().optional(),
    notifyEmail: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.opportunityId || v.firmId || v.programmeId), {
    message: "One of opportunityId, firmId or programmeId is required",
  });

export const updateWatchSchema = z.object({
  notifyWhatsApp: z.boolean().optional(),
  notifyInApp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
});

export const updatePreferencesSchema = z.object({
  university: nullableString,
  degree: nullableString,
  degreeLengthYears: z.number().int().min(1).max(8).nullable().optional(),
  currentYear: z.number().int().min(1).max(8).nullable().optional(),
  graduationYear: z.number().int().min(2000).max(2100).nullable().optional(),
  nationality: nullableString,
  workEligibility: nullableString,
  preferredRegions: z.array(z.string()).optional(),
  interests: z.array(financeAreaEnum).optional(),
  categories: z.array(opportunityCategoryEnum).optional(),
  showUnclear: z.boolean().optional(),
  whatsappNumber: nullableString,
  /**
   * Explicit opt-in. Sending `true` records the consent timestamp; `false`
   * clears it. There is no way to enable WhatsApp without this flag.
   */
  whatsappOptIn: z.boolean().optional(),
  subscriptions: z
    .array(z.object({ channel: alertChannelEnum, event: alertEventEnum, enabled: z.boolean() }))
    .optional(),
});

export const createApplicationSchema = z.object({
  opportunityId: z.string().min(1),
  /** Also create the linked HQ task (default true, matching the legacy tracker). */
  createTask: z.boolean().optional(),
});

export const updateApplicationSchema = z.object({
  stage: applicationStageEnum.optional(),
  notes: nullableString,
});
