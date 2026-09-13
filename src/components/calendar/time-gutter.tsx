import { PX_PER_MIN, DAY_MINUTES, GRID_HEIGHT } from "@/lib/calendar-constants";

function formatHour(hour: number) {
  if (hour === 0) return "";
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

export function TimeGutter() {
  return (
    <div className="relative w-14 shrink-0 md:w-16" style={{ height: GRID_HEIGHT }}>
      {Array.from({ length: DAY_MINUTES / 60 }).map((_, hour) => (
        <div
          key={hour}
          className="absolute right-2 -translate-y-1/2 text-[11px] text-subtle-foreground"
          style={{ top: hour * 60 * PX_PER_MIN }}
        >
          {formatHour(hour)}
        </div>
      ))}
    </div>
  );
}
