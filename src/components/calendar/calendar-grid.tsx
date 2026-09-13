"use client";

import { useEffect, useRef } from "react";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { DEFAULT_SCROLL_HOUR, PX_PER_MIN } from "@/lib/calendar-constants";
import { TimeGutter } from "./time-gutter";
import { DayColumn } from "./day-column";
import type { TimeBlockDTO } from "@/lib/types";

interface CalendarGridProps {
  days: Date[];
  blocksByDay: Map<string, TimeBlockDTO[]>;
  onOpenDetail: (block: TimeBlockDTO) => void;
  onCreateDraft: (start: Date, end: Date) => void;
}

export function CalendarGrid({ days, blocksByDay, onOpenDetail, onCreateDraft }: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = DEFAULT_SCROLL_HOUR * 60 * PX_PER_MIN - 24;
    }
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex border-b border-border pl-14 md:pl-16">
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 border-l border-border py-2.5 first:border-l-0",
            )}
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
              {format(day, "EEE")}
            </span>
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-[14px] font-semibold",
                isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground",
              )}
            >
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex">
          <TimeGutter />
          <div className="flex flex-1">
            {days.map((day) => (
              <DayColumn
                key={day.toISOString()}
                date={day}
                blocks={blocksByDay.get(format(day, "yyyy-MM-dd")) ?? []}
                onOpenDetail={onOpenDetail}
                onCreateDraft={onCreateDraft}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
