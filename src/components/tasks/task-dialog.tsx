"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/labels";
import type { TaskDTO, Priority, TaskCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function toDatetimeLocalValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskDTO;
  defaultDeadline?: string | null;
  defaultExpanded?: boolean;
}

export function TaskDialog({ open, onOpenChange, task, defaultDeadline, defaultExpanded }: TaskDialogProps) {
  const isEdit = !!task;
  const { data: projects } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [category, setCategory] = useState<TaskCategory>("PERSONAL");
  const [deadline, setDeadline] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const [saving, setSaving] = useState(false);

  // Re-seed the form fields whenever the dialog opens for a (possibly new) task.
  /* eslint-disable react-hooks/set-state-in-effect -- resetting a form on open is not a render-purity issue */
  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setPriority(task?.priority ?? "MEDIUM");
    setCategory(task?.category ?? "PERSONAL");
    setDeadline(toDatetimeLocalValue(task?.deadline ?? defaultDeadline));
    setEstimatedMinutes(task?.estimatedMinutes ? String(task.estimatedMinutes) : "");
    setProjectId(task?.projectId ?? "none");
    setExpanded(!!defaultExpanded || isEdit);
  }, [open, task, defaultDeadline, isEdit, defaultExpanded]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      priority,
      category,
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      projectId: projectId === "none" ? null : projectId,
    };

    try {
      if (isEdit) {
        await updateTask.mutateAsync({ id: task.id, ...payload });
      } else {
        await createTask.mutateAsync(payload);
        toast.success("Task added");
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 py-3">
            <Input
              autoFocus
              placeholder="What do you need to do?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 text-[15px] font-medium"
            />

            {!expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                <ChevronDown className="size-3.5" />
                Add details
              </button>
            )}

            {expanded && (
              <div className="space-y-4 hq-animate-in">
                <div>
                  <Label htmlFor="task-description">Notes</Label>
                  <Textarea
                    id="task-description"
                    className="mt-1.5"
                    placeholder="Add a description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["HIGH", "MEDIUM", "LOW"] as Priority[]).map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_LABEL[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CATEGORY_LABEL) as TaskCategory[]).map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="task-deadline">Deadline</Label>
                    <Input
                      id="task-deadline"
                      type="datetime-local"
                      className="mt-1.5"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="task-duration">Est. duration (min)</Label>
                    <Input
                      id="task-duration"
                      type="number"
                      min={5}
                      step={5}
                      className="mt-1.5"
                      placeholder="30"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {task?.opportunity && (
                  <div className="rounded-lg bg-primary-tint px-3 py-2 text-[12.5px] text-primary">
                    Linked to {task.opportunity.companyName} — {task.opportunity.programme}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className={cn(isEdit && "justify-between")}>
            {isEdit && (
              <Button
                type="button"
                variant="danger-ghost"
                size="sm"
                onClick={handleDelete}
                className="mr-auto"
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || saving}>
                {isEdit ? "Save changes" : "Add task"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
