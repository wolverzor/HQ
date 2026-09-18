"use client";

import { ArrowRight, BellOff, BellRing, CheckCircle2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AREA_LABEL } from "@/lib/foe/labels";
import { countdown, daysUntil, relativeTime, shortDate } from "@/lib/foe/format";
import { PriorityBucket } from "@/lib/foe/priority";
import type { FoeOpportunityDTO } from "@/lib/foe/types";
import { DeadlineSoonBadge, EligibilityBadge, FirmMark, NewBadge, StateBadge } from "./badges";

/**
 * The open-opportunities list: a real table on desktop (fast to scan down a
 * column) and stacked cards on narrow screens, rather than a table squeezed
 * into 375px.
 */

/** Uses the server's priority bucket so the badge and the ordering agree. */
function isNewlyOpened(o: FoeOpportunityDTO): boolean {
  return o.priority.bucket === PriorityBucket.NewlyOpened || o.priority.bucket === PriorityBucket.NewlyOpenedRolling;
}

function DeadlineCell({ o }: { o: FoeOpportunityDTO }) {
  if (o.rolling) return <span className="text-[13px] text-foreground">Rolling</span>;
  if (!o.deadline) return <span className="text-[13px] text-subtle-foreground">Not stated</span>;
  const days = daysUntil(o.deadline);
  return (
    <span className={cn("text-[13px]", days !== null && days <= 7 ? "font-medium text-warning" : "text-foreground")}>
      {shortDate(o.deadline)}
    </span>
  );
}

function StatusCell({ o }: { o: FoeOpportunityDTO }) {
  const days = daysUntil(o.deadline);
  const showDeadlineSoon = !o.rolling && days !== null && days >= 0 && days <= 7;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isNewlyOpened(o) && <NewBadge />}
      {showDeadlineSoon ? <DeadlineSoonBadge days={days} /> : <StateBadge state={o.state} />}
    </div>
  );
}

function RowActions({
  o,
  onOpen,
  onToggleWatch,
  onMarkApplied,
}: {
  o: FoeOpportunityDTO;
  onOpen: () => void;
  onToggleWatch: () => void;
  onMarkApplied: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {o.application ? (
        <Button size="sm" variant="secondary" onClick={onOpen}>
          Applied
        </Button>
      ) : o.applicationUrl ? (
        <Button size="sm" asChild>
          <a href={o.applicationUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            Apply
            <ArrowRight className="size-3.5" />
          </a>
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={onOpen}>
          Details
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${o.firmName} ${o.programmeName}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-1.5 text-subtle-foreground transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpen}>View details</DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleWatch}>
            {o.isWatched ? (
              <>
                <BellOff className="size-3.5" /> Stop watching
              </>
            ) : (
              <>
                <BellRing className="size-3.5" /> Watch
              </>
            )}
          </DropdownMenuItem>
          {!o.application && (
            <DropdownMenuItem onSelect={onMarkApplied}>
              <CheckCircle2 className="size-3.5" /> Mark applied
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function OpportunityTable({
  opportunities,
  onOpen,
  onToggleWatch,
  onMarkApplied,
}: {
  opportunities: FoeOpportunityDTO[];
  onOpen: (o: FoeOpportunityDTO) => void;
  onToggleWatch: (o: FoeOpportunityDTO) => void;
  onMarkApplied: (o: FoeOpportunityDTO) => void;
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border text-left">
              {["Company", "Opportunity", "Area", "Opened", "Deadline", "Eligibility", "Status", ""].map((h, i) => (
                <th
                  key={h || i}
                  scope="col"
                  className={cn(
                    "px-3 py-2.5 text-[12px] font-medium text-muted-foreground",
                    i === 7 && "text-right",
                  )}
                >
                  {h || <span className="sr-only">Action</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => (
              <tr
                key={o.id}
                onClick={() => onOpen(o)}
                className="group border-b border-border transition-colors last:border-0 hover:bg-surface-hover cursor-pointer"
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <FirmMark name={o.firmName} size={26} />
                    <span className="truncate text-[13px] font-medium text-foreground">{o.firmName}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="text-[13.5px] font-medium text-foreground">
                    {o.programmeName} {o.recruitmentYear}
                  </span>
                  {o.location && <span className="ml-2 text-[12px] text-subtle-foreground">{o.location}</span>}
                </td>
                <td className="px-3 py-3 text-[13px] text-muted-foreground">{AREA_LABEL[o.area]}</td>
                <td className="px-3 py-3 text-[13px] text-muted-foreground">
                  {relativeTime(o.firstVerifiedOpenAt ?? o.openingDate) ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <DeadlineCell o={o} />
                </td>
                <td className="px-3 py-3">
                  <EligibilityBadge verdict={o.eligibility.verdict} />
                </td>
                <td className="px-3 py-3">
                  <StatusCell o={o} />
                </td>
                <td className="px-3 py-3">
                  <RowActions
                    o={o}
                    onOpen={() => onOpen(o)}
                    onToggleWatch={() => onToggleWatch(o)}
                    onMarkApplied={() => onMarkApplied(o)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border md:hidden">
        {opportunities.map((o) => (
          <div key={o.id} className="py-3.5">
            <button type="button" onClick={() => onOpen(o)} className="flex w-full items-start gap-2.5 text-left cursor-pointer">
              <FirmMark name={o.firmName} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-foreground">{o.firmName}</span>
                <span className="block truncate text-[14px] font-semibold tracking-tight text-foreground">
                  {o.programmeName} {o.recruitmentYear}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                  {AREA_LABEL[o.area]}
                  {o.location ? ` · ${o.location}` : ""}
                </span>
              </span>
            </button>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusCell o={o} />
              <EligibilityBadge verdict={o.eligibility.verdict} />
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-3">
              <span className="truncate text-[12px] text-muted-foreground">
                {relativeTime(o.firstVerifiedOpenAt ?? o.openingDate) ?? "—"}
                {o.rolling ? " · Rolling" : o.deadline ? ` · ${countdown(o.deadline)?.toLowerCase()}` : ""}
              </span>
              <RowActions
                o={o}
                onOpen={() => onOpen(o)}
                onToggleWatch={() => onToggleWatch(o)}
                onMarkApplied={() => onMarkApplied(o)}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
