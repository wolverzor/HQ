/**
 * FOE demo dataset.
 *
 * Everything written here is flagged `isDemo: true`, which is the line between
 * "a realistic dashboard to build against" and "FOE claims Goldman Sachs is
 * open right now". The UI shows a Demo data badge whenever the only rows
 * present are these, the engine never verifies them, and
 * `clearFoeDemoData()` removes them without touching anything the monitoring
 * pipeline produced.
 *
 * Dates are relative to the seed time so the dashboard stays coherent whenever
 * it is run, rather than rotting into a screen full of past deadlines.
 */

import type {
  AtsProvider,
  FinanceArea,
  FirmCategory,
  OpportunityCategory,
  OpportunityState,
  PrismaClient,
  PriorityTier,
  SourceKind,
} from "@prisma/client";
import { opportunityFingerprint, programmeKey, canonicalFirmName } from "../src/lib/foe/fingerprint";
import { regionForLocation } from "../src/lib/foe/taxonomy";
import { deriveExpectedWindow } from "../src/lib/foe/expected-window";

const RECRUITMENT_YEAR = 2027;

/**
 * Demo rows are kept out of the canonical namespace entirely.
 *
 * `isDemo` alone is not enough: `Firm.canonicalName` and
 * `FoeOpportunity.fingerprint` are unique, so a demo "Goldman Sachs" would own
 * the real one's key — and a candidate the live sweep found would merge into a
 * demo row rather than creating a real one. Suffixing the keys keeps the two
 * sets genuinely separate while the display names stay clean.
 */
const DEMO_KEY_SUFFIX = " [demo]";
const demoCanonicalName = (name: string) => canonicalFirmName(name) + DEMO_KEY_SUFFIX;
const demoFingerprint = (input: Parameters<typeof opportunityFingerprint>[0]) =>
  `demo|${opportunityFingerprint(input)}`;

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);

interface DemoFirm {
  name: string;
  domain: string;
  categories: FirmCategory[];
  tier: PriorityTier;
  ats: AtsProvider;
}

const FIRMS: DemoFirm[] = [
  { name: "Goldman Sachs", domain: "goldmansachs.com", categories: ["BULGE_BRACKET"], tier: "TIER_1", ats: "PROPRIETARY" },
  { name: "J.P. Morgan", domain: "jpmorgan.com", categories: ["BULGE_BRACKET"], tier: "TIER_1", ats: "PROPRIETARY" },
  { name: "Morgan Stanley", domain: "morganstanley.com", categories: ["BULGE_BRACKET"], tier: "TIER_1", ats: "WORKDAY" },
  { name: "Citi", domain: "citigroup.com", categories: ["BULGE_BRACKET"], tier: "TIER_1", ats: "WORKDAY" },
  { name: "Bank of America", domain: "bankofamerica.com", categories: ["BULGE_BRACKET"], tier: "TIER_1", ats: "WORKDAY" },
  { name: "UBS", domain: "ubs.com", categories: ["BULGE_BRACKET"], tier: "TIER_1", ats: "AVATURE" },
  { name: "Barclays", domain: "barclays.com", categories: ["INVESTMENT_BANK"], tier: "TIER_1", ats: "WORKDAY" },
  { name: "Deutsche Bank", domain: "db.com", categories: ["INVESTMENT_BANK"], tier: "TIER_2", ats: "WORKDAY" },
  { name: "Rothschild & Co", domain: "rothschildandco.com", categories: ["ELITE_BOUTIQUE"], tier: "TIER_1", ats: "SMARTRECRUITERS" },
  { name: "Lazard", domain: "lazard.com", categories: ["ELITE_BOUTIQUE"], tier: "TIER_1", ats: "WORKDAY" },
  { name: "Evercore", domain: "evercore.com", categories: ["ELITE_BOUTIQUE"], tier: "TIER_1", ats: "GREENHOUSE" },
  { name: "PJT Partners", domain: "pjtpartners.com", categories: ["ELITE_BOUTIQUE"], tier: "TIER_2", ats: "GREENHOUSE" },
  { name: "Moelis & Company", domain: "moelis.com", categories: ["ELITE_BOUTIQUE"], tier: "TIER_2", ats: "GREENHOUSE" },
  { name: "Houlihan Lokey", domain: "hl.com", categories: ["MIDDLE_MARKET_BANK"], tier: "TIER_2", ats: "ICIMS" },
  { name: "Blackstone", domain: "blackstone.com", categories: ["PRIVATE_EQUITY", "ALTERNATIVE_ASSET_MANAGER"], tier: "TIER_1", ats: "WORKDAY" },
  { name: "KKR", domain: "kkr.com", categories: ["PRIVATE_EQUITY"], tier: "TIER_1", ats: "WORKDAY" },
  { name: "Apollo Global Management", domain: "apollo.com", categories: ["PRIVATE_EQUITY"], tier: "TIER_2", ats: "WORKDAY" },
  { name: "The Carlyle Group", domain: "carlyle.com", categories: ["PRIVATE_EQUITY"], tier: "TIER_2", ats: "WORKDAY" },
  { name: "BlackRock", domain: "blackrock.com", categories: ["ASSET_MANAGER"], tier: "TIER_1", ats: "WORKDAY" },
  { name: "Jane Street", domain: "janestreet.com", categories: ["MARKET_MAKER", "PROPRIETARY_TRADING"], tier: "TIER_1", ats: "GREENHOUSE" },
  { name: "Citadel", domain: "citadel.com", categories: ["HEDGE_FUND"], tier: "TIER_1", ats: "GREENHOUSE" },
  { name: "Point72", domain: "point72.com", categories: ["HEDGE_FUND"], tier: "TIER_2", ats: "GREENHOUSE" },
];

