"use client";

import { useMemo, useState } from "react";
import { ListTodo } from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { UnscheduledTaskCard } from "./unscheduled-task-card";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import type { TaskDTO } from "@/lib/types";

export function UnscheduledPanel() {
  const { data: tasks, isLoading } = useTasks();
  const [editing, setEditing] = useState<TaskDTO | null>(null);

  const unscheduled = useMemo(
    () => (tasks ?? []).filter((t) => t.status !== "DONE" && t.timeBlocks.length === 0),
    [tasks],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3.5">
        <h2 className="text-[14px] font-semibold text-foreground">Unscheduled tasks</h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">Drag onto your week to plan them</p>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[52px] rounded-xl" />)
        ) : unscheduled.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="Nothing to schedule"
            description="All active tasks are already on your calendar."
            compact
          />
        ) : (
          unscheduled.map((task) => (
            <UnscheduledTaskCard key={task.id} task={task} onOpen={() => setEditing(task)} />
          ))
        )}
      </div>

      {editing && (
        <TaskDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} task={editing} />
      )}
    </div>
  );
}
