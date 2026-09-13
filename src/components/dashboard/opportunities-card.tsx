"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { useOpportunities } from "@/hooks/use-opportunities";
import { isUpcoming } from "@/lib/date-helpers";
import { MiniOpportunityItem } from "./mini-opportunity-item";

const NEW_WINDOW_DAYS = 10;
const DEADLINE_WINDOW_DAYS = 14;

export function OpportunitiesCard() {
  const { data: opportunities, isLoading } = useOpportunities();

  // "Now" is captured once on mount (via effect, not during render) so the
  // "newly added" window has a stable reference point instead of an
  // impure Date.now() read inside the memo below.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);

  const { fresh, dueSoon } = useMemo(() => {
    if (!opportunities || now === null) return { fresh: [], dueSoon: [] };
    const fresh = opportunities
      .filter((o) => now - new Date(o.createdAt).getTime() < NEW_WINDOW_DAYS * 86400000)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
    const dueSoon = opportunities
      .filter((o) => o.deadline && isUpcoming(new Date(o.deadline), DEADLINE_WINDOW_DAYS) && o.status !== "REJECTED" && o.status !== "CLOSED")
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 4);
    return { fresh, dueSoon };
  }, [opportunities, now]);

  const isEmpty = fresh.length === 0 && dueSoon.length === 0;

  return (
    <SectionCard icon={LineChart} title="Finance opportunities" href="/opportunities" hrefLabel="Open tracker">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={LineChart}
          title="No opportunities tracked yet"
          description="Add one, or check your watchlist for new finds."
          compact
        />
      ) : (
        <div className="space-y-4">
          {dueSoon.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
                Deadlines approaching
              </p>
              <div className="space-y-0.5">
                {dueSoon.map((o) => (
                  <MiniOpportunityItem key={o.id} opportunity={o} />
                ))}
              </div>
            </div>
          )}
          {fresh.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground">
                Newly added
              </p>
              <div className="space-y-0.5">
                {fresh.map((o) => (
                  <MiniOpportunityItem key={o.id} opportunity={o} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
