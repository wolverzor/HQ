"use client";

import { useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { Button } from "@/components/ui/button";
import { rand } from "@/lib/assessments/rng";

const meta = getGameMeta("money-exchange-1")!;
const ROUNDS = 5;
const ENDOWMENT = 10;
const MULTIPLIER = 3;

type Stage = "choosing" | "revealed" | "rating";

// Simulated partner "return ratio" per round - varies to feel like a real counterpart.
function partnerReturnRatio() {
  return 0.25 + rand() * 0.4;
}

export function MoneyExchange1Game({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(0);
  const [stage, setStage] = useState<Stage>("choosing");
  const [sent, setSent] = useState(0);
  const [returned, setReturned] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [totalReturned, setTotalReturned] = useState(0);
  const [finalBalance, setFinalBalance] = useState(0);
  const [fairnessRatings, setFairnessRatings] = useState<number[]>([]);

  function start() {
    setRound(0);
    setStage("choosing");
    setTotalSent(0);
    setTotalReturned(0);
    setFinalBalance(0);
    setFairnessRatings([]);
    setPhase("playing");
  }

  function send(amount: number) {
    const kept = ENDOWMENT - amount;
    const received = amount * MULTIPLIER;
    const back = Math.round(received * partnerReturnRatio());
    setSent(amount);
    setReturned(back);
    setTotalSent((s) => s + amount);
    setTotalReturned((r) => r + back);
    setFinalBalance((b) => b + kept + back);
    setStage("revealed");
  }

  function rateFairness(rating: number) {
    setFairnessRatings((r) => [...r, rating]);
    nextRound();
  }

  function nextRound() {
    const next = round + 1;
    if (next >= ROUNDS) {
      finish();
      return;
    }
    setRound(next);
    setStage("choosing");
  }

  function finish() {
    const avgSent = totalSent / ROUNDS;
    const avgFairness = fairnessRatings.length
      ? fairnessRatings.reduce((a, b) => a + b, 0) / fairnessRatings.length
      : 0;
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `Ended with ${finalBalance} pts`,
      detail: {
        "Final balance": finalBalance,
        "Avg sent / round": avgSent.toFixed(1),
        "Total received back": totalReturned,
        "Avg fairness rating": avgFairness.toFixed(1),
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
          Each round you get {ENDOWMENT} points. Send any amount to a partner - whatever you send is tripled on
          their end, and they choose how much to send back. {ROUNDS} rounds total.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground">
          <span>
            Round {round + 1} / {ROUNDS}
          </span>
          <span>Balance: {finalBalance} pts</span>
        </div>

        {stage === "choosing" && (
          <>
            <p className="text-[14px] font-medium text-foreground">
              You have {ENDOWMENT} points. How much do you send?
            </p>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: ENDOWMENT + 1 }, (_, i) => i).map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => send(amount)}
                  className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-inset text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-hover cursor-pointer"
                >
                  {amount}
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "revealed" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-[13.5px] text-muted-foreground">
              You sent <span className="font-semibold text-foreground">{sent}</span>, tripled to{" "}
              <span className="font-semibold text-foreground">{sent * MULTIPLIER}</span>. Your partner sent back{" "}
              <span className="font-semibold text-foreground">{returned}</span>.
            </p>
            <p className="text-[14px] font-semibold text-foreground">
              This round&apos;s take: {ENDOWMENT - sent + returned} pts
            </p>
            <Button onClick={() => setStage("rating")}>Continue</Button>
          </div>
        )}

        {stage === "rating" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-[13.5px] text-muted-foreground">How fair was your partner in this exchange?</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {Array.from({ length: 11 }, (_, i) => i).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => rateFairness(rating)}
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface-inset text-[13px] font-medium text-foreground transition-colors hover:bg-surface-hover cursor-pointer"
                >
                  {rating}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">0 = very unfair, 10 = very fair</p>
          </div>
        )}
      </div>
    </GameShell>
  );
}
