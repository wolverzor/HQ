"use client";

import { RotateCcw } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AREA_LABEL, CATEGORY_LABEL } from "@/lib/foe/labels";
import { PRIMARY_AREAS, REGIONS } from "@/lib/foe/taxonomy";
import { EMPTY_FILTERS, type EligibilityFilter, type OpportunityFilters } from "@/lib/foe/types";
import type { FinanceArea, OpportunityCategory } from "@/lib/foe/types";

const TYPE_OPTIONS: OpportunityCategory[] = [
  "SPRING_WEEK",
  "SPRING_INSIGHT",
  "INSIGHT_PROGRAMME",
  "FIRST_YEAR_PROGRAMME",
  "EARLY_INSIGHT",
  "SUMMER_INTERNSHIP",
  "OFF_CYCLE_INTERNSHIP",
  "INDUSTRIAL_PLACEMENT",
  "NETWORKING_EVENT",
];

const ELIGIBILITY_OPTIONS: { value: EligibilityFilter; label: string; help?: string }[] = [
  { value: "all", label: "All" },
  { value: "eligible", label: "Eligible only" },
  { value: "eligible_plus_likely", label: "Eligible + likely" },
  { value: "unclear", label: "Unclear only", help: "Programmes FOE could not confirm — worth a look, not a skip" },
];

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer",
        active
          ? "border-transparent bg-primary-tint text-primary"
          : "border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border py-5 first:pt-0 last:border-0">
      <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h3>
      {note && <p className="mt-0.5 text-[12px] text-muted-foreground">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function FilterDrawer({
  open,
  onOpenChange,
  filters,
  onChange,
  resultCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: OpportunityFilters;
  onChange: (next: OpportunityFilters) => void;
  resultCount: number;
}) {
  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Filters only change what you see. Nothing is deleted from the engine, and FOE keeps monitoring everything.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <Group title="Opportunity type">
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((c) => (
                <Toggle
                  key={c}
                  active={filters.categories.includes(c)}
                  onClick={() => onChange({ ...filters, categories: toggleIn(filters.categories, c) })}
                >
                  {CATEGORY_LABEL[c]}
                </Toggle>
              ))}
            </div>
          </Group>

          <Group title="Area">
            <div className="flex flex-wrap gap-2">
              {PRIMARY_AREAS.map((a: FinanceArea) => (
                <Toggle
                  key={a}
                  active={filters.areas.includes(a)}
                  onClick={() => onChange({ ...filters, areas: toggleIn(filters.areas, a) })}
                >
                  {AREA_LABEL[a]}
                </Toggle>
              ))}
            </div>
          </Group>

          <Group
            title="Eligibility"
            note="Unclear programmes stay visible unless you choose otherwise — a missed eligible programme is the costlier mistake."
          >
            <div className="flex flex-wrap gap-2">
              {ELIGIBILITY_OPTIONS.map((opt) => (
                <Toggle
                  key={opt.value}
                  active={filters.eligibility === opt.value}
                  onClick={() => onChange({ ...filters, eligibility: opt.value })}
                >
                  {opt.label}
                </Toggle>
              ))}
            </div>
          </Group>

          <Group title="Location">
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <Toggle
                  key={r}
                  active={filters.regions.includes(r)}
                  onClick={() => onChange({ ...filters, regions: toggleIn(filters.regions, r) })}
                >
                  {r}
                </Toggle>
              ))}
            </div>
          </Group>

          <Group title="Application">
            <div className="space-y-3">
              {(
                [
                  { key: "rollingOnly", label: "Rolling only", help: "Assessed as applications arrive — apply early" },
                  { key: "deadlineWithin7Days", label: "Deadline within 7 days" },
                  { key: "notYetApplied", label: "Not yet applied" },
                ] as const
              ).map((row) => (
                <label key={row.key} className="flex cursor-pointer items-center justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-[13.5px] text-foreground">{row.label}</span>
                    {"help" in row && row.help && <span className="block text-[12px] text-muted-foreground">{row.help}</span>}
                  </span>
                  <Switch
                    checked={filters[row.key]}
                    onCheckedChange={(checked) => onChange({ ...filters, [row.key]: checked })}
                  />
                </label>
              ))}
            </div>
          </Group>
        </SheetBody>

        <SheetFooter className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...EMPTY_FILTERS, search: filters.search, sort: filters.sort })}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Show {resultCount} {resultCount === 1 ? "opportunity" : "opportunities"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
