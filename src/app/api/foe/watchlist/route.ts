import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/session";
import { listWatchlist } from "@/lib/foe/server";
import { watchSchema } from "@/lib/foe/validation";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  return NextResponse.json(await listWatchlist(userId));
}

/**
 * Toggle a watch. One endpoint for both directions so the UI's Watch button is
 * a single idempotent call — re-watching something already watched is a no-op
 * rather than a duplicate row (the unique indexes back this up).
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = watchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { opportunityId, firmId, programmeId, watching, ...notify } = parsed.data;

  const where = opportunityId
    ? { userId_opportunityId: { userId, opportunityId } }
    : programmeId
      ? { userId_programmeId: { userId, programmeId } }
      : { userId_firmId: { userId, firmId: firmId as string } };

  if (!watching) {
    await prisma.watchlistItem.deleteMany({
      where: { userId, opportunityId: opportunityId ?? undefined, firmId: firmId ?? undefined, programmeId: programmeId ?? undefined },
    });
    return NextResponse.json({ watching: false });
  }

  // The watched row must exist and, for programmes and opportunities, must be a
  // real global row — users cannot invent watch targets.
  if (opportunityId && (await prisma.foeOpportunity.count({ where: { id: opportunityId } })) === 0) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }
  if (firmId && (await prisma.firm.count({ where: { id: firmId } })) === 0) {
    return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  }
  if (programmeId && (await prisma.programme.count({ where: { id: programmeId } })) === 0) {
    return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  }

  const item = await prisma.watchlistItem.upsert({
    where,
    create: {
      userId,
      targetType: opportunityId ? "OPPORTUNITY" : programmeId ? "PROGRAMME" : "FIRM",
      opportunityId,
      firmId,
      programmeId,
      ...notify,
    },
    update: notify,
  });

  return NextResponse.json({ watching: true, id: item.id });
}
