"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { cn } from "@/lib/utils";
import { now, rand } from "@/lib/assessments/rng";

const meta = getGameMeta("tower")!;
const DISCS = 5;
const DISC_COLORS = ["bg-primary", "bg-warning", "bg-success", "bg-danger", "bg-foreground"];

type Pegs = number[][];

// Randomly scatter all discs across 3 pegs in a random stacking order - discs have no size
// constraint here (unlike classic Hanoi), any disc can sit on any other.
function randomArrangement(): Pegs {
  const discs = Array.from({ length: DISCS }, (_, i) => i);
  for (let i = discs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [discs[i], discs[j]] = [discs[j], discs[i]];
  }
  const pegs: Pegs = [[], [], []];
  for (const d of discs) {
    pegs[Math.floor(rand() * 3)].push(d);
  }
  return pegs;
}

function arrangementsEqual(a: Pegs, b: Pegs) {
  return a.every((peg, i) => peg.length === b[i].length && peg.every((disc, j) => disc === b[i][j]));
}

export function TowerGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [pegs, setPegs] = useState<Pegs>([[], [], []]);
  const [target, setTarget] = useState<Pegs>([[], [], []]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [firstMoveMs, setFirstMoveMs] = useState<number | null>(null);
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
    let startPegs: Pegs;
    let goalPegs: Pegs;
    do {
      startPegs = randomArrangement();
      goalPegs = randomArrangement();
    } while (arrangementsEqual(startPegs, goalPegs));
    setPegs(startPegs);
    setTarget(goalPegs);
    setSelected(null);
    setMoves(0);
    setFirstMoveMs(null);
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
    const movingDisc = from[from.length - 1];

    const nextPegs = pegs.map((p) => [...p]);
    nextPegs[selected].pop();
    nextPegs[pegIndex].push(movingDisc);
    setPegs(nextPegs);
    setSelected(null);

    if (firstMoveMs === null) setFirstMoveMs(Math.round(now() - startedAt.current));
    const finalMoves = moves + 1;
    setMoves(finalMoves);

    if (arrangementsEqual(nextPegs, target)) {
      finish(finalMoves);
    }
  }

  function finish(finalMoves: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const secs = Math.round((now() - startedAt.current) / 1000);
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `Matched target in ${finalMoves} moves, ${secs}s`,
      detail: {
        Moves: finalMoves,
        Time: `${secs}s`,
        "Time to first move": firstMoveMs !== null ? `${firstMoveMs} ms` : "-",
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

  function renderPegs(arrangement: Pegs, interactive: boolean) {
    return (
      <div className="flex w-full items-end justify-around gap-3 rounded-xl bg-surface-inset px-3 pb-3 pt-6">
        {arrangement.map((peg, pegIndex) => {
          const Tag = interactive ? "button" : "div";
          return (
            <Tag
              key={pegIndex}
              type={interactive ? "button" : undefined}
              onClick={interactive ? () => clickPeg(pegIndex) : undefined}
              className={cn(
                "flex h-28 w-16 flex-col-reverse items-center gap-1 rounded-md border-b-2 border-border pb-1",
                interactive && "cursor-pointer",
              )}
            >
              {peg.map((disc, i) => (
                <div
                  key={i}
                  className={cn(
                    "size-8 rounded-full border border-black/10",
                    DISC_COLORS[disc % DISC_COLORS.length],
                    interactive && selected === pegIndex && i === peg.length - 1 && "ring-2 ring-offset-1 ring-primary",
                  )}
                />
              ))}
            </Tag>
          );
        })}
      </div>
    );
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
          Rearrange the {DISCS} discs across the three pegs to match the target arrangement shown above the play
          area, in as few moves as possible. Only the top disc on a peg can move - click a peg to pick up its top
          disc, then click another peg to drop it there.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground">
          <span>Moves: {moves}</span>
          <span>Time: {elapsed}s</span>
        </div>

        <div className="w-full">
          <p className="mb-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Target
          </p>
          {renderPegs(target, false)}
        </div>

        <div className="w-full">
          <p className="mb-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Your pegs
          </p>
          {renderPegs(pegs, true)}
        </div>
      </div>
    </GameShell>
  );
}
