import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, notFoundReference, ownsReferences, unauthorized } from "@/lib/session";
import { createTaskSchema } from "@/lib/validation";

const taskInclude = {
  project: { select: { id: true, name: true, color: true } },
  opportunity: { select: { id: true, companyName: true, programme: true } },
  timeBlocks: { select: { id: true, start: true, end: true } },
} as const;

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const tasks = await prisma.task.findMany({
    where: { userId },
    include: taskInclude,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!(await ownsReferences(userId, parsed.data))) return notFoundReference();

  const maxOrder = await prisma.task.aggregate({
    where: { userId },
    _max: { order: true },
  });

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      priority: parsed.data.priority,
      category: parsed.data.category,
      estimatedMinutes: parsed.data.estimatedMinutes ?? undefined,
      status: parsed.data.status,
      projectId: parsed.data.projectId ?? undefined,
      opportunityId: parsed.data.opportunityId ?? undefined,
      order: (maxOrder._max.order ?? -1) + 1,
      userId,
    },
    include: taskInclude,
  });

  return NextResponse.json(task, { status: 201 });
}
