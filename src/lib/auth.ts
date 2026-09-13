import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { DEFAULT_WATCHLIST } from "@/lib/default-watchlist";

// Google sign-in is only switched on when both credentials exist, so the app
// still works (email + password) before a Google OAuth client is set up.
export const googleAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// On Vercel the production URL is known without extra config; BETTER_AUTH_URL
// still wins when set (e.g. a custom domain).
const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

export const auth = betterAuth({
  baseURL,
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
