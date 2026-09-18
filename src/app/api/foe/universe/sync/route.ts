import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCronAuth } from "@/lib/foe/cron-auth";
import { syncFirmUniverse } from "@/lib/foe/firm-universe";

export const maxDuration = 120;

/**
 * Brings the global firm universe in line with the curated roster. Idempotent,
 * so it is safe to call on deploy and after any edit to
 * src/lib/foe/firm-universe.ts.
 */
export async function POST(req: NextRequest) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  return NextResponse.json(await syncFirmUniverse(prisma));
}
