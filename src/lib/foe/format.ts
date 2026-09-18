/**
 * Display formatting for FOE.
 *
 * Kept separate from the labels so the wording of "34 mins ago" / "In 5 days"
 * is defined once. Recency is load-bearing in this product — how long ago
 * something opened, and how long ago FOE last checked it, are two of the ten
 * questions the dashboard has to answer at a glance.
 */

/** "34 mins ago", "2 hrs ago", "1 day ago". */
export function relativeTime(input: string | Date | null | undefined, now: Date = new Date()): string | null {
  if (!input) return null;
  const then = typeof input === "string" ? new Date(input) : input;
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return "just now";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.floor(months / 12)} yr ago`;
}

/** "In 5 days", "Tomorrow", "Today", "2 days ago". */
export function countdown(input: string | Date | null | undefined, now: Date = new Date()): string | null {
  if (!input) return null;
  const then = typeof input === "string" ? new Date(input) : input;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(then) - startOfDay(now)) / 864e5);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/** "23 Sept" — short, unambiguous, no year when it is the current one. */
export function shortDate(input: string | Date | null | undefined, now: Date = new Date()): string | null {
  if (!input) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "23 September 2027" for the detail drawer, where there is room to be exact. */
export function longDate(input: string | Date | null | undefined): string | null {
  if (!input) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Days until a date, or null. Negative when it has passed. */
export function daysUntil(input: string | Date | null | undefined, now: Date = new Date()): number | null {
  if (!input) return null;
  const d = typeof input === "string" ? new Date(input) : input;
  return Math.ceil((d.getTime() - now.getTime()) / 864e5);
}

/**
 * Initials for a firm mark. FOE renders a monogram rather than a scraped
 * employer logo: it keeps the dashboard visually consistent and avoids
 * displaying someone else's trademark as if it were our asset.
 */
export function firmInitials(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 &.]/g, "")
    .split(/[\s.&]+/)
    .filter((w) => w.length > 0 && !["the", "and", "of", "group", "co"].includes(w.toLowerCase()));

  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * A stable, muted colour per firm so the same employer always looks the same.
 * Hues are spaced around the wheel and kept desaturated — this is a finance
 * operating system, not a crypto dashboard.
 */
export function firmColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 32% 42%)`;
}
