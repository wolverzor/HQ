import type { Candidate, SourceAdapter, AdapterFirm } from "./types";
import type { FinanceArea, OpportunityCategory } from "@prisma/client";
import { matchArea, matchProgrammeTerms, regionForLocation } from "../../taxonomy";
import { hasClosedSignal, hasLiveApplicationAction } from "../content";
import { inferEligibleYears, inferLocation, inferRecruitmentYear, inferRolling } from "./inference";

/** A window of text around a match, for the evidence excerpt. */
function excerptAround(text: string, phrase: string, radius = 160): string | null {
  const index = text.toLowerCase().indexOf(phrase);
  if (index < 0) return null;
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + phrase.length + radius);
  return `${start > 0 ? "..." : ""}${text.slice(start, end).trim()}${end < text.length ? "..." : ""}`;
}

function titleCase(s: string): string {
  return s.replace(/\w/g, (c) => c.toUpperCase());
}

/**
 * Reads any HTML page as text and looks for the configured programme
 * vocabulary. Low precision by design: it exists to make sure nothing is missed
 * on a site no structured adapter covers, and every candidate it raises still
 * has to survive verification before the user is told anything is open.
 */
export const genericPageAdapter: SourceAdapter = {
  id: "generic-page",
  supports: () => true,
  parse({ text, url, firm, source, now }) {
    const terms = matchProgrammeTerms(text);
    if (terms.length === 0) return [];

    const recruitmentYear = inferRecruitmentYear(text, now);
    const location = inferLocation(text);
    const rolling = inferRolling(text);
    const eligibleYears = inferEligibleYears(text);
    const applicationLive = hasLiveApplicationAction(text);
    const closedSignal = hasClosedSignal(text);

    // One candidate per distinct programme family. Two problems to avoid:
    // matching every phrase would give twelve candidates for one page, and
    // overlapping vocabulary would double-count a single programme —
    // "Spring Insight Programme" contains both "spring insight" and "insight
    // programme", which are different categories but the same programme.
    //
    // `terms` arrives longest-first, so claiming the text each match occupies
    // lets the most specific phrase win the span and shorter phrases inside it
    // are skipped.
    const lower = text.toLowerCase();
    const claimed: [number, number][] = [];
    const byCategory = new Map<OpportunityCategory, { phrase: string }>();

    for (const term of terms) {
      const at = lower.indexOf(term.phrase);
      if (at < 0) continue;
      const span: [number, number] = [at, at + term.phrase.length];

      const overlapsClaimed = claimed.some(([start, end]) => span[0] < end && span[1] > start);
      if (overlapsClaimed) continue;

      claimed.push(span);
      if (!byCategory.has(term.category)) byCategory.set(term.category, { phrase: term.phrase });
    }

    const candidates: Candidate[] = [];
    for (const [category, { phrase }] of byCategory) {
      const excerpt = excerptAround(text, phrase);
      const area = (excerpt ? matchArea(excerpt) : null) ?? matchArea(text) ?? inferAreaFromFirm(firm);

      candidates.push({
        programmeName: titleCase(phrase),
        category,
        area,
        location,
        region: regionForLocation(location),
        recruitmentYear,
        sourceUrl: url,
        // The generic adapter never claims to have found the application link
        // itself: it only saw the words on a page. Verification resolves the
        // real one.
        applicationUrl: null,
        officialInfoUrl: source.kind.startsWith("OFFICIAL") || source.kind === "ATS" ? url : null,
        rolling,
        deadline: null,
        eligibleYears,
        applicationLive,
        closedSignal,
        excerpt,
      });
    }

    return candidates;
  },
};

function inferAreaFromFirm(firm: AdapterFirm): FinanceArea {
  void firm;
  return "OTHER";
}
