// Finds the Postgres connection string among the env vars that Vercel's
// Storage integrations create. Prisma Postgres, Neon and legacy Vercel
// Postgres use different names (and an optional custom prefix), and an empty
// DATABASE_URL copied over from .env.example must not win over a real one.

const PREFERRED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "PRISMA_DATABASE_URL"];
const SUFFIXES = ["_DATABASE_URL", "_POSTGRES_PRISMA_URL", "_POSTGRES_URL"];

const isDbUrl = (value) => typeof value === "string" && /^(postgres(ql)?|prisma\+postgres):\/\//.test(value.trim());

/** @param {Record<string, string | undefined>} env */
export function resolveDatabaseUrl(env = process.env) {
  for (const key of PREFERRED) {
    if (isDbUrl(env[key])) return env[key].trim();
  }
  for (const [key, value] of Object.entries(env)) {
    if (SUFFIXES.some((s) => key.endsWith(s)) && !key.includes("UNPOOLED") && isDbUrl(value)) return value.trim();
  }
  return undefined;
}
