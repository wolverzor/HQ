"use client";

import { useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { Button } from "@/components/ui/button";
import { rand } from "@/lib/assessments/rng";

const meta = getGameMeta("balloon")!;
const TOTAL_BALLOONS = 6;
const POINTS_PER_PUMP = 5;
// Pop probability rises with each pump - roughly a 1-in-(128-pumps) chance per pump, capped.
function popChance(pumps: number) {
  return Math.min(0.9, pumps / 24);
}

type Stage = "pumping" | "popped" | "cashed";

export function BalloonGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [balloonIndex, setBalloonIndex] = useState(0);
  const [pumps, setPumps] = useState(0);
  const [stage, setStage] = useState<Stage>("pumping");
  const [totalScore, setTotalScore] = useState(0);
  const [pumpHistory, setPumpHistory] = useState<number[]>([]);

  function start() {
    setBalloonIndex(0);
    setPumps(0);
    setStage("pumping");
    setTotalScore(0);
    setPumpHistory([]);
    setPhase("playing");
  }

  function pump() {
    if (rand() < popChance(pumps)) {
      setStage("popped");
      setPumpHistory((h) => [...h, pumps]);
      return;
    }
    setPumps((p) => p + 1);
  }

  function cashOut() {
    setTotalScore((s) => s + pumps * POINTS_PER_PUMP);
    setPumpHistory((h) => [...h, pumps]);
    setStage("cashed");
  }

  function nextBalloon() {
    const nextIndex = balloonIndex + 1;
    if (nextIndex >= TOTAL_BALLOONS) {
      finish();
      return;
    }
    setBalloonIndex(nextIndex);
    setPumps(0);
    setStage("pumping");
  }

  function finish() {
    const avgPumps = pumpHistory.length
      ? pumpHistory.reduce((a, b) => a + b, 0) / pumpHistory.length
      : 0;
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `${totalScore} points earned`,
      detail: {
        "Total points": totalScore,
        "Avg pumps / balloon": avgPumps.toFixed(1),
        Balloons: TOTAL_BALLOONS,
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

  const size = 96 + pumps * 6;

  return (
    <GameShell
      meta={meta}
      phase={phase}
      result={result}
      onStart={start}
      onReplay={replay}
      instructions={
        <p className="text-[13px] text-muted-foreground">
          Each pump adds points to the current balloon, but the balloon can pop at any time - and popping loses
          everything on that balloon. Cash out whenever you want to bank the points. {TOTAL_BALLOONS} balloons
          total.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground">
          <span>
            Balloon {balloonIndex + 1} / {TOTAL_BALLOONS}
          </span>
          <span>Banked: {totalScore} pts</span>
        </div>

        <div className="flex h-56 items-center justify-center">
          {stage === "popped" ? (
            <div className="text-[56px]">💥</div>
          ) : (
            <div
              className="rounded-full bg-danger transition-all duration-150"
              style={{ width: size, height: size }}
            />
          )}
        </div>

        <div className="text-[14px] font-medium text-foreground">
          Current balloon: {pumps * POINTS_PER_PUMP} pts ({pumps} pumps)
        </div>

        {stage === "pumping" && (
          <div className="flex gap-2">
            <Button size="lg" onClick={pump}>
              Pump
            </Button>
            <Button size="lg" variant="secondary" onClick={cashOut} disabled={pumps === 0}>
              Cash out
            </Button>
          </div>
        )}

        {stage === "popped" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13.5px] font-medium text-danger">Popped! Lost this balloon&apos;s points.</p>
            <Button onClick={nextBalloon}>Next balloon</Button>
          </div>
        )}

        {stage === "cashed" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13.5px] font-medium text-success">Cashed out {pumps * POINTS_PER_PUMP} points.</p>
            <Button onClick={nextBalloon}>Next balloon</Button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
