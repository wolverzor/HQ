/**
 * Application progress rules.
 *
 * FOE feeds the existing HQ task/calendar system rather than duplicating it:
 * marking an application creates an Application row AND an HQ Task (category
 * Finance / Career, deadline carried over), exactly as the legacy tracker's
 * "Start Application" already does.
 */

import type { ApplicationStage } from "@prisma/client";
import { STAGE_ORDER } from "./labels";

/** Stages from which the process has ended. */
const TERMINAL: ReadonlySet<ApplicationStage> = new Set<ApplicationStage>(["OFFER", "REJECTED", "WITHDRAWN"]);

export function isTerminalStage(stage: ApplicationStage): boolean {
  return TERMINAL.has(stage);
}

/**
 * Stages a user can move to next.
 *
 * Deliberately permissive forwards — real processes skip steps (plenty of firms
 * have no HireVue) — but a terminal stage only reopens via an explicit move
 * back, so a rejection cannot silently become "Interview" again.
 */
export function nextStages(current: ApplicationStage): ApplicationStage[] {
  if (isTerminalStage(current)) return [];
  const idx = STAGE_ORDER.indexOf(current);
  const forward = idx >= 0 ? STAGE_ORDER.slice(idx + 1) : [...STAGE_ORDER];
  return [...forward, "REJECTED", "WITHDRAWN"];
}

export function canMoveTo(from: ApplicationStage, to: ApplicationStage): boolean {
  if (from === to) return true;
  return nextStages(from).includes(to);
}

/** Progress through the happy path, for the pipeline bar. 0-1. */
export function stageProgress(stage: ApplicationStage): number {
  if (stage === "REJECTED" || stage === "WITHDRAWN") return 0;
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0) return 0;
  return (idx + 1) / STAGE_ORDER.length;
}

/** The HQ task title created alongside an application. */
export function taskTitleFor(firmName: string, programmeName: string): string {
  return `Apply: ${firmName} — ${programmeName}`;
}
