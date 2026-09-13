export const PX_PER_MIN = 1.1;
export const HOUR_HEIGHT = PX_PER_MIN * 60;
export const DAY_MINUTES = 24 * 60;
export const GRID_HEIGHT = PX_PER_MIN * DAY_MINUTES;
export const SNAP_MIN = 15;
export const DEFAULT_SCROLL_HOUR = 7;
export const MIN_BLOCK_MINUTES = 15;

export function snapMinutes(minutes: number, snap = SNAP_MIN) {
  return Math.round(minutes / snap) * snap;
}

export function clampMinutes(minutes: number) {
  return Math.max(0, Math.min(DAY_MINUTES, minutes));
}

export const BLOCK_COLORS = [
  "#4f46e5",
  "#0284c7",
  "#16a34a",
  "#d97706",
  "#e11d48",
  "#9333ea",
  "#0d9488",
];
