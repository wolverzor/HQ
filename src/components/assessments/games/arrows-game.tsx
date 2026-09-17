"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { ArrowLeft as LeftIcon, ArrowRight as RightIcon } from "lucide-react";
import { now, rand } from "@/lib/assessments/rng";

const meta = getGameMeta("arrows")!;
// Real pymetrics runs ~135 arrow-sets in 3 minutes (~1.3s/trial) - match that cadence and count.
const TRIALS = 135;
const SHOW_MS = 1000;
const GAP_MS = 300;

type Direction = "left" | "right";
type Stage = "showing" | "gap";

function randomDirection(): Direction {
  return rand() < 0.5 ? "left" : "right";
}

export function ArrowsGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [trial, setTrial] = useState(0);
  const [stage, setStage] = useState<Stage>("showing");
  // Blue/black arrows: respond to the center arrow. Red arrows: respond to the side arrows instead.
  const [color, setColor] = useState<"blue" | "red">("blue");
  const [centerDir, setCenterDir] = useState<Direction>("right");
  const [outerDir, setOuterDir] = useState<Direction>("right");
  const [correct, setCorrect] = useState(0);
  const [responded, setResponded] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const rtTimes = useRef<number[]>([]);
  const shownAt = useRef(0);
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
    setColor(rand() < 0.5 ? "blue" : "red");
    setCenterDir(randomDirection());
    setOuterDir(randomDirection());
    setStage("showing");
    setFeedback(null);
    respondedRef.current = false;
    setResponded(false);
    shownAt.current = now();

    timeoutRef.current = setTimeout(() => {
      setStage("gap");
      timeoutRef.current = setTimeout(() => nextTrial(n + 1), GAP_MS);
    }, SHOW_MS);
  }

  function start() {
    setCorrect(0);
    rtTimes.current = [];
    setPhase("playing");
    nextTrial(0);
  }

  function answer(dir: Direction) {
    if (stage !== "showing" || respondedRef.current) return;
    respondedRef.current = true;
    setResponded(true);
    const rt = now() - shownAt.current;
    rtTimes.current.push(rt);
    const target = color === "blue" ? centerDir : outerDir;
    const isCorrect = dir === target;
    if (isCorrect) setCorrect((c) => c + 1);
    setFeedback(isCorrect ? "correct" : "wrong");
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

  const arrowColor = color === "blue" ? "text-primary" : "text-danger";
  const Center = centerDir === "left" ? LeftIcon : RightIcon;
  const Outer = outerDir === "left" ? LeftIcon : RightIcon;

  return (
    <GameShell
      meta={meta}
      phase={phase}
      result={result}
      onStart={start}
      onReplay={replay}
      instructions={
        <p className="text-[13px] text-muted-foreground">
          Five arrows appear in a row. When they&apos;re{" "}
          <span className="font-semibold text-primary">blue or black</span>, respond to the direction of the{" "}
          <span className="font-semibold">center</span> arrow. When they&apos;re{" "}
          <span className="font-semibold text-danger">red</span>, ignore the center arrow and respond to the
          direction of the <span className="font-semibold">side</span> arrows instead - the side arrows always
          point the same way as each other. Use the left/right arrow keys or click the buttons. {TRIALS} trials.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="text-[12px] font-medium text-muted-foreground">
          Trial {Math.min(trial + 1, TRIALS)} / {TRIALS}
        </div>

        <div className="flex h-20 items-center justify-center gap-1">
          {stage === "showing" && (
            <>
              <Outer className={`size-6 ${arrowColor}`} />
              <Outer className={`size-6 ${arrowColor}`} />
              <Center className={`size-6 ${arrowColor}`} />
              <Outer className={`size-6 ${arrowColor}`} />
              <Outer className={`size-6 ${arrowColor}`} />
            </>
          )}
        </div>

        {feedback && (
          <p className={`text-[12.5px] font-medium ${feedback === "correct" ? "text-success" : "text-danger"}`}>
            {feedback === "correct" ? "Correct" : "Wrong"}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={stage !== "showing" || responded}
            onClick={() => answer("left")}
            className="flex size-14 items-center justify-center rounded-xl border border-border bg-surface-inset transition-colors hover:bg-surface-hover disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            <LeftIcon className="size-5" />
          </button>
          <button
            type="button"
            disabled={stage !== "showing" || responded}
            onClick={() => answer("right")}
            className="flex size-14 items-center justify-center rounded-xl border border-border bg-surface-inset transition-colors hover:bg-surface-hover disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            <RightIcon className="size-5" />
          </button>
        </div>
      </div>
    </GameShell>
  );
}
