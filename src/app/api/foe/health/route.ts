import { NextResponse } from "next/server";
import { getUserId, unauthorized } from "@/lib/session";
import { getEngineHealth } from "@/lib/foe/server";

// Backs the small "Last scan 16:00 · All critical sources healthy" indicator
// and its detail popover. Health is global (the engine is global), but still
// requires a session — it exposes the shape of the monitoring estate.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  return NextResponse.json(await getEngineHealth());
}
