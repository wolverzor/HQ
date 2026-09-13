# HQ

Your personal headquarters — a calm, fast home for tasks, time-blocking, and
finance opportunities, in one app.

This is **V1**: a home dashboard, task manager, time-blocking calendar, and a
finance opportunity tracker with a company watchlist and a working
discovery/verification flow. It's a single-user app (no login) designed to be
installed as a PWA on desktop and mobile.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling, hand-built UI primitives on **Radix UI**
- **Prisma** ORM — **SQLite** for local dev (zero setup), swappable to
  **Postgres** for production (see [Deploying to Vercel](#deploying-to-vercel))
- **TanStack Query** for client-side data fetching, caching and optimistic
  updates
- **dnd-kit** for drag-and-drop (task reordering, dragging tasks onto the
  calendar, moving/resizing time blocks)
- **next-themes** for light/dark mode
- A minimal hand-written **service worker** + Next.js `manifest.ts` for PWA
  installability (no `next-pwa` dependency)

## Getting started

```bash
npm install
npm run db:migrate   # creates prisma/dev.db and applies the schema
npm run db:seed      # loads realistic demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app is seeded with
example tasks, time blocks, and finance opportunities so you can see how
everything connects immediately.

Other useful scripts:

```bash
npm run build       # production build (also runs prisma generate + migrate deploy)
npm run lint         # ESLint
npm run db:studio    # Prisma Studio — browse/edit the local database
```

## Data model

See [`prisma/schema.prisma`](prisma/schema.prisma). Core entities:

- **User** — single seeded user for V1 (no auth yet)
- **Project** — lightweight optional grouping for tasks
- **Task** — title (only required field), description, deadline, priority,
  category, estimated duration, status, optional project, optional linked
  opportunity
- **TimeBlock** — a scheduled slot on the calendar, optionally linked to a
  Task
- **Company** — a watchlist entry with a careers URL and enabled/disabled
  monitoring
- **Opportunity** — a tracked finance programme, with separate `status`
  (your application pipeline) and `verificationStatus` (how sure HQ is that
  it's real) fields, plus `source`/`sourceUrl`/`officialUrl`/`lastVerifiedAt`
- **CheckRun** — a log entry for each "Check opportunities" run against a
  company, so scheduled automatic checks can be layered on later without
  changing the data model

## How the pieces connect

- Dragging a task onto the calendar creates a **linked** `TimeBlock`
  (`TimeBlock.taskId`). Completing that block marks the task done.
- Clicking **Start Application** on an opportunity sets its status to
  *Applying*, and creates a task (`Task.opportunityId`) with the deadline
  carried over and category set to *Finance / Career* — which immediately
  shows up in the task list and can be dragged onto the calendar.
- The **Check** button on a watchlist company (and **Check all now** for
  every enabled company at once) does a real fetch of its careers page and
  scans for relevant keywords (spring week, insight programme, first-year/
  off-cycle internship, summer analyst, division names, etc.). Matches are
  recorded as new opportunities tagged **Needs Verification** — HQ never
  invents a deadline, opening date, or marks something **Confirmed Open** on
  its own. See [`src/lib/discovery.ts`](src/lib/discovery.ts).
- The seed data ships with a broad default watchlist (~40 companies) spanning
  investment banking, private equity, asset management, and sales & trading /
  hedge funds / quant, so discovery isn't limited to firms you add yourself.

## Deploying to Vercel

The app deploys like any standard Next.js app, **with one required change**:
SQLite's `dev.db` file lives on the local filesystem, which Vercel's
serverless functions don't persist between requests. Before deploying, switch
the datasource to a hosted Postgres database (both have generous free tiers):

1. Create a database — [Neon](https://neon.tech) or
   [Vercel Postgres](https://vercel.com/storage/postgres) both work.
2. In [`prisma/schema.prisma`](prisma/schema.prisma), change:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   to:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Delete the `prisma/migrations` folder (SQLite and Postgres migrations
   aren't compatible) and run `npx prisma migrate dev --name init` once
   locally against the new `DATABASE_URL` to generate fresh Postgres
   migrations — commit the new `prisma/migrations` folder.
4. In your Vercel project settings, add a `DATABASE_URL` environment
   variable pointing at your Postgres database.
5. Push to your Git provider and import the repo in Vercel — it will run
   `npm run build`, which runs `prisma generate && prisma migrate deploy`
   automatically before building.
6. Run `npm run db:seed` once against the production `DATABASE_URL` (locally,
   with `DATABASE_URL` set in your shell) if you want the same demo data live.

Everything else — the PWA manifest, icons, and service worker — works out of
the box on Vercel with no extra configuration.

## Automatic hourly opportunity checks

[`vercel.json`](vercel.json) defines a Vercel Cron job that hits
`/api/cron/check-all` once an hour, which runs the same discovery check
described above against every enabled watchlist company. This starts working
automatically the moment the project is deployed to Vercel — no extra setup
beyond deploying — but you should still add one environment variable so the
endpoint can't be triggered by anyone else who finds the URL:

1. In your Vercel project settings, add a `CRON_SECRET` environment variable
   set to any long random string (e.g. `openssl rand -hex 32`).
2. Vercel automatically sends that value as an `Authorization: Bearer
   <CRON_SECRET>` header on every cron invocation — the route checks it
   matches before running. Without `CRON_SECRET` set, the endpoint runs
   unauthenticated (fine for local testing, not for production).

Cron jobs only run once a project is deployed — there's no way to get a true
"every hour, even when your laptop is off" schedule without a deployment.
Locally (or any time before you deploy), use the **Check all now** button on
the Watchlist tab to run the same check on demand.

**On the scope of "discovery":** this checks a curated list of company
careers pages (see [`prisma/seed.ts`](prisma/seed.ts) for the ~40 seeded
firms, or add your own) for keyword mentions — it does not crawl the open
web to find companies you haven't listed. Genuinely open-ended web discovery
("find every finance internship on the internet") would need a search API
(Google Programmable Search, Bing Web Search, SerpAPI, etc.), which needs an
API key and a billing account that only you can set up. If you want that
wired in, get an API key from one of those and it's a small, additive change
to `src/lib/discovery.ts` — happy to build it once you have one.

## What's next

See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for what's built, known issues,
and what's intentionally deferred to a later version.
