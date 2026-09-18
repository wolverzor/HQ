/**
 * Greenhouse job board adapter.
 *
 * Greenhouse serves every employer's board as public JSON at
 * `boards-api.greenhouse.io/v1/boards/<token>/jobs` — the same endpoint the
 * firm's own careers page calls to render itself. No key, no scraping, and the
 * fields arrive as data rather than as prose to be guessed at.
 *
 * That is the whole argument for structured adapters: on a careers page FOE has
 * to infer the division from surrounding words and usually gets it wrong. Here
 * the title, location and application URL are simply given.
 */

import type { Candidate, SourceAdapter } from "./types";
import { inferRecruitmentYear } from "./inference";
import { matchArea, regionForLocation } from "../../taxonomy";
import { classifyJobTitle, isRelevantLocation, yearFromTitle } from "./ats-vocabulary";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  metadata?: { name?: string; value?: unknown }[];
}

/** Recognises a Greenhouse board URL and extracts its token. */
export function greenhouseToken(url: string): string | null {
  const patterns = [
    /boards-api\.greenhouse\.io\/v1\/boards\/([^/?#]+)/i,
    /boards\.greenhouse\.io\/([^/?#]+)/i,
    /job-boards\.greenhouse\.io\/([^/?#]+)/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function greenhouseJobsUrl(token: string): string {
  return `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`;
}

export const greenhouseAdapter: SourceAdapter = {
  id: "greenhouse",

  supports: (source) => source.atsProvider === "GREENHOUSE" || greenhouseToken(source.url) !== null,

  parse({ text, firm, now }) {
    let payload: { jobs?: GreenhouseJob[] };
    try {
      payload = JSON.parse(text) as { jobs?: GreenhouseJob[] };
    } catch {
      // The fetcher strips HTML to text, so a board that returned a page rather
      // than JSON lands here. Not an error worth raising: the source health
      // check already records what came back.
      return [];
    }

    const jobs = payload.jobs ?? [];
    const candidates: Candidate[] = [];

    for (const job of jobs) {
      const match = classifyJobTitle(job.title);
      if (!match) continue;

      const location = job.location?.name ?? null;
      if (!isRelevantLocation(location)) continue;

      // A Greenhouse posting IS the application: its URL is the apply page, and
      // its presence on the board means it is live. That is what makes this a
      // verifiable source rather than a lead.
      candidates.push({
        programmeName: cleanTitle(job.title),
        category: match.category,
        area: matchArea(job.title) ?? matchArea(firm.name) ?? "OTHER",
        location,
        region: regionForLocation(location),
        recruitmentYear: yearFromTitle(job.title, now) ?? inferRecruitmentYear(job.title, now),
        sourceUrl: job.absolute_url,
        applicationUrl: job.absolute_url,
        officialInfoUrl: job.absolute_url,
        rolling: false,
        deadline: null,
        eligibleYears: [],
        applicationLive: true,
        closedSignal: false,
        excerpt: `${job.title}${location ? ` — ${location}` : ""}`,
      });
    }

    return candidates;
  },
};

/**
 * Tidies a board title into a programme name.
 *
 * Firms prefix the year and suffix the location: "2027 – Internship,
 * Quantitative Research and Trading" and "2027 Point72 Academy Investment
 * Analyst Summer Internship Program - Hong Kong". The year lives in its own
 * field and the location in another, so leaving them in the name would make
 * the same programme fingerprint differently year on year.
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\s*[-–—|]\s*(london|new york|hong kong|singapore|japan|us|uk|amsterdam|paris|dublin|zurich|geneva|shanghai|beijing|sydney)\b.*$/i, "")
    .replace(/^\s*[-–—,|]\s*/, "")
    .replace(/\s*[-–—,|]\s*$/, "")
    // Stripping the year can leave the brackets it sat in: "Graduate Software
    // Engineer (2026)" must not become "Graduate Software Engineer ( )".
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
