import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/lib/constants";
import { reorderTasksSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = reorderTasksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.items.map((item) =>
      prisma.task.updateMany({
        where: { id: item.id, userId: DEMO_USER_ID },
        data: { order: item.order },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
