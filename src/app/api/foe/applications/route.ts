import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/session";
import { createApplicationSchema } from "@/lib/foe/validation";
import { taskTitleFor } from "@/lib/foe/applications";
import type { ApplicationDTO } from "@/lib/foe/types";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const rows = await prisma.application.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
  });

  const dto: ApplicationDTO[] = rows.map((a) => ({
    id: a.id,
    opportunityId: a.opportunityId,
    firmName: a.firmName,
    programmeName: a.programmeName,
    stage: a.stage,
    appliedAt: a.appliedAt.toISOString(),
    deadline: a.deadline?.toISOString() ?? null,
    notes: a.notes,
    taskId: a.taskId,
    updatedAt: a.updatedAt.toISOString(),
  }));

  return NextResponse.json(dto);
}

/**
 * "Mark Applied" on an opportunity.
 *
 * Deliberately feeds the existing HQ systems rather than building a parallel
 * one: it creates an Application row AND an HQ Task (category Finance / Career,
 * deadline carried over) so the application immediately appears in the task
 * list and can be dragged onto the calendar, exactly like the legacy tracker's
 * Start Application action.
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = createApplicationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { opportunityId, createTask = true } = parsed.data;

  const opportunity = await prisma.foeOpportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  const existing = await prisma.application.findUnique({ where: { userId_opportunityId: { userId, opportunityId } } });
  if (existing) return NextResponse.json(existing);

  let taskId: string | null = null;
  if (createTask) {
    const maxOrder = await prisma.task.aggregate({ where: { userId }, _max: { order: true } });
    const task = await prisma.task.create({
      data: {
        title: taskTitleFor(opportunity.firmName, opportunity.programmeName),
        deadline: opportunity.deadline ?? undefined,
        priority: "HIGH",
        category: "FINANCE_CAREER",
        estimatedMinutes: 60,
        userId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    taskId = task.id;
  }

  const application = await prisma.application.create({
    data: {
      userId,
      opportunityId,
      firmName: opportunity.firmName,
      programmeName: `${opportunity.programmeName} ${opportunity.recruitmentYear}`,
      deadline: opportunity.deadline,
      taskId,
    },
  });

  return NextResponse.json(application, { status: 201 });
}
