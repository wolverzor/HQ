"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ShellUser = { name: string; email: string };

function initials(user: ShellUser) {
  const source = user.name.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2)).toUpperCase();
}

export function UserMenu({ user, compact = false }: { user: ShellUser; compact?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    // Nothing from this account should linger for whoever uses the device next.
    queryClient.clear();
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    router.replace("/login");
    router.refresh();
  }

  const avatar = (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[12px] font-semibold text-primary">
      {initials(user)}
    </span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "flex items-center gap-2.5 rounded-xl text-left transition-colors hover:bg-surface-hover cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact ? "p-0.5 rounded-full" : "min-w-0 flex-1 px-2 py-1.5",
          )}
        >
          {avatar}
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{user.name || user.email}</span>
                <span className="block truncate text-[11.5px] text-subtle-foreground">{user.email}</span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-subtle-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"} className="w-56">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block truncate text-[13px] font-medium text-foreground">{user.name || "Signed in"}</span>
          <span className="block truncate text-[12px] font-normal text-subtle-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={signingOut}
          onSelect={(e) => {
            e.preventDefault();
            signOut();
          }}
        >
          <LogOut className="size-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
