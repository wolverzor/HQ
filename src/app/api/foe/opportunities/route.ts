import { NextResponse } from "next/server";
import { getUserId, unauthorized } from "@/lib/session";
import { listOpportunities } from "@/lib/foe/server";

// The FOE dashboard feed: every visible canonical opportunity plus this user's
// eligibility, priority reasons, watch state and application progress.
// Filtering is left to the client so the summary counts and the "hidden by
// filters" notice can stay truthful about what exists.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const data = await listOpportunities(userId);
  return NextResponse.json(data);
}
