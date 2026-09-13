"use client";

import { useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PX_PER_MIN, SNAP_MIN, MIN_BLOCK_MINUTES } from "@/lib/calendar-constants";
import { formatTimeRange } from "@/lib/date-helpers";
import { useUpdateTimeBlock } from "@/hooks/use-timeblocks";
import type { TimeBlockDTO } from "@/lib/types";

interface TimeBlockCardProps {
  block: TimeBlockDTO;
  top: number;
  height: number;
  onOpenDetail: (block: TimeBlockDTO) => void;
}

export function TimeBlockCard({ block, top, height, onOpenDetail }: TimeBlockCardProps) {
  const updateBlock = useUpdateTimeBlock();
  const [resizeEdge, setResizeEdge] = useState<"top" | "bottom" | null>(null);
  const [resizeDeltaPx, setResizeDeltaPx] = useState(0);
  const movedRef = useRef(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block:${block.id}`,
    data: { type: "block", block },
  });

  function startResize(edge: "top" | "bottom", e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    setResizeEdge(edge);
    const startY = e.clientY;

    function onMove(ev: PointerEvent) {
      setResizeDeltaPx(ev.clientY - startY);
    }
    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      const deltaMin = Math.round((ev.clientY - startY) / PX_PER_MIN / SNAP_MIN) * SNAP_MIN;
      setResizeEdge(null);
      setResizeDeltaPx(0);

      const start = new Date(block.start);
      const end = new Date(block.end);

      if (edge === "top") {
        const newStart = new Date(start.getTime() + deltaMin * 60000);
        if (end.getTime() - newStart.getTime() >= MIN_BLOCK_MINUTES * 60000) {
          updateBlock.mutate({ id: block.id, start: newStart.toISOString() });
        }
      } else {
        const newEnd = new Date(end.getTime() + deltaMin * 60000);
        if (newEnd.getTime() - start.getTime() >= MIN_BLOCK_MINUTES * 60000) {
          updateBlock.mutate({ id: block.id, end: newEnd.toISOString() });
        }
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  const dragTransformStyle =
    transform && !resizeEdge
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined;

  let visualTop = top;
  let visualHeight = height;
  if (resizeEdge === "top") {
    visualTop = top + resizeDeltaPx;
    visualHeight = height - resizeDeltaPx;
  } else if (resizeEdge === "bottom") {
    visualHeight = height + resizeDeltaPx;
  }
  visualHeight = Math.max(visualHeight, MIN_BLOCK_MINUTES * PX_PER_MIN * 0.6);

  const compact = visualHeight < 40;

  return (
    <div
      ref={setNodeRef}
      style={{
        top: visualTop,
        height: visualHeight,
        transform: dragTransformStyle,
        borderColor: block.color,
      }}
      className={cn(
        "group absolute left-1 right-1 z-[1] overflow-hidden rounded-[10px] border-l-[3px] bg-surface px-2.5 py-1.5 text-left shadow-sm transition-shadow cursor-grab active:cursor-grabbing",
        isDragging && "z-20 opacity-90 shadow-lg cursor-grabbing",
        resizeEdge && "z-20 shadow-lg",
        block.completed && "opacity-60",
      )}
      {...attributes}
      onClick={(e) => {
        if (movedRef.current) {
          movedRef.current = false;
          return;
        }
        e.stopPropagation();
        onOpenDetail(block);
      }}
      onPointerDown={(e) => {
        movedRef.current = false;
        listeners?.onPointerDown?.(e);
      }}
      onPointerMove={() => {
        if (isDragging) movedRef.current = true;
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ backgroundColor: block.color }}
      />
      <div className="relative flex items-start gap-1">
        {block.completed && <CheckCircle2 className="mt-[1px] size-3 shrink-0 text-success" />}
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-[12.5px] font-medium leading-tight text-foreground",
              block.completed && "line-through",
            )}
          >
            {block.title}
          </p>
          {!compact && (
            <p className="truncate text-[11px] leading-tight text-muted-foreground">
              {formatTimeRange(new Date(block.start), new Date(block.end))}
            </p>
          )}
        </div>
      </div>

      <div
        className="absolute inset-x-0 top-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
        onPointerDown={(e) => startResize("top", e)}
      >
        <div className="mx-auto mt-0.5 h-[3px] w-6 rounded-full bg-border-strong" />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
        onPointerDown={(e) => startResize("bottom", e)}
      >
        <div className="mx-auto mb-0.5 h-[3px] w-6 rounded-full bg-border-strong" />
      </div>
    </div>
  );
}
