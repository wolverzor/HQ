/**
 * Shared authorisation for FOE's scheduled endpoints.
 *
 * Mirrors the existing /api/cron/check-all convention: a bearer secret is
 * mandatory in production, and absent locally so the sweep can be triggered by
 * hand during development.
 */

import { NextRequest, NextResponse } from "next/server";

export function checkCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 401 });
  }

  return null;
}
