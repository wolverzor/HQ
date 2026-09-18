import { NextResponse } from "next/server";
import { getUserId, unauthorized } from "@/lib/session";
import { listOpeningSoon } from "@/lib/foe/server";

// Confirmed (ANNOUNCED) and predicted (EXPECTED) future openings. Both are
// returned together but always tagged with `kind` — the UI is required to
// render them differently.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  return NextResponse.json(await listOpeningSoon(userId));
}
