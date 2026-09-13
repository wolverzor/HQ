import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/lib/constants";
import { updateTimeBlockSchema } from "@/lib/validation";

const blockInclude = {
  task: { select: { id: true, title: true, status: true, estimatedMinutes: true } },
} as const;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateTimeBlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.timeBlock.findFirst({ where: { id, userId: DEMO_USER_ID } });
  if (!existing) {
    return NextResponse.json({ error: "Time block not found" }, { status: 404 });
  }

  const d = parsed.data;
  const start = d.start ? new Date(d.start) : existing.start;
  const end = d.end ? new Date(d.end) : existing.end;
  if (end <= start) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const block = await prisma.timeBlock.update({
    where: { id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.start !== undefined && { start }),
      ...(d.end !== undefined && { end }),
      ...(d.taskId !== undefined && { taskId: d.taskId }),
      ...(d.color !== undefined && { color: d.color }),
      ...(d.notes !== undefined && { notes: d.notes }),
      ...(d.completed !== undefined && { completed: d.completed }),
    },
    include: blockInclude,
  });

  if (d.completed === true && block.taskId) {
    await prisma.task.updateMany({
      where: { id: block.taskId, userId: DEMO_USER_ID, status: { not: "DONE" } },
      data: { status: "DONE", completedAt: new Date() },
    });
  }

  return NextResponse.json(block);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.timeBlock.findFirst({ where: { id, userId: DEMO_USER_ID } });
  if (!existing) {
    return NextResponse.json({ error: "Time block not found" }, { status: 404 });
  }
  await prisma.timeBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
