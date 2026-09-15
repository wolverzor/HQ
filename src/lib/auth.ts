import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { DEFAULT_WATCHLIST } from "@/lib/default-watchlist";

// Google sign-in is only switched on when both credentials exist, so the app
// still works (email + password) before a Google OAuth client is set up.
export const googleAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// On Vercel the production URL is known without extra config; BETTER_AUTH_URL
// still wins when set (e.g. a custom domain). A localhost value is ignored on
// Vercel, so a copied-over example .env can't break sign-in in production.
const configuredURL = process.env.BETTER_AUTH_URL;
const baseURL =
  (configuredURL && !(process.env.VERCEL && configuredURL.includes("localhost")) ? configuredURL : undefined) ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

// Vercel serves a project from several working hostnames — the stable
// production domain, but also a per-branch one and a unique one for the
// exact deployment. Only trusting `baseURL` means sign-in fails with
// "Invalid origin" for anyone using one of the others, so every hostname
// Vercel tells us about for this deployment is trusted too.
const asOrigin = (host: string | undefined) => (host ? `https://${host}` : undefined);
const trustedOrigins = Array.from(
  new Set(
    [
      baseURL,
      asOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
      asOrigin(process.env.VERCEL_BRANCH_URL),
      asOrigin(process.env.VERCEL_URL),
    ].filter((v): v is string => Boolean(v)),
  ),
);

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: googleAuthEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  account: {
    // Signing in with Google using the same email as an existing
    // password account links the two instead of failing.
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        // Every new account starts with the default discovery watchlist.
        after: async (user) => {
          await prisma.company.createMany({
            data: DEFAULT_WATCHLIST.map((c) => ({ ...c, enabled: true, userId: user.id })),
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
