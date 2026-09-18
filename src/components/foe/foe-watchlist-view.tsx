"use client";

import { Bell, Building2, CalendarClock, Layers, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATE_LABEL } from "@/lib/foe/labels";
import { useFoePreferences, useFoeWatchlist, useRemoveWatchItem, useUpdateWatchItem } from "@/hooks/use-foe";
import { FirmMark } from "./badges";
import type { WatchlistItemDTO } from "@/lib/foe/types";

const TARGET_ICON = {
  FIRM: Building2,
  PROGRAMME: Layers,
  OPPORTUNITY: CalendarClock,
} as const;

const TARGET_LABEL = {
  FIRM: "Firm",
  PROGRAMME: "Programme",
  OPPORTUNITY: "Opportunity",
} as const;

function WatchRow({
  item,
  whatsappAvailable,
  onUpdate,
  onRemove,
}: {
  item: WatchlistItemDTO;
  whatsappAvailable: boolean;
  onUpdate: (patch: { notifyWhatsApp?: boolean; notifyInApp?: boolean; notifyEmail?: boolean }) => void;
  onRemove: () => void;
}) {
  const Icon = TARGET_ICON[item.targetType];

  return (
    <div className="flex flex-wrap items-start gap-4 py-4">
      <FirmMark name={item.title} size={34} className="mt-0.5" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[14px] font-semibold tracking-tight text-foreground">{item.title}</h3>
          <Badge className="gap-1 text-[11px]">
            <Icon className="size-3" strokeWidth={2} />
            {TARGET_LABEL[item.targetType]}
          </Badge>
          {item.state && <Badge className="text-[11px]">{STATE_LABEL[item.state]}</Badge>}
        </div>
        {item.subtitle && <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{item.subtitle}</p>}
        {item.openingLabel && <p className="mt-1 text-[12.5px] font-medium text-foreground">{item.openingLabel}</p>}
      </div>

      {/* Per-item channels, so one critical firm can go to WhatsApp without
          turning every watch into a phone notification. */}
      <div className="flex items-center gap-4">
        {(
          [
            { key: "notifyWhatsApp", label: "WhatsApp", disabled: !whatsappAvailable },
            { key: "notifyInApp", label: "In-app", disabled: false },
            { key: "notifyEmail", label: "Email", disabled: false },
          ] as const
        ).map((c) => (
          <label key={c.key} className={cn("flex flex-col items-center gap-1", c.disabled ? "opacity-50" : "cursor-pointer")}>
            <span className="text-[11px] text-muted-foreground">{c.label}</span>
            <Switch
              checked={item[c.key]}
              disabled={c.disabled}
              onCheckedChange={(checked) => onUpdate({ [c.key]: checked })}
              aria-label={`${c.label} alerts for ${item.title}`}
            />
          </label>
        ))}

        <button
          type="button"
          onClick={onRemove}
          aria-label={`Stop watching ${item.title}`}
          className="mt-4 rounded-lg p-2 text-subtle-foreground transition-colors hover:bg-danger-tint hover:text-danger cursor-pointer"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function FoeWatchlistView() {
  const { data: items, isLoading } = useFoeWatchlist();
  const { data: prefs } = useFoePreferences();
  const update = useUpdateWatchItem();
  const remove = useRemoveWatchItem();

  const whatsappAvailable = prefs?.whatsappOptInAt != null;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Finance Opportunity Engine
        </p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-foreground">Watchlist</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Programmes and firms you want to hear about first. FOE monitors everything regardless — watching changes who
          gets told, not what gets checked.
        </p>
      </div>

      {!whatsappAvailable && (
        <p className="mt-4 rounded-xl border border-border bg-surface-inset px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
          WhatsApp alerts are off. Turn them on in notification settings on the Finance Opportunities dashboard to enable
          the WhatsApp switches below.
        </p>
      )}

      <div className="mt-5 rounded-2xl border border-border bg-surface px-5">
        {isLoading ? (
          <div className="py-5">
            <Skeleton className="h-[220px] rounded-xl" />
          </div>
        ) : !items || items.length === 0 ? (
          <div className="py-5">
            <EmptyState
              icon={Bell}
              title="Nothing on your watchlist"
              description="Watch a firm or an upcoming programme and FOE will alert you the moment its application is verified open."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <WatchRow
                key={item.id}
                item={item}
                whatsappAvailable={whatsappAvailable}
                onUpdate={(patch) => update.mutate({ id: item.id, ...patch })}
                onRemove={() => remove.mutate(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
