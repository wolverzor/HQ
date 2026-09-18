import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/session";
import { updateApplicationSchema } from "@/lib/foe/validation";
import { canMoveTo } from "@/lib/foe/applications";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const parsed = updateApplicationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.application.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Stage moves follow the documented pipeline: forwards (skipping is fine),
  // or out to Rejected/Withdrawn. A finished application does not silently
  // reopen.
  if (parsed.data.stage && !canMoveTo(existing.stage, parsed.data.stage)) {
    return NextResponse.json(
      { error: `An application at ${existing.stage} cannot move to ${parsed.data.stage}.` },
      { status: 400 },
    );
  }

  const updated = await prisma.application.update({ where: { id }, data: parsed.data });

  // Completing the pipeline closes the linked HQ task, so the task list does
  // not keep nagging about an application that is done.
  if (updated.taskId && parsed.data.stage && ["OFFER", "REJECTED", "WITHDRAWN"].includes(parsed.data.stage)) {
    await prisma.task.updateMany({
      where: { id: updated.taskId, userId },
      data: { status: "DONE", completedAt: new Date() },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const result = await prisma.application.deleteMany({ where: { id, userId } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
