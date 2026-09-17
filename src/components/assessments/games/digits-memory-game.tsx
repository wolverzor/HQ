"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { rand } from "@/lib/assessments/rng";

const meta = getGameMeta("digits-memory")!;
const START_LENGTH = 3;
const SHOW_MS_PER_DIGIT = 700;

type Stage = "showing" | "input" | "feedback";

function randomDigits(len: number): number[] {
  return Array.from({ length: len }, () => Math.floor(rand() * 10));
}

export function DigitsMemoryGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [stage, setStage] = useState<Stage>("showing");
  const [sequence, setSequence] = useState<number[]>([]);
  const [shownIndex, setShownIndex] = useState(-1);
  const [input, setInput] = useState("");
  const [wasCorrect, setWasCorrect] = useState(false);
  const bestLength = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage !== "input") return;
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        pressDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, input]);

  function playSequence(seq: number[]) {
    setStage("showing");
    setShownIndex(-1);
    let i = 0;
    function step() {
      setShownIndex(i);
      timeoutRef.current = setTimeout(() => {
        i += 1;
        if (i < seq.length) {
          step();
        } else {
          setShownIndex(-1);
          setStage("input");
        }
      }, SHOW_MS_PER_DIGIT);
    }
    step();
  }

  function start() {
    bestLength.current = 0;
    const seq = randomDigits(START_LENGTH);
    setSequence(seq);
    setInput("");
    setPhase("playing");
    playSequence(seq);
  }

  function submit(finalInput: string) {
    const correct = finalInput === sequence.join("");
    setWasCorrect(correct);
    setStage("feedback");

    if (correct) {
      bestLength.current = sequence.length;
      timeoutRef.current = setTimeout(() => {
        const next = randomDigits(sequence.length + 1);
        setSequence(next);
        setInput("");
        playSequence(next);
      }, 900);
    } else {
      timeoutRef.current = setTimeout(() => finish(), 900);
    }
  }

  function finish() {
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `Recalled up to ${bestLength.current} digits`,
      detail: { "Longest span": bestLength.current },
    };
    setResult(r);
    setPhase("done");
    onComplete(r);
  }

  function replay() {
    setResult(null);
    setPhase("intro");
  }

  function pressDigit(d: string) {
    if (stage !== "input") return;
    if (input.length >= sequence.length) return;
    const next = input + d;
    setInput(next);
    if (next.length === sequence.length) submit(next);
  }

  function backspace() {
    setInput((s) => s.slice(0, -1));
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
          Watch the digits appear one at a time, then type the sequence back in the same order using your keyboard
          or the on-screen pad. Each round adds one more digit until you make a mistake.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-6 py-4">
        {stage === "showing" && (
          <div className="flex h-24 items-center justify-center text-[56px] font-bold tabular-nums text-foreground">
            {shownIndex >= 0 ? sequence[shownIndex] : ""}
          </div>
        )}

        {stage !== "showing" && (
          <div className="flex h-24 items-center justify-center gap-2">
            {sequence.map((_, i) => (
              <div
                key={i}
                className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-inset text-[20px] font-semibold tabular-nums text-foreground"
              >
                {input[i] ?? ""}
              </div>
            ))}
          </div>
        )}

        {stage === "feedback" && (
          <p className={`text-[14px] font-medium ${wasCorrect ? "text-success" : "text-danger"}`}>
            {wasCorrect ? "Correct!" : `The sequence was ${sequence.join("")}`}
          </p>
        )}

        {stage === "input" && (
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"].map((d, i) =>
              d === "⌫" ? (
                <button
                  key={i}
                  type="button"
                  onClick={backspace}
                  className="flex size-14 items-center justify-center rounded-xl border border-border bg-surface-inset text-[16px] font-medium text-foreground transition-colors hover:bg-surface-hover cursor-pointer"
                >
                  ⌫
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => pressDigit(d)}
                  className="flex size-14 items-center justify-center rounded-xl border border-border bg-surface-inset text-[18px] font-semibold text-foreground transition-colors hover:bg-surface-hover cursor-pointer"
                >
                  {d}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </GameShell>
  );
}
