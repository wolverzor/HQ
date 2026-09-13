import {
  isToday as _isToday,
  isTomorrow,
  isPast,
  isWithinInterval,
  addDays,
  startOfDay,
  endOfDay,
  format,
  formatDistanceToNowStrict,
} from "date-fns";

export function isToday(date: Date) {
  return _isToday(date);
}

export function isOverdue(date: Date) {
  return isPast(date) && !_isToday(date);
}

export function isUpcoming(date: Date, days = 7) {
  const now = new Date();
  return isWithinInterval(date, { start: startOfDay(now), end: endOfDay(addDays(now, days)) });
}

export function formatDeadline(date: Date) {
  if (_isToday(date)) return `Today ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Tomorrow ${format(date, "HH:mm")}`;
  return format(date, "d MMM, HH:mm");
}

export function formatDeadlineShort(date: Date) {
  if (_isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "d MMM");
}

export function formatRelativeCountdown(date: Date) {
  if (isPast(date)) return `${formatDistanceToNowStrict(date)} ago`;
  return `in ${formatDistanceToNowStrict(date)}`;
}

export function formatTimeRange(start: Date, end: Date) {
  return `${format(start, "HH:mm")}–${format(end, "HH:mm")}`;
}
