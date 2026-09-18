"use client";

import { useMemo } from "react";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STAGE_COLOR, STAGE_LABEL, STAGE_ORDER } from "@/lib/foe/labels";
import { isTerminalStage, nextStages, stageProgress } from "@/lib/foe/applications";
import { relativeTime, shortDate } from "@/lib/foe/format";
import { useFoeApplications, useUpdateApplication } from "@/hooks/use-foe";
import type { ApplicationDTO, ApplicationStage } from "@/lib/foe/types";
import { FirmMark } from "./badges";

/**
 * Application tracking.
 *
 * Fed by "Mark applied" on an opportunity, which also creates the HQ task — so
 * this is a view onto the existing task/calendar system rather than a competing
 * tracker.
 */
function StagePipeline({ stage }: { stage: ApplicationStage }) {
  if (isTerminalStage(stage) && stage !== "OFFER") {
    return (
      <Badge color={STAGE_COLOR[stage]} className="text-[11.5px]">
        {STAGE_LABEL[stage]}
      </Badge>
    );
  }

  const progress = stageProgress(stage);
  const currentIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="min-w-[180px]">
      <div className="flex items-center gap-1">
        {STAGE_ORDER.map((s, i) => (
          <span
            key={s}
            title={STAGE_LABEL[s]}
            className={cn("h-1.5 flex-1 rounded-full", i <= currentIndex ? "" : "bg-border")}
            style={i <= currentIndex ? { backgroundColor: STAGE_COLOR[stage] } : undefined}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[12px] font-medium" style={{ color: STAGE_COLOR[stage] }}>
        {STAGE_LABEL[stage]}
        <span className="ml-1.5 font-normal text-muted-foreground">
          step {currentIndex + 1} of {STAGE_ORDER.length}
        </span>
      </p>
      <span className="sr-only">{Math.round(progress * 100)}% through the pipeline</span>
    </div>
  );
}

function ApplicationRow({ application: a }: { application: ApplicationDTO }) {
  const update = useUpdateApplication();
  const moves = nextStages(a.stage);

  return (
    <div className="flex flex-wrap items-center gap-4 py-4">
      <FirmMark name={a.firmName} size={34} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[14px] font-semibold tracking-tight text-foreground">{a.firmName}</h3>
        <p className="truncate text-[13px] text-muted-foreground">{a.programmeName}</p>
        <p className="mt-0.5 text-[12px] text-subtle-foreground">
          Applied {relativeTime(a.appliedAt)}
          {a.deadline ? ` · deadline ${shortDate(a.deadline)}` : ""}
        </p>
      </div>

      <StagePipeline stage={a.stage} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm" disabled={moves.length === 0}>
            {moves.length === 0 ? "Closed" : "Update stage"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {moves.map((s) => (
            <DropdownMenuItem key={s} onSelect={() => update.mutate({ id: a.id, stage: s })}>
              {STAGE_LABEL[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ApplicationsView() {
  const { data: applications, isLoading } = useFoeApplications();

  const { live, closed } = useMemo(() => {
    const all = applications ?? [];
    return {
      live: all.filter((a) => !isTerminalStage(a.stage)),
      closed: all.filter((a) => isTerminalStage(a.stage)),
    };
  }, [applications]);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Finance Opportunity Engine
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-foreground">Applications</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Every application you have started from FOE. Marking one applied also adds a task to your HQ task list.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="mt-5 h-[280px] rounded-2xl" />
      ) : (applications?.length ?? 0) === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={ClipboardList}
            title="No applications yet"
            description="Use Mark applied on an open opportunity and it will appear here, with a matching task in your task list."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <section className="rounded-2xl border border-border bg-surface px-5">
            <div className="border-b border-border py-3.5">
              <h2 className="text-[14px] font-semibold tracking-tight text-foreground">
                In progress <span className="text-muted-foreground">({live.length})</span>
              </h2>
            </div>
            {live.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">Nothing in progress.</p>
            ) : (
              <div className="divide-y divide-border">
                {live.map((a) => (
                  <ApplicationRow key={a.id} application={a} />
                ))}
              </div>
            )}
          </section>

          {closed.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface px-5">
              <div className="border-b border-border py-3.5">
                <h2 className="text-[14px] font-semibold tracking-tight text-foreground">
                  Closed <span className="text-muted-foreground">({closed.length})</span>
                </h2>
              </div>
              <div className="divide-y divide-border">
                {closed.map((a) => (
                  <ApplicationRow key={a.id} application={a} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
