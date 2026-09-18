"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock, ListOrdered } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { cn } from "@/lib/utils";
import { useOpeningSoon, useToggleWatch } from "@/hooks/use-foe";
import type { OpeningSoonDTO } from "@/lib/foe/types";
import { OpeningSoonRow } from "./opening-soon-row";
import { OpeningKindBadge } from "./badges";

/** The date a row sits on: the confirmed day, or the start of the predicted window. */
function anchorDate(item: OpeningSoonDTO): Date | null {
  const raw = item.openingDate ?? item.expectedOpeningStart;
  return raw ? new Date(raw) : null;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function Timeline({ items, onToggleWatch }: { items: OpeningSoonDTO[]; onToggleWatch: (i: OpeningSoonDTO) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: OpeningSoonDTO[] }>();
    const undated: OpeningSoonDTO[] = [];

    for (const item of items) {
      const d = anchorDate(item);
      if (!d) {
        undated.push(item);
        continue;
      }
      const key = monthKey(d);
      if (!map.has(key)) map.set(key, { label: monthLabel(d), items: [] });
      map.get(key)!.items.push(item);
    }

    return { months: [...map.entries()].sort(([a], [b]) => a.localeCompare(b)), undated };
  }, [items]);

  return (
    <div className="space-y-8">
      {groups.months.map(([key, group]) => (
        <section key={key}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-subtle-foreground">{group.label}</h3>

          <ol className="mt-3 border-l border-border pl-5">
            {group.items.map((item) => (
              <li key={item.id} className="relative">
                {/* Confirmed gets a filled marker; expected gets a hollow, dashed
                    one — the timeline itself has to show which dates are real. */}
                <span
                  className={cn(
                    "absolute -left-[26px] top-6 size-2.5 rounded-full",
                    item.kind === "CONFIRMED" ? "bg-success" : "border-2 border-dashed border-[#7c3aed] bg-surface",
                  )}
                  aria-hidden
                />
                <OpeningSoonRow item={item} onToggleWatch={() => onToggleWatch(item)} className="border-b border-border last:border-0" />
              </li>
            ))}
          </ol>
        </section>
      ))}

      {groups.undated.length > 0 && (
        <section>
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-subtle-foreground">Date not yet known</h3>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            FOE is monitoring these, but has neither an announced date nor enough history to predict a window.
          </p>
          <div className="mt-2 divide-y divide-border">
            {groups.undated.map((item) => (
              <OpeningSoonRow key={item.id} item={item} onToggleWatch={() => onToggleWatch(item)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CalendarView({ items }: { items: OpeningSoonDTO[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  // Memoised so it is a stable dependency for the day grouping below.
  const month = useMemo(() => {
    const base = new Date();
    return new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const firstWeekday = (month.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map = new Map<number, OpeningSoonDTO[]>();
    for (const item of items) {
      const d = anchorDate(item);
      if (!d) continue;
      if (d.getFullYear() !== month.getFullYear() || d.getMonth() !== month.getMonth()) continue;
      const day = d.getDate();
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(item);
    }
    return map;
  }, [items, month]);

  const today = new Date();
  const isThisMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{monthLabel(month)}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o - 1)}
            className="rounded-lg px-2.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset(0)}
            className="rounded-lg px-2.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o + 1)}
            className="rounded-lg px-2.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-surface-inset px-2 py-1.5 text-center text-[11.5px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}

        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[92px] bg-surface" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const entries = byDay.get(day) ?? [];
          const isToday = isThisMonth && today.getDate() === day;
          return (
            <div key={day} className="min-h-[92px] bg-surface p-1.5">
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full text-[11.5px] tabular-nums",
                  isToday ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {day}
              </span>
              <div className="mt-1 space-y-1">
                {entries.slice(0, 2).map((e) => (
                  <div
                    key={e.id}
                    title={`${e.firmName} — ${e.programmeName} (${e.kind === "CONFIRMED" ? "confirmed" : "expected"})`}
                    className={cn(
                      "truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
                      e.kind === "CONFIRMED"
                        ? "bg-success-tint text-success"
                        : "border border-dashed border-[#7c3aed]/40 text-[#7c3aed]",
                    )}
                  >
                    {e.firmName}
                  </div>
                ))}
                {entries.length > 2 && (
                  <div className="px-1.5 text-[10.5px] text-muted-foreground">+{entries.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-success" aria-hidden />
          Confirmed by the employer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-dashed border-[#7c3aed]" aria-hidden />
          Expected from previous cycles — the day shown is the start of a window
        </span>
      </div>
    </div>
  );
}

export function OpeningSoonView() {
  const { data: items, isLoading } = useOpeningSoon();
  const toggleWatch = useToggleWatch();

  const confirmed = items?.filter((i) => i.kind === "CONFIRMED").length ?? 0;
  const expected = items?.filter((i) => i.kind === "EXPECTED").length ?? 0;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Finance Opportunity Engine
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-foreground">Opening soon</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {confirmed} confirmed by employers · {expected} expected from previous cycles.
          </p>
        </div>

        {/* A legend, so the two kinds are distinguishable before scrolling. */}
        <div className="flex items-center gap-2">
          <OpeningKindBadge kind="CONFIRMED" />
          <OpeningKindBadge kind="EXPECTED" />
        </div>
      </div>

      <Tabs defaultValue="timeline" className="mt-6">
        <TabsList>
          <TabsTrigger value="timeline">
            <span className="flex items-center gap-1.5">
              <ListOrdered className="size-3.5" />
              Timeline
            </span>
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Calendar
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-5">
          {isLoading ? (
            <Skeleton className="h-[320px] rounded-2xl" />
          ) : !items || items.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nothing scheduled yet"
              description="FOE will list programmes here once an employer announces a date, or once there is enough history to predict one."
            />
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <Timeline items={items} onToggleWatch={(i) => toggleWatch.mutate({ opportunityId: i.id, watching: !i.isWatched })} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-5">
          {isLoading ? (
            <Skeleton className="h-[420px] rounded-2xl" />
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <CalendarView items={items ?? []} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
