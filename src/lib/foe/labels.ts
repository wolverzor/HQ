/**
 * Display names and colours for FOE enums.
 *
 * Follows the existing src/lib/labels.ts convention (Record per enum, hex
 * colours drawn from the HQ design tokens) so FOE badges look like HQ badges.
 * Every colour is paired with a text label at every call site — colour is never
 * the only signal.
 */

import type {
  AlertChannel,
  AlertEvent,
  ApplicationStage,
  AtsProvider,
  EligibilityVerdict,
  FailureKind,
  FinanceArea,
  FirmCategory,
  OpportunityCategory,
  OpportunityState,
  PriorityTier,
  SourceHealth,
  SourceKind,
  VerificationMethod,
} from "@prisma/client";

export const STATE_LABEL: Record<OpportunityState, string> = {
  DISCOVERED: "Discovered",
  VERIFYING: "Verifying",
  EXPECTED: "Expected",
  ANNOUNCED: "Announced",
  OPEN: "Open",
  CLOSING_SOON: "Closing soon",
  CLOSED: "Closed",
  REJECTED: "Not relevant",
  DUPLICATE: "Duplicate",
  UNREACHABLE: "Unreachable",
  MANUAL_REVIEW: "Needs review",
};

/**
 * One-line explanations. EXPECTED / ANNOUNCED / OPEN are the three the user
 * must never confuse, so each says plainly where its date came from.
 */
export const STATE_MEANING: Record<OpportunityState, string> = {
  DISCOVERED: "Seen somewhere, not yet checked against an official source.",
  VERIFYING: "Being confirmed against the employer's own site right now.",
  EXPECTED: "Predicted from previous years. Not confirmed by the employer.",
  ANNOUNCED: "The employer has publicly stated a future opening date.",
  OPEN: "A live application was verified on an official source.",
  CLOSING_SOON: "Open, with the deadline approaching.",
  CLOSED: "Applications are no longer being accepted.",
  REJECTED: "Reviewed and judged not a relevant finance opportunity.",
  DUPLICATE: "Merged into another entry for the same programme.",
  UNREACHABLE: "FOE could not check the source. This is not a 'no opportunity'.",
  MANUAL_REVIEW: "Ambiguous — flagged for a human to look at.",
};

export const STATE_COLOR: Record<OpportunityState, string> = {
  DISCOVERED: "#71717a",
  VERIFYING: "#0284c7",
  EXPECTED: "#7c3aed",
  ANNOUNCED: "#4f46e5",
  OPEN: "#16a34a",
  CLOSING_SOON: "#d97706",
  CLOSED: "#52525b",
  REJECTED: "#71717a",
  DUPLICATE: "#a1a1aa",
  UNREACHABLE: "#e11d48",
  MANUAL_REVIEW: "#d97706",
};

export const CATEGORY_LABEL: Record<OpportunityCategory, string> = {
  SPRING_WEEK: "Spring Week",
  SPRING_INSIGHT: "Spring Insight",
  INSIGHT_PROGRAMME: "Insight Programme",
  FIRST_YEAR_PROGRAMME: "First-Year Programme",
  EARLY_INSIGHT: "Early Insight",
  SUMMER_INTERNSHIP: "Summer Internship",
  OFF_CYCLE_INTERNSHIP: "Off-cycle Internship",
  INDUSTRIAL_PLACEMENT: "Industrial Placement",
  GRADUATE_PROGRAMME: "Graduate Programme",
  SCHOLARSHIP: "Scholarship",
  NETWORKING_EVENT: "Networking",
  COMPETITION: "Competition",
  OTHER: "Other",
};

export const AREA_LABEL: Record<FinanceArea, string> = {
  INVESTMENT_BANKING: "Investment Banking",
  MERGERS_AND_ACQUISITIONS: "M&A",
  ADVISORY: "Advisory",
  CORPORATE_FINANCE: "Corporate Finance",
  CAPITAL_MARKETS: "Capital Markets",
  EQUITY_CAPITAL_MARKETS: "ECM",
  DEBT_CAPITAL_MARKETS: "DCM",
  LEVERAGED_FINANCE: "Leveraged Finance",
  RESTRUCTURING: "Restructuring",
  MARKETS: "Markets",
  SALES_AND_TRADING: "Sales & Trading",
  GLOBAL_MARKETS: "Global Markets",
  PRIVATE_EQUITY: "Private Equity",
  ASSET_MANAGEMENT: "Asset Management",
  INVESTMENTS: "Investments",
  EQUITIES: "Equities",
  FIXED_INCOME: "Fixed Income",
  RESEARCH: "Research",
  HEDGE_FUND: "Hedge Funds",
  QUANTITATIVE: "Quant",
  OTHER: "Other",
};

export const ELIGIBILITY_LABEL: Record<EligibilityVerdict, string> = {
  ELIGIBLE: "Eligible",
  LIKELY_ELIGIBLE: "Likely eligible",
  UNCLEAR: "Unclear",
  NOT_ELIGIBLE: "Not eligible",
};

export const ELIGIBILITY_COLOR: Record<EligibilityVerdict, string> = {
  ELIGIBLE: "#16a34a",
  LIKELY_ELIGIBLE: "#0284c7",
  UNCLEAR: "#d97706",
  NOT_ELIGIBLE: "#71717a",
};

