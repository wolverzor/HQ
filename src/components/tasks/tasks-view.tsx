"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ListChecks, Plus, ArrowDownUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useTasks, useReorderTasks } from "@/hooks/use-tasks";
import { TaskRow } from "./task-row";
import { TaskDialog } from "./task-dialog";
import { filterTasksForView, sortTasks, type TaskSort, type TaskView } from "@/lib/task-helpers";
import { CATEGORY_LABEL } from "@/lib/labels";
import type { TaskCategory } from "@/lib/types";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";

const SORT_LABEL: Record<TaskSort, string> = {
  manual: "Manual order",
  deadline: "Deadline",
  priority: "Priority",
};

export function TasksView() {
  const { data: tasks, isLoading } = useTasks();
  const reorder = useReorderTasks();
  const [view, setView] = useState<TaskView>("all");
  const [sort, setSort] = useState<TaskSort>("manual");
  const [categoryFilter, setCategoryFilter] = useState<Set<TaskCategory>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const visibleTasks = useMemo(() => {
    if (!tasks) return [];
    let filtered = filterTasksForView(tasks, view);
    if (categoryFilter.size > 0) {
      filtered = filtered.filter((t) => categoryFilter.has(t.category));
    }
    return sortTasks(filtered, view === "completed" ? "deadline" : sort);
  }, [tasks, view, sort, categoryFilter]);

  const counts = useMemo(() => {
    if (!tasks) return { all: 0, today: 0, upcoming: 0, completed: 0 };
    return {
      all: filterTasksForView(tasks, "all").length,
      today: filterTasksForView(tasks, "today").length,
      upcoming: filterTasksForView(tasks, "upcoming").length,
      completed: filterTasksForView(tasks, "completed").length,
    };
  }, [tasks]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !tasks) return;

    const oldIndex = visibleTasks.findIndex((t) => t.id === active.id);
    const newIndex = visibleTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...visibleTasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorder.mutate(reordered.map((t, i) => ({ id: t.id, order: i })));
  }

  function toggleCategory(cat: TaskCategory) {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Tasks</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">
            {counts.all} active · {counts.today} due today
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New task
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Tabs value={view} onValueChange={(v) => setView(v as TaskView)}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="today">Today ({counts.today})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({counts.upcoming})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <ArrowDownUp className="size-3.5" />
                {SORT_LABEL[sort]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {(["manual", "deadline", "priority"] as TaskSort[]).map((s) => (
                <DropdownMenuItem key={s} onSelect={() => setSort(s)}>
                  {SORT_LABEL[s]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter category</DropdownMenuLabel>
              {(Object.keys(CATEGORY_LABEL) as TaskCategory[]).map((c) => (
                <DropdownMenuCheckboxItem
                  key={c}
                  checked={categoryFilter.has(c)}
                  onCheckedChange={() => toggleCategory(c)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {CATEGORY_LABEL[c]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[58px] rounded-xl" />
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={view === "completed" ? "Nothing completed yet" : "You're all clear"}
            description={
              view === "completed"
                ? "Tasks you finish will show up here."
                : "No tasks in this view. Add one to get started."
            }
            action={view !== "completed" ? { label: "New task", onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {visibleTasks.map((task) => (
                  <TaskRow key={task.id} task={task} sortable={sort === "manual" && view !== "completed"} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <TaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
