import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/lib/constants";
import { createCompanySchema } from "@/lib/validation";

export async function GET() {
  const companies = await prisma.company.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { opportunities: true } },
      checkRuns: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });

  const dto = companies.map((c) => ({
    id: c.id,
    name: c.name,
    website: c.website,
    careersUrl: c.careersUrl,
    enabled: c.enabled,
    notes: c.notes,
    createdAt: c.createdAt,
    opportunityCount: c._count.opportunities,
    lastCheckRun: c.checkRuns[0] ?? null,
  }));

  return NextResponse.json(dto);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name,
      website: parsed.data.website ?? undefined,
      careersUrl: parsed.data.careersUrl ?? undefined,
      notes: parsed.data.notes ?? undefined,
      enabled: parsed.data.enabled ?? true,
      userId: DEMO_USER_ID,
    },
  });

  return NextResponse.json(company, { status: 201 });
}
