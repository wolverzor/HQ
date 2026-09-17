"use client";

import type { GameId } from "./catalog";

const STORAGE_KEY = "hq.assessments.results";

export interface GameResult {
  completedAt: string;
  summary: string;
  detail?: Record<string, number | string>;
}

type ResultsMap = Partial<Record<GameId, GameResult>>;

let cache: ResultsMap | null = null;
const listeners = new Set<() => void>();
const EMPTY_RESULTS: ResultsMap = {};

function readFromStorage(): ResultsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ResultsMap) : {};
  } catch {
    return {};
  }
}

function getSnapshot(): ResultsMap {
  if (cache === null) cache = readFromStorage();
  return cache;
}

function getServerSnapshot(): ResultsMap {
  return EMPTY_RESULTS;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function recordResult(id: GameId, result: GameResult) {
  cache = { ...getSnapshot(), [id]: result };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage unavailable (private mode, quota) - in-memory cache still updates
  }
  listeners.forEach((listener) => listener());
}

export const resultsStore = { getSnapshot, getServerSnapshot, subscribe, recordResult };
