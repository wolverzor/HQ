import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/foe/cron-auth";
import { checkScheduleHealth, runFullSweep } from "@/lib/foe/engine/sweep";

// Vercel allows up to 300s on this plan; the sweep's own budget is lower so it
// finishes and records a result rather than being killed mid-run.
export const maxDuration = 300;

/**
 * The hourly full-universe sweep.
 *
 * Returns 409 rather than starting a second run when one is already in flight —
 * that is the overlap guard working, not an error worth retrying.
 */
export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  await checkScheduleHealth();

  const summary = await runFullSweep({ budgetMs: 4 * 60_000 });

  return NextResponse.json(summary, { status: summary.skipped ? 409 : 200 });
}
