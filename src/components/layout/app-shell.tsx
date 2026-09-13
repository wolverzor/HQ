"use client";

import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { MobileTopBar } from "./mobile-topbar";
import { QuickAddProvider } from "@/components/tasks/quick-add-context";
import { QuickAddDialog } from "@/components/tasks/quick-add-dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <QuickAddProvider>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
        </div>
        <MobileNav />
      </div>
      <QuickAddDialog />
    </QuickAddProvider>
  );
}
