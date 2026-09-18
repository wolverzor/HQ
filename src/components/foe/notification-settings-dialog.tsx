"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Bell, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ALERT_EVENT_LABEL } from "@/lib/foe/labels";
import { useFoePreferences, useUpdateFoePreferences } from "@/hooks/use-foe";
import type { AlertChannel, AlertEvent } from "@/lib/foe/types";

const EVENTS: AlertEvent[] = [
  "PROGRAMME_ANNOUNCED",
  "APPLICATIONS_OPENED",
  "SEVEN_DAYS_BEFORE_OPENING",
  "ONE_DAY_BEFORE_OPENING",
  "DEADLINE_SOON",
];

const CHANNELS: { channel: AlertChannel; label: string; icon: typeof Bell; note?: string }[] = [
  { channel: "IN_APP", label: "In-app", icon: Bell },
  { channel: "WHATSAPP", label: "WhatsApp", icon: MessageCircle, note: "Requires opt-in below" },
  { channel: "EMAIL", label: "Email", icon: Mail },
];

/**
 * Notification settings.
 *
 * WhatsApp is opt-in and stays off until the user explicitly turns it on and
 * provides a number — the consent timestamp is recorded server-side. Opening
 * alerts are called out because they are the ones where a delay costs a place.
 */
export function NotificationSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: prefs } = useFoePreferences();
  const update = useUpdateFoePreferences();

  const [subs, setSubs] = useState<{ channel: AlertChannel; event: AlertEvent; enabled: boolean }[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  useEffect(() => {
    if (!prefs || !open) return;
    // Re-seed the form from saved settings each time the dialog opens, so a
    // cancelled edit does not linger.
    /* eslint-disable react-hooks/set-state-in-effect */
    setSubs(prefs.subscriptions);
    setWhatsappNumber(prefs.whatsappNumber ?? "");
    setWhatsappOptIn(prefs.whatsappOptInAt != null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, prefs]);

  const isOn = (channel: AlertChannel, event: AlertEvent) =>
    subs.find((s) => s.channel === channel && s.event === event)?.enabled ?? false;

  const setOn = (channel: AlertChannel, event: AlertEvent, enabled: boolean) =>
    setSubs((prev) => {
      const next = prev.filter((s) => !(s.channel === channel && s.event === event));
      return [...next, { channel, event, enabled }];
    });

  async function save() {
    await update.mutateAsync({
      subscriptions: subs,
      whatsappNumber: whatsappNumber.trim() || null,
      whatsappOptIn,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Notification settings</DialogTitle>
          <DialogDescription>
            Choose how FOE tells you about an opportunity. Opening alerts are sent the moment an application is verified
            live, not at the end of the next sweep.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className="pb-2 text-left text-[12px] font-medium text-muted-foreground">
                    Event
                  </th>
                  {CHANNELS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <th key={c.channel} scope="col" className="px-2 pb-2 text-center">
                        <span className="flex flex-col items-center gap-0.5">
                          <Icon className="size-4 text-muted-foreground" strokeWidth={2} />
                          <span className="text-[11.5px] font-medium text-muted-foreground">{c.label}</span>
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {EVENTS.map((event) => (
                  <tr key={event} className="border-t border-border">
                    <td className="py-2.5 pr-3">
                      <span
                        className={cn(
                          "text-[13px]",
                          event === "APPLICATIONS_OPENED" ? "font-semibold text-foreground" : "text-foreground",
                        )}
                      >
                        {ALERT_EVENT_LABEL[event]}
                      </span>
                      {event === "APPLICATIONS_OPENED" && (
                        <span className="block text-[11.5px] text-muted-foreground">Sent immediately on verification</span>
                      )}
                    </td>
                    {CHANNELS.map((c) => (
                      <td key={c.channel} className="px-2 py-2.5 text-center">
                        <Switch
                          checked={isOn(c.channel, event)}
                          disabled={c.channel === "WHATSAPP" && !whatsappOptIn}
                          onCheckedChange={(checked) => setOn(c.channel, event, checked)}
                          aria-label={`${ALERT_EVENT_LABEL[event]} via ${c.label}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-surface-inset p-4">
            <label className="flex cursor-pointer items-start justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-foreground">
                  Send finance opportunity alerts on WhatsApp
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                  Off until you turn it on. FOE records when you opted in, sends at most one message per programme per
                  event, and you can turn it off here at any time.
                </span>
              </span>
              <Switch
                checked={whatsappOptIn}
                onCheckedChange={(checked) => {
                  setWhatsappOptIn(checked);
                  if (!checked) {
                    setSubs((prev) => prev.map((s) => (s.channel === "WHATSAPP" ? { ...s, enabled: false } : s)));
                  }
                }}
              />
            </label>

            {whatsappOptIn && (
              <div className="mt-3.5">
                <Label htmlFor="foe-whatsapp">WhatsApp number</Label>
                <Input
                  id="foe-whatsapp"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+44 7700 900000"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="mt-1.5"
                />
                <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                  Include the country code. Delivery runs through a notification service, so email and push can be added
                  later without changing these settings.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
