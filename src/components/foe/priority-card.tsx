"use client";

import { ArrowRight, BellOff, BellRing, CheckCircle2, Clock, MoreHorizontal, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AREA_LABEL } from "@/lib/foe/labels";
import { countdown, daysUntil, relativeTime } from "@/lib/foe/format";
import { PriorityBucket } from "@/lib/foe/priority";
import type { FoeOpportunityDTO } from "@/lib/foe/types";
import { DeadlineSoonBadge, EligibilityBadge, FirmMark, NewBadge, OpeningKindBadge, RollingBadge, StateBadge } from "./badges";

/**
 * A compact "Priority for you" card.
 *
 * It shows why it is here (opened recently / rolling / eligible / deadline) and
 * when FOE last verified it — the two things that decide whether the user acts
 * now or later.
 */
export function PriorityCard({
  opportunity: o,
  onOpen,
  onToggleWatch,
  onMarkApplied,
}: {
  opportunity: FoeOpportunityDTO;
  onOpen: () => void;
  onToggleWatch: () => void;
  onMarkApplied: () => void;
}) {
  const openedAgo = relativeTime(o.firstVerifiedOpenAt ?? o.openingDate);
  const verifiedAgo = relativeTime(o.applicationVerifiedAt);
  const deadlineDays = daysUntil(o.deadline);
  const isOpen = o.state === "OPEN" || o.state === "CLOSING_SOON";
  // "Newly opened" comes from the server's priority bucket rather than being
  // recomputed from the clock here: it keeps the badge consistent with the
  // ordering, and keeps render pure.
  const isNew =
    o.priority.bucket === PriorityBucket.NewlyOpened || o.priority.bucket === PriorityBucket.NewlyOpenedRolling;

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 transition-all hover:border-border-strong hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 items-center gap-2.5 text-left cursor-pointer"
        >
          <FirmMark name={o.firmName} size={30} />
          <span className="truncate text-[13.5px] font-semibold tracking-tight text-foreground">{o.firmName}</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${o.firmName} ${o.programmeName}`}
              className="-mr-1 shrink-0 rounded-lg p-1 text-subtle-foreground transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer"
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

      <button type="button" onClick={onOpen} className="mt-3 min-w-0 text-left cursor-pointer">
        <h3 className="truncate text-[16px] font-semibold leading-snug tracking-tight text-foreground">
          {o.programmeName} {o.recruitmentYear}
        </h3>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
          {AREA_LABEL[o.area]}
          {o.location ? ` · ${o.location}` : ""}
        </p>
      </button>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {isNew && <NewBadge />}
        {!isOpen && <StateBadge state={o.state} />}
        {o.rolling && isOpen && <RollingBadge />}
        {deadlineDays !== null && deadlineDays <= 7 && deadlineDays >= 0 && <DeadlineSoonBadge days={deadlineDays} />}
        <EligibilityBadge verdict={o.eligibility.verdict} />
        {o.state === "ANNOUNCED" && <OpeningKindBadge kind="CONFIRMED" />}
        {o.state === "EXPECTED" && <OpeningKindBadge kind="EXPECTED" />}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="min-w-0 space-y-1">
          {isOpen && openedAgo && (
            <p className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
              <Clock className="size-3.5 shrink-0 text-subtle-foreground" strokeWidth={2} />
              Opened {openedAgo}
            </p>
          )}
          {!isOpen && o.openingDate && (
            <p className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
              <Clock className="size-3.5 shrink-0 text-subtle-foreground" strokeWidth={2} />
              Opens {countdown(o.openingDate)?.toLowerCase()}
            </p>
          )}
          {!isOpen && !o.openingDate && o.expectedOpeningLabel && (
            <p className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
              <Clock className="size-3.5 shrink-0 text-subtle-foreground" strokeWidth={2} />
              Expected {o.expectedOpeningLabel.toLowerCase()}
            </p>
          )}
          {verifiedAgo && (
            <p className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
              <ShieldCheck className="size-3.5 shrink-0" strokeWidth={2} style={{ color: "#16a34a" }} />
              Verified {verifiedAgo}
            </p>
          )}
        </div>

        {o.application ? (
          <Button size="sm" variant="secondary" onClick={onOpen} className="shrink-0">
            Applied
          </Button>
        ) : isOpen && o.applicationUrl ? (
          <Button size="sm" asChild className="shrink-0">
            <a href={o.applicationUrl} target="_blank" rel="noopener noreferrer">
              Apply
              <ArrowRight className="size-3.5" />
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onToggleWatch} className="shrink-0">
            {o.isWatched ? "Watching" : "Watch"}
          </Button>
        )}
      </div>
    </div>
  );
}
