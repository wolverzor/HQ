import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { googleAuthEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in · HQ" };

// Only same-site paths are allowed as a post-login destination.
function safeNext(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);

  if (await getSession()) redirect(next);

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-11 items-center justify-center rounded-[14px] bg-primary text-[15px] font-bold tracking-tight text-primary-foreground shadow-sm">
            HQ
          </div>
          <h1 className="mt-5 text-[22px] font-semibold tracking-tight">Welcome to HQ</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Tasks, time-blocking and opportunities in one place.</p>
        </div>
        <LoginForm
          googleEnabled={googleAuthEnabled}
          next={next}
          initialMode={params.mode === "signup" ? "signup" : "signin"}
        />
      </div>
    </div>
  );
}
