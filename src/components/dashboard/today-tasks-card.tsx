"use client";

import { ListChecks } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { useTasks } from "@/hooks/use-tasks";
import { filterTasksForView, sortTasks } from "@/lib/task-helpers";
import { MiniTaskItem } from "./mini-task-item";

export function TodayTasksCard() {
  const { data: tasks, isLoading } = useTasks();
  const todayTasks = tasks ? sortTasks(filterTasksForView(tasks, "today"), "priority") : [];

  return (
    <SectionCard icon={ListChecks} title="Today's tasks" href="/tasks" hrefLabel="Open tasks">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
      ) : todayTasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nothing due today" description="Enjoy the clear runway." compact />
      ) : (
        <div className="space-y-0.5">
          {todayTasks.map((task) => (
            <MiniTaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
