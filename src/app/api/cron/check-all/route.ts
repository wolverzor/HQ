import { NextRequest, NextResponse } from "next/server";
import { runAllEnabledChecks } from "@/lib/discovery";

export const maxDuration = 60;

// Hit by Vercel Cron once an hour (see vercel.json) to check every enabled
// watchlist company. Vercel automatically sends `Authorization: Bearer
// <CRON_SECRET>` when a CRON_SECRET env var is configured on the project —
// see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs.
// Without a CRON_SECRET set (e.g. local dev) the check runs unauthenticated,
// which is fine for local testing but should always be set in production.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results = await runAllEnabledChecks();
  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    companiesChecked: results.length,
    totalMatches,
    results,
  });
}
