"use client";

import { Activity, CircleAlert, RadioTower } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/foe/format";
import { FAILURE_LABEL } from "@/lib/foe/labels";
import { useEngineHealth } from "@/hooks/use-foe";
import type { FailureKind } from "@/lib/foe/types";

const DOT: Record<string, string> = {
  HEALTHY: "#16a34a",
  DEGRADED: "#d97706",
  FAILING: "#e11d48",
  NEVER_RUN: "#71717a",
};

/**
 * The monitoring indicator.
 *
 * Small on purpose — this is the user's dashboard, not an ops console — but
 * never hidden, because "FOE could not check 14 sources this hour" and "there
 * is nothing new" look identical unless something says otherwise. Clicking it
 * opens the detail.
 */
export function EngineHealthIndicator({ className }: { className?: string }) {
  const { data: health } = useEngineHealth();
  if (!health) return null;

  const color = DOT[health.status] ?? DOT.NEVER_RUN;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer",
            className,
          )}
        >
          <span className="relative flex size-2 shrink-0">
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
          </span>
          <span className="truncate">{health.statusLine}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold tracking-tight text-foreground">
            <Activity className="size-4 text-muted-foreground" strokeWidth={2} />
            Monitoring health
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {health.lastScanAt ? `Last sweep ${relativeTime(health.lastScanAt)}` : "No sweep has run yet"}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 py-3.5">
          <div>
            <dt className="text-[11.5px] text-muted-foreground">Firms monitored</dt>
            <dd className="text-[15px] font-semibold tabular-nums text-foreground">{health.firmsInUniverse}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-muted-foreground">Sources</dt>
            <dd className="text-[15px] font-semibold tabular-nums text-foreground">
              {health.sourcesHealthy}
              <span className="text-[12px] font-normal text-muted-foreground"> / {health.sourcesTotal} healthy</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-muted-foreground">On hot watch</dt>
            <dd className="flex items-center gap-1.5 text-[15px] font-semibold tabular-nums text-foreground">
              <RadioTower className="size-3.5 text-primary" strokeWidth={2} />
              {health.hotWatchCount}
            </dd>
          </div>
          <div>
            <dt className="text-[11.5px] text-muted-foreground">Failing sources</dt>
            <dd
              className="text-[15px] font-semibold tabular-nums"
              style={{ color: health.sourcesFailing > 0 ? "#e11d48" : undefined }}
            >
              {health.sourcesFailing}
            </dd>
          </div>
        </dl>

        {health.openFailures.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-subtle-foreground">Open issues</p>
            <ul className="mt-2 space-y-2">
              {health.openFailures.slice(0, 4).map((f) => (
                <li key={f.id} className="flex items-start gap-2">
                  <CircleAlert
                    className="mt-0.5 size-3.5 shrink-0"
                    strokeWidth={2}
                    style={{ color: f.severity === "CRITICAL" ? "#e11d48" : "#d97706" }}
                  />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium text-foreground">
                      {f.firmName ? `${f.firmName} — ` : ""}
                      {FAILURE_LABEL[f.kind as FailureKind] ?? f.kind}
                    </span>
                    <span className="block text-[11.5px] leading-relaxed text-muted-foreground">{f.message}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-border bg-surface-inset px-4 py-2.5">
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            A source FOE could not reach is recorded as unchecked, never as &quot;no opportunities&quot;.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
