"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

export function LoginForm({
  googleEnabled,
  next,
  initialMode,
}: {
  googleEnabled: boolean;
  next: string;
  initialMode: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"email" | "google" | null>(null);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending("email");

    const { error } = isSignup
      ? await authClient.signUp.email({ name: name.trim() || email.split("@")[0], email, password })
      : await authClient.signIn.email({ email, password });

    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      setPending(null);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    setPending("google");
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (error) {
      setError(error.message ?? "Google sign-in failed. Please try again.");
      setPending(null);
    }
  }

  function switchMode() {
    setMode(isSignup ? "signin" : "signup");
    setError(null);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={!googleEnabled || pending !== null}
        onClick={handleGoogle}
      >
        {pending === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>
      {!googleEnabled && (
        <p className="mt-2 text-center text-xs text-subtle-foreground">
          Google sign-in isn&apos;t configured on this server yet.
        </p>
      )}

      <div className="my-5 flex items-center gap-3 text-xs text-subtle-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isSignup && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isSignup && <p className="text-xs text-subtle-foreground">At least 8 characters.</p>}
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-danger-tint px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending !== null}>
          {pending === "email" && <Loader2 className="size-4 animate-spin" />}
          {isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-muted-foreground">
        {isSignup ? "Already have an account?" : "New to HQ?"}{" "}
        <button type="button" onClick={switchMode} className="font-medium text-primary hover:underline cursor-pointer">
          {isSignup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.6H1.27a12 12 0 0 0 0 10.8l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.6l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}
