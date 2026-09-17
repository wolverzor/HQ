"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { GameId } from "@/lib/assessments/catalog";
import { resultsStore, type GameResult } from "@/lib/assessments/results-store";

export type { GameResult };

export function useGameProgress() {
  const results = useSyncExternalStore(
    resultsStore.subscribe,
    resultsStore.getSnapshot,
    resultsStore.getServerSnapshot,
  );

  const recordResult = useCallback((id: GameId, result: GameResult) => {
    resultsStore.recordResult(id, result);
  }, []);

  return { results, recordResult };
}
