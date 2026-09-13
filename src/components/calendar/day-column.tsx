"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday as _isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { PX_PER_MIN, SNAP_MIN, GRID_HEIGHT, DAY_MINUTES, clampMinutes, snapMinutes } from "@/lib/calendar-constants";
import { minutesSinceMidnight, dateFromMinutes } from "@/lib/calendar-helpers";
import { TimeBlockCard } from "./time-block-card";
import type { TimeBlockDTO } from "@/lib/types";

interface DayColumnProps {
  date: Date;
  blocks: TimeBlockDTO[];
  onOpenDetail: (block: TimeBlockDTO) => void;
  onCreateDraft: (start: Date, end: Date) => void;
}

export function DayColumn({ date, blocks, onOpenDetail, onCreateDraft }: DayColumnProps) {
  const dateKey = format(date, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dateKey}`, data: { type: "day", date } });
  const columnRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<{ startMin: number; endMin: number } | null>(null);
  const draftRef = useRef<{ startMin: number; endMin: number } | null>(null);
  const dragState = useRef<{ anchorMin: number } | null>(null);

  function minutesFromClientY(clientY: number) {
    const rect = columnRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clampMinutes((clientY - rect.top) / PX_PER_MIN);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-block]")) return;
    const min = snapMinutes(minutesFromClientY(e.clientY));
    dragState.current = { anchorMin: min };
    draftRef.current = { startMin: min, endMin: min + SNAP_MIN };
    setDraft(draftRef.current);

    function onMove(ev: PointerEvent) {
      if (!dragState.current) return;
      const cur = snapMinutes(minutesFromClientY(ev.clientY));
      const anchor = dragState.current.anchorMin;
      const next = { startMin: Math.min(anchor, cur), endMin: Math.max(anchor, cur) + (cur === anchor ? SNAP_MIN : 0) };
      draftRef.current = next;
      setDraft(next);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dragState.current = null;
      const finalDraft = draftRef.current;
      draftRef.current = null;
      setDraft(null);
      if (finalDraft) {
        const start = dateFromMinutes(date, finalDraft.startMin);
        const end = dateFromMinutes(date, Math.max(finalDraft.endMin, finalDraft.startMin + SNAP_MIN));
        onCreateDraft(start, end);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  // "Now" is only known on the client — avoids a hydration mismatch, and ticks
  // the red current-time line forward once a minute.
  const [now, setNow] = useState<Date | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- syncing from a live clock, not render-derived state */
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const showNowLine = now !== null && _isToday(date);
  const nowMin = now ? minutesSinceMidnight(now) : 0;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        columnRef.current = node;
      }}
      onPointerDown={handlePointerDown}
      className={cn(
        "relative flex-1 border-l border-border first:border-l-0 select-none",
        isOver && "bg-primary-tint/40",
      )}
      style={{ height: GRID_HEIGHT }}
    >
      {Array.from({ length: DAY_MINUTES / 60 }).map((_, hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-border/70"
          style={{ top: hour * 60 * PX_PER_MIN }}
        />
      ))}

      {blocks.map((block) => {
        const start = minutesSinceMidnight(new Date(block.start));
        const durationMin = (new Date(block.end).getTime() - new Date(block.start).getTime()) / 60000;
        return (
          <div key={block.id} data-block>
            <TimeBlockCard
              block={block}
              top={start * PX_PER_MIN}
              height={durationMin * PX_PER_MIN}
              onOpenDetail={onOpenDetail}
            />
          </div>
        );
      })}

      {draft && (
        <div
          className="pointer-events-none absolute left-1 right-1 z-[2] rounded-[10px] border-2 border-dashed border-primary bg-primary/10"
          style={{ top: draft.startMin * PX_PER_MIN, height: (draft.endMin - draft.startMin) * PX_PER_MIN }}
        />
      )}

      {showNowLine && (
        <div
          className="pointer-events-none absolute inset-x-0 z-[3] flex items-center"
          style={{ top: nowMin * PX_PER_MIN }}
        >
          <div className="-ml-[3px] size-[7px] rounded-full bg-danger" />
          <div className="h-px flex-1 bg-danger" />
        </div>
      )}
    </div>
  );
}
