"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { cn } from "@/lib/utils";
import { rand } from "@/lib/assessments/rng";

const meta = getGameMeta("stop")!;
const TRIALS = 24;
const STOP_RATIO = 0.25;
const SHOW_MS = 900;
const GAP_MS = 500;

type TrialType = "go" | "stop";
type Stage = "waiting" | "showing" | "gap";

export function StopGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [trial, setTrial] = useState(0);
  const [trialType, setTrialType] = useState<TrialType>("go");
  const [stage, setStage] = useState<Stage>("waiting");
  const [responded, setResponded] = useState(false);

  const correctGo = useRef(0);
  const missedGo = useRef(0);
  const correctStop = useRef(0);
  const failedStop = useRef(0);
  const respondedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        respond();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stage]);

  function nextTrial(n: number) {
    if (n >= TRIALS) {
      finish();
      return;
    }
    const type: TrialType = rand() < STOP_RATIO ? "stop" : "go";
    setTrial(n);
    setTrialType(type);
    setResponded(false);
    respondedRef.current = false;
    setStage("showing");

    timeoutRef.current = setTimeout(() => {
      if (type === "go" && !respondedRef.current) missedGo.current += 1;
      if (type === "stop" && !respondedRef.current) correctStop.current += 1;
      setStage("gap");
      timeoutRef.current = setTimeout(() => nextTrial(n + 1), GAP_MS);
    }, SHOW_MS);
  }

  function start() {
    correctGo.current = 0;
    missedGo.current = 0;
    correctStop.current = 0;
    failedStop.current = 0;
    setPhase("playing");
    nextTrial(0);
  }

  function respond() {
    if (stage !== "showing" || respondedRef.current) return;
    respondedRef.current = true;
    setResponded(true);
    if (trialType === "go") correctGo.current += 1;
    else failedStop.current += 1;
  }

  function finish() {
    const goTrials = correctGo.current + missedGo.current;
    const stopTrials = correctStop.current + failedStop.current;
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `${correctGo.current}/${goTrials} go hits · ${correctStop.current}/${stopTrials} stops held`,
      detail: {
        "Go accuracy": goTrials ? `${Math.round((correctGo.current / goTrials) * 100)}%` : "-",
        "Stop accuracy": stopTrials ? `${Math.round((correctStop.current / stopTrials) * 100)}%` : "-",
        "Missed go": missedGo.current,
        "Failed stops": failedStop.current,
      },
    };
    setResult(r);
    setPhase("done");
    onComplete(r);
  }

  function replay() {
    setResult(null);
    setPhase("intro");
  }

  return (
    <GameShell
      meta={meta}
      phase={phase}
      result={result}
      onStart={start}
      onReplay={replay}
      instructions={
        <p className="text-[13px] text-muted-foreground">
          Press the spacebar whenever you see a <span className="font-semibold text-danger">red circle</span>. When
          you see a <span className="font-semibold text-success">green circle</span> instead, do nothing and let it
          pass. {TRIALS} trials, roughly a quarter of them will be green (no-go) signals.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="text-[12px] font-medium text-muted-foreground">
          Trial {Math.min(trial + 1, TRIALS)} / {TRIALS}
        </div>

        <div className="flex h-32 items-center justify-center">
          {stage === "showing" ? (
            <button
              type="button"
              onClick={respond}
              className={cn(
                "size-24 cursor-pointer rounded-full transition-transform active:scale-95",
                trialType === "go" ? "bg-danger" : "bg-success",
              )}
              aria-label={trialType === "go" ? "Go" : "Stop"}
            />
          ) : (
            <div className="size-24 rounded-full border-2 border-dashed border-border" />
          )}
        </div>

        {stage === "gap" && responded && trialType === "stop" && (
          <p className="text-[12.5px] font-medium text-danger">Should have held still!</p>
        )}
      </div>
    </GameShell>
  );
}
