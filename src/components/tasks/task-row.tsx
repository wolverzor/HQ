"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Clock, Briefcase } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR, CATEGORY_LABEL, PRIORITY_COLOR } from "@/lib/labels";
import { formatDeadlineShort } from "@/lib/date-helpers";
import { isTaskOverdue } from "@/lib/task-helpers";
import { useUpdateTask } from "@/hooks/use-tasks";
import type { TaskDTO } from "@/lib/types";
import { TaskDialog } from "./task-dialog";

export function TaskRow({ task, sortable = true }: { task: TaskDTO; sortable?: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const updateTask = useUpdateTask();

  const sortableProps = useSortable({ id: task.id, disabled: !sortable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortableProps;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isTaskOverdue(task);
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const isDone = task.status === "DONE";

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-surface-hover",
          isDragging && "z-10 bg-surface shadow-lg opacity-90",
        )}
      >
        {sortable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            aria-label="Reorder task"
          >
            <GripVertical className="size-4" />
          </button>
        )}

        <Checkbox
          checked={isDone}
          onCheckedChange={(checked) =>
            updateTask.mutate({ id: task.id, status: checked ? "DONE" : "TODO" })
          }
          onClick={(e) => e.stopPropagation()}
        />

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex min-w-0 flex-1 flex-col gap-1 text-left cursor-pointer"
        >
          <span
            className={cn(
              "truncate text-[14.5px] font-medium text-foreground",
              isDone && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="dot" color={PRIORITY_COLOR[task.priority]} className="bg-transparent px-0 text-muted-foreground">
              {task.priority === "HIGH" ? "High" : task.priority === "MEDIUM" ? "Medium" : "Low"}
            </Badge>
            <span className="text-subtle-foreground">·</span>
            <Badge color={CATEGORY_COLOR[task.category]}>{CATEGORY_LABEL[task.category]}</Badge>
            {task.project && (
              <Badge color={task.project.color}>
                <Briefcase className="size-2.5" />
                {task.project.name}
              </Badge>
            )}
            {deadline && (
              <Badge
                color={overdue ? "#e11d48" : undefined}
                variant={overdue ? "tint" : "tint"}
                className={!overdue ? "bg-surface-inset text-muted-foreground" : undefined}
              >
                {formatDeadlineShort(deadline)}
              </Badge>
            )}
            {task.estimatedMinutes && (
              <span className="flex items-center gap-1 text-[11.5px] text-subtle-foreground">
                <Clock className="size-3" />
                {task.estimatedMinutes}m
              </span>
            )}
          </div>
        </button>
      </div>

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
    </>
  );
}
