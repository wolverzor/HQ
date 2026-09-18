"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Clock, Filter, ListFilter, Search, SlidersHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { cn } from "@/lib/utils";
import { AREA_LABEL } from "@/lib/foe/labels";
import { relativeTime, daysUntil } from "@/lib/foe/format";
import { matchesEligibilityFilter } from "@/lib/foe/eligibility";
import { countActiveFilters, EMPTY_FILTERS, type OpportunityFilters, type SortOption } from "@/lib/foe/types";
import type { FinanceArea, FoeOpportunityDTO } from "@/lib/foe/types";
import {
  useFoeOpportunities,
  useMarkApplied,
  useOpeningSoon,
  useToggleWatch,
} from "@/hooks/use-foe";
import { SummaryCards, type SummaryView } from "./summary-cards";
import { PriorityCard } from "./priority-card";
import { OpeningSoonRow } from "./opening-soon-row";
import { OpportunityTable } from "./opportunity-table";
import { FilterDrawer } from "./filter-drawer";
import { OpportunityDrawer } from "./opportunity-drawer";
import { NotificationSettingsDialog } from "./notification-settings-dialog";
import { EngineHealthIndicator } from "./engine-health";
import { DemoBadge } from "./badges";

const FILTERS_STORAGE_KEY = "hq.foe.filters";

const SORT_LABEL: Record<SortOption, string> = {
  priority: "Priority",
  newest: "Newest",
  deadline: "Deadline",
  firm: "Company",
};

