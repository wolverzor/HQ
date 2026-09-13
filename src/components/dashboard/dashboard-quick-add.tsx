"use client";

import { useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateTask } from "@/hooks/use-tasks";
import { useQuickAdd } from "@/components/tasks/quick-add-context";
import { toast } from "sonner";

export function DashboardQuickAdd() {
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();
  const { open } = useQuickAdd();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await createTask.mutateAsync({ title: trimmed });
    setTitle("");
    toast.success("Task added");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 pl-4 shadow-sm"
    >
      <Plus className="size-4 shrink-0 text-subtle-foreground" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quickly add a task... press Enter"
        className="h-9 flex-1 border-none bg-transparent px-0 shadow-none focus:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => open()}
        aria-label="Add task with more details"
        title="Add with more details"
      >
        <SlidersHorizontal className="size-3.5" />
      </Button>
      <Button type="submit" size="sm" disabled={!title.trim() || createTask.isPending}>
        Add
      </Button>
    </form>
  );
}
