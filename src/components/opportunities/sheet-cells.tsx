"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const cellBase =
  "h-full w-full min-w-0 border border-transparent bg-transparent px-2.5 py-2 text-[13px] text-foreground outline-none transition-colors hover:border-border focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary/15 rounded-md";

export function SheetTextCell({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  // Local draft mirrors `value`, but resets when `value` changes from outside
  // (e.g. a save elsewhere or a refetch) — done during render, React's
  // documented pattern for this, rather than in an effect.
  const [prevValue, setPrevValue] = useState(value);
  const [draft, setDraft] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className={cn(cellBase, className)}
    />
  );
}

export function SheetDateCell({
  value,
  onCommit,
  className,
}: {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onCommit(e.target.value)}
      className={cn(cellBase, "tabular-nums", className)}
    />
  );
}

export function SheetSelectCell<T extends string>({
  value,
  options,
  onCommit,
  colorFor,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onCommit: (value: T) => void;
  colorFor?: (value: T) => string | undefined;
  className?: string;
}) {
  const color = colorFor?.(value);
  return (
    <Select value={value} onValueChange={(v) => onCommit(v as T)}>
      <SelectTrigger
        className={cn(
          "h-full w-full min-w-0 justify-start gap-1.5 rounded-md border-transparent bg-transparent px-2.5 py-0 text-[12.5px] font-medium hover:border-border focus:ring-1 focus:ring-primary/15",
          className,
        )}
        style={color ? { color } : undefined}
      >
        {color && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
