/**
 * Seeding and maintaining the global finance firm universe.
 *
 * The universe is persistent and shared: it is not rebuilt each sweep, and it
 * is not per-account. `syncFirmUniverse` is idempotent, so it can run on deploy
 * and after every edit to the list below without duplicating anything.
 *
 * The starting roster is the same one HQ already used for its per-account
 * watchlist (src/lib/default-watchlist.ts), promoted to global rows and
 * annotated with the category and tier the engine needs. Firms the engine
 * discovers later are added alongside these (Phase 9), which is why nothing
 * here assumes the list is complete.
 */

import type { AtsProvider, FirmCategory, PrismaClient, PriorityTier, SourceKind } from "@prisma/client";
import { DEFAULT_WATCHLIST } from "@/lib/default-watchlist";
import { canonicalFirmName } from "./fingerprint";
import { greenhouseJobsUrl } from "./engine/adapters/greenhouse";

interface UniverseEntry {
  name: string;
  categories: FirmCategory[];
  tier: PriorityTier;
}

/**
 * Category and tier per firm, keyed by `canonicalFirmName` of the roster entry.
 *
 * Keys are EXACT. An earlier version fell back to substring matching, which
 * quietly mapped "Millennium Management", "Apollo Global Management" and
 * "Wellington Management" onto Man Group, because every one of them contains
 * "man" — three firms vanishing from the universe without a single error. A
 * monitoring system losing firms silently is the exact failure it exists to
 * prevent, so unknown names now get a safe default under their own name
 * instead of being guessed at.
 *
 * Tier drives *redundancy and escalation only* — every tier is swept hourly.
 */
