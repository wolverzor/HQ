"use client";

import { useMemo, useState } from "react";
import { LineChart, Plus, Filter } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useOpportunities } from "@/hooks/use-opportunities";
import { OpportunityRow } from "./opportunity-row";
import { OpportunityDialog } from "./opportunity-dialog";
import { WatchlistView } from "./watchlist-view";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { OPPORTUNITY_STATUS_LABEL } from "@/lib/labels";
import type { OpportunityStatus } from "@/lib/types";

const ACTIVE_STATUSES: OpportunityStatus[] = [
  "NOT_OPEN",
  "OPEN",
  "APPLYING",
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
];

export function OpportunitiesView() {
  const { data: opportunities, isLoading } = useOpportunities();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<OpportunityStatus>>(new Set());

  const filtered = useMemo(() => {
    if (!opportunities) return [];
    const base =
      statusFilter.size > 0
        ? opportunities.filter((o) => statusFilter.has(o.status))
        : opportunities.filter((o) => o.status !== "REJECTED" && o.status !== "CLOSED");
    return [...base].sort((a, b) => {
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  }, [opportunities, statusFilter]);

  function toggleStatus(s: OpportunityStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Opportunities</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">
            {opportunities?.length ?? 0} tracked across spring weeks, internships &amp; insight programmes
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Add opportunity
        </Button>
      </div>

      <Tabs defaultValue="tracker" className="mt-5">
        <TabsList>
          <TabsTrigger value="tracker">Tracker</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="mt-4">
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <Filter className="size-3.5" />
                  {statusFilter.size > 0 ? `${statusFilter.size} filters` : "All active"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                {ACTIVE_STATUSES.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={statusFilter.has(s)}
                    onCheckedChange={() => toggleStatus(s)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {OPPORTUNITY_STATUS_LABEL[s]}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuCheckboxItem
                  checked={statusFilter.has("REJECTED")}
                  onCheckedChange={() => toggleStatus("REJECTED")}
                  onSelect={(e) => e.preventDefault()}
                >
                  {OPPORTUNITY_STATUS_LABEL.REJECTED}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.has("CLOSED")}
                  onCheckedChange={() => toggleStatus("CLOSED")}
                  onSelect={(e) => e.preventDefault()}
                >
                  {OPPORTUNITY_STATUS_LABEL.CLOSED}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={LineChart}
                title="No opportunities here"
                description="Add one manually, or check your watchlist for new finds."
                action={{ label: "Add opportunity", onClick: () => setCreateOpen(true) }}
              />
            ) : (
              filtered.map((o) => <OpportunityRow key={o.id} opportunity={o} />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="watchlist" className="mt-4">
          <WatchlistView />
        </TabsContent>
      </Tabs>

      <OpportunityDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
