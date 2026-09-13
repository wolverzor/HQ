import { NextResponse } from "next/server";
import { runAllEnabledChecks } from "@/lib/discovery";
import { getUserId, unauthorized } from "@/lib/session";

export const maxDuration = 300;

// Manual "check everything now" for the signed-in user — the same underlying
// check the scheduled job runs for everyone (see /api/cron/check-all).
export async function POST() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const results = await runAllEnabledChecks(userId);
  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    companiesChecked: results.length,
    totalMatches,
    results,
  });
}
