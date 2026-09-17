"use client";

import { useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { rand } from "@/lib/assessments/rng";

const meta = getGameMeta("balloon")!;
const TOTAL_BALLOONS = 12;
const PUMP_COOLDOWN_MS = 150;

// Each color carries a different hidden risk/reward profile - the color itself never says
// which is which, so learning the pattern across balloons is part of the task, same as
// multi-cue variants of the classic BART.
const COLORS = [
  { key: "yellow", label: "Yellow", maxBreakpoint: 96, pointsPerPump: 3, bg: "bg-warning" },
  { key: "orange", label: "Orange", maxBreakpoint: 48, pointsPerPump: 5, bg: "bg-primary" },
  { key: "red", label: "Red", maxBreakpoint: 20, pointsPerPump: 10, bg: "bg-danger" },
] as const;

type ColorKey = (typeof COLORS)[number]["key"];

function drawBalloon() {
  const color = COLORS[Math.floor(rand() * COLORS.length)];
  const breakpoint = 1 + Math.floor(rand() * color.maxBreakpoint);
  return { color, breakpoint };
}

type Stage = "pumping" | "popped" | "collected";

export function BalloonGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [balloonIndex, setBalloonIndex] = useState(0);
  const [pumps, setPumps] = useState(0);
  const [balloon, setBalloon] = useState(drawBalloon());
  const [stage, setStage] = useState<Stage>("pumping");
  const [cooldown, setCooldown] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [pumpsByColor, setPumpsByColor] = useState<Record<ColorKey, number[]>>({
    yellow: [],
    orange: [],
    red: [],
  });

  function start() {
    setBalloonIndex(0);
    setPumps(0);
    setBalloon(drawBalloon());
    setStage("pumping");
    setCooldown(false);
    setTotalScore(0);
    setPumpsByColor({ yellow: [], orange: [], red: [] });
    setPhase("playing");
  }

  function pump() {
    if (cooldown) return;
    setCooldown(true);
    setTimeout(() => setCooldown(false), PUMP_COOLDOWN_MS);

    if (pumps >= balloon.breakpoint) {
      setStage("popped");
      setPumpsByColor((prev) => ({ ...prev, [balloon.color.key]: [...prev[balloon.color.key], pumps] }));
      return;
    }
    setPumps((p) => p + 1);
  }

  function collect() {
    setTotalScore((s) => s + pumps * balloon.color.pointsPerPump);
    setPumpsByColor((prev) => ({ ...prev, [balloon.color.key]: [...prev[balloon.color.key], pumps] }));
    setStage("collected");
  }

  function nextBalloon() {
    const nextIndex = balloonIndex + 1;
    if (nextIndex >= TOTAL_BALLOONS) {
      finish();
      return;
    }
    setBalloonIndex(nextIndex);
    setPumps(0);
    setBalloon(drawBalloon());
    setStage("pumping");
  }

  function finish() {
    const avgFor = (key: ColorKey) => {
      const arr = pumpsByColor[key];
      return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "-";
    };
    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `${totalScore} points earned`,
      detail: {
        "Total points": totalScore,
        "Avg pumps (yellow)": avgFor("yellow"),
        "Avg pumps (orange)": avgFor("orange"),
        "Avg pumps (red)": avgFor("red"),
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

  const size = 96 + pumps * 4;

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
          everything on that balloon. Collect whenever you want to bank the points before that happens. Balloons
          come in three colors with different risk/reward patterns - the color doesn&apos;t tell you which is
          which up front, but pay attention as you go. {TOTAL_BALLOONS} balloons total.
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
              className={cn("rounded-full transition-all duration-150", balloon.color.bg)}
              style={{ width: size, height: size }}
            />
          )}
        </div>

        <div className="text-[14px] font-medium text-foreground">
          {balloon.color.label} balloon: {pumps * balloon.color.pointsPerPump} pts ({pumps} pumps)
        </div>

        {stage === "pumping" && (
          <div className="flex gap-2">
            <Button size="lg" onClick={pump} disabled={cooldown}>
              Pump
            </Button>
            <Button size="lg" variant="secondary" onClick={collect} disabled={pumps === 0}>
              Collect
            </Button>
          </div>
        )}

        {stage === "popped" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13.5px] font-medium text-danger">Popped! Lost this balloon&apos;s points.</p>
            <Button onClick={nextBalloon}>Next balloon</Button>
          </div>
        )}

        {stage === "collected" && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[13.5px] font-medium text-success">
              Collected {pumps * balloon.color.pointsPerPump} points.
            </p>
            <Button onClick={nextBalloon}>Next balloon</Button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
