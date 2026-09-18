import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/session";
import { getOrCreatePreferences, getPreferences } from "@/lib/foe/server";
import { updatePreferencesSchema } from "@/lib/foe/validation";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  return NextResponse.json(await getPreferences(userId));
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const parsed = updatePreferencesSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { subscriptions, whatsappOptIn, ...fields } = parsed.data;

  await getOrCreatePreferences(userId);

  // WhatsApp consent is recorded as a timestamp, not a boolean, so there is an
  // auditable record of when the user opted in. Opting out clears it.
  const optInPatch =
    whatsappOptIn === undefined ? {} : { whatsappOptInAt: whatsappOptIn ? new Date() : null };

  await prisma.foePreferences.update({
    where: { userId },
    data: {
      ...fields,
      ...optInPatch,
    },
  });

  if (subscriptions?.length) {
    await prisma.$transaction(
      subscriptions.map((s) =>
        prisma.alertSubscription.upsert({
          where: { userId_channel_event: { userId, channel: s.channel, event: s.event } },
          create: { userId, channel: s.channel, event: s.event, enabled: s.enabled },
          update: { enabled: s.enabled },
        }),
      ),
    );
  }

  return NextResponse.json(await getPreferences(userId));
}
