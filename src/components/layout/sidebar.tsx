"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { useQuickAdd } from "@/components/tasks/quick-add-context";

export function Sidebar() {
  const pathname = usePathname();
  const { open } = useQuickAdd();

  return (
    <aside className="hidden md:flex md:w-[248px] md:shrink-0 md:flex-col md:border-r md:border-border md:bg-surface md:px-3 md:py-4">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-[13px] font-bold tracking-tight text-primary-foreground">
          HQ
        </div>
        <span className="text-[15px] font-semibold tracking-tight">HQ</span>
      </div>

      <button
        type="button"
        onClick={() => open()}
        className="mx-1 mt-4 flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary-hover hover:shadow-md active:scale-[0.98] cursor-pointer"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        Quick add task
      </button>

      <nav className="mt-6 flex flex-col gap-0.5 px-1">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                active
                  ? "bg-primary-tint text-primary"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-[18px] transition-colors",
                  active ? "text-primary" : "text-subtle-foreground group-hover:text-foreground",
                )}
                strokeWidth={2}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center justify-between px-2 pt-4">
        <span className="text-xs text-subtle-foreground">V1</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
