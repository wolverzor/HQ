import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-20 w-full resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-subtle-foreground transition-colors outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
