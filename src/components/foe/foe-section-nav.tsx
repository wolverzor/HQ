"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FOE_NAV_ITEMS } from "@/components/layout/nav-items";

/**
 * Section tabs for the Finance Opportunities area.
 *
 * The sidebar stays at four sections; Opening soon, Watchlist and the original
 * Tracker live here rather than adding three more top-level entries and
 * unbalancing HQ's navigation.
 */
export function FoeSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto max-w-[1400px] px-4 pt-5 md:px-8">
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {FOE_NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
