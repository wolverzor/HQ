"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { now, rand } from "@/lib/assessments/rng";

const meta = getGameMeta("lengths")!;
// ~80 rapid trials fills the real game's 1-2 minute window at a typical sub-second response pace.
const TRIALS = 80;

type Stage = "showing" | "answered";

function randomPair() {
  const base = 60 + rand() * 40;
  const diff = 8 + rand() * 40;
  const leftLonger = rand() < 0.5;
  const left = leftLonger ? base + diff : base;
  const right = leftLonger ? base : base + diff;
  return { left, right, longer: leftLonger ? "left" : "right" } as const;
}

export function LengthsGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [trial, setTrial] = useState(0);
  const [stage, setStage] = useState<Stage>("showing");
  const [pair, setPair] = useState(randomPair());
  const [correct, setCorrect] = useState(0);
  const rtTimes = useRef<number[]>([]);
  const shownAt = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        answer("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        answer("right");
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
    setTrial(n);
    setPair(randomPair());
    setStage("showing");
    shownAt.current = now();
  }

  function start() {
    setCorrect(0);
    rtTimes.current = [];
    setPhase("playing");
    nextTrial(0);
  }

  function answer(side: "left" | "right") {
    if (stage !== "showing") return;
    const rt = now() - shownAt.current;
    rtTimes.current.push(rt);
    if (side === pair.longer) setCorrect((c) => c + 1);
    setStage("answered");
    timeoutRef.current = setTimeout(() => nextTrial(trial + 1), 250);
  }

  function finish() {
    const avgRt = rtTimes.current.length
      ? rtTimes.current.reduce((a, b) => a + b, 0) / rtTimes.current.length
      : 0;
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `${correct}/${TRIALS} correct · ${avgRt.toFixed(0)} ms avg`,
      detail: {
        Accuracy: `${Math.round((correct / TRIALS) * 100)}%`,
        "Avg response time": `${avgRt.toFixed(0)} ms`,
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
          Two horizontal lines appear side by side. Press the left/right arrow key (or click the side) with the
          longer line, as quickly and accurately as you can. {TRIALS} trials.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="text-[12px] font-medium text-muted-foreground">
          Trial {Math.min(trial + 1, TRIALS)} / {TRIALS}
        </div>

        <div className="flex h-32 w-full items-center justify-around">
          <button
            type="button"
            onClick={() => answer("left")}
            disabled={stage !== "showing"}
            className="flex h-full flex-1 items-center justify-center cursor-pointer disabled:cursor-default"
          >
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pair.left}px` }} />
          </button>
          <div className="h-16 w-px bg-border" />
          <button
            type="button"
            onClick={() => answer("right")}
            disabled={stage !== "showing"}
            className="flex h-full flex-1 items-center justify-center cursor-pointer disabled:cursor-default"
          >
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pair.right}px` }} />
          </button>
        </div>
      </div>
    </GameShell>
  );
}
