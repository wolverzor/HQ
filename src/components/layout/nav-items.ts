import { LayoutGrid, ListChecks, CalendarDays, LineChart, Brain, ClipboardList } from "lucide-react";

/**
 * `shortLabel` is what the mobile bottom bar renders — "Finance Opportunities"
 * does not fit in a 53px tab, and truncating it mid-word reads badly.
 */
export const NAV_ITEMS = [
  { href: "/", label: "Home", shortLabel: "Home", icon: LayoutGrid, match: (p: string) => p === "/" },
  { href: "/tasks", label: "Tasks", shortLabel: "Tasks", icon: ListChecks, match: (p: string) => p.startsWith("/tasks") },
  { href: "/calendar", label: "Calendar", shortLabel: "Calendar", icon: CalendarDays, match: (p: string) => p.startsWith("/calendar") },
  {
    href: "/opportunities",
    label: "Finance Opportunities",
    shortLabel: "Finance",
    icon: LineChart,
    match: (p: string) => p.startsWith("/opportunities"),
  },
  {
    href: "/applications",
    label: "Applications",
    shortLabel: "Apps",
    icon: ClipboardList,
    match: (p: string) => p.startsWith("/applications"),
  },
  { href: "/assessments", label: "Assessments", shortLabel: "Tests", icon: Brain, match: (p: string) => p.startsWith("/assessments") },
] as const;

/**
 * Sub-navigation for the Finance Opportunity Engine. Shown as a row of tabs
 * under the section rather than as six more sidebar entries.
 */
export const FOE_NAV_ITEMS = [
  { href: "/opportunities", label: "Overview", match: (p: string) => p === "/opportunities" },
  { href: "/opportunities/opening-soon", label: "Opening soon", match: (p: string) => p.startsWith("/opportunities/opening-soon") },
  { href: "/opportunities/watchlist", label: "Watchlist", match: (p: string) => p.startsWith("/opportunities/watchlist") },
  { href: "/opportunities/tracker", label: "Tracker", match: (p: string) => p.startsWith("/opportunities/tracker") },
] as const;