interface DemoOpportunity {
  firm: string;
  programme: string;
  category: OpportunityCategory;
  area: FinanceArea;
  location: string;
  state: OpportunityState;
  rolling?: boolean;
  /** Minutes ago the opening was verified — drives the "Opened X ago" line. */
  openedMinutesAgo?: number;
  verifiedMinutesAgo?: number;
  deadlineInDays?: number;
  /** For ANNOUNCED: the employer's stated opening date, in days from now. */
  announcedOpensInDays?: number;
  /** For EXPECTED: previous cycles' opening dates, as days-ago offsets. */
  historyOpenDayOffsets?: number[];
  eligibleYears?: number[];
  description?: string;
  /** Deliberately unofficial-only, to exercise the verification gate. */
  discoveryOnly?: boolean;
}

const OPPORTUNITIES: DemoOpportunity[] = [
  // --- Open, recent (the "Priority for you" cards in the reference UI) ------
  {
    firm: "Goldman Sachs",
    programme: "Spring Insight",
    category: "SPRING_INSIGHT",
    area: "INVESTMENT_BANKING",
    location: "London",
    state: "OPEN",
    rolling: true,
    openedMinutesAgo: 34,
    verifiedMinutesAgo: 8,
    eligibleYears: [1],
    description:
      "A week-long insight into the Investment Banking Division, with sessions on M&A, financing and a trading-floor visit. Applications are assessed on a rolling basis.",
  },
  {
    firm: "Blackstone",
    programme: "Future Women Leaders",
    category: "INSIGHT_PROGRAMME",
    area: "PRIVATE_EQUITY",
    location: "London",
    state: "OPEN",
    openedMinutesAgo: 120,
    verifiedMinutesAgo: 22,
    deadlineInDays: 43,
    eligibleYears: [1, 2],
    description:
      "An insight programme for women in their first or second year of university, covering private equity, real estate and credit.",
  },
  {
    firm: "J.P. Morgan",
    programme: "Early Insights Programme",
    category: "EARLY_INSIGHT",
    area: "MARKETS",
    location: "London",
    state: "CLOSING_SOON",
    openedMinutesAgo: 1_440,
    verifiedMinutesAgo: 45,
    deadlineInDays: 3,
    eligibleYears: [1],
    description: "Markets-focused early insight programme for first-year students, including sales, trading and research.",
  },

  // --- The rest of the open table -----------------------------------------
  {
    firm: "Morgan Stanley",
    programme: "Insight Programme",
    category: "INSIGHT_PROGRAMME",
    area: "INVESTMENT_BANKING",
    location: "London",
    state: "OPEN",
    openedMinutesAgo: 240,
    verifiedMinutesAgo: 30,
    deadlineInDays: 27,
    eligibleYears: [1],
  },
  {
    firm: "Evercore",
    programme: "Spring Insight Programme",
    category: "SPRING_INSIGHT",
    area: "INVESTMENT_BANKING",
    location: "London",
    state: "CLOSING_SOON",
    openedMinutesAgo: 1_500,
    verifiedMinutesAgo: 55,
    deadlineInDays: 6,
    eligibleYears: [1],
  },
  {
    firm: "Citi",
    programme: "Markets Discovery Programme",
    category: "INSIGHT_PROGRAMME",
    area: "SALES_AND_TRADING",
    location: "London",
    state: "OPEN",
    openedMinutesAgo: 1_600,
    verifiedMinutesAgo: 60,
    deadlineInDays: 36,
    eligibleYears: [1],
  },
  {
    firm: "Bank of America",
    programme: "Spring Week",
    category: "SPRING_WEEK",
    area: "INVESTMENT_BANKING",
    location: "London",
    state: "OPEN",
    rolling: true,
    openedMinutesAgo: 300,
    verifiedMinutesAgo: 18,
    eligibleYears: [1],
  },
  {
    firm: "UBS",
    programme: "Discover UBS",
    category: "INSIGHT_PROGRAMME",
    area: "GLOBAL_MARKETS",
    location: "London",
    state: "OPEN",
    openedMinutesAgo: 2_800,
    verifiedMinutesAgo: 70,
    deadlineInDays: 21,
    eligibleYears: [1],
  },
  {
    firm: "Barclays",
    programme: "Spring Insight Programme",
    category: "SPRING_INSIGHT",
    area: "INVESTMENT_BANKING",
    location: "London",
    state: "OPEN",
    rolling: true,
    openedMinutesAgo: 4_300,
    verifiedMinutesAgo: 90,
    eligibleYears: [1],
  },
  {
    firm: "Deutsche Bank",
    programme: "Spring into Banking",
    category: "SPRING_WEEK",
    area: "INVESTMENT_BANKING",
    location: "London",
    state: "CLOSING_SOON",
    openedMinutesAgo: 8_000,
    verifiedMinutesAgo: 120,
    deadlineInDays: 5,
    eligibleYears: [1],
  },
  {
    firm: "PJT Partners",
    programme: "Spring Insight Programme",
    category: "SPRING_INSIGHT",
    area: "RESTRUCTURING",
    location: "London",
    state: "OPEN",
    rolling: true,
    openedMinutesAgo: 5_000,
    verifiedMinutesAgo: 100,
    eligibleYears: [1],
  },
  {
    firm: "Moelis & Company",
    programme: "Spring Insight Week",
    category: "SPRING_WEEK",
    area: "MERGERS_AND_ACQUISITIONS",
    location: "London",
    state: "OPEN",
    openedMinutesAgo: 6_100,
    verifiedMinutesAgo: 140,
    deadlineInDays: 31,
    eligibleYears: [1],
  },
  {
    firm: "Houlihan Lokey",
    programme: "First Year Insight",
    category: "FIRST_YEAR_PROGRAMME",
    area: "CORPORATE_FINANCE",
    location: "London",
    state: "OPEN",
    openedMinutesAgo: 7_200,
    verifiedMinutesAgo: 160,
    deadlineInDays: 24,
    eligibleYears: [1],
  },
  {
    firm: "KKR",
    programme: "Future Leaders Insight",
    category: "INSIGHT_PROGRAMME",
    area: "PRIVATE_EQUITY",
    location: "London",
    state: "CLOSING_SOON",
    openedMinutesAgo: 9_000,
    verifiedMinutesAgo: 75,
    deadlineInDays: 4,
    eligibleYears: [1, 2],
  },
  {
    firm: "BlackRock",
    programme: "Spring Insight Programme",
    category: "SPRING_INSIGHT",
    area: "ASSET_MANAGEMENT",
    location: "London",
    state: "OPEN",
    openedMinutesAgo: 10_000,
    verifiedMinutesAgo: 200,
    deadlineInDays: 40,
    eligibleYears: [1],
  },
  {
    firm: "Jane Street",
    programme: "First Year Trading Programme",
    category: "FIRST_YEAR_PROGRAMME",
    area: "QUANTITATIVE",
    location: "London",
    state: "OPEN",
    rolling: true,
    openedMinutesAgo: 400,
    verifiedMinutesAgo: 25,
    eligibleYears: [1],
  },
  {
    firm: "Citadel",
    programme: "Discover Citadel",
    category: "INSIGHT_PROGRAMME",
    area: "HEDGE_FUND",
    location: "London",
    state: "OPEN",
    openedMinutesAgo: 11_000,
    verifiedMinutesAgo: 240,
    deadlineInDays: 18,
    eligibleYears: [1, 2],
  },

  // --- Announced: employer has confirmed a future opening date -------------
  {
    firm: "Rothschild & Co",
    programme: "Spring Insight Programme",
    category: "SPRING_INSIGHT",
    area: "ADVISORY",
    location: "London",
    state: "ANNOUNCED",
    announcedOpensInDays: 5,
    eligibleYears: [1],
    description: "Global Advisory spring insight programme. The firm has confirmed the opening date on its student careers page.",
  },
  {
    firm: "Morgan Stanley",
    programme: "Sales & Trading Spring Insight",
    category: "SPRING_INSIGHT",
    area: "SALES_AND_TRADING",
    location: "London",
    state: "ANNOUNCED",
    announcedOpensInDays: 9,
    eligibleYears: [1],
  },
  {
    firm: "Apollo Global Management",
    programme: "Insight Week",
    category: "INSIGHT_PROGRAMME",
    area: "PRIVATE_EQUITY",
    location: "London",
    state: "ANNOUNCED",
    announcedOpensInDays: 14,
    eligibleYears: [1, 2],
  },
  {
    firm: "Point72",
    programme: "Academy Insight Day",
    category: "INSIGHT_PROGRAMME",
    area: "HEDGE_FUND",
    location: "London",
    state: "ANNOUNCED",
    announcedOpensInDays: 20,
  },

  // --- Expected: predicted from history, never presented as confirmed ------
  {
    firm: "Lazard",
    programme: "Spring Insight Programme",
    category: "SPRING_INSIGHT",
    area: "INVESTMENT_BANKING",
    location: "London",
    state: "EXPECTED",
    historyOpenDayOffsets: [366, 731],
    eligibleYears: [1],
    description: "Lazard has run a spring insight programme in each of the last two cycles. FOE is watching for this year's opening.",
  },
  {
    firm: "The Carlyle Group",
    programme: "Spring Insight",
    category: "SPRING_INSIGHT",
    area: "PRIVATE_EQUITY",
    location: "London",
    state: "EXPECTED",
    historyOpenDayOffsets: [359, 740],
  },
  {
    firm: "Goldman Sachs",
    programme: "Markets Spring Insight",
    category: "SPRING_INSIGHT",
    area: "GLOBAL_MARKETS",
    location: "London",
    state: "EXPECTED",
    historyOpenDayOffsets: [372],
  },
  {
    firm: "Citi",
    programme: "Spring Insight Programme",
    category: "SPRING_INSIGHT",
    area: "INVESTMENT_BANKING",
    location: "London",
    state: "EXPECTED",
    historyOpenDayOffsets: [368, 736, 1101],
  },
  {
    firm: "Barclays",
    programme: "Markets Spring Programme",
    category: "SPRING_WEEK",
    area: "MARKETS",
    location: "London",
    state: "EXPECTED",
    historyOpenDayOffsets: [380, 742],
  },

  // --- States that prove the engine is honest ------------------------------
  {
    firm: "Houlihan Lokey",
    programme: "European Spring Insight",
    category: "SPRING_INSIGHT",
    area: "INVESTMENT_BANKING",
    location: "Frankfurt",
    state: "DISCOVERED",
    discoveryOnly: true,
    description:
      "Seen on a third-party spring week tracker. FOE will not show this as open until the firm's own site or ATS confirms a live application.",
  },
  {
    firm: "Deutsche Bank",
    programme: "Women in Markets Insight",
    category: "INSIGHT_PROGRAMME",
    area: "MARKETS",
    location: "London",
    state: "UNREACHABLE",
    description:
      "The careers page returned a 403 on the last three sweeps. This is a monitoring failure, not evidence that the programme does not exist.",
  },
];

