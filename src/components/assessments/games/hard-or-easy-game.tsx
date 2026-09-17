"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { Button } from "@/components/ui/button";
import { now, rand } from "@/lib/assessments/rng";

const meta = getGameMeta("hard-or-easy")!;
const ROUNDS = 8;
const EASY_REWARD = 5;
const HARD_REWARD = 15;
const EASY_TARGET_MS = 900;
const HARD_TARGET_MS = 400;

type Stage = "choosing" | "task" | "result";

export function HardOrEasyGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(0);
  const [stage, setStage] = useState<Stage>("choosing");
  const [choice, setChoice] = useState<"easy" | "hard" | null>(null);
  const [targetVisible, setTargetVisible] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [hardPicks, setHardPicks] = useState(0);
  const [hardSuccesses, setHardSuccesses] = useState(0);
  const [easyPicks, setEasyPicks] = useState(0);
  const [easySuccesses, setEasySuccesses] = useState(0);

  const appearAt = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function start() {
    setRound(0);
    setTotalPoints(0);
    setHardPicks(0);
    setHardSuccesses(0);
    setEasyPicks(0);
    setEasySuccesses(0);
    setStage("choosing");
    setPhase("playing");
  }

  function pick(kind: "easy" | "hard") {
    setChoice(kind);
    setStage("task");
    setTargetVisible(false);
    const delay = 600 + rand() * 900;
    timeoutRef.current = setTimeout(() => {
      appearAt.current = now();
      setTargetVisible(true);
    }, delay);
  }

  function hitTarget() {
    if (!targetVisible || !choice) return;
    const rt = now() - appearAt.current;
    const target = choice === "hard" ? HARD_TARGET_MS : EASY_TARGET_MS;
    const success = rt <= target;
    setSucceeded(success);
    setTargetVisible(false);

    if (choice === "hard") {
      setHardPicks((n) => n + 1);
      if (success) {
        setHardSuccesses((n) => n + 1);
        setTotalPoints((p) => p + HARD_REWARD);
      }
    } else {
      setEasyPicks((n) => n + 1);
      if (success) {
        setEasySuccesses((n) => n + 1);
        setTotalPoints((p) => p + EASY_REWARD);
      }
    }
    setStage("result");
  }

  function nextRound() {
    const next = round + 1;
    if (next >= ROUNDS) {
      finish();
      return;
    }
    setRound(next);
    setChoice(null);
    setStage("choosing");
  }

  function finish() {
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `${totalPoints} points · chose hard ${hardPicks}/${ROUNDS} times`,
      detail: {
        "Total points": totalPoints,
        "Hard picks": `${hardPicks} (${hardSuccesses} hit)`,
        "Easy picks": `${easyPicks} (${easySuccesses} hit)`,
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
          Each round, choose an easy task (worth {EASY_REWARD} pts, generous timing) or a hard task (worth{" "}
          {HARD_REWARD} pts, tight timing). When a target circle appears, tap it as fast as you can within the time
          limit to succeed. {ROUNDS} rounds total.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground">
          <span>
            Round {round + 1} / {ROUNDS}
          </span>
          <span>Points: {totalPoints}</span>
        </div>

        {stage === "choosing" && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => pick("easy")}
              className="flex w-32 flex-col items-center gap-1 rounded-xl border border-border bg-surface-inset px-4 py-4 transition-colors hover:bg-surface-hover cursor-pointer"
            >
              <span className="text-[14px] font-semibold text-foreground">Easy</span>
              <span className="text-[12px] text-muted-foreground">{EASY_REWARD} pts</span>
            </button>
            <button
              type="button"
              onClick={() => pick("hard")}
              className="flex w-32 flex-col items-center gap-1 rounded-xl border border-border bg-surface-inset px-4 py-4 transition-colors hover:bg-surface-hover cursor-pointer"
            >
              <span className="text-[14px] font-semibold text-foreground">Hard</span>
              <span className="text-[12px] text-muted-foreground">{HARD_REWARD} pts</span>
            </button>
          </div>
        )}

        {stage === "task" && (
          <div className="flex h-32 w-32 items-center justify-center">
            {targetVisible ? (
              <button
                type="button"
                onClick={hitTarget}
                className="size-24 animate-pulse rounded-full bg-primary cursor-pointer"
                aria-label="Target"
              />
            ) : (
              <p className="text-[12.5px] text-muted-foreground">Get ready...</p>
            )}
          </div>
        )}

        {stage === "result" && (
          <div className="flex flex-col items-center gap-3">
            <p className={`text-[14px] font-semibold ${succeeded ? "text-success" : "text-danger"}`}>
              {succeeded ? "Hit! Points earned." : "Missed the window."}
            </p>
            <Button onClick={nextRound}>{round + 1 >= ROUNDS ? "See results" : "Next round"}</Button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
