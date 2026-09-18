/**
 * Source adapters — the registry.
 *
 * Every source, whether an ATS API, a careers search endpoint or a plain HTML
 * programme page, is reduced to the same thing: a list of `Candidate`s. That
 * single normalisation is what lets Greenhouse, Workday and a hand-rolled
 * careers site feed one pipeline.
 *
 * Structured adapters sit in front of the generic text adapter, which stays
 * last as the catch-all. The order matters: where a firm publishes a real job
 * board, its titles, locations and apply links arrive as data instead of being
 * guessed at from prose on a marketing page.
 *
 * A candidate is a lead, never a verified opening. Nothing here can set OPEN;
 * that decision belongs to `canMarkOpen` in src/lib/foe/status.ts.
 */

import type { AdapterFirm, AdapterSource, SourceAdapter } from "./adapters/types";
import { genericPageAdapter } from "./adapters/generic-page";
import { greenhouseAdapter } from "./adapters/greenhouse";

export type { AdapterContext, AdapterFirm, AdapterSource, Candidate, SourceAdapter } from "./adapters/types";
export { genericPageAdapter } from "./adapters/generic-page";
export { greenhouseAdapter } from "./adapters/greenhouse";
export { inferEligibleYears, inferLocation, inferRecruitmentYear, inferRolling } from "./adapters/inference";

/** Most specific first; the generic page adapter is always the fallback. */
const REGISTRY: SourceAdapter[] = [greenhouseAdapter, genericPageAdapter];

export function registerAdapter(adapter: SourceAdapter) {
  REGISTRY.unshift(adapter);
}

export function adapterFor(source: AdapterSource, firm: AdapterFirm): SourceAdapter {
  return REGISTRY.find((a) => a.supports(source, firm)) ?? genericPageAdapter;
}

export function registeredAdapterIds(): string[] {
  return REGISTRY.map((a) => a.id);
}
