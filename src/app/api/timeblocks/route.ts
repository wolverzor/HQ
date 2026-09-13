import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, notFoundReference, ownsReferences, unauthorized } from "@/lib/session";
import { createTimeBlockSchema } from "@/lib/validation";

const blockInclude = {
  task: { select: { id: true, title: true, status: true, estimatedMinutes: true } },
} as const;

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const blocks = await prisma.timeBlock.findMany({
    where: {
      userId,
      ...(start && end
        ? { start: { gte: new Date(start) }, end: { lte: new Date(end) } }
        : {}),
    },
    include: blockInclude,
    orderBy: { start: "asc" },
  });

  return NextResponse.json(blocks);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await req.json();
  const parsed = createTimeBlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const start = new Date(parsed.data.start);
  const end = new Date(parsed.data.end);
  if (end <= start) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }
  if (!(await ownsReferences(userId, parsed.data))) return notFoundReference();

  const block = await prisma.timeBlock.create({
    data: {
      title: parsed.data.title,
      start,
      end,
      taskId: parsed.data.taskId ?? undefined,
      color: parsed.data.color ?? "#6366f1",
      notes: parsed.data.notes ?? undefined,
      userId,
    },
    include: blockInclude,
  });

  return NextResponse.json(block, { status: 201 });
}
