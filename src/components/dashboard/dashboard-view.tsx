"use client";

import { format } from "date-fns";
import { DashboardQuickAdd } from "./dashboard-quick-add";
import { TodayScheduleCard } from "./today-schedule-card";
import { TodayTasksCard } from "./today-tasks-card";
import { UpcomingCard } from "./upcoming-card";
import { OpportunitiesCard } from "./opportunities-card";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardView() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{getGreeting()}</h1>
        <p className="mt-0.5 text-[13.5px] text-muted-foreground">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>

      <div className="mt-5">
        <DashboardQuickAdd />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TodayScheduleCard />
        <TodayTasksCard />
        <UpcomingCard />
        <OpportunitiesCard />
      </div>
    </div>
  );
}
