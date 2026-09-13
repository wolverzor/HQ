import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_USER_ID } from "@/lib/constants";
import { createProjectSchema } from "@/lib/validation";

export async function GET() {
  const projects = await prisma.project.findMany({
    where: { userId: DEMO_USER_ID, archived: false },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color ?? "#6366f1",
      userId: DEMO_USER_ID,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
