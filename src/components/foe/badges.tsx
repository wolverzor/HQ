"use client";

import { Check, CircleAlert, Clock, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { firmColor, firmInitials } from "@/lib/foe/format";
import { ELIGIBILITY_COLOR, ELIGIBILITY_LABEL, STATE_COLOR, STATE_LABEL } from "@/lib/foe/labels";
import type { EligibilityVerdict, OpportunityState } from "@/lib/foe/types";

/**
 * FOE badges.
 *
 * Every badge carries a word. Colour is a second channel, never the only one —
 * a red dot on its own is meaningless to anyone who cannot see the difference,
 * and "Deadline soon" is exactly the signal that must not go unread.
 */

export function StateBadge({ state, className }: { state: OpportunityState; className?: string }) {
  return (
    <Badge color={STATE_COLOR[state]} className={cn("font-semibold uppercase tracking-wide text-[11px]", className)}>
      {STATE_LABEL[state]}
    </Badge>
  );
}

export function EligibilityBadge({ verdict, className }: { verdict: EligibilityVerdict; className?: string }) {
  return (
    <Badge color={ELIGIBILITY_COLOR[verdict]} className={cn("gap-1", className)}>
      {ELIGIBILITY_LABEL[verdict]}
      {(verdict === "ELIGIBLE" || verdict === "LIKELY_ELIGIBLE") && <Check className="size-3" strokeWidth={3} />}
    </Badge>
  );
}

export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge color="#4f46e5" className={cn("gap-1 font-semibold uppercase tracking-wide text-[11px]", className)}>
      <Sparkles className="size-3" strokeWidth={2.5} />
      New
    </Badge>
  );
}

export function RollingBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn("gap-1", className)}>
      <Zap className="size-3" strokeWidth={2.5} />
      Rolling
    </Badge>
  );
}

export function DeadlineSoonBadge({ days, className }: { days: number; className?: string }) {
  return (
    <Badge color="#d97706" className={cn("gap-1 font-medium", className)}>
      <Clock className="size-3" strokeWidth={2.5} />
      {days <= 0 ? "Deadline today" : `Deadline in ${days} day${days === 1 ? "" : "s"}`}
    </Badge>
  );
}

/** CONFIRMED vs EXPECTED: visually distinct on purpose. */
export function OpeningKindBadge({ kind, className }: { kind: "CONFIRMED" | "EXPECTED"; className?: string }) {
  return kind === "CONFIRMED" ? (
    <Badge color="#16a34a" className={cn("font-semibold uppercase tracking-wide text-[11px]", className)}>
      Confirmed
    </Badge>
  ) : (
    <Badge
      color="#7c3aed"
      variant="outline"
      className={cn("border-dashed font-semibold uppercase tracking-wide text-[11px]", className)}
    >
      Expected
    </Badge>
  );
}

export function UnreachableBadge({ className }: { className?: string }) {
  return (
    <Badge color="#e11d48" className={cn("gap-1", className)}>
      <CircleAlert className="size-3" strokeWidth={2.5} />
      Not checked
    </Badge>
  );
}

/** Marks seeded sample rows so they can never be mistaken for live findings. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("border-dashed text-[11px] text-muted-foreground", className)}>
      Demo data
    </Badge>
  );
}

/**
 * A firm's monogram. Deliberately not a scraped logo — consistent, fast, and it
 * avoids rendering employer trademarks as though they were ours.
 */
export function FirmMark({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  const color = firmColor(name);
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[9px] font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: Math.round(size * 0.38),
        letterSpacing: "0.01em",
      }}
    >
      {firmInitials(name)}
    </span>
  );
}
