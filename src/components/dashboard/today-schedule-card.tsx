"use client";

import { CalendarDays, CheckCircle2 } from "lucide-react";
import { isToday } from "date-fns";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { useTimeBlocks } from "@/hooks/use-timeblocks";
import { formatTimeRange } from "@/lib/date-helpers";
import { cn } from "@/lib/utils";

export function TodayScheduleCard() {
  const { data: blocks, isLoading } = useTimeBlocks();
  const todayBlocks = (blocks ?? [])
    .filter((b) => isToday(new Date(b.start)))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <SectionCard icon={CalendarDays} title="Today's schedule" href="/calendar" hrefLabel="Open calendar">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : todayBlocks.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing planned today"
          description="Drag a task onto your calendar to plan the day."
          compact
        />
      ) : (
        <div className="space-y-0.5">
          {todayBlocks.map((block) => (
            <div key={block.id} className="flex items-center gap-3 rounded-lg px-1.5 py-2">
              <span className="w-[92px] shrink-0 text-[12px] tabular-nums text-muted-foreground">
                {formatTimeRange(new Date(block.start), new Date(block.end))}
              </span>
              <span
                className="h-6 w-[3px] shrink-0 rounded-full"
                style={{ backgroundColor: block.color }}
              />
              <span className={cn("truncate text-[13.5px] font-medium text-foreground", block.completed && "text-muted-foreground line-through")}>
                {block.title}
              </span>
              {block.completed && <CheckCircle2 className="ml-auto size-3.5 shrink-0 text-success" />}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
