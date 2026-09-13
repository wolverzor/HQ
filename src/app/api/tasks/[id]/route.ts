import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, notFoundReference, ownsReferences, unauthorized } from "@/lib/session";
import { updateTaskSchema } from "@/lib/validation";

const taskInclude = {
  project: { select: { id: true, name: true, color: true } },
  opportunity: { select: { id: true, companyName: true, programme: true } },
  timeBlocks: { select: { id: true, start: true, end: true } },
} as const;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const d = parsed.data;
  if (!(await ownsReferences(userId, d))) return notFoundReference();

  const isCompleting = d.status === "DONE" && existing.status !== "DONE";
  const isReopening = d.status && d.status !== "DONE" && existing.status === "DONE";

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.deadline !== undefined && { deadline: d.deadline ? new Date(d.deadline) : null }),
      ...(d.priority !== undefined && { priority: d.priority }),
      ...(d.category !== undefined && { category: d.category }),
      ...(d.estimatedMinutes !== undefined && { estimatedMinutes: d.estimatedMinutes }),
      ...(d.status !== undefined && { status: d.status }),
      ...(d.projectId !== undefined && { projectId: d.projectId }),
      ...(d.opportunityId !== undefined && { opportunityId: d.opportunityId }),
      ...(d.order !== undefined && { order: d.order }),
      ...(isCompleting && { completedAt: new Date() }),
      ...(isReopening && { completedAt: null }),
    },
    include: taskInclude,
  });

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