const CLASSIFICATION: Record<string, UniverseEntry> = {
  // Bulge bracket / major banks
  "goldman sachs": { name: "Goldman Sachs", categories: ["BULGE_BRACKET"], tier: "TIER_1" },
  "morgan stanley": { name: "Morgan Stanley", categories: ["BULGE_BRACKET"], tier: "TIER_1" },
  "jpmorgan chase": { name: "JPMorgan Chase", categories: ["BULGE_BRACKET"], tier: "TIER_1" },
  "bank of america": { name: "Bank of America", categories: ["BULGE_BRACKET"], tier: "TIER_1" },
  citi: { name: "Citi", categories: ["BULGE_BRACKET"], tier: "TIER_1" },
  barclays: { name: "Barclays", categories: ["INVESTMENT_BANK"], tier: "TIER_1" },
  hsbc: { name: "HSBC", categories: ["INVESTMENT_BANK"], tier: "TIER_1" },
  "deutsche bank": { name: "Deutsche Bank", categories: ["INVESTMENT_BANK"], tier: "TIER_1" },
  ubs: { name: "UBS", categories: ["BULGE_BRACKET"], tier: "TIER_1" },
  nomura: { name: "Nomura", categories: ["INVESTMENT_BANK"], tier: "TIER_2" },
  jefferies: { name: "Jefferies", categories: ["INVESTMENT_BANK"], tier: "TIER_1" },
  "rbc capital markets": { name: "RBC Capital Markets", categories: ["INVESTMENT_BANK"], tier: "TIER_2" },

  // Elite boutiques / advisory
  lazard: { name: "Lazard", categories: ["ELITE_BOUTIQUE"], tier: "TIER_1" },
  evercore: { name: "Evercore", categories: ["ELITE_BOUTIQUE"], tier: "TIER_1" },
  moelis: { name: "Moelis & Company", categories: ["ELITE_BOUTIQUE"], tier: "TIER_2" },
  rothschild: { name: "Rothschild & Co", categories: ["ELITE_BOUTIQUE"], tier: "TIER_1" },
  "houlihan lokey": { name: "Houlihan Lokey", categories: ["MIDDLE_MARKET_BANK"], tier: "TIER_2" },
  centerview: { name: "Centerview Partners", categories: ["ELITE_BOUTIQUE"], tier: "TIER_2" },

  // Private equity
  blackstone: { name: "Blackstone", categories: ["PRIVATE_EQUITY", "ALTERNATIVE_ASSET_MANAGER"], tier: "TIER_1" },
  kkr: { name: "KKR", categories: ["PRIVATE_EQUITY"], tier: "TIER_1" },
  "apollo global management": { name: "Apollo Global Management", categories: ["PRIVATE_EQUITY"], tier: "TIER_2" },
  carlyle: { name: "The Carlyle Group", categories: ["PRIVATE_EQUITY"], tier: "TIER_2" },
  "cvc capital": { name: "CVC Capital Partners", categories: ["PRIVATE_EQUITY"], tier: "TIER_2" },
  "bain capital": { name: "Bain Capital", categories: ["PRIVATE_EQUITY"], tier: "TIER_2" },
  permira: { name: "Permira", categories: ["PRIVATE_EQUITY"], tier: "TIER_3" },
  ardian: { name: "Ardian", categories: ["PRIVATE_EQUITY"], tier: "TIER_3" },

  // Asset management
  blackrock: { name: "BlackRock", categories: ["ASSET_MANAGER"], tier: "TIER_1" },
  vanguard: { name: "Vanguard", categories: ["ASSET_MANAGER"], tier: "TIER_2" },
  fidelity: { name: "Fidelity International", categories: ["ASSET_MANAGER"], tier: "TIER_2" },
  pimco: { name: "PIMCO", categories: ["ASSET_MANAGER"], tier: "TIER_2" },
  "wellington management": { name: "Wellington Management", categories: ["ASSET_MANAGER"], tier: "TIER_3" },
  schroders: { name: "Schroders", categories: ["ASSET_MANAGER"], tier: "TIER_2" },
  "m and g investments": { name: "M&G Investments", categories: ["ASSET_MANAGER"], tier: "TIER_3" },

  // Trading / hedge funds / quant
  "jane street": { name: "Jane Street", categories: ["MARKET_MAKER", "PROPRIETARY_TRADING"], tier: "TIER_1" },
  optiver: { name: "Optiver", categories: ["MARKET_MAKER"], tier: "TIER_1" },
  "imc trading": { name: "IMC Trading", categories: ["MARKET_MAKER"], tier: "TIER_2" },
  "citadel securities": { name: "Citadel Securities", categories: ["MARKET_MAKER"], tier: "TIER_1" },
  drw: { name: "DRW", categories: ["PROPRIETARY_TRADING"], tier: "TIER_2" },
  "susquehanna international group sig": {
    name: "Susquehanna International Group (SIG)",
    categories: ["PROPRIETARY_TRADING"],
    tier: "TIER_1",
  },
  "two sigma": { name: "Two Sigma", categories: ["QUANT", "HEDGE_FUND"], tier: "TIER_2" },
  man: { name: "Man Group", categories: ["HEDGE_FUND"], tier: "TIER_2" },
  "millennium management": { name: "Millennium Management", categories: ["HEDGE_FUND"], tier: "TIER_2" },
  point72: { name: "Point72", categories: ["HEDGE_FUND"], tier: "TIER_2" },
  "d e shaw": { name: "D. E. Shaw", categories: ["QUANT", "HEDGE_FUND"], tier: "TIER_2" },
  "marshall wace": { name: "Marshall Wace", categories: ["HEDGE_FUND"], tier: "TIER_3" },
  "brevan howard": { name: "Brevan Howard", categories: ["HEDGE_FUND"], tier: "TIER_3" },
  "xtx markets": { name: "XTX Markets", categories: ["QUANT", "MARKET_MAKER"], tier: "TIER_2" },
  "flow traders": { name: "Flow Traders", categories: ["MARKET_MAKER"], tier: "TIER_3" },
  "qube research and technologies": { name: "Qube Research & Technologies", categories: ["QUANT"], tier: "TIER_3" },
  "g research": { name: "G-Research", categories: ["QUANT"], tier: "TIER_2" },
};

/**
 * Classifies a roster entry. An unknown name keeps its own name and gets a
 * conservative default — never another firm's identity.
 */
export function classify(name: string): UniverseEntry {
  return CLASSIFICATION[canonicalFirmName(name)] ?? { name, categories: ["OTHER_FINANCE"], tier: "TIER_3" };
}


/**
 * Public ATS boards, discovered by probing each provider's public endpoint and
 * confirming it returns real jobs.
 *
 * These are worth far more than a careers page. A board returns titles,
 * locations and apply links as structured data, so FOE stops guessing the
 * division from surrounding prose — and a posting's presence on the board is
 * itself evidence the application is live.
 *
 * Verified live when added. A board that later disappears shows up as a source
 * failure rather than as an absence of opportunities, which is the point.
 */
const ATS_BOARDS: { firm: string; provider: AtsProvider; token: string }[] = [
  { firm: "Jane Street", provider: "GREENHOUSE", token: "janestreet" },
  { firm: "Point72", provider: "GREENHOUSE", token: "point72" },
  { firm: "IMC Trading", provider: "GREENHOUSE", token: "imc" },
  { firm: "Flow Traders", provider: "GREENHOUSE", token: "flowtraders" },
  { firm: "Qube Research & Technologies", provider: "GREENHOUSE", token: "quberesearchandtechnologies" },
  { firm: "Optiver", provider: "GREENHOUSE", token: "optiver" },
  { firm: "Marshall Wace", provider: "GREENHOUSE", token: "marshallwace" },
];

