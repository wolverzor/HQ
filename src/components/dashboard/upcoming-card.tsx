"use client";

import { CalendarClock } from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { useTasks } from "@/hooks/use-tasks";
import { filterTasksForView, sortTasks } from "@/lib/task-helpers";
import { MiniTaskItem } from "./mini-task-item";

export function UpcomingCard() {
  const { data: tasks, isLoading } = useTasks();
  const upcoming = tasks ? sortTasks(filterTasksForView(tasks, "upcoming"), "deadline").slice(0, 6) : [];

  return (
    <SectionCard icon={CalendarClock} title="Upcoming" subtitle="Next 7 days" href="/tasks" hrefLabel="See all">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nothing on the horizon" description="No deadlines in the next week." compact />
      ) : (
        <div className="space-y-0.5">
          {upcoming.map((task) => (
            <MiniTaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
