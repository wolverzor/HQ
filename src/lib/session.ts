import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** The signed-in user's id, or null. Every API route scopes its queries by this. */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "You need to sign in." }, { status: 401 });
}

/**
 * Checks that every referenced row (passed in a request body) belongs to the
 * user, so one account can never link its tasks or blocks to another's data.
 */
export async function ownsReferences(
  userId: string,
  refs: { projectId?: string | null; opportunityId?: string | null; taskId?: string | null; companyId?: string | null },
): Promise<boolean> {
  const checks: Promise<number>[] = [];
  if (refs.projectId) checks.push(prisma.project.count({ where: { id: refs.projectId, userId } }));
  if (refs.opportunityId) checks.push(prisma.opportunity.count({ where: { id: refs.opportunityId, userId } }));
  if (refs.taskId) checks.push(prisma.task.count({ where: { id: refs.taskId, userId } }));
  if (refs.companyId) checks.push(prisma.company.count({ where: { id: refs.companyId, userId } }));
  const counts = await Promise.all(checks);
  return counts.every((c) => c > 0);
}

export function notFoundReference() {
  return NextResponse.json({ error: "Linked item not found" }, { status: 404 });
}
