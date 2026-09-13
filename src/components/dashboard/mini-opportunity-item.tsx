"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDeadlineShort } from "@/lib/date-helpers";
import { VERIFICATION_COLOR, VERIFICATION_LABEL } from "@/lib/labels";
import { OpportunityDialog } from "@/components/opportunities/opportunity-dialog";
import type { OpportunityDTO } from "@/lib/types";

export function MiniOpportunityItem({ opportunity }: { opportunity: OpportunityDTO }) {
  const [open, setOpen] = useState(false);
  const deadline = opportunity.deadline ? new Date(opportunity.deadline) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-surface-hover cursor-pointer"
      >
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-foreground">{opportunity.companyName}</p>
          <p className="truncate text-[12px] text-muted-foreground">{opportunity.programme}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {deadline && <span className="text-[11.5px] text-subtle-foreground">Due {formatDeadlineShort(deadline)}</span>}
          <Badge color={VERIFICATION_COLOR[opportunity.verificationStatus]} className="px-1.5 py-0.5 text-[10.5px]">
            {VERIFICATION_LABEL[opportunity.verificationStatus]}
          </Badge>
        </div>
      </button>
      <OpportunityDialog open={open} onOpenChange={setOpen} opportunity={opportunity} />
    </>
  );
}
