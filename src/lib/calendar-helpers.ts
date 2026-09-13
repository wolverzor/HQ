import { startOfWeek, addDays, startOfDay, isSameDay } from "date-fns";

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export function dateFromMinutes(day: Date, minutes: number) {
  const d = startOfDay(day);
  d.setMinutes(minutes);
  return d;
}

export { isSameDay };
