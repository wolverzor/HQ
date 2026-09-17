"use client";

import { useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const meta = getGameMeta("money-exchange-2")!;
const BASE = 5;

// Real mechanic: round 1 you hold an extra $5 and decide how much of it to send; round 2 both
// start even and you choose to give to, or take from, your partner. Each round ends with a
// self-reported 0-10 fairness rating, not a right/wrong outcome.
type Stage = "round1-choose" | "round1-rate" | "round2-mode" | "round2-choose" | "round2-rate";

export function MoneyExchange2Game({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [stage, setStage] = useState<Stage>("round1-choose");

  const [round1Sent, setRound1Sent] = useState(0);
  const [round1Fairness, setRound1Fairness] = useState<number | null>(null);

  const [round2Mode, setRound2Mode] = useState<"give" | "take" | null>(null);
  const [round2Amount, setRound2Amount] = useState(0);

  function start() {
    setRound1Sent(0);
    setRound1Fairness(null);
    setRound2Mode(null);
    setRound2Amount(0);
    setStage("round1-choose");
    setPhase("playing");
  }

  function chooseRound1(amount: number) {
    setRound1Sent(amount);
    setStage("round1-rate");
  }

  function rateRound1(rating: number) {
    setRound1Fairness(rating);
    setStage("round2-mode");
  }

  function chooseRound2Mode(mode: "give" | "take") {
    setRound2Mode(mode);
    setRound2Amount(0);
    setStage("round2-choose");
  }

  function chooseRound2Amount(amount: number) {
    setRound2Amount(amount);
    setStage("round2-rate");
  }

  function rateRound2(rating: number) {
    finish(rating);
  }

  function finish(finalRound2Fairness: number) {
    const yourRound1Total = BASE + (BASE - round1Sent);
    const yourRound2Total = round2Mode === "take" ? BASE + round2Amount : BASE - round2Amount;
    const yourTotal = yourRound1Total + yourRound2Total;

    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `Sent ${round1Sent} in round 1 · ${round2Mode === "take" ? `took ${round2Amount}` : `gave ${round2Amount}`} in round 2`,
      detail: {
        "Round 1 sent": `$${round1Sent}`,
        "Round 1 fairness rating": round1Fairness ?? "-",
        "Round 2 action": round2Mode === "take" ? `Took $${round2Amount}` : `Gave $${round2Amount}`,
        "Round 2 fairness rating": finalRound2Fairness,
        "Your total": `$${yourTotal}`,
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
          Two rounds with a partner. In round 1 you hold an extra ${BASE} and decide how much of it to send them.
          In round 2 you both start even, and you choose to either give to or take from your partner. After each
          round, you rate how fair the outcome felt.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-5 py-4">
        {stage === "round1-choose" && (
          <>
            <p className="text-[13.5px] text-center text-muted-foreground">
              You have ${BASE} base plus an extra ${BASE}. Your partner has ${BASE}. How much of your extra ${BASE}{" "}
              do you send them?
            </p>
            <div className="flex gap-2">
              {Array.from({ length: BASE + 1 }, (_, i) => i).map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => chooseRound1(amount)}
                  className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-inset text-[14px] font-semibold text-foreground transition-colors hover:bg-surface-hover cursor-pointer"
                >
                  {amount}
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "round1-rate" && (
          <FairnessRating
            prompt={`You kept $${BASE - round1Sent} of your extra $${BASE} and sent $${round1Sent}. How fair does that feel?`}
            onRate={rateRound1}
          />
        )}

        {stage === "round2-mode" && (
          <>
            <p className="text-[13.5px] text-center text-muted-foreground">
              Round 2: you and your partner both have ${BASE}. Would you like to give to them, or take from them?
            </p>
            <div className="flex gap-3">
              <Button size="lg" variant="secondary" onClick={() => chooseRound2Mode("give")}>
                Give
              </Button>
              <Button size="lg" variant="secondary" onClick={() => chooseRound2Mode("take")}>
                Take
              </Button>
            </div>
          </>
        )}

        {stage === "round2-choose" && round2Mode && (
          <>
            <p className="text-[13.5px] text-center text-muted-foreground">
              How much would you like to {round2Mode}?
            </p>
            <div className="flex gap-2">
              {Array.from({ length: BASE + 1 }, (_, i) => i).map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => chooseRound2Amount(amount)}
                  className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-inset text-[14px] font-semibold text-foreground transition-colors hover:bg-surface-hover cursor-pointer"
                >
                  {amount}
                </button>
              ))}
            </div>
          </>
        )}

        {stage === "round2-rate" && (
          <FairnessRating
            prompt={
              round2Mode === "take"
                ? `You took $${round2Amount} from your partner. How fair does that feel?`
                : `You gave $${round2Amount} to your partner. How fair does that feel?`
            }
            onRate={rateRound2}
          />
        )}
      </div>
    </GameShell>
  );
}

function FairnessRating({ prompt, onRate }: { prompt: string; onRate: (rating: number) => void }) {
  return (
    <>
      <p className="text-[13.5px] text-center text-muted-foreground">{prompt}</p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: 11 }, (_, i) => i).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onRate(rating)}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border border-border bg-surface-inset text-[13px] font-medium text-foreground transition-colors hover:bg-surface-hover cursor-pointer",
            )}
          >
            {rating}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">0 = very unfair, 10 = very fair</p>
    </>
  );
}