function domainOf(website: string): string | null {
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Sources created for a firm.
 *
 * Only URLs that are actually known. An earlier version also added a guessed
 * `{website}/careers/students` for every Tier 1 firm to give them redundancy;
 * twenty of them 404'd, producing twenty permanent CAREERS_URL_MISSING failures
 * that were entirely self-inflicted. A health view full of fabricated failures
 * is worse than no redundancy, because it trains you to ignore it.
 *
 * Real redundancy for Tier 1 comes from sources the engine resolves rather than
 * invents: ATS endpoints (Phase 4) and discovered programme pages (Phase 9),
 * both of which are verified to exist before being stored.
 */
function sourcesFor(_entry: UniverseEntry, careersUrl: string): { kind: SourceKind; url: string; priority: number }[] {
  return [{ kind: "OFFICIAL_CAREERS_PAGE", url: careersUrl, priority: 20 }];
}

export interface SyncResult {
  firmsCreated: number;
  firmsUpdated: number;
  sourcesCreated: number;
}

/**
 * Brings the global universe in line with the roster above. Safe to run
 * repeatedly: firms are keyed on their canonical name and sources on
 * (firm, url), so nothing duplicates and nothing the engine has learned about a
 * firm is overwritten.
 */
export async function syncFirmUniverse(prisma: PrismaClient): Promise<SyncResult> {
  let firmsCreated = 0;
  let firmsUpdated = 0;
  let sourcesCreated = 0;

  for (const listed of DEFAULT_WATCHLIST) {
    const entry = classify(listed.name);
    const canonicalName = canonicalFirmName(entry.name);

    const existing = await prisma.firm.findUnique({ where: { canonicalName } });

    const firm = await prisma.firm.upsert({
      where: { canonicalName },
      create: {
        name: entry.name,
        canonicalName,
        aliases: entry.name === listed.name ? [] : [listed.name],
        websiteDomain: domainOf(listed.website),
        careersUrl: listed.careersUrl,
        categories: entry.categories,
        tier: entry.tier,
        confirmed: true,
      },
      // Only fill gaps: never clobber a URL or ATS detail the engine resolved.
      update: {
        categories: entry.categories,
        tier: entry.tier,
        careersUrl: existing?.careersUrl ?? listed.careersUrl,
        websiteDomain: existing?.websiteDomain ?? domainOf(listed.website),
      },
    });

    if (existing) firmsUpdated += 1;
    else firmsCreated += 1;

    // An ATS board, where the firm has one, is the highest-confidence source
    // available and runs first.
    const board = ATS_BOARDS.find((b) => canonicalFirmName(b.firm) === canonicalName);
    if (board) {
      await prisma.firm.update({
        where: { id: firm.id },
        data: { atsProvider: board.provider, atsBoardId: board.token },
      });
      await prisma.firmSource.upsert({
        where: { firmId_url: { firmId: firm.id, url: greenhouseJobsUrl(board.token) } },
        create: {
          firmId: firm.id,
          kind: "ATS",
          url: greenhouseJobsUrl(board.token),
          atsProvider: board.provider,
          priority: 5,
          label: `${board.provider} board`,
        },
        update: {},
      });
    }

    for (const source of sourcesFor(entry, listed.careersUrl)) {
      const created = await prisma.firmSource.upsert({
        where: { firmId_url: { firmId: firm.id, url: source.url } },
        create: { firmId: firm.id, kind: source.kind, url: source.url, priority: source.priority },
        update: {},
      });
      if (created.createdAt.getTime() > Date.now() - 5_000) sourcesCreated += 1;
    }
  }

  return { firmsCreated, firmsUpdated, sourcesCreated };
}

/**
 * Records a firm the engine discovered rather than one from the roster.
 *
 * Added unconfirmed: FOE has a name and a URL but has not resolved the official
 * domain or careers pages yet, and an unconfirmed firm should not be presented
 * as part of the monitored universe until it has.
 */
export async function addCandidateFirm(
  prisma: PrismaClient,
  input: { name: string; websiteDomain?: string | null; sourceUrl: string; sourceKind: SourceKind },
) {
  const canonicalName = canonicalFirmName(input.name);
  const existing = await prisma.firm.findUnique({ where: { canonicalName } });
  if (existing) return existing;

  const firm = await prisma.firm.create({
    data: {
      name: input.name,
      canonicalName,
      websiteDomain: input.websiteDomain ?? null,
      categories: ["OTHER_FINANCE"],
      tier: "TIER_3",
      confirmed: false,
      notes: `Discovered via ${input.sourceKind} at ${input.sourceUrl}`,
    },
  });

  await prisma.firmSource.create({
    data: { firmId: firm.id, kind: input.sourceKind, url: input.sourceUrl, priority: 50 },
  });

  return firm;
}
