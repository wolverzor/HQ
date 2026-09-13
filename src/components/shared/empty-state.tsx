import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border text-center",
        compact ? "px-4 py-8" : "px-6 py-16",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-surface-inset text-subtle-foreground">
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <p className="mt-3.5 text-[14.5px] font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">{description}</p>}
      {action && (
        <Button size="sm" variant="secondary" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
