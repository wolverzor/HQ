"use client";

import { useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { cn } from "@/lib/utils";
import { now, rand } from "@/lib/assessments/rng";

const meta = getGameMeta("tower")!;
const DISC_COLORS = ["bg-primary", "bg-warning", "bg-success", "bg-danger", "bg-foreground", "bg-subtle-foreground"];
// A sequence of puzzles with increasing disc counts, like the real multi-round Tower game,
// rather than a single one-off arrangement - fills out the stated 5-8 minute session.
const PUZZLE_DISCS = [3, 3, 4, 4, 5, 5, 6];

type Pegs = number[][];

// Randomly scatter all discs across 3 pegs in a random stacking order - discs have no size
// constraint here (unlike classic Hanoi), any disc can sit on any other.
function randomArrangement(discCount: number): Pegs {
  const discs = Array.from({ length: discCount }, (_, i) => i);
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

function newPuzzle(discCount: number) {
  let startPegs: Pegs;
  let goalPegs: Pegs;
  do {
    startPegs = randomArrangement(discCount);
    goalPegs = randomArrangement(discCount);
  } while (arrangementsEqual(startPegs, goalPegs));
  return { startPegs, goalPegs };
}

export function TowerGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [pegs, setPegs] = useState<Pegs>([[], [], []]);
  const [target, setTarget] = useState<Pegs>([[], [], []]);
  const [selected, setSelected] = useState<number | null>(null);
  const [puzzleMoves, setPuzzleMoves] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
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

  function loadPuzzle(index: number) {
    const { startPegs, goalPegs } = newPuzzle(PUZZLE_DISCS[index]);
    setPuzzleIndex(index);
    setPegs(startPegs);
    setTarget(goalPegs);
    setSelected(null);
    setPuzzleMoves(0);
  }

  function start() {
    setTotalMoves(0);
    setElapsed(0);
    startedAt.current = now();
    loadPuzzle(0);
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

    const finalPuzzleMoves = puzzleMoves + 1;
    setPuzzleMoves(finalPuzzleMoves);
    const finalTotalMoves = totalMoves + 1;
    setTotalMoves(finalTotalMoves);

    if (arrangementsEqual(nextPegs, target)) {
      const nextIndex = puzzleIndex + 1;
      if (nextIndex >= PUZZLE_DISCS.length) {
        finish(finalTotalMoves);
      } else {
        loadPuzzle(nextIndex);
      }
    }
  }

  function finish(finalTotalMoves: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const secs = Math.round((now() - startedAt.current) / 1000);
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `${PUZZLE_DISCS.length} puzzles solved in ${finalTotalMoves} moves, ${secs}s`,
      detail: {
        "Puzzles solved": PUZZLE_DISCS.length,
        "Total moves": finalTotalMoves,
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
          Rearrange the discs across the three pegs to match the target arrangement shown above the play area, in
          as few moves as possible. Only the top disc on a peg can move - click a peg to pick up its top disc, then
          click another peg to drop it there. There are {PUZZLE_DISCS.length} puzzles, each with more discs than
          the last.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground">
          <span>
            Puzzle {puzzleIndex + 1} / {PUZZLE_DISCS.length} · Moves: {puzzleMoves}
          </span>
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
