/**
 * FOE data-transfer objects.
 *
 * Follows the existing src/lib/types.ts convention: dates are ISO strings over
 * the wire, enums come straight from Prisma, and anything the server computed
 * (eligibility, priority, watch state) is included so the client never has to
 * re-derive it.
 */

import type {
  AlertChannel,
  AlertEvent,
  AlertStatus,
  ApplicationStage,
  AtsProvider,
  EligibilityVerdict,
  FailureKind,
  FailureSeverity,
  FinanceArea,
  FirmCategory,
  OpportunityCategory,
  OpportunityState,
  PriorityTier,
  SourceHealth,
  SourceKind,
  VerificationMethod,
} from "@prisma/client";
import type { PriorityBucket } from "./priority";

export type {
  AlertChannel,
  AlertEvent,
  AlertStatus,
  ApplicationStage,
  AtsProvider,
  EligibilityVerdict,
  FailureKind,
  FailureSeverity,
  FinanceArea,
  FirmCategory,
  OpportunityCategory,
  OpportunityState,
  PriorityTier,
  SourceHealth,
  SourceKind,
  VerificationMethod,
};

export interface OpportunitySourceDTO {
  id: string;
  kind: SourceKind;
  url: string;
  title: string | null;
  isOfficial: boolean;
  confidence: number;
  discoveredAt: string;
  lastSeenAt: string;
}

export interface FoeOpportunityDTO {
  id: string;
  fingerprint: string;
  firmId: string;
  firmName: string;
  programmeId: string | null;
  programmeName: string;
  recruitmentYear: number;
  category: OpportunityCategory;
  area: FinanceArea;
  location: string | null;
  region: string | null;
  description: string | null;

  state: OpportunityState;
  rolling: boolean;

  announcedAt: string | null;
  openingDate: string | null;
  expectedOpeningStart: string | null;
  expectedOpeningEnd: string | null;
  expectedOpeningLabel: string | null;
  deadline: string | null;

  applicationUrl: string | null;
  officialInfoUrl: string | null;
  applicationVerifiedAt: string | null;
  verificationMethod: VerificationMethod;
  verificationConfidence: number;

  eligibilityText: string | null;
  firstDiscoveredAt: string;
  firstVerifiedOpenAt: string | null;
  lastCheckedAt: string | null;
  lastChangedAt: string | null;

  isDemo: boolean;

  // Server-computed, per user
  eligibility: { verdict: EligibilityVerdict; reason: string };
  priority: { bucket: PriorityBucket; reasons: string[] };
  isWatched: boolean;
  application: { id: string; stage: ApplicationStage; appliedAt: string } | null;
  sources: OpportunitySourceDTO[];
  officialSourceCount: number;
}

export interface FoeSummaryDTO {
  open: number;
  newToday: number;
  openingSoon: number;
  urgent: number;
}

/** A confirmed or predicted future opening, for the Opening Soon panel/page. */
export interface OpeningSoonDTO {
  id: string;
  firmId: string;
  firmName: string;
  programmeName: string;
  area: FinanceArea;
  location: string | null;
  /** CONFIRMED means the employer announced it; EXPECTED is FOE's prediction. */
  kind: "CONFIRMED" | "EXPECTED";
  openingDate: string | null;
  expectedOpeningLabel: string | null;
  expectedOpeningStart: string | null;
  expectedOpeningEnd: string | null;
  daysUntil: number | null;
  /** EXPECTED only: the predicted window has started and has not ended. */
  windowOpenNow: boolean;
  isWatched: boolean;
  officialInfoUrl: string | null;
  /** How many past cycles the prediction rests on; null when confirmed. */
  basedOnCycles: number | null;
  isDemo: boolean;
}

export interface WatchlistItemDTO {
  id: string;
  targetType: "FIRM" | "PROGRAMME" | "OPPORTUNITY";
  firmId: string | null;
  programmeId: string | null;
  opportunityId: string | null;
  title: string;
  subtitle: string | null;
  /** Current state of the thing being watched, when it is an opportunity. */
  state: OpportunityState | null;
  openingLabel: string | null;
  notifyWhatsApp: boolean;
  notifyInApp: boolean;
  notifyEmail: boolean;
  createdAt: string;
}

export interface FoePreferencesDTO {
  university: string | null;
  degree: string | null;
  degreeLengthYears: number | null;
  currentYear: number | null;
  graduationYear: number | null;
  nationality: string | null;
  workEligibility: string | null;
  preferredRegions: string[];
  interests: FinanceArea[];
  categories: OpportunityCategory[];
  showUnclear: boolean;
  whatsappNumber: string | null;
  whatsappOptInAt: string | null;
  subscriptions: { channel: AlertChannel; event: AlertEvent; enabled: boolean }[];
}

export interface ApplicationDTO {
  id: string;
  opportunityId: string | null;
  firmName: string;
  programmeName: string;
  stage: ApplicationStage;
  appliedAt: string;
  deadline: string | null;
  notes: string | null;
  taskId: string | null;
  updatedAt: string;
}

export interface AlertDTO {
  id: string;
  opportunityId: string;
  firmName: string;
  programmeName: string;
  channel: AlertChannel;
  event: AlertEvent;
  status: AlertStatus;
  body: string | null;
  queuedAt: string;
  sentAt: string | null;
  readAt: string | null;
}

/** The small "Last scan 16:00 · All critical sources healthy" indicator. */
export interface EngineHealthDTO {
  lastScanAt: string | null;
  lastScanKind: string | null;
  nextSweepDueAt: string | null;
  firmsInUniverse: number;
  sourcesTotal: number;
  sourcesHealthy: number;
  sourcesFailing: number;
  hotWatchCount: number;
  openFailures: { id: string; kind: string; severity: string; message: string; detectedAt: string; firmName: string | null }[];
  /** True while the only data present is the seeded demo set. */
  demoDataOnly: boolean;
  status: "HEALTHY" | "DEGRADED" | "FAILING" | "NEVER_RUN";
  statusLine: string;
}

// ---------------------------------------------------------------------------
// Query / filter shapes shared by the API and the filter drawer
// ---------------------------------------------------------------------------

export type EligibilityFilter = "all" | "eligible" | "eligible_plus_likely" | "unclear";
export type SortOption = "priority" | "newest" | "deadline" | "firm";

export interface OpportunityFilters {
  search: string;
  categories: OpportunityCategory[];
  areas: FinanceArea[];
  eligibility: EligibilityFilter;
  regions: string[];
  rollingOnly: boolean;
  deadlineWithin7Days: boolean;
  notYetApplied: boolean;
  sort: SortOption;
}

export const EMPTY_FILTERS: OpportunityFilters = {
  search: "",
  categories: [],
  areas: [],
  eligibility: "all",
  regions: [],
  rollingOnly: false,
  deadlineWithin7Days: false,
  notYetApplied: false,
  sort: "priority",
};

export function countActiveFilters(f: OpportunityFilters): number {
  let n = 0;
  n += f.categories.length;
  n += f.areas.length;
  n += f.regions.length;
  if (f.eligibility !== "all") n += 1;
  if (f.rollingOnly) n += 1;
  if (f.deadlineWithin7Days) n += 1;
  if (f.notYetApplied) n += 1;
  return n;
}
