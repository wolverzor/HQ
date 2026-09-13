"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { addDays, format, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTimeBlocks, useCreateTimeBlock, useUpdateTimeBlock } from "@/hooks/use-timeblocks";
import { getWeekDays } from "@/lib/calendar-helpers";
import { minutesSinceMidnight, dateFromMinutes } from "@/lib/calendar-helpers";
import { PX_PER_MIN, snapMinutes } from "@/lib/calendar-constants";
import { CATEGORY_COLOR } from "@/lib/labels";
import { CalendarGrid } from "./calendar-grid";
import { UnscheduledPanel } from "./unscheduled-panel";
import { CreateBlockDialog } from "./create-block-dialog";
import { TimeBlockDetailDialog } from "./time-block-detail-dialog";
import type { TimeBlockDTO, TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week";

export function CalendarView() {
  const { data: blocks } = useTimeBlocks();
  const createBlock = useCreateTimeBlock();
  const updateBlock = useUpdateTimeBlock();

  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [draft, setDraft] = useState<{ start: Date; end: Date } | null>(null);
  const [detailBlock, setDetailBlock] = useState<TimeBlockDTO | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // One-time default based on viewport width — not derivable during render.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView("day");
    }
  }, []);

  const days = useMemo(() => (view === "day" ? [anchor] : getWeekDays(anchor)), [view, anchor]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, TimeBlockDTO[]>();
    for (const b of blocks ?? []) {
      const key = format(new Date(b.start), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return map;
  }, [blocks]);

  function goPrev() {
    setAnchor((d) => (view === "day" ? subDays(d, 1) : subDays(d, 7)));
  }
  function goNext() {
    setAnchor((d) => (view === "day" ? addDays(d, 1) : addDays(d, 7)));
  }
  function goToday() {
    setAnchor(new Date());
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeData = active.data.current as { type: string; task?: TaskDTO; block?: TimeBlockDTO };
    const overData = over.data.current as { type: string; date: Date } | undefined;
    if (!overData || overData.type !== "day") return;

    if (activeData.type === "task" && activeData.task) {
      const task = activeData.task;
      const activeRect = active.rect.current.translated;
      const overRect = over.rect;
      const offsetY = activeRect ? activeRect.top - overRect.top : 0;
      const startMin = snapMinutes(Math.max(0, offsetY / PX_PER_MIN));
      const duration = task.estimatedMinutes ?? 30;
      const start = dateFromMinutes(overData.date, startMin);
      const end = new Date(start.getTime() + duration * 60000);

      createBlock.mutate({
        title: task.title,
        start: start.toISOString(),
        end: end.toISOString(),
        taskId: task.id,
        color: CATEGORY_COLOR[task.category],
      });
      return;
    }

    if (activeData.type === "block" && activeData.block) {
      const block = activeData.block;
      const originalStart = new Date(block.start);
      const originalEnd = new Date(block.end);
      const durationMs = originalEnd.getTime() - originalStart.getTime();

      const deltaMin = event.delta.y / PX_PER_MIN;
      const newStartMin = snapMinutes(minutesSinceMidnight(originalStart) + deltaMin);
      const newStart = dateFromMinutes(overData.date, Math.max(0, newStartMin));
      const newEnd = new Date(newStart.getTime() + durationMs);

      updateBlock.mutate({ id: block.id, start: newStart.toISOString(), end: newEnd.toISOString() });
    }
  }

  const rangeLabel =
    view === "day"
      ? format(anchor, "EEEE d MMMM yyyy")
      : `${format(days[0], "d MMM")} – ${format(days[6], "d MMM yyyy")}`;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100dvh-57px)] flex-col md:h-dvh">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-semibold tracking-tight">Calendar</h1>
            <div className="hidden items-center gap-1 sm:flex">
              <Button variant="ghost" size="icon-sm" onClick={goPrev} aria-label="Previous">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={goNext} aria-label="Next">
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={goToday}>
                Today
              </Button>
            </div>
            <span className="text-[13.5px] text-muted-foreground">{rangeLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 sm:hidden">
              <Button variant="ghost" size="icon-sm" onClick={goPrev} aria-label="Previous">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={goNext} aria-label="Next">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="secondary"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobilePanelOpen((v) => !v)}
              aria-label="Toggle unscheduled tasks"
            >
              <PanelRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <CalendarGrid
            days={days}
            blocksByDay={blocksByDay}
            onOpenDetail={setDetailBlock}
            onCreateDraft={(start, end) => setDraft({ start, end })}
          />

          {mobilePanelOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] lg:hidden"
              onClick={() => setMobilePanelOpen(false)}
            />
          )}

          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-hidden rounded-t-2xl border-t border-border bg-surface shadow-float transition-transform duration-200",
              "lg:static lg:z-auto lg:max-h-none lg:w-[280px] lg:shrink-0 lg:translate-y-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none",
              mobilePanelOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border-strong lg:hidden" />
            <UnscheduledPanel />
          </div>
        </div>
      </div>

      <CreateBlockDialog draft={draft} onClose={() => setDraft(null)} />
      <TimeBlockDetailDialog block={detailBlock} onClose={() => setDetailBlock(null)} />
    </DndContext>
  );
}
