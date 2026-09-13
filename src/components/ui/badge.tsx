import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  color,
  variant = "tint",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  color?: string;
  variant?: "tint" | "solid" | "outline" | "dot";
}) {
  const style: React.CSSProperties = {};
  if (color) {
    if (variant === "solid") {
      style.backgroundColor = color;
      style.color = "#fff";
    } else if (variant === "outline") {
      style.borderColor = color;
      style.color = color;
    } else {
      style.backgroundColor = `${color}1a`;
      style.color = color;
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none",
        variant === "outline" && "border bg-transparent",
        !color && variant === "tint" && "bg-surface-inset text-muted-foreground",
        className,
      )}
      style={style}
      {...props}
    >
      {variant === "dot" && color && (
        <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      )}
      {children}
    </span>
  );
}

export { Badge };
