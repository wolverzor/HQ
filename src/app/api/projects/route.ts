import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/session";
import { createProjectSchema } from "@/lib/validation";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const projects = await prisma.project.findMany({
    where: { userId, archived: false },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color ?? "#6366f1",
      userId,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
