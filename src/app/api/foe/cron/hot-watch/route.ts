import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/foe/cron-auth";
import { runHotWatch } from "@/lib/foe/engine/sweep";

export const maxDuration = 300;

/**
 * The 10-minute hot watch: only sources belonging to a programme that is about
 * to open, or that should already have opened. This is what turns "Rothschild
 * opens on the 23rd" into an alert minutes after it actually opens, instead of
 * up to an hour later.
 */
export async function GET(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const summary = await runHotWatch({ budgetMs: 4 * 60_000, concurrency: 6 });

  return NextResponse.json(summary, { status: summary.skipped ? 409 : 200 });
}
