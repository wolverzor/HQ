"use client";

import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Clock, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_COLOR } from "@/lib/labels";
import type { TaskDTO } from "@/lib/types";

export function UnscheduledTaskCard({ task, onOpen }: { task: TaskDTO; onOpen: () => void }) {
  const movedRef = useRef(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task:${task.id}`,
    data: { type: "task", task },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      {...attributes}
      onPointerDown={(e) => {
        movedRef.current = false;
        listeners?.onPointerDown?.(e);
      }}
      onPointerMove={() => {
        if (isDragging) movedRef.current = true;
      }}
      onClick={() => {
        if (movedRef.current) {
          movedRef.current = false;
          return;
        }
        onOpen();
      }}
      className={cn(
        "group flex touch-none items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-2 shadow-sm transition-shadow cursor-grab active:cursor-grabbing",
        isDragging && "z-30 opacity-90 shadow-lg",
      )}
    >
      <GripVertical className="size-3.5 shrink-0 text-subtle-foreground" />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-medium text-foreground">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle-foreground">
          <span className="size-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[task.priority] }} />
          {task.estimatedMinutes ? (
            <span className="flex items-center gap-0.5">
              <Clock className="size-2.5" />
              {task.estimatedMinutes}m
            </span>
          ) : (
            <span>No estimate</span>
          )}
        </div>
      </div>
    </div>
  );
}
