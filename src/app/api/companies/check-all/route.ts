import { NextResponse } from "next/server";
import { runAllEnabledChecks } from "@/lib/discovery";

// Manual "check everything now" — the same underlying check the hourly
// Vercel Cron job runs (see /api/cron/check-all), triggered from the UI so
// you can test discovery locally before it's deployed and scheduled.
export async function POST() {
  const results = await runAllEnabledChecks();
  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);
  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    companiesChecked: results.length,
    totalMatches,
    results,
  });
}
