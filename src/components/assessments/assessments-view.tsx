"use client";

import { Brain } from "lucide-react";
import { GAME_CATALOG } from "@/lib/assessments/catalog";
import { useGameProgress } from "@/hooks/use-game-progress";
import { AssessmentCard } from "@/components/assessments/assessment-card";

export function AssessmentsView() {
  const { results } = useGameProgress();
  const completedCount = Object.keys(results).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-[10px] bg-surface-inset text-foreground">
          <Brain className="size-[17px]" strokeWidth={1.9} />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Assessments</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">
            Practice versions of common cognitive & behavioral assessment games · {completedCount}/
            {GAME_CATALOG.length} completed
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_CATALOG.map((meta) => (
          <AssessmentCard key={meta.id} meta={meta} result={results[meta.id]} />
        ))}
      </div>
    </div>
  );
}
