"use client";

import { ThemeToggle } from "./theme-toggle";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-[8px] bg-primary text-[12px] font-bold text-primary-foreground">
          HQ
        </div>
        <span className="text-[15px] font-semibold tracking-tight">HQ</span>
      </div>
      <ThemeToggle />
    </header>
  );
}
