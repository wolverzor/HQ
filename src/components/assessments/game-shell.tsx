"use client";

import Link from "next/link";
import { ArrowLeft, Clock, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";

export type GamePhase = "intro" | "playing" | "done";

interface GameShellProps {
  meta: GameMeta;
  phase: GamePhase;
  instructions: React.ReactNode;
  onStart: () => void;
  onReplay: () => void;
  result: GameResult | null;
  children?: React.ReactNode;
}

export function GameShell({ meta, phase, instructions, onStart, onReplay, result, children }: GameShellProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <Link
        href="/assessments"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All assessments
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">{meta.title}</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">{meta.tagline}</p>
        </div>
        <Badge variant="tint" className="shrink-0">
          <Clock className="size-3" />
          {meta.duration}
        </Badge>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        {phase === "intro" && (
          <div>
            <p className="text-[13.5px] leading-relaxed text-foreground">{meta.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {meta.measures.map((m) => (
                <Badge key={m} variant="tint">
                  <Target className="size-3" />
                  {m}
                </Badge>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-4">{instructions}</div>
            <Button className="mt-5 w-full" size="lg" onClick={onStart}>
              Start
            </Button>
          </div>
        )}

        {phase === "playing" && children}

        {phase === "done" && result && (
          <div className="text-center">
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Result</p>
            <p className="mt-1.5 text-[19px] font-semibold text-foreground">{result.summary}</p>
            {result.detail && Object.keys(result.detail).length > 0 && (
              <dl className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-3">
                {Object.entries(result.detail).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-surface-inset px-3 py-2.5 text-left">
                    <dt className="text-[11px] text-muted-foreground">{key}</dt>
                    <dd className="text-[15px] font-semibold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="secondary" onClick={onReplay}>
                <RotateCcw className="size-3.5" />
                Try again
              </Button>
              <Button asChild>
                <Link href="/assessments">Back to assessments</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
