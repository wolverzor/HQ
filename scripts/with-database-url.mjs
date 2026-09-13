// Runs a command (e.g. `prisma migrate deploy`) with DATABASE_URL resolved
// from whichever database env var is actually set — see database-url.mjs.
import { spawnSync } from "node:child_process";
import { resolveDatabaseUrl } from "./database-url.mjs";

// Local builds keep the URL in .env (Vercel injects real env vars instead).
// loadEnvFile never overrides variables that are already set.
try {
  process.loadEnvFile();
} catch {
  // No .env file.
}

const url = resolveDatabaseUrl();
if (!url) {
  console.error(
    "\nNo Postgres connection string found (checked DATABASE_URL, POSTGRES_URL, PRISMA_DATABASE_URL and prefixed variants).\n" +
      "On Vercel: open the project's Storage tab, create or connect a Postgres database to this project, then redeploy.\n",
  );
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(command, args, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(result.status ?? 1);
