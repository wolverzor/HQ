import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

// The core HQ "connect" workflow: starting an application on an opportunity
// moves its status to Applying, and creates a matching task (deadline
// carried over, category set to Finance / Career) so it immediately shows up
// in the task manager and can be dragged onto the calendar.
export async function POST(_req: Request, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const opportunity = await prisma.opportunity.findFirst({ where: { id, userId } });
  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const maxOrder = await prisma.task.aggregate({
    where: { userId },
    _max: { order: true },
  });

  const [, task] = await prisma.$transaction([
    prisma.opportunity.update({
      where: { id },
      data: {
        status: opportunity.status === "NOT_OPEN" || opportunity.status === "OPEN" ? "APPLYING" : opportunity.status,
      },
    }),
    prisma.task.create({
      data: {
        title: `Complete ${opportunity.companyName} ${opportunity.programme} application`,
        deadline: opportunity.deadline ?? undefined,
        priority: "HIGH",
        category: "FINANCE_CAREER",
        estimatedMinutes: 60,
        opportunityId: opportunity.id,
        userId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    }),
  ]);

  const fullOpportunity = await prisma.opportunity.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { tasks: true } } },
  });

  return NextResponse.json({
    opportunity: { ...fullOpportunity, taskCount: fullOpportunity._count.tasks },
    task,
  });
}