export const FIRM_CATEGORY_LABEL: Record<FirmCategory, string> = {
  BULGE_BRACKET: "Bulge bracket",
  ELITE_BOUTIQUE: "Elite boutique",
  INVESTMENT_BANK: "Investment bank",
  MIDDLE_MARKET_BANK: "Middle-market bank",
  PRIVATE_EQUITY: "Private equity",
  ASSET_MANAGER: "Asset manager",
  HEDGE_FUND: "Hedge fund",
  MARKET_MAKER: "Market maker",
  PROPRIETARY_TRADING: "Prop trading",
  QUANT: "Quant",
  ALTERNATIVE_ASSET_MANAGER: "Alternative assets",
  INSTITUTIONAL_INVESTOR: "Institutional investor",
  OTHER_FINANCE: "Other finance",
};

export const TIER_LABEL: Record<PriorityTier, string> = {
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
};

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  ATS: "Applicant tracking system",
  OFFICIAL_CAREERS_PAGE: "Official careers page",
  OFFICIAL_EARLY_CAREERS_PAGE: "Official early careers page",
  OFFICIAL_PROGRAMME_PAGE: "Official programme page",
  OFFICIAL_ANNOUNCEMENT: "Official announcement",
  SITEMAP: "Sitemap",
  HISTORICAL_URL: "Previous year's URL",
  SEARCH_ENGINE: "Search engine",
  AGGREGATOR: "Opportunity tracker",
  UNIVERSITY_PAGE: "University careers page",
  COMMUNITY: "Community mention",
  MANUAL: "Added manually",
};

export const VERIFICATION_METHOD_LABEL: Record<VerificationMethod, string> = {
  ATS_API: "ATS API",
  ATS_PAGE: "ATS posting",
  OFFICIAL_CAREERS_PAGE: "Official careers page",
  OFFICIAL_PROGRAMME_PAGE: "Official programme page",
  OFFICIAL_ANNOUNCEMENT: "Official announcement",
  MANUAL: "Checked by hand",
  NONE: "Not verified",
};

export const ATS_LABEL: Record<AtsProvider, string> = {
  GREENHOUSE: "Greenhouse",
  LEVER: "Lever",
  WORKDAY: "Workday",
  SMARTRECRUITERS: "SmartRecruiters",
  ICIMS: "iCIMS",
  TALEO: "Taleo",
  AVATURE: "Avature",
  SUCCESSFACTORS: "SuccessFactors",
  PROPRIETARY: "Own careers site",
  UNKNOWN: "Unknown",
};

export const HEALTH_LABEL: Record<SourceHealth, string> = {
  HEALTHY: "Healthy",
  DEGRADED: "Degraded",
  FAILING: "Failing",
  BLOCKED: "Blocked",
  UNKNOWN: "Not yet checked",
};

export const HEALTH_COLOR: Record<SourceHealth, string> = {
  HEALTHY: "#16a34a",
  DEGRADED: "#d97706",
  FAILING: "#e11d48",
  BLOCKED: "#e11d48",
  UNKNOWN: "#71717a",
};

export const FAILURE_LABEL: Record<FailureKind, string> = {
  FETCH_ERROR: "Could not reach source",
  HTTP_ERROR: "HTTP error",
  PARSER_ERROR: "Could not parse page",
  ATS_FORMAT_CHANGE: "ATS format changed",
  CAREERS_URL_MISSING: "Careers URL missing",
  BLOCKED: "Blocked by the site",
  CAPTCHA: "CAPTCHA encountered",
  RATE_LIMITED: "Rate limited",
  CRON_MISSED: "Scheduled run did not execute",
  QUEUE_STALLED: "Worker queue stalled",
  SEARCH_QUOTA_EXHAUSTED: "Search quota exhausted",
  NOTIFICATION_FAILURE: "Alert delivery failed",
  DATABASE_ERROR: "Database write failed",
  ABNORMALLY_LOW_RESULTS: "Unusually few results",
};

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  APPLIED: "Applied",
  ONLINE_ASSESSMENT: "Online Assessment",
  HIREVUE: "HireVue",
  INTERVIEW: "Interview",
  ASSESSMENT_CENTRE: "Assessment Centre",
  OFFER: "Offer",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const STAGE_COLOR: Record<ApplicationStage, string> = {
  APPLIED: "#4f46e5",
  ONLINE_ASSESSMENT: "#0284c7",
  HIREVUE: "#7c3aed",
  INTERVIEW: "#ea580c",
  ASSESSMENT_CENTRE: "#d97706",
  OFFER: "#16a34a",
  REJECTED: "#e11d48",
  WITHDRAWN: "#71717a",
};

/** The order a live application moves through. */
export const STAGE_ORDER: ApplicationStage[] = [
  "APPLIED",
  "ONLINE_ASSESSMENT",
  "HIREVUE",
  "INTERVIEW",
  "ASSESSMENT_CENTRE",
  "OFFER",
];

export const CHANNEL_LABEL: Record<AlertChannel, string> = {
  WHATSAPP: "WhatsApp",
  IN_APP: "In-app",
  EMAIL: "Email",
  PUSH: "Push",
};

export const ALERT_EVENT_LABEL: Record<AlertEvent, string> = {
  PROGRAMME_ANNOUNCED: "When officially announced",
  APPLICATIONS_OPENED: "When applications open",
  SEVEN_DAYS_BEFORE_OPENING: "7 days before opening",
  ONE_DAY_BEFORE_OPENING: "1 day before opening",
  DEADLINE_SOON: "Deadline soon",
};

export const ALERT_EVENT_SHORT: Record<AlertEvent, string> = {
  PROGRAMME_ANNOUNCED: "Announced",
  APPLICATIONS_OPENED: "Opened",
  SEVEN_DAYS_BEFORE_OPENING: "7 days out",
  ONE_DAY_BEFORE_OPENING: "1 day out",
  DEADLINE_SOON: "Deadline",
};
