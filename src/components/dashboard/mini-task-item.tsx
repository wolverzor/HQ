"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateTask } from "@/hooks/use-tasks";
import { PRIORITY_COLOR } from "@/lib/labels";
import { formatDeadlineShort } from "@/lib/date-helpers";
import { isTaskOverdue } from "@/lib/task-helpers";
import { TaskDialog } from "@/components/tasks/task-dialog";
import type { TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MiniTaskItem({ task }: { task: TaskDTO }) {
  const updateTask = useUpdateTask();
  const [editOpen, setEditOpen] = useState(false);
  const overdue = isTaskOverdue(task);
  const deadline = task.deadline ? new Date(task.deadline) : null;

  return (
    <>
      <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-surface-hover">
        <Checkbox
          checked={task.status === "DONE"}
          onCheckedChange={(checked) => updateTask.mutate({ id: task.id, status: checked ? "DONE" : "TODO" })}
        />
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left cursor-pointer"
        >
          <span className="flex items-center gap-1.5 truncate">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_COLOR[task.priority] }} />
            <span className="truncate text-[13.5px] font-medium text-foreground">{task.title}</span>
          </span>
          {deadline && (
            <span className={cn("shrink-0 text-[11.5px]", overdue ? "font-medium text-danger" : "text-subtle-foreground")}>
              {formatDeadlineShort(deadline)}
            </span>
          )}
        </button>
      </div>
      <TaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
    </>
  );
}
