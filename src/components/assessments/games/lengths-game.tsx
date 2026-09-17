"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { now, rand } from "@/lib/assessments/rng";

const meta = getGameMeta("lengths")!;
// ~70 trials at a very brief flash fills the real game's 1-2 minute window.
const TRIALS = 70;
const SHOW_MS = 350;
const GAP_MS = 200;

type Stage = "showing" | "answering";
type MouthLength = "short" | "long";

// Real mechanic: a face flashes briefly with a subtly shorter or longer mouth (the two
// categories differ by only ~8-15%), and you judge which it was after it's gone.
function randomMouth() {
  const base = 18 + rand() * 4;
  const diffPct = 0.08 + rand() * 0.07;
  const length: MouthLength = rand() < 0.5 ? "short" : "long";
  const halfWidth = length === "long" ? base * (1 + diffPct) : base * (1 - diffPct);
  return { halfWidth, length };
}

export function LengthsGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [trial, setTrial] = useState(0);
  const [stage, setStage] = useState<Stage>("showing");
  const [mouth, setMouth] = useState(randomMouth());
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
        answer("short");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        answer("long");
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
    setMouth(randomMouth());
    setStage("showing");
    shownAt.current = now();
    timeoutRef.current = setTimeout(() => setStage("answering"), SHOW_MS);
  }

  function start() {
    setCorrect(0);
    rtTimes.current = [];
    setPhase("playing");
    nextTrial(0);
  }

  function answer(guess: MouthLength) {
    if (stage !== "answering") return;
    const rt = now() - shownAt.current;
    rtTimes.current.push(rt);
    if (guess === mouth.length) setCorrect((c) => c + 1);
    timeoutRef.current = setTimeout(() => nextTrial(trial + 1), GAP_MS);
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
          A face flashes briefly with either a short or long mouth - the difference is subtle. After it
          disappears, press the left arrow key for a short mouth or the right arrow key for a long mouth, as
          quickly and accurately as you can. {TRIALS} trials.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="text-[12px] font-medium text-muted-foreground">
          Trial {Math.min(trial + 1, TRIALS)} / {TRIALS}
        </div>

        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-inset text-foreground">
          {stage === "showing" ? (
            <svg viewBox="0 0 100 100" className="size-20" fill="none" stroke="currentColor" strokeWidth="3.5">
              <circle cx="50" cy="50" r="42" strokeWidth="3" />
              <circle cx="34" cy="42" r="4" fill="currentColor" stroke="none" />
              <circle cx="66" cy="42" r="4" fill="currentColor" stroke="none" />
              <path d={`M${50 - mouth.halfWidth},68 Q50,72 ${50 + mouth.halfWidth},68`} strokeLinecap="round" />
            </svg>
          ) : (
            <span className="text-[32px] font-semibold text-muted-foreground">?</span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={stage !== "answering"}
            onClick={() => answer("short")}
            className="rounded-xl border border-border bg-surface-inset px-4 py-2.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            ← Short mouth
          </button>
          <button
            type="button"
            disabled={stage !== "answering"}
            onClick={() => answer("long")}
            className="rounded-xl border border-border bg-surface-inset px-4 py-2.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            Long mouth →
          </button>
        </div>
      </div>
    </GameShell>
  );
}
