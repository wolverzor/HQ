import { NextResponse } from "next/server";
import { runCompanyCheck } from "@/lib/discovery";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const run = await runCompanyCheck(id);
    return NextResponse.json(run);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
