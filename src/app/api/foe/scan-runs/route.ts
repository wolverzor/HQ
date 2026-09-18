import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/session";

/** Recent sweeps, for the health popover's detail view and for debugging. */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const runs = await prisma.scanRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 25,
  });

  return NextResponse.json(
    runs.map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      firmsScanned: r.firmsScanned,
      sourcesScanned: r.sourcesScanned,
      sourcesChanged: r.sourcesChanged,
      sourcesFailed: r.sourcesFailed,
      candidatesFound: r.candidatesFound,
      opportunitiesOpened: r.opportunitiesOpened,
      message: r.message,
    })),
  );
}
