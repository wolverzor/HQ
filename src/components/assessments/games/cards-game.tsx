"use client";

import { useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { cn } from "@/lib/utils";
import { rand } from "@/lib/assessments/rng";

const meta = getGameMeta("cards")!;
const TOTAL_DRAWS = 40;

// Classic Iowa Gambling Task profile: A/B are "bad" decks (big reward, bigger occasional loss,
// net negative over time); C/D are "good" decks (smaller reward, smaller occasional loss, net positive).
const DECKS = {
  A: { reward: 100, lossChance: 0.5, lossRange: [150, 350] as const },
  B: { reward: 100, lossChance: 0.1, lossRange: [1000, 1250] as const },
  C: { reward: 50, lossChance: 0.5, lossRange: [25, 75] as const },
  D: { reward: 50, lossChance: 0.1, lossRange: [200, 300] as const },
};

type DeckKey = keyof typeof DECKS;

function drawFrom(deck: DeckKey) {
  const d = DECKS[deck];
  const loses = rand() < d.lossChance;
  const loss = loses ? Math.round(d.lossRange[0] + rand() * (d.lossRange[1] - d.lossRange[0])) : 0;
  return d.reward - loss;
}

export function CardsGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [draws, setDraws] = useState(0);
  const [balance, setBalance] = useState(2000);
  const [lastOutcome, setLastOutcome] = useState<{ deck: DeckKey; amount: number } | null>(null);
  const [deckCounts, setDeckCounts] = useState<Record<DeckKey, number>>({ A: 0, B: 0, C: 0, D: 0 });

  function start() {
    setDraws(0);
    setBalance(2000);
    setLastOutcome(null);
    setDeckCounts({ A: 0, B: 0, C: 0, D: 0 });
    setPhase("playing");
  }

  function draw(deck: DeckKey) {
    const amount = drawFrom(deck);
    const newBalance = balance + amount;
    setBalance(newBalance);
    setLastOutcome({ deck, amount });
    setDeckCounts((prev) => ({ ...prev, [deck]: prev[deck] + 1 }));
    const nextDraws = draws + 1;
    setDraws(nextDraws);

    if (nextDraws >= TOTAL_DRAWS) {
      finish(newBalance, { ...deckCounts, [deck]: deckCounts[deck] + 1 });
    }
  }

  function finish(finalBalance: number, counts: Record<DeckKey, number>) {
    const goodPicks = counts.C + counts.D;
    const badPicks = counts.A + counts.B;
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `Ended with ${finalBalance} pts`,
      detail: {
        "Final balance": finalBalance,
        "Good deck picks (C+D)": goodPicks,
        "Risky deck picks (A+B)": badPicks,
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
          Draw cards from any of the four decks. Each draw pays out a reward, but some cards also carry a loss. The
          decks have different hidden risk profiles - the goal is to end with as much as possible after{" "}
          {TOTAL_DRAWS} draws.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground">
          <span>
            Draw {Math.min(draws, TOTAL_DRAWS)} / {TOTAL_DRAWS}
          </span>
          <span>Balance: {balance} pts</span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(DECKS) as DeckKey[]).map((deck) => (
            <button
              key={deck}
              type="button"
              onClick={() => draw(deck)}
              disabled={draws >= TOTAL_DRAWS}
              className="flex h-24 w-16 flex-col items-center justify-center rounded-xl border border-border bg-surface-inset text-[18px] font-bold text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >
              {deck}
              <span className="mt-1 text-[10px] font-normal text-muted-foreground">{deckCounts[deck]}x</span>
            </button>
          ))}
        </div>

        {lastOutcome && (
          <p
            className={cn(
              "text-[13.5px] font-medium",
              lastOutcome.amount >= 0 ? "text-success" : "text-danger",
            )}
          >
            Deck {lastOutcome.deck}: {lastOutcome.amount >= 0 ? "+" : ""}
            {lastOutcome.amount} pts
          </p>
        )}
      </div>
    </GameShell>
  );
}
