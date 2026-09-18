/**
 * Alert composition and deduplication.
 *
 * Provider-agnostic on purpose: this module decides WHAT to send and WHETHER it
 * has already been sent. Delivery lives behind a notification-service interface
 * (WhatsApp Business API, email, push, in-app) so adding a channel does not
 * touch this logic.
 *
 * The dedupe key is the safeguard that stops one programme found through six
 * sources becoming six WhatsApp messages.
 */

import type { AlertChannel, AlertEvent, EligibilityVerdict, OpportunityState } from "@prisma/client";
import { AREA_LABEL, ELIGIBILITY_LABEL } from "./labels";
import type { FinanceArea } from "@prisma/client";

/**
 * One alert per user, per opportunity, per event, per channel — forever.
 * Stored as a unique column, so the database enforces it even if two workers
 * race.
 */
export function alertDedupeKey(input: {
  userId: string;
  opportunityId: string;
  event: AlertEvent;
  channel: AlertChannel;
}): string {
  return [input.userId, input.opportunityId, input.event, input.channel].join(":");
}

export interface AlertOpportunity {
  firmName: string;
  programmeName: string;
  recruitmentYear: number;
  area: FinanceArea;
  location: string | null;
  state: OpportunityState;
  rolling: boolean;
  applicationUrl: string | null;
  officialInfoUrl: string | null;
  deadline: Date | null;
  openingDate: Date | null;
  expectedOpeningLabel: string | null;
}

function timeHHMM(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

/**
 * The message body. Plain text, deliberately scannable on a phone lock screen:
 * firm, programme, what changed, and the link, in that order.
 */
export function composeAlertBody(
  event: AlertEvent,
  o: AlertOpportunity,
  eligibility: EligibilityVerdict,
  detectedAt: Date,
): string {
  const header: Record<AlertEvent, string> = {
    APPLICATIONS_OPENED: "🚨 New finance opportunity open",
    PROGRAMME_ANNOUNCED: "📣 Programme announced",
    SEVEN_DAYS_BEFORE_OPENING: "⏳ Opens in 7 days",
    ONE_DAY_BEFORE_OPENING: "⏰ Opens tomorrow",
    DEADLINE_SOON: "⚠️ Deadline approaching",
  };

  const lines: string[] = [header[event], "", o.firmName, `${o.programmeName} ${o.recruitmentYear}`];

  const where = [AREA_LABEL[o.area], o.location].filter(Boolean).join(" · ");
  if (where) lines.push(where);

  lines.push("");

  if (event === "APPLICATIONS_OPENED") {
    lines.push("Status: OPEN");
    lines.push(`Rolling: ${o.rolling ? "Yes" : "No"}`);
    if (o.deadline) lines.push(`Deadline: ${formatDate(o.deadline)}`);
  } else if (event === "PROGRAMME_ANNOUNCED" && o.openingDate) {
    lines.push(`Status: ANNOUNCED — opens ${formatDate(o.openingDate)}`);
  } else if (event === "SEVEN_DAYS_BEFORE_OPENING" || event === "ONE_DAY_BEFORE_OPENING") {
    if (o.openingDate) lines.push(`Opens: ${formatDate(o.openingDate)}`);
    else if (o.expectedOpeningLabel) lines.push(`Expected: ${o.expectedOpeningLabel} (not confirmed by the employer)`);
  } else if (event === "DEADLINE_SOON" && o.deadline) {
    lines.push(`Deadline: ${formatDate(o.deadline)}`);
  }

  lines.push(`Eligibility: ${ELIGIBILITY_LABEL[eligibility]}`);

  const link = o.applicationUrl ?? o.officialInfoUrl;
  if (link) {
    lines.push("", event === "APPLICATIONS_OPENED" ? "Apply:" : "Details:", link);
  }

  lines.push("", `Detected by FOE: ${timeHHMM(detectedAt)}`);

  return lines.join("\n");
}

/**
 * Which event an opportunity's state change should raise, if any.
 * Returns null when nothing alert-worthy happened — most sweeps change nothing.
 */
export function eventForTransition(from: OpportunityState | null, to: OpportunityState): AlertEvent | null {
  if (to === "OPEN" && from !== "OPEN" && from !== "CLOSING_SOON") return "APPLICATIONS_OPENED";
  if (to === "ANNOUNCED" && from !== "ANNOUNCED") return "PROGRAMME_ANNOUNCED";
  if (to === "CLOSING_SOON" && from !== "CLOSING_SOON") return "DEADLINE_SOON";
  return null;
}

/** Opening alerts jump the queue; everything else is best-effort. */
export function alertUrgency(event: AlertEvent): "immediate" | "normal" {
  return event === "APPLICATIONS_OPENED" ? "immediate" : "normal";
}

/** Defaults for a new account: in-app on, WhatsApp off until explicitly opted in. */
export const DEFAULT_SUBSCRIPTIONS: { channel: AlertChannel; event: AlertEvent; enabled: boolean }[] = [
  { channel: "IN_APP", event: "APPLICATIONS_OPENED", enabled: true },
  { channel: "IN_APP", event: "PROGRAMME_ANNOUNCED", enabled: true },
  { channel: "IN_APP", event: "SEVEN_DAYS_BEFORE_OPENING", enabled: true },
  { channel: "IN_APP", event: "ONE_DAY_BEFORE_OPENING", enabled: true },
  { channel: "IN_APP", event: "DEADLINE_SOON", enabled: true },
  { channel: "WHATSAPP", event: "APPLICATIONS_OPENED", enabled: false },
  { channel: "WHATSAPP", event: "PROGRAMME_ANNOUNCED", enabled: false },
  { channel: "WHATSAPP", event: "SEVEN_DAYS_BEFORE_OPENING", enabled: false },
  { channel: "WHATSAPP", event: "ONE_DAY_BEFORE_OPENING", enabled: false },
  { channel: "WHATSAPP", event: "DEADLINE_SOON", enabled: false },
  { channel: "EMAIL", event: "APPLICATIONS_OPENED", enabled: false },
  { channel: "EMAIL", event: "PROGRAMME_ANNOUNCED", enabled: false },
  { channel: "EMAIL", event: "SEVEN_DAYS_BEFORE_OPENING", enabled: false },
  { channel: "EMAIL", event: "ONE_DAY_BEFORE_OPENING", enabled: false },
  { channel: "EMAIL", event: "DEADLINE_SOON", enabled: false },
];
