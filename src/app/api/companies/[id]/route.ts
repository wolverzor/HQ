import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/session";
import { updateCompanySchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await req.json();
  const parsed = updateCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.company.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const d = parsed.data;
  const company = await prisma.company.update({
    where: { id },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.website !== undefined && { website: d.website }),
      ...(d.careersUrl !== undefined && { careersUrl: d.careersUrl }),
      ...(d.notes !== undefined && { notes: d.notes }),
      ...(d.enabled !== undefined && { enabled: d.enabled }),
    },
  });

  return NextResponse.json(company);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const existing = await prisma.company.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  await prisma.company.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
