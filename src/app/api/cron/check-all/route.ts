import { NextRequest, NextResponse } from "next/server";
import { runAllEnabledChecks } from "@/lib/discovery";

export const maxDuration = 300;

// Scheduled discovery for every account's enabled watchlist companies.
// Called hourly by .github/workflows/hourly-discovery.yml (and daily by
// Vercel Cron as a backstop — see vercel.json). Both send
// `Authorization: Bearer <CRON_SECRET>`. In production the secret is
// mandatory; locally, with no CRON_SECRET set, it runs unauthenticated.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 401 });
  }

  const results = await runAllEnabledChecks();
  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    companiesChecked: results.length,
    totalMatches,
  });
}
