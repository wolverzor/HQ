import type { TaskDTO } from "@/lib/types";
import { isOverdue, isToday, isUpcoming } from "@/lib/date-helpers";

const PRIORITY_WEIGHT: Record<TaskDTO["priority"], number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export type TaskSort = "manual" | "deadline" | "priority";
export type TaskView = "all" | "today" | "upcoming" | "completed";

export function taskDeadlineDate(task: TaskDTO) {
  return task.deadline ? new Date(task.deadline) : null;
}

export function isTaskOverdue(task: TaskDTO) {
  if (task.status === "DONE") return false;
  const d = taskDeadlineDate(task);
  return d ? isOverdue(d) : false;
}

export function isTaskDueToday(task: TaskDTO) {
  const d = taskDeadlineDate(task);
  return d ? isToday(d) : false;
}

export function isTaskUpcoming(task: TaskDTO, days = 7) {
  const d = taskDeadlineDate(task);
  return d ? isUpcoming(d, days) : false;
}

export function filterTasksForView(tasks: TaskDTO[], view: TaskView): TaskDTO[] {
  switch (view) {
    case "today":
      return tasks.filter((t) => t.status !== "DONE" && (isTaskDueToday(t) || isTaskOverdue(t)));
    case "upcoming":
      return tasks.filter((t) => t.status !== "DONE" && isTaskUpcoming(t) && !isTaskDueToday(t) && !isTaskOverdue(t));
    case "completed":
      return tasks.filter((t) => t.status === "DONE");
    case "all":
    default:
      return tasks.filter((t) => t.status !== "DONE");
  }
}

export function sortTasks(tasks: TaskDTO[], sort: TaskSort): TaskDTO[] {
  const copy = [...tasks];
  if (sort === "deadline") {
    copy.sort((a, b) => {
      const ad = taskDeadlineDate(a);
      const bd = taskDeadlineDate(b);
      if (ad && bd) return ad.getTime() - bd.getTime();
      if (ad) return -1;
      if (bd) return 1;
      return a.order - b.order;
    });
  } else if (sort === "priority") {
    copy.sort((a, b) => {
      const diff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (diff !== 0) return diff;
      return a.order - b.order;
    });
  } else {
    copy.sort((a, b) => a.order - b.order);
  }
  return copy;
}
