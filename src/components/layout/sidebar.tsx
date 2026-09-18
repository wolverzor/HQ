"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu, type ShellUser } from "./user-menu";
import { useQuickAdd } from "@/components/tasks/quick-add-context";

/**
 * The sidebar draws from its own token set (`--sidebar-*`) rather than the
 * workspace surface tokens. That separation is what lets the Navy theme put a
 * dark rail next to a light working area without darkening the whole app.
 */
export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const { open } = useQuickAdd();

  return (
    <aside className="hidden md:flex md:w-[248px] md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:px-3 md:py-4">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex size-8 items-center justify-center rounded-[10px] bg-sidebar-accent text-[13px] font-bold tracking-tight text-sidebar-accent-foreground">
          HQ
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">HQ</span>
      </div>

      <button
        type="button"
        onClick={() => open()}
        className="mx-1 mt-4 flex items-center gap-2 rounded-xl bg-sidebar-accent px-3.5 py-2.5 text-sm font-medium text-sidebar-accent-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-[0.98] cursor-pointer"
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
                  ? "bg-sidebar-active text-sidebar-active-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-[18px] shrink-0 transition-colors",
                  active ? "text-sidebar-active-foreground" : "text-sidebar-muted group-hover:text-sidebar-foreground",
                )}
                strokeWidth={2}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-1 pt-4">
        <UserMenu user={user} />
        <ThemeToggle className="shrink-0 text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground" />
      </div>
    </aside>
  );
}
