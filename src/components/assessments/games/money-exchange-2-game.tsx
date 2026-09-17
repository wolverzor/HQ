"use client";

import { useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { Button } from "@/components/ui/button";
import { rand } from "@/lib/assessments/rng";

const meta = getGameMeta("money-exchange-2")!;
const ROUNDS = 6;
const POT = 10;

type Stage = "offer" | "revealed";

function randomOffer() {
  return Math.floor(rand() * (POT + 1));
}

export function MoneyExchange2Game({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [round, setRound] = useState(0);
  const [stage, setStage] = useState<Stage>("offer");
  const [offer, setOffer] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [accepts, setAccepts] = useState(0);
  const [rejects, setRejects] = useState(0);
  const [lowestAccepted, setLowestAccepted] = useState<number | null>(null);

  function start() {
    setRound(0);
    setTotalEarned(0);
    setAccepts(0);
    setRejects(0);
    setLowestAccepted(null);
    setOffer(randomOffer());
    setStage("offer");
    setPhase("playing");
  }

  function respond(accept: boolean) {
    setAccepted(accept);
    if (accept) {
      setTotalEarned((t) => t + offer);
      setAccepts((a) => a + 1);
      setLowestAccepted((prev) => (prev === null ? offer : Math.min(prev, offer)));
    } else {
      setRejects((r) => r + 1);
    }
    setStage("revealed");
  }

  function nextRound() {
    const next = round + 1;
    if (next >= ROUNDS) {
      finish();
      return;
    }
    setRound(next);
    setOffer(randomOffer());
    setStage("offer");
  }

  function finish() {
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `Earned ${totalEarned} pts · accepted ${accepts}/${ROUNDS}`,
      detail: {
        "Total earned": totalEarned,
        Accepted: accepts,
        Rejected: rejects,
        "Lowest accepted": lowestAccepted ?? "-",
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
          Another player proposes how to split {POT} points between you. If you accept, you both keep your shares.
          If you reject, neither of you gets anything. {ROUNDS} rounds total.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground">
          <span>
            Round {round + 1} / {ROUNDS}
          </span>
          <span>Earned: {totalEarned} pts</span>
        </div>

        {stage === "offer" && (
          <>
            <p className="text-[13.5px] text-muted-foreground text-center">
              They keep <span className="font-semibold text-foreground">{POT - offer}</span> and offer you:
            </p>
            <div className="text-[48px] font-bold tabular-nums text-foreground">{offer}</div>
            <div className="flex gap-2">
              <Button size="lg" onClick={() => respond(true)}>
                Accept
              </Button>
              <Button size="lg" variant="secondary" onClick={() => respond(false)}>
                Reject
              </Button>
            </div>
          </>
        )}

        {stage === "revealed" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className={`text-[14px] font-semibold ${accepted ? "text-success" : "text-danger"}`}>
              {accepted ? `You accepted and earned ${offer} points.` : "You rejected - both sides get nothing."}
            </p>
            <Button onClick={nextRound}>{round + 1 >= ROUNDS ? "See results" : "Next round"}</Button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
