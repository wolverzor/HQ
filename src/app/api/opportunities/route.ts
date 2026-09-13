import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, notFoundReference, ownsReferences, unauthorized } from "@/lib/session";
import { createOpportunitySchema } from "@/lib/validation";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const opportunities = await prisma.opportunity.findMany({
    where: { userId },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { tasks: true } } },
  });

  const dto = opportunities.map((o) => ({ ...o, taskCount: o._count.tasks }));
  return NextResponse.json(dto);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await req.json();
  const parsed = createOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  if (!(await ownsReferences(userId, d))) return notFoundReference();

  const opportunity = await prisma.opportunity.create({
    data: {
      companyId: d.companyId ?? undefined,
      companyName: d.companyName,
      programme: d.programme,
      division: d.division,
      programmeType: d.programmeType,
      location: d.location ?? undefined,
      openingDate: d.openingDate ? new Date(d.openingDate) : undefined,
      deadline: d.deadline ? new Date(d.deadline) : undefined,
      applicationUrl: d.applicationUrl ?? undefined,
      status: d.status,
      dateApplied: d.dateApplied ? new Date(d.dateApplied) : undefined,
      notes: d.notes ?? undefined,
      source: d.source ?? undefined,
      sourceUrl: d.sourceUrl ?? undefined,
      officialUrl: d.officialUrl ?? undefined,
      verificationStatus: d.verificationStatus,
      userId,
    },
  });

  return NextResponse.json({ ...opportunity, taskCount: 0 }, { status: 201 });
}
