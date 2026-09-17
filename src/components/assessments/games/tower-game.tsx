"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { cn } from "@/lib/utils";
import { now } from "@/lib/assessments/rng";

const meta = getGameMeta("tower")!;
const DISCS = 4;
const MIN_MOVES = 2 ** DISCS - 1;

type Pegs = number[][];

function initialPegs(): Pegs {
  return [Array.from({ length: DISCS }, (_, i) => DISCS - i), [], []];
}

export function TowerGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [pegs, setPegs] = useState<Pegs>(initialPegs());
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== "playing") return;
    intervalRef.current = setInterval(() => {
      setElapsed(Math.round((now() - startedAt.current) / 1000));
    }, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  function start() {
    setPegs(initialPegs());
    setSelected(null);
    setMoves(0);
    setElapsed(0);
    startedAt.current = now();
    setPhase("playing");
  }

  function clickPeg(pegIndex: number) {
    if (selected === null) {
      if (pegs[pegIndex].length > 0) setSelected(pegIndex);
      return;
    }
    if (selected === pegIndex) {
      setSelected(null);
      return;
    }

    const from = pegs[selected];
    const to = pegs[pegIndex];
    const movingDisc = from[from.length - 1];
    const targetTop = to[to.length - 1];

    if (targetTop !== undefined && targetTop < movingDisc) {
      setSelected(pegIndex);
      return;
    }

    const nextPegs = pegs.map((p) => [...p]);
    nextPegs[selected].pop();
    nextPegs[pegIndex].push(movingDisc);
    setPegs(nextPegs);
    setSelected(null);
    setMoves((m) => m + 1);

    if (nextPegs[2].length === DISCS) {
      finish(moves + 1);
    }
  }

  function finish(finalMoves: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const secs = Math.round((now() - startedAt.current) / 1000);
    const efficiency = Math.round((MIN_MOVES / finalMoves) * 100);
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `Solved in ${finalMoves} moves, ${secs}s`,
      detail: {
        Moves: finalMoves,
        "Minimum possible": MIN_MOVES,
        Efficiency: `${Math.min(100, efficiency)}%`,
        Time: `${secs}s`,
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

  const discColor = (n: number) =>
    ["bg-primary", "bg-warning", "bg-success", "bg-danger", "bg-foreground"][n % 5];

  return (
    <GameShell
      meta={meta}
      phase={phase}
      result={result}
      onStart={start}
      onReplay={replay}
      instructions={
        <p className="text-[13px] text-muted-foreground">
          Move all {DISCS} discs from the left peg to the right peg. Click a peg to pick up its top disc, then
          click another peg to drop it there. You can never place a larger disc on a smaller one.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground">
          <span>Moves: {moves}</span>
          <span>Time: {elapsed}s</span>
        </div>

        <div className="flex w-full items-end justify-around gap-4 rounded-xl bg-surface-inset px-4 pb-3 pt-8">
          {pegs.map((peg, pegIndex) => (
            <button
              key={pegIndex}
              type="button"
              onClick={() => clickPeg(pegIndex)}
              className="flex h-40 w-24 flex-col-reverse items-center gap-1 rounded-md border-b-2 border-border pb-1 cursor-pointer"
            >
              {peg.map((disc, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-5 rounded-full transition-all",
                    discColor(disc),
                    selected === pegIndex && i === peg.length - 1 && "ring-2 ring-offset-1 ring-primary",
                  )}
                  style={{ width: `${28 + disc * 14}px` }}
                />
              ))}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
