import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/lib/constants";
import { createOpportunitySchema } from "@/lib/validation";

export async function GET() {
  const opportunities = await prisma.opportunity.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { tasks: true } } },
  });

  const dto = opportunities.map((o) => ({ ...o, taskCount: o._count.tasks }));
  return NextResponse.json(dto);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
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
      userId: DEMO_USER_ID,
    },
  });

  return NextResponse.json({ ...opportunity, taskCount: 0 }, { status: 201 });
}
