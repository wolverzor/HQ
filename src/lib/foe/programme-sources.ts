/**
 * Curated programme sources — the highest-value data in the engine.
 *
 * This is the thing that separates a working opportunity tracker from a
 * hopeful one. A careers *landing* page is marketing: Goldman's contains 5KB of
 * text and not one instance of the word "spring". The programmes live on
 * specific student pages, and knowing which page is the whole game. Checking a
 * known page for "is this open yet" is the easy part, and the engine already
 * does it.
 *
 * Every URL here was verified live before being added — fetched, and confirmed
 * to contain at least two programme terms, or confirmed to return 200 where it
 * replaces a dead roster URL. Nothing is guessed. An earlier version of this
 * file guessed `{domain}/careers/students` for every Tier 1 firm and produced
 * twenty permanent 404s, which taught the health view to be ignored.
 *
 * Maintenance: these URLs rot. When one starts failing it surfaces as a
 * CAREERS_URL_MISSING failure against that firm rather than as an absence of
 * opportunities, which is the whole point of the health model. Fix it here.
 */

import type { SourceKind } from "@prisma/client";

export interface ProgrammeSource {
  /** Matched against the roster by canonical name. */
  firm: string;
  url: string;
  kind: SourceKind;
  /** Lower runs first. Programme pages beat careers pages. */
  priority: number;
  label: string;
}

export const PROGRAMME_SOURCES: ProgrammeSource[] = [
  // --- Bulge bracket -------------------------------------------------------
  {
    firm: "Goldman Sachs",
    url: "https://www.goldmansachs.com/careers/students",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 10,
    label: "Students",
  },
  {
    firm: "Morgan Stanley",
    url: "https://www.morganstanley.com/people-opportunities/students-graduates/programs",
    kind: "OFFICIAL_PROGRAMME_PAGE",
    priority: 10,
    label: "Student programmes",
  },
  {
    firm: "JPMorgan Chase",
    url: "https://careers.jpmorgan.com/careers/explore-opportunities/students-and-graduates",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 10,
    label: "Students and graduates",
  },
  {
    firm: "Bank of America",
    url: "https://campus.bankofamerica.com/",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 10,
    label: "Campus",
  },
  // Citi splits its early careers across three pages; the pre-internships one
  // is where first-year programmes actually appear.
  {
    firm: "Citi",
    url: "https://jobs.citi.com/early-career-programs-pre-internships",
    kind: "OFFICIAL_PROGRAMME_PAGE",
    priority: 10,
    label: "Pre-internship programmes",
  },
  {
    firm: "Citi",
    url: "https://jobs.citi.com/early-career-programs",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 12,
    label: "Early career programmes",
  },
  {
    firm: "Citi",
    url: "https://jobs.citi.com/early-career-programs-internships",
    kind: "OFFICIAL_PROGRAMME_PAGE",
    priority: 14,
    label: "Internships",
  },
  {
    firm: "UBS",
    url: "https://www.ubs.com/global/en/careers.html",
    kind: "OFFICIAL_CAREERS_PAGE",
    priority: 20,
    label: "Careers",
  },

  // --- Other investment banks ---------------------------------------------
  {
    firm: "Barclays",
    url: "https://search.jobs.barclays/early-careers",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 10,
    label: "Early careers",
  },
  {
    firm: "Barclays",
    url: "https://search.jobs.barclays/internships",
    kind: "OFFICIAL_PROGRAMME_PAGE",
    priority: 12,
    label: "Internships",
  },
  {
    firm: "HSBC",
    url: "https://www.hsbc.com/careers/students-and-graduates/university-students-and-graduates",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 10,
    label: "University students and graduates",
  },
  {
    firm: "HSBC",
    url: "https://www.hsbc.com/careers/students-and-graduates/university-students-and-graduates/investment-banking",
    kind: "OFFICIAL_PROGRAMME_PAGE",
    priority: 12,
    label: "Investment banking programmes",
  },
  // Deutsche Bank publishes its insight programmes on their own page.
  {
    firm: "Deutsche Bank",
    url: "https://careers.db.com/students-graduates/insight-programmes/index?language_id=1",
    kind: "OFFICIAL_PROGRAMME_PAGE",
    priority: 10,
    label: "Insight programmes",
  },
  {
    firm: "Jefferies",
    url: "https://www.jefferies.com/careers/",
    kind: "OFFICIAL_CAREERS_PAGE",
    priority: 20,
    label: "Careers",
  },

  // --- Elite boutiques -----------------------------------------------------
  {
    firm: "Evercore",
    url: "https://www.evercore.com/careers/students/",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 10,
    label: "Students",
  },
  {
    firm: "Rothschild & Co",
    url: "https://www.rothschildandco.com/en/careers/students-and-graduates/",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 10,
    label: "Students and graduates",
  },
  {
    firm: "Moelis & Company",
    url: "https://www.moelis.com/careers/explore-opportunities/?tab=students-and-graduates",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 10,
    label: "Students and graduates",
  },

  // --- Buy side ------------------------------------------------------------
  {
    firm: "BlackRock",
    url: "https://careers.blackrock.com/early-careers",
    kind: "OFFICIAL_EARLY_CAREERS_PAGE",
    priority: 10,
    label: "Early careers",
  },
];

/**
 * Firms whose early-careers page could not be located, recorded rather than
 * quietly omitted.
 *
 * FOE still monitors each of these through its careers page and general
 * discovery. The note is here so the gap is visible and fixable, instead of
 * looking like the firm simply runs no programmes.
 */
export const UNRESOLVED_PROGRAMME_PAGES: { firm: string; reason: string }[] = [
  { firm: "UBS", reason: "Student pages are behind a region selector; no stable public URL found." },
  { firm: "Lazard", reason: "No student page reachable; careers site returns 404 on the usual paths." },
  { firm: "Blackstone", reason: "Careers site returns 403 to automated requests." },
  { firm: "Houlihan Lokey", reason: "No student page found via site navigation." },
];
