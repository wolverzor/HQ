/**
 * The adapter contract.
 *
 * Interfaces only, in their own module so an adapter can import the types
 * without importing the registry that lists it — the cycle that otherwise
 * appears the moment a concrete adapter is registered.
 */

import type { AtsProvider, FinanceArea, OpportunityCategory, SourceKind } from "@prisma/client";

export interface AdapterSource {
  id: string;
  kind: SourceKind;
  url: string;
  atsProvider: AtsProvider | null;
}

export interface AdapterFirm {
  id: string;
  name: string;
  websiteDomain: string | null;
  atsProvider: AtsProvider;
}

export interface AdapterContext {
  firm: AdapterFirm;
  source: AdapterSource;
  /** Cleaned page text, or the raw body for sources that return JSON. */
  text: string;
  /** The URL actually fetched, after redirects. */
  url: string;
  now: Date;
}

/**
 * A lead, never a verified opening. Nothing an adapter produces can set OPEN;
 * that decision belongs to canMarkOpen in src/lib/foe/status.ts.
 */
export interface Candidate {
  programmeName: string;
  category: OpportunityCategory;
  area: FinanceArea;
  location: string | null;
  region: string | null;
  recruitmentYear: number;
  /** Where the candidate was found. Not automatically an application link. */
  sourceUrl: string;
  applicationUrl: string | null;
  officialInfoUrl: string | null;
  rolling: boolean;
  deadline: Date | null;
  eligibleYears: number[];
  /** Did this source show a live application action? Input to verification. */
  applicationLive: boolean;
  /** Did it say applications are shut? */
  closedSignal: boolean;
  excerpt: string | null;
}

export interface SourceAdapter {
  id: string;
  /** Whether this adapter can handle the source. First match wins. */
  supports: (source: AdapterSource, firm: AdapterFirm) => boolean;
  parse: (context: AdapterContext) => Candidate[];
}
