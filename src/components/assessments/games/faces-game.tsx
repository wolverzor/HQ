"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { now, rand } from "@/lib/assessments/rng";
import { FaceIllustration } from "@/components/assessments/games/face-illustration";

const meta = getGameMeta("faces")!;
// ~50 trials at ~1200ms display + ~1.5s avg response fills the real game's 2-3 minute window.
const TRIALS = 50;
const SHOW_MS = 1200;

const EMOTIONS = [
  { key: "happy", label: "Happy" },
  { key: "sad", label: "Sad" },
  { key: "angry", label: "Angry" },
  { key: "surprised", label: "Surprised" },
  { key: "fearful", label: "Fearful" },
  { key: "disgusted", label: "Disgusted" },
] as const;

type Stage = "showing" | "answering";
type Emotion = (typeof EMOTIONS)[number];

function pickEmotion() {
  return EMOTIONS[Math.floor(rand() * EMOTIONS.length)];
}

function choiceSet(correctKey: string) {
  const others = EMOTIONS.filter((e) => e.key !== correctKey);
  const shuffled = [...others].sort(() => rand() - 0.5).slice(0, 3);
  const correct = EMOTIONS.find((e) => e.key === correctKey)!;
  return [...shuffled, correct].sort(() => rand() - 0.5);
}

export function FacesGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [stage, setStage] = useState<Stage>("showing");
  const [trial, setTrial] = useState(0);
  const [current, setCurrent] = useState<Emotion>(EMOTIONS[0]);
  const [options, setOptions] = useState<Emotion[]>(EMOTIONS.slice(0, 4));
  const [correctCount, setCorrectCount] = useState(0);
  const rtTimes = useRef<number[]>([]);
  const shownAt = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function nextTrial(n: number) {
    if (n >= TRIALS) {
      finish();
      return;
    }
    const emotion = pickEmotion();
    setCurrent(emotion);
    setOptions(choiceSet(emotion.key));
    setStage("showing");
    setTrial(n);
    timeoutRef.current = setTimeout(() => {
      shownAt.current = now();
      setStage("answering");
    }, SHOW_MS);
  }

  function start() {
    setCorrectCount(0);
    rtTimes.current = [];
    setPhase("playing");
    nextTrial(0);
  }

  function answer(key: string) {
    if (stage !== "answering") return;
    const rt = now() - shownAt.current;
    rtTimes.current.push(rt);
    if (key === current.key) setCorrectCount((c) => c + 1);
    nextTrial(trial + 1);
  }

  function finish() {
    const avgRt = rtTimes.current.length
      ? rtTimes.current.reduce((a, b) => a + b, 0) / rtTimes.current.length
      : 0;
    const accuracy = (correctCount / TRIALS) * 100;
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `${correctCount}/${TRIALS} correct · ${accuracy.toFixed(0)}% accuracy`,
      detail: {
        Accuracy: `${accuracy.toFixed(0)}%`,
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
          A face briefly appears showing an emotion. Once it disappears, pick the matching emotion from the options
          as quickly and accurately as you can. {TRIALS} trials total.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="text-[12px] font-medium text-muted-foreground">
          Trial {Math.min(trial + 1, TRIALS)} / {TRIALS}
        </div>

        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-inset text-foreground">
          {stage === "showing" ? (
            <FaceIllustration emotion={current.key} className="size-20" />
          ) : (
            <span className="text-[32px] font-semibold text-muted-foreground">?</span>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-2">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              disabled={stage !== "answering"}
              onClick={() => answer(opt.key)}
              className="rounded-xl border border-border bg-surface-inset px-3 py-3 text-[13.5px] font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
