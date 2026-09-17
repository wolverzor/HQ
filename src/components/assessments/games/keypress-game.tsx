"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameShell, type GamePhase } from "@/components/assessments/game-shell";
import { getGameMeta } from "@/lib/assessments/catalog";
import type { GameResult } from "@/hooks/use-game-progress";
import { now } from "@/lib/assessments/rng";

const DURATION_MS = 40_000;
const meta = getGameMeta("keypress")!;

export function KeypressGame({ onComplete }: { onComplete: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [result, setResult] = useState<GameResult | null>(null);
  const [taps, setTaps] = useState(0);
  const [msLeft, setMsLeft] = useState(DURATION_MS);

  const startedAt = useRef<number | null>(null);
  const tapTimes = useRef<number[]>([]);
  const rafId = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    const times = tapTimes.current;
    const totalTaps = times.length;
    const intervals = times.slice(1).map((t, i) => t - times[i]);
    const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    const rate = totalTaps / (DURATION_MS / 1000);

    const r: GameResult = {
      completedAt: new Date().toISOString(),
      summary: `${totalTaps} taps · ${rate.toFixed(1)} / sec`,
      detail: {
        "Total taps": totalTaps,
        "Taps / second": rate.toFixed(2),
        "Avg interval": intervals.length ? `${avgInterval.toFixed(0)} ms` : "-",
      },
    };
    setResult(r);
    setPhase("done");
    onComplete(r);
  }, [onComplete]);

  useEffect(() => {
    if (phase !== "playing") return;
    startedAt.current = now();

    function tick() {
      const elapsed = now() - (startedAt.current ?? 0);
      const left = Math.max(0, DURATION_MS - elapsed);
      setMsLeft(left);
      if (left <= 0) {
        finish();
        return;
      }
      rafId.current = requestAnimationFrame(tick);
    }
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [phase, finish]);

  useEffect(() => {
    if (phase !== "playing") return;
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        registerTap();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  function registerTap() {
    tapTimes.current.push(now());
    setTaps((t) => t + 1);
  }

  function start() {
    tapTimes.current = [];
    setTaps(0);
    setMsLeft(DURATION_MS);
    setPhase("playing");
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
          Press <kbd className="rounded border border-border bg-surface-inset px-1.5 py-0.5 font-mono text-[12px]">Space</kbd> or
          tap the button below as many times as you can in 40 seconds.
        </p>
      }
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="text-[13px] font-medium text-muted-foreground tabular-nums">
          {(msLeft / 1000).toFixed(1)}s left
        </div>
        <div className="text-[48px] font-bold tabular-nums text-foreground">{taps}</div>
        <button
          type="button"
          onClick={registerTap}
          className="flex size-40 select-none items-center justify-center rounded-full bg-primary text-[18px] font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95 cursor-pointer"
        >
          TAP
        </button>
      </div>
    </GameShell>
  );
}
