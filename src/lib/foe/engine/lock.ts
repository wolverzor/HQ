/**
 * Database-backed sweep lease.
 *
 * Wraps the pure rules in src/lib/foe/scan-lock.ts with the actual row. The
 * lease is the thing that stops the 15:00 sweep starting while the 14:00 sweep
 * is still crawling — which would double every request, double-count
 * candidates, and race two workers into duplicate alerts for one opening.
 */

import type { PrismaClient } from "@prisma/client";
import { isLockHeld, leaseUntil, wasStolen } from "../scan-lock";

export interface LeaseResult {
  acquired: boolean;
  /** Set when a previous holder's lease had expired and was taken over. */
  stolenFrom: string | null;
  /** When the current holder's lease runs out, if acquisition failed. */
  heldUntil: Date | null;
}

export async function acquireLease(
  prisma: PrismaClient,
  key: string,
  holder: string,
  minutes: number,
  now: Date = new Date(),
): Promise<LeaseResult> {
  const existing = await prisma.scanLock.findUnique({ where: { key } });

  if (isLockHeld(existing, now)) {
    return { acquired: false, stolenFrom: null, heldUntil: existing!.expiresAt };
  }

  const stolen = wasStolen(existing, now) ? (existing?.holder ?? "unknown") : null;

  // The unique primary key is the real guard: if two workers race here, one
  // upsert wins and the other throws, which is the correct outcome.
  try {
    await prisma.scanLock.upsert({
      where: { key },
      create: { key, holder, expiresAt: leaseUntil(now, minutes) },
      update: { holder, acquiredAt: now, expiresAt: leaseUntil(now, minutes) },
    });
  } catch {
    return { acquired: false, stolenFrom: null, heldUntil: null };
  }

  return { acquired: true, stolenFrom: stolen, heldUntil: null };
}

/** Releases the lease, but only if this holder still owns it. */
export async function releaseLease(prisma: PrismaClient, key: string, holder: string) {
  await prisma.scanLock.deleteMany({ where: { key, holder } });
}

/** Extends a lease mid-run, for a sweep that is taking longer than expected. */
export async function extendLease(prisma: PrismaClient, key: string, holder: string, minutes: number, now = new Date()) {
  await prisma.scanLock.updateMany({
    where: { key, holder },
    data: { expiresAt: leaseUntil(now, minutes) },
  });
}