function atsUrl(firm: DemoFirm, slug: string): string {
  switch (firm.ats) {
    case "GREENHOUSE":
      return `https://boards.greenhouse.io/${canonicalFirmName(firm.name).replace(/\s+/g, "")}/jobs/${slug}`;
    case "WORKDAY":
      return `https://${canonicalFirmName(firm.name).replace(/\s+/g, "")}.wd1.myworkdayjobs.com/en-US/campus/job/${slug}`;
    case "SMARTRECRUITERS":
      return `https://jobs.smartrecruiters.com/${canonicalFirmName(firm.name).replace(/\s+/g, "")}/${slug}`;
    case "ICIMS":
      return `https://careers-${canonicalFirmName(firm.name).replace(/\s+/g, "")}.icims.com/jobs/${slug}`;
    case "AVATURE":
      return `https://${canonicalFirmName(firm.name).replace(/\s+/g, "")}.avature.net/careers/JobDetail/${slug}`;
    default:
      return `https://www.${firm.domain}/careers/students/programmes/${slug}`;
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Removes every demo row, leaving anything the live engine produced intact. */
export async function clearFoeDemoData(prisma: PrismaClient) {
  await prisma.alert.deleteMany({ where: { isDemo: true } });
  await prisma.opportunitySnapshot.deleteMany({ where: { isDemo: true } });
  await prisma.opportunitySource.deleteMany({ where: { isDemo: true } });
  await prisma.foeOpportunity.deleteMany({ where: { isDemo: true } });
  await prisma.programmeHistory.deleteMany({ where: { isDemo: true } });
  await prisma.programme.deleteMany({ where: { isDemo: true } });
  await prisma.sourceFailure.deleteMany({ where: { isDemo: true } });
  await prisma.firmSource.deleteMany({ where: { isDemo: true } });
  await prisma.firm.deleteMany({ where: { isDemo: true } });
  await prisma.scanRun.deleteMany({ where: { isDemo: true } });
}

export async function seedFoeDemoData(prisma: PrismaClient, userId: string) {
  await clearFoeDemoData(prisma);

  // --- Firm universe -------------------------------------------------------
  const firmIds = new Map<string, string>();
  for (const f of FIRMS) {
    const firm = await prisma.firm.create({
      data: {
        name: f.name,
        canonicalName: demoCanonicalName(f.name),
        aliases: [],
        websiteDomain: f.domain,
        careersUrl: `https://www.${f.domain}/careers`,
        earlyCareersUrl: `https://www.${f.domain}/careers/students`,
        atsProvider: f.ats,
        categories: f.categories,
        tier: f.tier,
        health: "HEALTHY",
        lastScanAttemptedAt: minutesAgo(8),
        lastScanSucceededAt: minutesAgo(8),
        isDemo: true,
      },
    });
    firmIds.set(f.name, firm.id);

    // Tier 1 firms get redundant monitoring; every tier is still monitored.
    const sources: { kind: SourceKind; url: string; priority: number }[] = [
      { kind: "OFFICIAL_EARLY_CAREERS_PAGE", url: `https://www.${f.domain}/careers/students`, priority: 10 },
      { kind: "OFFICIAL_CAREERS_PAGE", url: `https://www.${f.domain}/careers`, priority: 20 },
    ];
    if (f.tier === "TIER_1") {
      sources.push({ kind: "ATS", url: atsUrl(f, "search"), priority: 5 });
      sources.push({ kind: "SITEMAP", url: `https://www.${f.domain}/sitemap.xml`, priority: 40 });
    }

    for (const s of sources) {
      await prisma.firmSource.create({
        data: {
          firmId: firm.id,
          kind: s.kind,
          url: s.url,
          priority: s.priority,
          atsProvider: s.kind === "ATS" ? f.ats : null,
          health: "HEALTHY",
          lastAttemptedAt: minutesAgo(8),
          lastSucceededAt: minutesAgo(8),
          lastStatusCode: 200,
          lastContentHash: `demo-${slugify(s.url).slice(-24)}`,
          isDemo: true,
        },
      });
    }
  }

  // --- Programmes, history and canonical opportunities ---------------------
  let opportunityCount = 0;
  const watchTargets: string[] = [];

  for (const o of OPPORTUNITIES) {
    const firmId = firmIds.get(o.firm);
    if (!firmId) continue;
    const firmMeta = FIRMS.find((f) => f.name === o.firm) as DemoFirm;

    const programme = await prisma.programme.create({
      data: {
        firmId,
        name: o.programme,
        canonicalKey: programmeKey({ programmeName: o.programme, category: o.category, location: o.location }),
        category: o.category,
        area: o.area,
        location: o.location,
        description: o.description,
        isDemo: true,
      },
    });

    // Previous cycles -> the expected-opening window.
    let expectedStart: Date | null = null;
    let expectedEnd: Date | null = null;
    let expectedLabel: string | null = null;
    if (o.historyOpenDayOffsets?.length) {
      const history = o.historyOpenDayOffsets.map((offset, i) => ({
        recruitmentYear: RECRUITMENT_YEAR - (i + 1),
        openedAt: daysAgo(offset),
      }));
      for (const h of history) {
        await prisma.programmeHistory.create({
          data: {
            programmeId: programme.id,
            recruitmentYear: h.recruitmentYear,
            openedAt: h.openedAt,
            deadlineAt: new Date(h.openedAt.getTime() + 45 * 86_400_000),
            source: "Previous cycle observed by FOE",
            isDemo: true,
          },
        });
      }
      // `now` rolls the window onto the cycle that is actually next: the 2027
      // cohort opens in autumn 2026, not autumn 2027.
      const window = deriveExpectedWindow(history, RECRUITMENT_YEAR, new Date());
      if (window) {
        expectedStart = window.start;
        expectedEnd = window.end;
        expectedLabel = window.label;
      }
    }

    const slug = slugify(`${o.programme}-${RECRUITMENT_YEAR}`);
    const officialUrl = `https://www.${firmMeta.domain}/careers/students/programmes/${slug}`;
    const applicationUrl = atsUrl(firmMeta, slug);
    const isOpen = o.state === "OPEN" || o.state === "CLOSING_SOON";

    const opportunity = await prisma.foeOpportunity.create({
      data: {
        fingerprint: demoFingerprint({
          firmName: o.firm,
          programmeName: o.programme,
          recruitmentYear: RECRUITMENT_YEAR,
          category: o.category,
          location: o.location,
        }),
        firmId,
        programmeId: programme.id,
        firmName: o.firm,
        programmeName: o.programme,
        recruitmentYear: RECRUITMENT_YEAR,
        category: o.category,
        area: o.area,
        location: o.location,
        region: regionForLocation(o.location),
        description: o.description,
        state: o.state,
        rolling: o.rolling ?? false,
        announcedAt: o.announcedOpensInDays != null ? daysAgo(2) : null,
        openingDate:
          o.announcedOpensInDays != null
            ? daysAhead(o.announcedOpensInDays)
            : o.openedMinutesAgo != null
              ? minutesAgo(o.openedMinutesAgo)
              : null,
        expectedOpeningStart: expectedStart,
        expectedOpeningEnd: expectedEnd,
        expectedOpeningLabel: expectedLabel,
        deadline: o.deadlineInDays != null ? daysAhead(o.deadlineInDays) : null,
        applicationUrl: isOpen ? applicationUrl : null,
        officialInfoUrl: o.discoveryOnly ? null : officialUrl,
        // Only verified openings carry a verification stamp. DISCOVERED and
        // UNREACHABLE rows deliberately have none.
        applicationVerifiedAt: isOpen && o.verifiedMinutesAgo != null ? minutesAgo(o.verifiedMinutesAgo) : null,
        verificationMethod: isOpen ? (firmMeta.ats === "PROPRIETARY" ? "OFFICIAL_PROGRAMME_PAGE" : "ATS_PAGE") : "NONE",
        verificationConfidence: isOpen ? (firmMeta.ats === "PROPRIETARY" ? 85 : 95) : 0,
        eligibleYears: o.eligibleYears ?? [],
        firstDiscoveredAt: o.openedMinutesAgo != null ? minutesAgo(o.openedMinutesAgo + 5) : daysAgo(30),
        firstVerifiedOpenAt: isOpen && o.openedMinutesAgo != null ? minutesAgo(o.openedMinutesAgo) : null,
        lastCheckedAt: o.state === "UNREACHABLE" ? hoursAgo(3) : minutesAgo(8),
        lastChangedAt: o.openedMinutesAgo != null ? minutesAgo(o.openedMinutesAgo) : daysAgo(2),
        isDemo: true,
      },
    });
    opportunityCount += 1;

    // Evidence. Discovery-only rows get third-party evidence exclusively, which
    // is exactly why they cannot be OPEN.
    if (o.discoveryOnly) {
      await prisma.opportunitySource.create({
        data: {
          opportunityId: opportunity.id,
          kind: "AGGREGATOR",
          url: `https://example-tracker.invalid/spring-weeks/${slug}`,
          title: "Listed on a third-party spring week tracker",
          isOfficial: false,
          confidence: 20,
          discoveredAt: hoursAgo(6),
          isDemo: true,
        },
      });
    } else {
      await prisma.opportunitySource.create({
        data: {
          opportunityId: opportunity.id,
          // A firm with no third-party ATS is verified on its own programme
          // page, so the source kind has to match the URL it points at.
          kind: !isOpen
            ? "OFFICIAL_EARLY_CAREERS_PAGE"
            : firmMeta.ats === "PROPRIETARY"
              ? "OFFICIAL_PROGRAMME_PAGE"
              : "ATS",
          url: isOpen ? applicationUrl : officialUrl,
          title: `${o.firm} — ${o.programme}`,
          isOfficial: true,
          confidence: isOpen ? 95 : 85,
          discoveredAt: o.openedMinutesAgo != null ? minutesAgo(o.openedMinutesAgo + 5) : daysAgo(20),
          lastSeenAt: minutesAgo(8),
          isDemo: true,
        },
      });
      // A second, independent path to the same programme — the case
      // deduplication exists to handle.
      await prisma.opportunitySource.create({
        data: {
          opportunityId: opportunity.id,
          kind: "SEARCH_ENGINE",
          url: `https://example-search.invalid/?q=${encodeURIComponent(`${o.firm} ${o.programme}`)}`,
          title: "Found again via search",
          isOfficial: false,
          confidence: 25,
          discoveredAt: hoursAgo(12),
          lastSeenAt: minutesAgo(8),
          isDemo: true,
        },
      });
    }

    await prisma.opportunitySnapshot.create({
      data: {
        opportunityId: opportunity.id,
        state: o.state,
        contentHash: `demo-${opportunity.id.slice(-12)}`,
        changeKind: isOpen ? "APPLICATION_OPENED" : "DISCOVERED",
        summary: isOpen ? "Application action detected on the official source." : "Programme page recorded.",
        isDemo: true,
      },
    });

    if (o.firm === "Rothschild & Co") watchTargets.push(opportunity.id);
  }

  // --- A profile for the demo account --------------------------------------
  // Without a university year every verdict is UNCLEAR, which is correct but
  // makes the demo dashboard say nothing useful about eligibility.
  await prisma.foePreferences.upsert({
    where: { userId },
    create: {
      userId,
      university: "University of Warwick",
      degree: "Economics",
      degreeLengthYears: 3,
      currentYear: 1,
      graduationYear: RECRUITMENT_YEAR + 1,
      preferredRegions: ["London", "UK"],
      interests: ["INVESTMENT_BANKING", "PRIVATE_EQUITY", "SALES_AND_TRADING"],
      categories: ["SPRING_WEEK", "SPRING_INSIGHT", "INSIGHT_PROGRAMME", "FIRST_YEAR_PROGRAMME", "EARLY_INSIGHT"],
    },
    update: {},
  });

  // --- The demo account watches the confirmed Rothschild opening ------------
  for (const opportunityId of watchTargets) {
    await prisma.watchlistItem.upsert({
      where: { userId_opportunityId: { userId, opportunityId } },
      create: { userId, opportunityId, targetType: "OPPORTUNITY", notifyInApp: true, notifyWhatsApp: false },
      update: {},
    });
  }

  // --- A completed sweep, so the health indicator has something to show -----
  const sourceCount = await prisma.firmSource.count({ where: { isDemo: true } });
  const scanRun = await prisma.scanRun.create({
    data: {
      kind: "FULL_SWEEP",
      status: "COMPLETED",
      startedAt: minutesAgo(8),
      finishedAt: minutesAgo(4),
      firmsPlanned: FIRMS.length,
      firmsScanned: FIRMS.length,
      sourcesScanned: sourceCount,
      sourcesChanged: 3,
      sourcesFailed: 1,
      candidatesFound: 4,
      opportunitiesOpened: 2,
      message: "Demo sweep",
      isDemo: true,
    },
  });

  // --- One unresolved failure, so "we could not check" is visible ----------
  const dbFirmId = firmIds.get("Deutsche Bank");
  if (dbFirmId) {
    const blocked = await prisma.firmSource.findFirst({ where: { firmId: dbFirmId, kind: "OFFICIAL_CAREERS_PAGE" } });
    if (blocked) {
      await prisma.firmSource.update({
        where: { id: blocked.id },
        data: { health: "BLOCKED", consecutiveFailures: 3, lastStatusCode: 403, blockedReason: "403 from the careers site" },
      });
      await prisma.sourceFailure.create({
        data: {
          scanRunId: scanRun.id,
          firmId: dbFirmId,
          firmSourceId: blocked.id,
          kind: "BLOCKED",
          severity: "WARNING",
          message: "Careers page returned 403 on the last 3 sweeps. Treated as unchecked, not as 'no opportunities'.",
          httpStatus: 403,
          detectedAt: hoursAgo(3),
          isDemo: true,
        },
      });
      await prisma.firm.update({ where: { id: dbFirmId }, data: { health: "DEGRADED", consecutiveFailures: 3 } });
    }
  }

  // --- Hot watch on the imminent confirmed opening -------------------------
  const rothschildId = firmIds.get("Rothschild & Co");
  if (rothschildId) {
    await prisma.firmSource.updateMany({
      where: { firmId: rothschildId },
      data: { hotWatchUntil: daysAhead(6) },
    });
  }

  return { firms: FIRMS.length, opportunities: opportunityCount };
}
