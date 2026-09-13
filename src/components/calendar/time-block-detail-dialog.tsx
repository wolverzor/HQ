"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Trash2, CheckCircle2, Circle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useUpdateTimeBlock, useDeleteTimeBlock } from "@/hooks/use-timeblocks";
import type { TimeBlockDTO } from "@/lib/types";

interface TimeBlockDetailDialogProps {
  block: TimeBlockDTO | null;
  onClose: () => void;
}

export function TimeBlockDetailDialog({ block, onClose }: TimeBlockDetailDialogProps) {
  const updateBlock = useUpdateTimeBlock();
  const deleteBlock = useDeleteTimeBlock();
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Re-seed the form fields whenever a different block is opened.
  /* eslint-disable react-hooks/set-state-in-effect -- resetting a form on open is not a render-purity issue */
  useEffect(() => {
    if (block) {
      setTitle(block.title);
      setStartTime(format(new Date(block.start), "HH:mm"));
      setEndTime(format(new Date(block.end), "HH:mm"));
    }
  }, [block]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!block) return null;

  function buildDate(base: Date, time: string) {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!block) return;
    const start = buildDate(new Date(block.start), startTime);
    const end = buildDate(new Date(block.start), endTime);
    if (end <= start) return;

    await updateBlock.mutateAsync({
      id: block.id,
      title: title.trim() || block.title,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    onClose();
  }

  async function toggleComplete() {
    if (!block) return;
    await updateBlock.mutateAsync({ id: block.id, completed: !block.completed });
  }

  async function handleDelete() {
    if (!block) return;
    await deleteBlock.mutateAsync(block.id);
    onClose();
  }

  return (
    <Dialog open={!!block} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Time block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-3">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 text-[15px] font-medium"
            />

            {block.task && (
              <Badge color="#4f46e5" className="w-fit">
                Linked to task: {block.task.title}
              </Badge>
            )}

            <p className="text-[13px] text-muted-foreground">{format(new Date(block.start), "EEEE d MMMM")}</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-block-start">Start</Label>
                <Input
                  id="edit-block-start"
                  type="time"
                  className="mt-1.5"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-block-end">End</Label>
                <Input
                  id="edit-block-end"
                  type="time"
                  className="mt-1.5"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={toggleComplete}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-surface-hover cursor-pointer"
            >
              {block.completed ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <Circle className="size-4 text-subtle-foreground" />
              )}
              {block.completed ? "Completed" : "Mark as completed"}
              {block.task && !block.completed && (
                <span className="ml-auto text-[11.5px] text-subtle-foreground">Also completes the task</span>
              )}
            </button>
          </div>

          <DialogFooter className="justify-between">
            <Button type="button" variant="danger-ghost" size="sm" onClick={handleDelete} className="mr-auto">
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
