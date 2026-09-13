"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { useQuickAdd } from "@/components/tasks/quick-add-context";

export function MobileNav() {
  const pathname = usePathname();
  const { open } = useQuickAdd();

  const left = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {left.map((item) => (
        <NavLink key={item.href} item={item} active={item.match(pathname)} />
      ))}

      <button
        type="button"
        onClick={() => open()}
        aria-label="Quick add task"
        className="relative -top-4 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform active:scale-95 cursor-pointer"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </button>

      {right.map((item) => (
        <NavLink key={item.href} item={item} active={item.match(pathname)} />
      ))}
    </nav>
  );
}

function NavLink({
  item,
  active,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-subtle-foreground",
      )}
    >
      <Icon className="size-[21px]" strokeWidth={active ? 2.4 : 2} />
      {item.label}
    </Link>
  );
}
