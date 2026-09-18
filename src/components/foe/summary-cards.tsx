"use client";

import { Briefcase, CalendarClock, ChevronRight, Sparkles, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FoeSummaryDTO } from "@/lib/foe/types";

export type SummaryView = "all" | "open" | "new" | "opening-soon" | "urgent";

interface CardSpec {
  view: Exclude<SummaryView, "all">;
  label: string;
  icon: LucideIcon;
  /** Tint for the icon tile. The card itself stays neutral until selected. */
  color: string;
  tint: string;
  help: string;
}

const CARDS: CardSpec[] = [
  {
    view: "open",
    label: "Open",
    icon: Briefcase,
    color: "#4f46e5",
    tint: "#eef2ff",
    help: "Applications FOE has verified as live on an official source",
  },
  {
    view: "new",
    label: "New Today",
    icon: Sparkles,
    color: "#16a34a",
    tint: "#f0fdf4",
    help: "Verified open for the first time since midnight",
  },
  {
    view: "opening-soon",
    label: "Opening Soon",
    icon: CalendarClock,
    color: "#7c3aed",
    tint: "#f5f3ff",
    help: "Announced by the employer, or expected from previous cycles",
  },
  {
    view: "urgent",
    label: "Urgent",
    icon: TriangleAlert,
    color: "#e11d48",
    tint: "#fff1f2",
    help: "Open, deadline within 7 days, and you have not applied",
  },
];

/**
 * The four counters across the top. Each one is a filter: clicking narrows the
 * list below and clicking again clears it, so the numbers are a way into the
 * data rather than decoration.
 */
export function SummaryCards({
  summary,
  active,
  onSelect,
}: {
  summary: FoeSummaryDTO;
  active: SummaryView;
  onSelect: (view: SummaryView) => void;
}) {
  const values: Record<Exclude<SummaryView, "all">, number> = {
    open: summary.open,
    new: summary.newToday,
    "opening-soon": summary.openingSoon,
    urgent: summary.urgent,
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const isActive = active === card.view;
        return (
          <button
            key={card.view}
            type="button"
            title={card.help}
            aria-pressed={isActive}
            onClick={() => onSelect(isActive ? "all" : card.view)}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3.5 text-left transition-all cursor-pointer",
              "hover:border-border-strong hover:shadow-sm",
              isActive ? "border-transparent shadow-sm ring-2" : "border-border",
            )}
            style={isActive ? ({ "--tw-ring-color": card.color } as React.CSSProperties) : undefined}
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: card.tint, color: card.color }}
            >
              <Icon className="size-[19px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-muted-foreground">{card.label}</span>
              <span className="block text-[26px] font-semibold leading-tight tracking-tight text-foreground tabular-nums">
                {values[card.view]}
              </span>
            </span>
            <ChevronRight
              className={cn(
                "size-4 shrink-0 transition-colors",
                isActive ? "text-foreground" : "text-subtle-foreground group-hover:text-muted-foreground",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
