"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Theme picker.
 *
 * Navy pairs a deep navy rail with a light workspace — the sidebar is themed by
 * its own tokens, so it can be dark while the working area stays light.
 * Midnight takes the same palette all the way through.
 */
const THEMES = [
  { value: "light", label: "Light", icon: Sun, swatch: ["#ffffff", "#4f46e5"] },
  { value: "dark", label: "Dark", icon: Moon, swatch: ["#131315", "#818cf8"] },
  { value: "navy", label: "Navy", icon: Palette, swatch: ["#101b33", "#f8fafc"] },
  { value: "midnight", label: "Midnight", icon: Palette, swatch: ["#0a1120", "#7aa2f7"] },
  { value: "system", label: "System", icon: Monitor, swatch: ["#ffffff", "#131315"] },
] as const;

export const THEME_NAMES = THEMES.filter((t) => t.value !== "system").map((t) => t.value);

function Swatch({ colors }: { colors: readonly [string, string] | string[] }) {
  return (
    <span
      aria-hidden
      className="flex size-4 shrink-0 overflow-hidden rounded-full border border-border-strong"
    >
      <span className="h-full w-1/2" style={{ backgroundColor: colors[0] }} />
      <span className="h-full w-1/2" style={{ backgroundColor: colors[1] }} />
    </span>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoids a hydration mismatch: theme is only known once mounted on the client.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn("size-9 rounded-full", className)} />;
  }

  const active = THEMES.find((t) => t.value === theme) ?? THEMES[0];
  const Icon = resolvedTheme === "dark" || theme === "midnight" ? Moon : active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Theme: ${active.label}`}
          className={cn(
            // Workspace colours by default; the sidebar passes its own.
            "flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground cursor-pointer",
            className,
          )}
        >
          <Icon className="size-[18px]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.value} onSelect={() => setTheme(t.value)} className="justify-between">
            <span className="flex items-center gap-2">
              <Swatch colors={t.swatch} />
              {t.label}
            </span>
            {theme === t.value && <Check className="size-3.5 text-primary" strokeWidth={3} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