/** The chips shown above the table — the filters worth one click. */
const CHIP_AREAS: FinanceArea[] = ["INVESTMENT_BANKING", "PRIVATE_EQUITY", "SALES_AND_TRADING"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors cursor-pointer",
        active
          ? "border-transparent bg-primary-tint text-primary"
          : "border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  count,
  href,
  hrefLabel,
  right,
}: {
  icon: typeof Star;
  title: string;
  count?: number;
  href?: string;
  hrefLabel?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
        <Icon className="size-[18px] shrink-0 text-muted-foreground" strokeWidth={2} />
        <span className="truncate">
          {title}
          {count !== undefined && <span className="ml-1 text-muted-foreground">({count})</span>}
        </span>
      </h2>
      {right}
      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-0.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          {hrefLabel ?? "See all"}
          <ChevronRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

export function FoeDashboard() {
  const { data, isLoading } = useFoeOpportunities();
  const { data: openingSoon } = useOpeningSoon();
  const toggleWatch = useToggleWatch();
  const markApplied = useMarkApplied();

  const [filters, setFilters] = useState<OpportunityFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<SummaryView>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selected, setSelected] = useState<FoeOpportunityDTO | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Filters persist between visits — the user's sector and eligibility choices
  // are stable preferences, not a per-session decision.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
      // Reading persisted state on mount: the value cannot be known during
      // render without a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setFilters({ ...EMPTY_FILTERS, ...JSON.parse(raw), search: "" });
    } catch {
      // Storage can be unavailable (private windows, blocked cookies) — the
      // dashboard works fine with the defaults.
    }
  }, []);

  useEffect(() => {
    try {
      const { search, ...persisted } = filters;
      void search;
      window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore — see above.
    }
  }, [filters]);

  const all = useMemo(() => data?.opportunities ?? [], [data]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    let rows = all.filter((o) => !hidden.has(o.id));

    // Summary-card view
    if (view === "open") rows = rows.filter((o) => o.state === "OPEN" || o.state === "CLOSING_SOON");
    else if (view === "new") rows = rows.filter((o) => o.firstVerifiedOpenAt != null && new Date(o.firstVerifiedOpenAt) >= startOfToday);
    else if (view === "opening-soon") rows = rows.filter((o) => o.state === "ANNOUNCED" || o.state === "EXPECTED");
    else if (view === "urgent") {
      rows = rows.filter((o) => {
        if (o.application) return false;
        if (o.state !== "OPEN" && o.state !== "CLOSING_SOON") return false;
        const d = daysUntil(o.deadline);
        return d !== null && d >= 0 && d <= 7;
      });
    }

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (o) =>
          o.firmName.toLowerCase().includes(q) ||
          o.programmeName.toLowerCase().includes(q) ||
          (o.location ?? "").toLowerCase().includes(q) ||
          AREA_LABEL[o.area].toLowerCase().includes(q),
      );
    }

    if (filters.categories.length) rows = rows.filter((o) => filters.categories.includes(o.category));
    if (filters.areas.length) rows = rows.filter((o) => filters.areas.includes(o.area));
    if (filters.regions.length) rows = rows.filter((o) => (o.region ? filters.regions.includes(o.region) : false));
    rows = rows.filter((o) => matchesEligibilityFilter(o.eligibility.verdict, filters.eligibility));
    if (filters.rollingOnly) rows = rows.filter((o) => o.rolling);
    if (filters.notYetApplied) rows = rows.filter((o) => !o.application);
    if (filters.deadlineWithin7Days) {
      rows = rows.filter((o) => {
        const d = daysUntil(o.deadline);
        return d !== null && d >= 0 && d <= 7;
      });
    }

    const sorted = [...rows];
    if (filters.sort === "newest") {
      sorted.sort(
        (a, b) =>
          new Date(b.firstVerifiedOpenAt ?? b.firstDiscoveredAt).getTime() -
          new Date(a.firstVerifiedOpenAt ?? a.firstDiscoveredAt).getTime(),
      );
    } else if (filters.sort === "deadline") {
      sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    } else if (filters.sort === "firm") {
      sorted.sort((a, b) => a.firmName.localeCompare(b.firmName));
    }
    // "priority" keeps the server's ordering, which already applies the
    // documented default rules.

    return sorted;
  }, [all, filters, view, hidden]);

  const priorityPicks = useMemo(
    () => filtered.filter((o) => o.state === "OPEN" || o.state === "CLOSING_SOON").slice(0, 3),
    [filtered],
  );

  /**
   * The main table is the verified-open list, matching its heading. Rows FOE
   * has found but not verified are not dropped — they get their own clearly
   * labelled block underneath, because hiding them would be exactly the
   * high-recall failure this product exists to avoid.
   */
  const openList = useMemo(
    () => filtered.filter((o) => o.state === "OPEN" || o.state === "CLOSING_SOON"),
    [filtered],
  );

  const unverifiedList = useMemo(
    () =>
      filtered.filter((o) =>
        ["DISCOVERED", "VERIFYING", "MANUAL_REVIEW", "UNREACHABLE"].includes(o.state),
      ),
    [filtered],
  );

  /**
   * The Opening Soon panel is sorted by date, and confirmed dates are almost
   * always sooner than predicted windows — so a plain "first four" would show
   * four CONFIRMED rows and the EXPECTED state would never appear on the
   * dashboard at all. Reserve the last slot for the soonest prediction.
   */
  const openingSoonPreview = useMemo(() => {
    if (!openingSoon?.length) return [];
    const confirmed = openingSoon.filter((i) => i.kind === "CONFIRMED");
    const expected = openingSoon.filter((i) => i.kind === "EXPECTED");
    // Confirmed dates lead, then the soonest prediction, so both kinds are
    // always represented and the panel never becomes four identical badges.
    return [...confirmed.slice(0, 3), ...expected.slice(0, 1)];
  }, [openingSoon]);

  const hiddenByFilters = all.length - filtered.length - hidden.size;
  const activeFilterCount = countActiveFilters(filters);
  const lastChecked = useMemo(() => {
    const stamps = all.map((o) => o.lastCheckedAt).filter(Boolean) as string[];
    if (!stamps.length) return null;
    return stamps.sort().at(-1) ?? null;
  }, [all]);
  const hasDemoData = all.some((o) => o.isDemo);

  function handleToggleWatch(o: FoeOpportunityDTO) {
    toggleWatch.mutate({ opportunityId: o.id, watching: !o.isWatched });
    setSelected((prev) => (prev && prev.id === o.id ? { ...prev, isWatched: !o.isWatched } : prev));
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Opportunities today
          </p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-foreground md:text-[32px]">
            Finance Opportunity Engine
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Track finance opportunities before you miss them.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <EngineHealthIndicator className="hidden sm:flex" />
          <Button variant="outline" size="md" onClick={() => setNotificationsOpen(true)}>
            <Bell className="size-4" />
            Notification settings
          </Button>
          <div className="hidden border-l border-border pl-4 lg:block">
            <p className="text-[13px] font-semibold tracking-tight text-foreground">Stay ahead.</p>
            <p className="text-[12.5px] text-muted-foreground">Opportunities create futures.</p>
          </div>
        </div>
      </div>

      {hasDemoData && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-surface-inset px-3.5 py-2.5">
          <DemoBadge />
          <p className="text-[12.5px] text-muted-foreground">
            This dashboard is showing seeded sample programmes so the interface can be built and reviewed. They are not
            live openings — the monitoring pipeline replaces them with verified results.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-5">
        {isLoading || !data ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[74px] rounded-2xl" />
            ))}
          </div>
        ) : (
          <SummaryCards summary={data.summary} active={view} onSelect={setView} />
        )}
      </div>

      {/* Priority + Opening soon */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <PanelHeader
            icon={Star}
            title="Priority for you"
            href="/opportunities?view=priority"
            hrefLabel="See all priority opportunities"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-[200px] rounded-2xl" />)
            ) : priorityPicks.length === 0 ? (
              <p className="col-span-full py-6 text-center text-[13px] text-muted-foreground">
                Nothing open matches your current filters.
              </p>
            ) : (
              priorityPicks.map((o) => (
                <PriorityCard
                  key={o.id}
                  opportunity={o}
                  onOpen={() => setSelected(o)}
                  onToggleWatch={() => handleToggleWatch(o)}
                  onMarkApplied={() => markApplied.mutate(o.id)}
                />
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <PanelHeader icon={Clock} title="Opening soon" href="/opportunities/opening-soon" />
          <div className="mt-1 divide-y divide-border">
            {!openingSoon ? (
              <Skeleton className="mt-3 h-[160px] rounded-xl" />
            ) : openingSoon.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">
                No announced or expected openings yet.
              </p>
            ) : (
              openingSoonPreview.map((item) => (
                <OpeningSoonRow
                  key={item.id}
                  item={item}
                  onToggleWatch={() => toggleWatch.mutate({ opportunityId: item.id, watching: !item.isWatched })}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Open opportunities */}
      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <PanelHeader
          icon={ListFilter}
          title="Open opportunities"
          count={openList.length}
          right={
            <span className="ml-auto hidden text-[12px] text-muted-foreground sm:block">
              {lastChecked ? `Last updated ${relativeTime(lastChecked)}` : "Not checked yet"}
            </span>
          }
        />

        {/* Search + chips + sort */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by company, opportunity or keyword..."
              className="pl-9"
              aria-label="Search opportunities"
            />
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            {CHIP_AREAS.map((area) => (
              <Chip
                key={area}
                active={filters.areas.includes(area)}
                onClick={() =>
                  setFilters({
                    ...filters,
                    areas: filters.areas.includes(area) ? filters.areas.filter((a) => a !== area) : [...filters.areas, area],
                  })
                }
              >
                {AREA_LABEL[area]}
              </Chip>
            ))}
            <Chip
              active={filters.eligibility === "eligible_plus_likely" || filters.eligibility === "eligible"}
              onClick={() =>
                setFilters({
                  ...filters,
                  eligibility: filters.eligibility === "all" ? "eligible_plus_likely" : "all",
                })
              }
            >
              <Filter className="size-3.5" />
              Eligible only
            </Chip>
            <Chip active={filters.rollingOnly} onClick={() => setFilters({ ...filters, rollingOnly: !filters.rollingOnly })}>
              <Clock className="size-3.5" />
              Rolling
            </Chip>
            <Chip
              active={filters.regions.includes("London")}
              onClick={() =>
                setFilters({
                  ...filters,
                  regions: filters.regions.includes("London")
                    ? filters.regions.filter((r) => r !== "London")
                    : [...filters.regions, "London"],
                })
              }
            >
              London
            </Chip>

            <Button variant="secondary" size="sm" onClick={() => setFiltersOpen(true)} className="ml-auto">
              <SlidersHorizontal className="size-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  Sort: {SORT_LABEL[filters.sort]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.sort}
                  onValueChange={(v) => setFilters({ ...filters, sort: v as SortOption })}
                >
                  {(Object.keys(SORT_LABEL) as SortOption[]).map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {SORT_LABEL[s]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* The list */}
        <div className="mt-2">
          {isLoading ? (
            <Skeleton className="h-[280px] rounded-xl" />
          ) : openList.length === 0 ? (
            <EmptyState
              icon={ListFilter}
              title="Nothing matches these filters"
              description={
                activeFilterCount > 0
                  ? "FOE is still monitoring everything — only your view is narrowed."
                  : "No open opportunities have been verified yet."
              }
              action={activeFilterCount > 0 ? { label: "Clear filters", onClick: () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort }) } : undefined}
            />
          ) : (
            <OpportunityTable
              opportunities={openList}
              onOpen={setSelected}
              onToggleWatch={handleToggleWatch}
              onMarkApplied={(o) => markApplied.mutate(o.id)}
            />
          )}
        </div>

        {/* Honesty about what is being hidden */}
        {hiddenByFilters > 0 && (
          <p className="mt-3 border-t border-border pt-3 text-[12px] text-muted-foreground">
            {hiddenByFilters} {hiddenByFilters === 1 ? "opportunity is" : "opportunities are"} hidden by your filters.
            FOE is still monitoring {all.length === 1 ? "it" : "them"}.{" "}
            <button
              type="button"
              onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
              className="font-medium text-primary hover:underline cursor-pointer"
            >
              Show everything
            </button>
          </p>
        )}
        {/* Found, not yet verified. Kept visible and clearly separated rather
            than dropped — an unverified row is still a lead. */}
        {unverifiedList.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
              Found, not yet verified <span className="text-muted-foreground">({unverifiedList.length})</span>
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              FOE has seen these but has not confirmed a live application on an official source, or could not reach the
              source at all. They are not counted as open.
            </p>
            <div className="mt-2">
              <OpportunityTable
                opportunities={unverifiedList}
                onOpen={setSelected}
                onToggleWatch={handleToggleWatch}
                onMarkApplied={(o) => markApplied.mutate(o.id)}
              />
            </div>
          </div>
        )}
      </section>

      <FilterDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onChange={setFilters}
        resultCount={openList.length}
      />

      <OpportunityDrawer
        opportunity={selected}
        open={selected != null}
        onOpenChange={(o) => !o && setSelected(null)}
        onToggleWatch={() => selected && handleToggleWatch(selected)}
        onMarkApplied={() => {
          if (selected) markApplied.mutate(selected.id);
          setSelected(null);
        }}
        onHide={() => {
          if (selected) setHidden((prev) => new Set(prev).add(selected.id));
          setSelected(null);
        }}
      />

      <NotificationSettingsDialog open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </div>
  );
}
