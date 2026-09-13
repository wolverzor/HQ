"use client";

import { useState } from "react";
import { Sparkles, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DIVISION_LABEL,
  PROGRAMME_TYPE_LABEL,
  OPPORTUNITY_STATUS_LABEL,
  OPPORTUNITY_STATUS_COLOR,
  VERIFICATION_LABEL,
  VERIFICATION_COLOR,
} from "@/lib/labels";
import { formatDeadlineShort, isOverdue, isUpcoming } from "@/lib/date-helpers";
import { useStartApplication } from "@/hooks/use-opportunities";
import { OpportunityDialog } from "./opportunity-dialog";
import type { OpportunityDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OpportunityRow({ opportunity }: { opportunity: OpportunityDTO }) {
  const [open, setOpen] = useState(false);
  const startApplication = useStartApplication();

  const deadline = opportunity.deadline ? new Date(opportunity.deadline) : null;
  const overdue = deadline ? isOverdue(deadline) && opportunity.status !== "APPLIED" : false;
  const soon = deadline ? isUpcoming(deadline, 7) : false;
  const canStart = opportunity.status === "NOT_OPEN" || opportunity.status === "OPEN";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="group flex w-full flex-col gap-2.5 rounded-xl border border-border bg-surface px-4 py-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-hover cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-semibold text-foreground">{opportunity.companyName}</p>
            <p className="truncate text-[13px] text-muted-foreground">{opportunity.programme}</p>
          </div>
          <Badge color={OPPORTUNITY_STATUS_COLOR[opportunity.status]} variant="solid" className="shrink-0">
            {OPPORTUNITY_STATUS_LABEL[opportunity.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="bg-surface-inset text-muted-foreground">{DIVISION_LABEL[opportunity.division]}</Badge>
          <Badge className="bg-surface-inset text-muted-foreground">{PROGRAMME_TYPE_LABEL[opportunity.programmeType]}</Badge>
          {opportunity.location && (
            <span className="flex items-center gap-1 text-[11.5px] text-subtle-foreground">
              <MapPin className="size-3" />
              {opportunity.location}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge color={VERIFICATION_COLOR[opportunity.verificationStatus]} variant="dot" className="bg-transparent px-0 text-muted-foreground">
              {VERIFICATION_LABEL[opportunity.verificationStatus]}
            </Badge>
            {deadline && (
              <Badge
                className={cn(
                  overdue
                    ? "bg-danger-tint text-danger"
                    : soon
                      ? "bg-warning-tint text-warning"
                      : "bg-surface-inset text-muted-foreground",
                )}
              >
                Deadline {formatDeadlineShort(deadline)}
              </Badge>
            )}
          </div>

          {canStart && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                startApplication.mutate(opportunity.id);
              }}
              disabled={startApplication.isPending}
              className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
            >
              <Sparkles className="size-3.5" />
              Start application
            </Button>
          )}
        </div>
      </div>

      <OpportunityDialog open={open} onOpenChange={setOpen} opportunity={opportunity} />
    </>
  );
}
