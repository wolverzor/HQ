"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
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
import { useCreateTimeBlock } from "@/hooks/use-timeblocks";

interface CreateBlockDialogProps {
  draft: { start: Date; end: Date } | null;
  onClose: () => void;
}

export function CreateBlockDialog({ draft, onClose }: CreateBlockDialogProps) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const createBlock = useCreateTimeBlock();

  // Re-seed the form fields whenever a new draft is drawn on the grid.
  /* eslint-disable react-hooks/set-state-in-effect -- resetting a form on open is not a render-purity issue */
  useEffect(() => {
    if (draft) {
      setTitle("");
      setStartTime(format(draft.start, "HH:mm"));
      setEndTime(format(draft.end, "HH:mm"));
    }
  }, [draft]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!draft) return null;

  function buildDate(base: Date, time: string) {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const start = buildDate(draft.start, startTime);
    const end = buildDate(draft.start, endTime);
    if (end <= start) return;

    await createBlock.mutateAsync({
      title: title.trim() || "New event",
      start: start.toISOString(),
      end: end.toISOString(),
    });
    onClose();
  }

  return (
    <Dialog open={!!draft} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New time block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-3">
            <Input
              autoFocus
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 text-[15px] font-medium"
            />
            <p className="text-[13px] text-muted-foreground">{format(draft.start, "EEEE d MMMM")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="block-start">Start</Label>
                <Input
                  id="block-start"
                  type="time"
                  className="mt-1.5"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="block-end">End</Label>
                <Input
                  id="block-end"
                  type="time"
                  className="mt-1.5"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
