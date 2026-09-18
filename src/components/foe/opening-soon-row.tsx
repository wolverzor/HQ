"use client";

import { BellRing, CalendarDays, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { countdown, shortDate } from "@/lib/foe/format";
import { AREA_LABEL } from "@/lib/foe/labels";
import type { OpeningSoonDTO } from "@/lib/foe/types";
import { FirmMark, OpeningKindBadge } from "./badges";

/**
 * One future opening.
 *
 * The whole point of this row is the difference between the two kinds:
 *
 *   CONFIRMED — the employer has published the date. Solid badge, exact date.
 *   EXPECTED  — FOE's prediction from previous cycles. Dashed badge, a period
 *               rather than a day, and the row says how many past cycles it
 *               rests on.
 *
 * They must never read alike, however tempting it is to line the dates up.
 */
export function OpeningSoonRow({
  item,
  onToggleWatch,
  onOpen,
  className,
}: {
  item: OpeningSoonDTO;
  onToggleWatch: () => void;
  onOpen?: () => void;
  className?: string;
}) {
  const confirmed = item.kind === "CONFIRMED";

  return (
    <div className={cn("flex items-start gap-3 py-3.5", className)}>
      <FirmMark name={item.firmName} size={28} className="mt-0.5" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={onOpen}
            disabled={!onOpen}
            className={cn("truncate text-[13px] font-semibold tracking-tight text-foreground", onOpen && "cursor-pointer hover:underline")}
          >
            {item.firmName}
          </button>
          <OpeningKindBadge kind={item.kind} />
        </div>

        <p className="mt-0.5 truncate text-[13.5px] font-medium text-foreground">{item.programmeName}</p>

        <p className="mt-1 text-[12px] text-muted-foreground">
          {confirmed ? "Confirmed opening date" : "Expected opening period"}
          {!confirmed && item.basedOnCycles ? ` · from ${item.basedOnCycles} previous cycle${item.basedOnCycles === 1 ? "" : "s"}` : ""}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
            <CalendarDays className="size-3.5 text-subtle-foreground" strokeWidth={2} />
            {confirmed && item.openingDate
              ? `Opens ${shortDate(item.openingDate)}`
              : (item.expectedOpeningLabel ?? "Date not known")}
          </span>
          {confirmed && item.openingDate && (
            <span className="text-[12px] text-muted-foreground">{countdown(item.openingDate)}</span>
          )}
          {!confirmed && item.windowOpenNow && (
            <span className="text-[12px] font-medium text-warning">Expected any time now</span>
          )}
          {!confirmed && (
            <span className="text-[12px] text-muted-foreground">Not confirmed by the employer</span>
          )}
        </div>

        {(item.area || item.location) && (
          <p className="mt-1 truncate text-[12px] text-subtle-foreground">
            {AREA_LABEL[item.area]}
            {item.location ? ` · ${item.location}` : ""}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleWatch}
        aria-pressed={item.isWatched}
        className={cn(
          "mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer",
          item.isWatched
            ? "border-transparent bg-success-tint text-success"
            : "border-border text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        )}
      >
        {item.isWatched ? (
          <>
            Watching
            <Check className="size-3.5" strokeWidth={3} />
          </>
        ) : (
          <>
            <BellRing className="size-3.5" strokeWidth={2} />
            Watch
          </>
        )}
      </button>
    </div>
  );
}
