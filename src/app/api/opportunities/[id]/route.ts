import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/lib/constants";
import { updateOpportunitySchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = updateOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.opportunity.findFirst({ where: { id, userId: DEMO_USER_ID } });
  if (!existing) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const d = parsed.data;
  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      ...(d.companyId !== undefined && { companyId: d.companyId }),
      ...(d.companyName !== undefined && { companyName: d.companyName }),
      ...(d.programme !== undefined && { programme: d.programme }),
      ...(d.division !== undefined && { division: d.division }),
      ...(d.programmeType !== undefined && { programmeType: d.programmeType }),
      ...(d.location !== undefined && { location: d.location }),
      ...(d.openingDate !== undefined && { openingDate: d.openingDate ? new Date(d.openingDate) : null }),
      ...(d.deadline !== undefined && { deadline: d.deadline ? new Date(d.deadline) : null }),
      ...(d.applicationUrl !== undefined && { applicationUrl: d.applicationUrl }),
      ...(d.status !== undefined && { status: d.status }),
      ...(d.dateApplied !== undefined && { dateApplied: d.dateApplied ? new Date(d.dateApplied) : null }),
      ...(d.notes !== undefined && { notes: d.notes }),
      ...(d.source !== undefined && { source: d.source }),
      ...(d.sourceUrl !== undefined && { sourceUrl: d.sourceUrl }),
      ...(d.officialUrl !== undefined && { officialUrl: d.officialUrl }),
      ...(d.verificationStatus !== undefined && {
        verificationStatus: d.verificationStatus,
        ...(d.verificationStatus === "CONFIRMED_OPEN" && { lastVerifiedAt: new Date() }),
      }),
    },
    include: { _count: { select: { tasks: true } } },
  });

  return NextResponse.json({ ...opportunity, taskCount: opportunity._count.tasks });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.opportunity.findFirst({ where: { id, userId: DEMO_USER_ID } });
  if (!existing) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }
  await prisma.opportunity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
