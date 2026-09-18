"use client";

import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Info,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AREA_LABEL, CATEGORY_LABEL, SOURCE_KIND_LABEL, STAGE_LABEL, STATE_MEANING, VERIFICATION_METHOD_LABEL } from "@/lib/foe/labels";
import { countdown, daysUntil, longDate, relativeTime } from "@/lib/foe/format";
import type { FoeOpportunityDTO } from "@/lib/foe/types";
import { DeadlineSoonBadge, DemoBadge, EligibilityBadge, FirmMark, OpeningKindBadge, RollingBadge, StateBadge } from "./badges";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

/**
 * The opportunity detail drawer.
 *
 * Opens over the list rather than navigating away, and leads with the things
 * that decide the next action: what state it is in, whether the user is
 * eligible and why, when FOE last verified it, and where that verification came
 * from. Apply stays the most prominent control throughout.
 */
export function OpportunityDrawer({
  opportunity: o,
  open,
  onOpenChange,
  onToggleWatch,
  onMarkApplied,
  onHide,
}: {
  opportunity: FoeOpportunityDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleWatch: () => void;
  onMarkApplied: () => void;
  onHide: () => void;
}) {
  if (!o) return null;

  const isOpen = o.state === "OPEN" || o.state === "CLOSING_SOON";
  const deadlineDays = daysUntil(o.deadline);
  const verifiedAgo = relativeTime(o.applicationVerifiedAt);
  const checkedAgo = relativeTime(o.lastCheckedAt);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <FirmMark name={o.firmName} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-muted-foreground">{o.firmName}</p>
              <SheetTitle className="truncate">
                {o.programmeName} {o.recruitmentYear}
              </SheetTitle>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StateBadge state={o.state} />
            {o.rolling && isOpen && <RollingBadge />}
            {deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7 && <DeadlineSoonBadge days={deadlineDays} />}
            <EligibilityBadge verdict={o.eligibility.verdict} />
            {o.isDemo && <DemoBadge />}
          </div>

          <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">{STATE_MEANING[o.state]}</p>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {o.description && <p className="text-[13.5px] leading-relaxed text-foreground">{o.description}</p>}

          {/* Why this is where it is — the alternative to an opaque score. */}
          {o.priority.reasons.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-inset p-3.5">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                <Info className="size-3.5 text-muted-foreground" strokeWidth={2} />
                Why this is prioritised
              </p>
              <ul className="mt-2 space-y-1">
                {o.priority.reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
                    <Check className="mt-0.5 size-3 shrink-0 text-success" strokeWidth={3} />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-subtle-foreground">Details</h3>
            <dl className="mt-1 divide-y divide-border">
              <Field label="Programme type">{CATEGORY_LABEL[o.category]}</Field>
              <Field label="Area">{AREA_LABEL[o.area]}</Field>
              <Field label="Location">{o.location ?? "Not stated"}</Field>

              {o.state === "ANNOUNCED" && o.openingDate && (
                <Field label="Opening date">
                  <span className="flex items-center justify-end gap-2">
                    {longDate(o.openingDate)}
                    <OpeningKindBadge kind="CONFIRMED" />
                  </span>
                  <span className="mt-0.5 block text-[12px] font-normal text-muted-foreground">
                    {countdown(o.openingDate)}
                  </span>
                </Field>
              )}

              {o.state === "EXPECTED" && (
                <Field label="Expected opening">
                  <span className="flex items-center justify-end gap-2">
                    {o.expectedOpeningLabel ?? "Not known"}
                    <OpeningKindBadge kind="EXPECTED" />
                  </span>
                  <span className="mt-0.5 block text-[12px] font-normal text-muted-foreground">
                    Predicted from previous cycles, not confirmed by the employer
                  </span>
                </Field>
              )}

              {isOpen && o.firstVerifiedOpenAt && (
                <Field label="Opened">{relativeTime(o.firstVerifiedOpenAt)}</Field>
              )}

              <Field label="Deadline">
                {o.rolling ? (
                  <span className="flex flex-col items-end">
                    Rolling
                    <span className="text-[12px] font-normal text-muted-foreground">Assessed as applications arrive</span>
                  </span>
                ) : o.deadline ? (
                  <span className="flex flex-col items-end">
                    {longDate(o.deadline)}
                    <span className="text-[12px] font-normal text-muted-foreground">{countdown(o.deadline)}</span>
                  </span>
                ) : (
                  "Not stated"
                )}
              </Field>

              {o.application && <Field label="Your application">{STAGE_LABEL[o.application.stage]}</Field>}
            </dl>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-subtle-foreground">Eligibility</h3>
            <div className="mt-2 rounded-xl border border-border p-3.5">
              <EligibilityBadge verdict={o.eligibility.verdict} />
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{o.eligibility.reason}</p>
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-subtle-foreground">Verification</h3>
            <div
              className={cn(
                "mt-2 rounded-xl border p-3.5",
                o.applicationVerifiedAt ? "border-border" : "border-dashed border-border",
              )}
            >
              {o.applicationVerifiedAt ? (
                <>
                  <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                    <ShieldCheck className="size-4 text-success" strokeWidth={2} />
                    Verified {verifiedAgo}
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {VERIFICATION_METHOD_LABEL[o.verificationMethod]} · confidence {o.verificationConfidence}/100
                  </p>
                </>
              ) : (
                <p className="flex items-start gap-1.5 text-[12.5px] text-muted-foreground">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" strokeWidth={2} />
                  Not verified as open. FOE only marks an opportunity open once a live application is confirmed on the
                  employer&apos;s own site or ATS.
                </p>
              )}
              {checkedAgo && <p className="mt-2 text-[12px] text-subtle-foreground">FOE last checked {checkedAgo}</p>}
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-subtle-foreground">
              Sources ({o.sources.length})
            </h3>
            <ul className="mt-2 space-y-2">
              {o.sources.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                      {SOURCE_KIND_LABEL[s.kind]}
                      {s.isOfficial ? (
                        <Badge color="#16a34a" className="text-[10.5px]">
                          Official
                        </Badge>
                      ) : (
                        <Badge className="text-[10.5px]">Discovery</Badge>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-subtle-foreground">{s.url}</p>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg p-1.5 text-subtle-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                    aria-label="Open source"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </li>
              ))}
              {o.sources.length === 0 && <li className="text-[12.5px] text-muted-foreground">No sources recorded yet.</li>}
            </ul>
          </div>
        </SheetBody>

        <SheetFooter className="space-y-2">
          <div className="flex items-center gap-2">
            {isOpen && o.applicationUrl ? (
              <Button asChild className="flex-1">
                <a href={o.applicationUrl} target="_blank" rel="noopener noreferrer">
                  Apply
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            ) : o.officialInfoUrl ? (
              <Button asChild variant="secondary" className="flex-1">
                <a href={o.officialInfoUrl} target="_blank" rel="noopener noreferrer">
                  Official page
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            ) : null}

            {!o.application && isOpen && (
              <Button variant="outline" onClick={onMarkApplied}>
                <CheckCircle2 className="size-4" />
                Mark applied
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleWatch} className="flex-1">
              <BellRing className="size-3.5" />
              {o.isWatched ? "Stop watching" : "Watch"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onHide} className="flex-1">
              <EyeOff className="size-3.5" />
              Hide
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
