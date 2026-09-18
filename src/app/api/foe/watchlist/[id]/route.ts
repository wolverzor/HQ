import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/session";
import { updateWatchSchema } from "@/lib/foe/validation";

type Params = { params: Promise<{ id: string }> };

/** Per-item notification channels, from the watchlist page. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const parsed = updateWatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Scoped by userId so one account can never edit another's watch settings.
  const result = await prisma.watchlistItem.updateMany({ where: { id, userId }, data: parsed.data });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(await prisma.watchlistItem.findUnique({ where: { id } }));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const result = await prisma.watchlistItem.deleteMany({ where: { id, userId } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
