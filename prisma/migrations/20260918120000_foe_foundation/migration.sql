-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('ATS', 'OFFICIAL_CAREERS_PAGE', 'OFFICIAL_EARLY_CAREERS_PAGE', 'OFFICIAL_PROGRAMME_PAGE', 'OFFICIAL_ANNOUNCEMENT', 'SITEMAP', 'HISTORICAL_URL', 'SEARCH_ENGINE', 'AGGREGATOR', 'UNIVERSITY_PAGE', 'COMMUNITY', 'MANUAL');

-- CreateEnum
CREATE TYPE "AtsProvider" AS ENUM ('GREENHOUSE', 'LEVER', 'WORKDAY', 'SMARTRECRUITERS', 'ICIMS', 'TALEO', 'AVATURE', 'SUCCESSFACTORS', 'PROPRIETARY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FirmCategory" AS ENUM ('BULGE_BRACKET', 'ELITE_BOUTIQUE', 'INVESTMENT_BANK', 'MIDDLE_MARKET_BANK', 'PRIVATE_EQUITY', 'ASSET_MANAGER', 'HEDGE_FUND', 'MARKET_MAKER', 'PROPRIETARY_TRADING', 'QUANT', 'ALTERNATIVE_ASSET_MANAGER', 'INSTITUTIONAL_INVESTOR', 'OTHER_FINANCE');

-- CreateEnum
CREATE TYPE "PriorityTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "SourceHealth" AS ENUM ('HEALTHY', 'DEGRADED', 'FAILING', 'BLOCKED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FinanceArea" AS ENUM ('INVESTMENT_BANKING', 'MERGERS_AND_ACQUISITIONS', 'ADVISORY', 'CORPORATE_FINANCE', 'CAPITAL_MARKETS', 'EQUITY_CAPITAL_MARKETS', 'DEBT_CAPITAL_MARKETS', 'LEVERAGED_FINANCE', 'RESTRUCTURING', 'MARKETS', 'SALES_AND_TRADING', 'GLOBAL_MARKETS', 'PRIVATE_EQUITY', 'ASSET_MANAGEMENT', 'INVESTMENTS', 'EQUITIES', 'FIXED_INCOME', 'RESEARCH', 'HEDGE_FUND', 'QUANTITATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityCategory" AS ENUM ('SPRING_WEEK', 'SPRING_INSIGHT', 'INSIGHT_PROGRAMME', 'FIRST_YEAR_PROGRAMME', 'EARLY_INSIGHT', 'SUMMER_INTERNSHIP', 'OFF_CYCLE_INTERNSHIP', 'INDUSTRIAL_PLACEMENT', 'GRADUATE_PROGRAMME', 'SCHOLARSHIP', 'NETWORKING_EVENT', 'COMPETITION', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityState" AS ENUM ('DISCOVERED', 'VERIFYING', 'EXPECTED', 'ANNOUNCED', 'OPEN', 'CLOSING_SOON', 'CLOSED', 'REJECTED', 'DUPLICATE', 'UNREACHABLE', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('ATS_API', 'ATS_PAGE', 'OFFICIAL_CAREERS_PAGE', 'OFFICIAL_PROGRAMME_PAGE', 'OFFICIAL_ANNOUNCEMENT', 'MANUAL', 'NONE');

-- CreateEnum
CREATE TYPE "EligibilityVerdict" AS ENUM ('ELIGIBLE', 'LIKELY_ELIGIBLE', 'UNCLEAR', 'NOT_ELIGIBLE');

-- CreateEnum
CREATE TYPE "ScanKind" AS ENUM ('FULL_SWEEP', 'HOT_WATCH', 'DISCOVERY', 'MANUAL');

-- CreateEnum
CREATE TYPE "ScanRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "FailureKind" AS ENUM ('FETCH_ERROR', 'HTTP_ERROR', 'PARSER_ERROR', 'ATS_FORMAT_CHANGE', 'CAREERS_URL_MISSING', 'BLOCKED', 'CAPTCHA', 'RATE_LIMITED', 'CRON_MISSED', 'QUEUE_STALLED', 'SEARCH_QUOTA_EXHAUSTED', 'NOTIFICATION_FAILURE', 'DATABASE_ERROR', 'ABNORMALLY_LOW_RESULTS');

-- CreateEnum
CREATE TYPE "FailureSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('WHATSAPP', 'IN_APP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "AlertEvent" AS ENUM ('PROGRAMME_ANNOUNCED', 'APPLICATIONS_OPENED', 'SEVEN_DAYS_BEFORE_OPENING', 'ONE_DAY_BEFORE_OPENING', 'DEADLINE_SOON');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SUPPRESSED_DUPLICATE');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('APPLIED', 'ONLINE_ASSESSMENT', 'HIREVUE', 'INTERVIEW', 'ASSESSMENT_CENTRE', 'OFFER', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "WatchTargetType" AS ENUM ('FIRM', 'PROGRAMME', 'OPPORTUNITY');

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "websiteDomain" TEXT,
    "careersUrl" TEXT,
    "earlyCareersUrl" TEXT,
    "careersSearchEndpoint" TEXT,
    "atsProvider" "AtsProvider" NOT NULL DEFAULT 'UNKNOWN',
    "atsTenant" TEXT,
    "atsBoardId" TEXT,
    "categories" "FirmCategory"[] DEFAULT ARRAY[]::"FirmCategory"[],
    "areas" "FinanceArea"[] DEFAULT ARRAY[]::"FinanceArea"[],
    "tier" "PriorityTier" NOT NULL DEFAULT 'TIER_3',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "health" "SourceHealth" NOT NULL DEFAULT 'UNKNOWN',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastScanAttemptedAt" TIMESTAMP(3),
    "lastScanSucceededAt" TIMESTAMP(3),
    "lastSourceChangeAt" TIMESTAMP(3),
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmSource" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "atsProvider" "AtsProvider",
    "priority" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "health" "SourceHealth" NOT NULL DEFAULT 'UNKNOWN',
    "lastAttemptedAt" TIMESTAMP(3),
    "lastSucceededAt" TIMESTAMP(3),
    "lastStatusCode" INTEGER,
    "lastContentHash" TEXT,
    "lastChangedAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "parserStatus" TEXT,
    "blockedReason" TEXT,
    "hotWatchUntil" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirmSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "category" "OpportunityCategory" NOT NULL DEFAULT 'OTHER',
    "area" "FinanceArea" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeHistory" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "recruitmentYear" INTEGER NOT NULL,
    "openedAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "applicationUrl" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgrammeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoeOpportunity" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "programmeId" TEXT,
    "firmName" TEXT NOT NULL,
    "programmeName" TEXT NOT NULL,
    "recruitmentYear" INTEGER NOT NULL,
    "category" "OpportunityCategory" NOT NULL DEFAULT 'OTHER',
    "area" "FinanceArea" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "region" TEXT,
    "description" TEXT,
    "state" "OpportunityState" NOT NULL DEFAULT 'DISCOVERED',
    "rolling" BOOLEAN NOT NULL DEFAULT false,
    "announcedAt" TIMESTAMP(3),
    "openingDate" TIMESTAMP(3),
    "expectedOpeningStart" TIMESTAMP(3),
    "expectedOpeningEnd" TIMESTAMP(3),
    "expectedOpeningLabel" TEXT,
    "deadline" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "applicationUrl" TEXT,
    "officialInfoUrl" TEXT,
    "applicationVerifiedAt" TIMESTAMP(3),
    "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'NONE',
    "verificationConfidence" INTEGER NOT NULL DEFAULT 0,
    "verifiedBySourceId" TEXT,
    "eligibilityText" TEXT,
    "eligibleYears" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "firstDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstVerifiedOpenAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastChangedAt" TIMESTAMP(3),
    "duplicateOfId" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoeOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySource" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "firmSourceId" TEXT,
    "kind" "SourceKind" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "excerpt" TEXT,
    "contentHash" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OpportunitySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySnapshot" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "OpportunityState" NOT NULL,
    "contentHash" TEXT,
    "changeKind" TEXT,
    "summary" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OpportunitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanRun" (
    "id" TEXT NOT NULL,
    "kind" "ScanKind" NOT NULL,
    "status" "ScanRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "firmsPlanned" INTEGER NOT NULL DEFAULT 0,
    "firmsScanned" INTEGER NOT NULL DEFAULT 0,
    "sourcesScanned" INTEGER NOT NULL DEFAULT 0,
    "sourcesChanged" INTEGER NOT NULL DEFAULT 0,
    "sourcesFailed" INTEGER NOT NULL DEFAULT 0,
    "candidatesFound" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesOpened" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ScanRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanResult" (
    "id" TEXT NOT NULL,
    "scanRunId" TEXT NOT NULL,
    "firmId" TEXT,
    "firmSourceId" TEXT,
    "url" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "httpStatus" INTEGER,
    "changed" BOOLEAN NOT NULL DEFAULT false,
    "contentHash" TEXT,
    "candidates" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceFailure" (
    "id" TEXT NOT NULL,
    "scanRunId" TEXT,
    "firmId" TEXT,
    "firmSourceId" TEXT,
    "kind" "FailureKind" NOT NULL,
    "severity" "FailureSeverity" NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SourceFailure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanLock" (
    "key" TEXT NOT NULL,
    "runId" TEXT,
    "holder" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanLock_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" "WatchTargetType" NOT NULL,
    "firmId" TEXT,
    "programmeId" TEXT,
    "opportunityId" TEXT,
    "notifyWhatsApp" BOOLEAN NOT NULL DEFAULT true,
    "notifyInApp" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoePreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "university" TEXT,
    "degree" TEXT,
    "degreeLengthYears" INTEGER,
    "currentYear" INTEGER,
    "graduationYear" INTEGER,
    "nationality" TEXT,
    "workEligibility" TEXT,
    "preferredRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" "FinanceArea"[] DEFAULT ARRAY[]::"FinanceArea"[],
    "categories" "OpportunityCategory"[] DEFAULT ARRAY[]::"OpportunityCategory"[],
    "showUnclear" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNumber" TEXT,
    "whatsappOptInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoePreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "AlertChannel" NOT NULL,
    "event" "AlertEvent" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "channel" "AlertChannel" NOT NULL,
    "event" "AlertEvent" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'QUEUED',
    "dedupeKey" TEXT NOT NULL,
    "body" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "firmName" TEXT NOT NULL,
    "programmeName" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'APPLIED',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "notes" TEXT,
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Firm_canonicalName_key" ON "Firm"("canonicalName");

-- CreateIndex
CREATE INDEX "Firm_tier_active_idx" ON "Firm"("tier", "active");

-- CreateIndex
CREATE INDEX "Firm_health_idx" ON "Firm"("health");

-- CreateIndex
CREATE INDEX "FirmSource_active_health_idx" ON "FirmSource"("active", "health");

-- CreateIndex
CREATE INDEX "FirmSource_hotWatchUntil_idx" ON "FirmSource"("hotWatchUntil");

-- CreateIndex
CREATE UNIQUE INDEX "FirmSource_firmId_url_key" ON "FirmSource"("firmId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_firmId_canonicalKey_key" ON "Programme"("firmId", "canonicalKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeHistory_programmeId_recruitmentYear_key" ON "ProgrammeHistory"("programmeId", "recruitmentYear");

-- CreateIndex
CREATE UNIQUE INDEX "FoeOpportunity_fingerprint_key" ON "FoeOpportunity"("fingerprint");

-- CreateIndex
CREATE INDEX "FoeOpportunity_state_openingDate_idx" ON "FoeOpportunity"("state", "openingDate");

-- CreateIndex
CREATE INDEX "FoeOpportunity_state_deadline_idx" ON "FoeOpportunity"("state", "deadline");

-- CreateIndex
CREATE INDEX "FoeOpportunity_recruitmentYear_category_idx" ON "FoeOpportunity"("recruitmentYear", "category");

-- CreateIndex
CREATE INDEX "FoeOpportunity_firstVerifiedOpenAt_idx" ON "FoeOpportunity"("firstVerifiedOpenAt");

-- CreateIndex
CREATE INDEX "OpportunitySource_opportunityId_isOfficial_idx" ON "OpportunitySource"("opportunityId", "isOfficial");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySource_opportunityId_url_key" ON "OpportunitySource"("opportunityId", "url");

-- CreateIndex
CREATE INDEX "OpportunitySnapshot_opportunityId_capturedAt_idx" ON "OpportunitySnapshot"("opportunityId", "capturedAt");

-- CreateIndex
CREATE INDEX "ScanRun_kind_startedAt_idx" ON "ScanRun"("kind", "startedAt");

-- CreateIndex
CREATE INDEX "ScanResult_scanRunId_ok_idx" ON "ScanResult"("scanRunId", "ok");

-- CreateIndex
CREATE INDEX "SourceFailure_resolvedAt_severity_idx" ON "SourceFailure"("resolvedAt", "severity");

-- CreateIndex
CREATE INDEX "WatchlistItem_userId_targetType_idx" ON "WatchlistItem"("userId", "targetType");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_firmId_key" ON "WatchlistItem"("userId", "firmId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_programmeId_key" ON "WatchlistItem"("userId", "programmeId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_opportunityId_key" ON "WatchlistItem"("userId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "FoePreferences_userId_key" ON "FoePreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertSubscription_userId_channel_event_key" ON "AlertSubscription"("userId", "channel", "event");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_dedupeKey_key" ON "Alert"("dedupeKey");

-- CreateIndex
CREATE INDEX "Alert_userId_status_idx" ON "Alert"("userId", "status");

-- CreateIndex
CREATE INDEX "Alert_userId_readAt_idx" ON "Alert"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Application_userId_stage_idx" ON "Application"("userId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_opportunityId_key" ON "Application"("userId", "opportunityId");

-- AddForeignKey
ALTER TABLE "FirmSource" ADD CONSTRAINT "FirmSource_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeHistory" ADD CONSTRAINT "ProgrammeHistory_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoeOpportunity" ADD CONSTRAINT "FoeOpportunity_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoeOpportunity" ADD CONSTRAINT "FoeOpportunity_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoeOpportunity" ADD CONSTRAINT "FoeOpportunity_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "FoeOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySource" ADD CONSTRAINT "OpportunitySource_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "FoeOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySource" ADD CONSTRAINT "OpportunitySource_firmSourceId_fkey" FOREIGN KEY ("firmSourceId") REFERENCES "FirmSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySnapshot" ADD CONSTRAINT "OpportunitySnapshot_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "FoeOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanResult" ADD CONSTRAINT "ScanResult_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "ScanRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanResult" ADD CONSTRAINT "ScanResult_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanResult" ADD CONSTRAINT "ScanResult_firmSourceId_fkey" FOREIGN KEY ("firmSourceId") REFERENCES "FirmSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceFailure" ADD CONSTRAINT "SourceFailure_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "ScanRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceFailure" ADD CONSTRAINT "SourceFailure_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceFailure" ADD CONSTRAINT "SourceFailure_firmSourceId_fkey" FOREIGN KEY ("firmSourceId") REFERENCES "FirmSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "FoeOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoePreferences" ADD CONSTRAINT "FoePreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertSubscription" ADD CONSTRAINT "AlertSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "FoeOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "FoeOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

