"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { Button } from "@/components/ui/button";
import { now, rand } from "@/lib/assessments/rng";

const meta = getGameMeta("hard-or-easy")!;
const ROUNDS = 6;

// Real mechanic: easy = 5 presses in 3s for a small reward, hard = 60 presses in 12s for a
// bigger reward. Even a successful attempt only pays out with some probability, so choosing
// hard is a genuine effort-vs-payoff gamble, not just a harder aim challenge.
const EASY = { target: 5, timeMs: 3000, reward: 10 };
const HARD = { target: 60, timeMs: 12000, reward: 40 };

type Stage = "choosing" | "task" | "result";

export function HardOrEasyGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(0);
  const [stage, setStage] = useState<Stage>("choosing");
  const [choice, setChoice] = useState<"easy" | "hard" | null>(null);
  const [presses, setPresses] = useState(0);
  const [msLeft, setMsLeft] = useState(0);
  const [outcome, setOutcome] = useState<"paid" | "unpaid" | "failed" | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [hardPicks, setHardPicks] = useState(0);
  const [hardPaid, setHardPaid] = useState(0);
  const [easyPicks, setEasyPicks] = useState(0);
  const [easyPaid, setEasyPaid] = useState(0);

  const pressesRef = useRef(0);
  const deadlineRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const settledRef = useRef(false);
  const choiceRef = useRef<"easy" | "hard" | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function start() {
    setRound(0);
    setTotalPoints(0);
    setHardPicks(0);
    setHardPaid(0);
    setEasyPicks(0);
    setEasyPaid(0);
    setStage("choosing");
    setPhase("playing");
  }

  function pick(kind: "easy" | "hard") {
    const config = kind === "easy" ? EASY : HARD;
    setChoice(kind);
    choiceRef.current = kind;
    setPresses(0);
    pressesRef.current = 0;
    settledRef.current = false;
    setMsLeft(config.timeMs);
    deadlineRef.current = now() + config.timeMs;
    setStage("task");

    function tick() {
      const left = Math.max(0, deadlineRef.current - now());
      setMsLeft(left);
      if (left <= 0) {
        settleTask(kind, pressesRef.current >= config.target);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function registerPress() {
    if (stage !== "task" || settledRef.current || !choiceRef.current) return;
    pressesRef.current += 1;
    setPresses(pressesRef.current);
    const config = choiceRef.current === "easy" ? EASY : HARD;
    if (pressesRef.current >= config.target) {
      settleTask(choiceRef.current, true);
    }
  }

  function settleTask(kind: "easy" | "hard", succeeded: boolean) {
    if (settledRef.current) return;
    settledRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (kind === "hard") setHardPicks((n) => n + 1);
    else setEasyPicks((n) => n + 1);

    if (!succeeded) {
      setOutcome("failed");
      setStage("result");
      return;
    }

    // Payout is probabilistic even on a successful attempt - the probability itself isn't shown.
    const payoutChance = 0.45 + rand() * 0.45;
    const paid = rand() < payoutChance;
    const config = kind === "easy" ? EASY : HARD;

    if (paid) {
      setTotalPoints((p) => p + config.reward);
      if (kind === "hard") setHardPaid((n) => n + 1);
      else setEasyPaid((n) => n + 1);
    }
    setOutcome(paid ? "paid" : "unpaid");
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
    choiceRef.current = null;
    setOutcome(null);
    setStage("choosing");
  }

  function finish() {
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `${totalPoints} points · chose hard ${hardPicks}/${ROUNDS} times`,
      detail: {
        "Total points": totalPoints,
        "Hard picks": `${hardPicks} (${hardPaid} paid)`,
        "Easy picks": `${easyPicks} (${easyPaid} paid)`,
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

  useEffect(() => {
    if (stage !== "task") return;
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        registerPress();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, choice]);

  const config = choice === "easy" ? EASY : HARD;

  return (
    <GameShell
      meta={meta}
      phase={phase}
      result={result}
      onStart={start}
      onReplay={replay}
      instructions={
        <p className="text-[13px] text-muted-foreground">
          Each round, choose an easy task (press spacebar {EASY.target} times in {EASY.timeMs / 1000}s, worth{" "}
          {EASY.reward} pts) or a hard task (press spacebar {HARD.target} times in {HARD.timeMs / 1000}s, worth{" "}
          {HARD.reward} pts). Even finishing in time only pays out some of the time - you won&apos;t know the odds
          up front. {ROUNDS} rounds total.
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
              className="flex w-36 flex-col items-center gap-1 rounded-xl border border-border bg-surface-inset px-4 py-4 transition-colors hover:bg-surface-hover cursor-pointer"
            >
              <span className="text-[14px] font-semibold text-foreground">Easy</span>
              <span className="text-[12px] text-muted-foreground">
                {EASY.target} presses / {EASY.timeMs / 1000}s
              </span>
              <span className="text-[12px] font-medium text-foreground">{EASY.reward} pts</span>
            </button>
            <button
              type="button"
              onClick={() => pick("hard")}
              className="flex w-36 flex-col items-center gap-1 rounded-xl border border-border bg-surface-inset px-4 py-4 transition-colors hover:bg-surface-hover cursor-pointer"
            >
              <span className="text-[14px] font-semibold text-foreground">Hard</span>
              <span className="text-[12px] text-muted-foreground">
                {HARD.target} presses / {HARD.timeMs / 1000}s
              </span>
              <span className="text-[12px] font-medium text-foreground">{HARD.reward} pts</span>
            </button>
          </div>
        )}

        {stage === "task" && choice && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-[12px] font-medium text-muted-foreground tabular-nums">
              {(msLeft / 1000).toFixed(1)}s left
            </div>
            <div className="text-[40px] font-bold tabular-nums text-foreground">
              {presses} / {config.target}
            </div>
            <button
              type="button"
              onClick={registerPress}
              className="flex size-28 select-none items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              PRESS
            </button>
          </div>
        )}

        {stage === "result" && (
          <div className="flex flex-col items-center gap-3">
            {outcome === "failed" && (
              <p className="text-[14px] font-semibold text-danger">Didn&apos;t hit the target in time.</p>
            )}
            {outcome === "paid" && <p className="text-[14px] font-semibold text-success">Paid out!</p>}
            {outcome === "unpaid" && (
              <p className="text-[14px] font-semibold text-warning">Completed it, but no payout this time.</p>
            )}
            <Button onClick={nextRound}>{round + 1 >= ROUNDS ? "See results" : "Next round"}</Button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
