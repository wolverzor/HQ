"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanies } from "@/hooks/use-companies";
import { CompanyRow } from "./company-row";
import { CompanyDialog } from "./company-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";

export function WatchlistView() {
  const { data: companies, isLoading } = useCompanies();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-medium text-foreground">Company watchlist</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground max-w-xl">
            HQ scans each company&apos;s public careers page for relevant keywords and flags matches as{" "}
            <span className="font-medium text-warning">Needs Verification</span> — it never invents dates or
            marks anything confirmed without you checking the official site.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="size-3.5" />
          Add company
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[70px] rounded-xl" />)
        ) : companies && companies.length > 0 ? (
          companies.map((c) => <CompanyRow key={c.id} company={c} />)
        ) : (
          <EmptyState
            icon={Building2}
            title="No companies yet"
            description="Add employers you want HQ to keep an eye on."
            action={{ label: "Add company", onClick: () => setAddOpen(true) }}
          />
        )}
      </div>

      <CompanyDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
