import { LayoutGrid, ListChecks, CalendarDays, LineChart } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutGrid, match: (p: string) => p === "/" },
  { href: "/tasks", label: "Tasks", icon: ListChecks, match: (p: string) => p.startsWith("/tasks") },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, match: (p: string) => p.startsWith("/calendar") },
  { href: "/opportunities", label: "Opportunities", icon: LineChart, match: (p: string) => p.startsWith("/opportunities") },
] as const;
