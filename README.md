# HQ

Your personal headquarters — a calm, fast home for tasks, time-blocking, and
finance opportunities, in one app.

A home dashboard, task manager, time-blocking calendar, and a finance
opportunity tracker with a company watchlist and a working
discovery/verification flow. Accounts sign in with **Google** or
**email + password**, every account's data is private to it, and the app is
installable as a PWA on desktop and mobile.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling, hand-built UI primitives on **Radix UI**
- **Prisma** ORM on **Postgres** — locally via `prisma dev`, in production
  via [Neon](https://neon.tech) (or any Postgres)
- **Better Auth** for sign-in (Google OAuth + email/password, database
  sessions)
- **TanStack Query** for client-side data fetching, caching and optimistic
  updates
- **dnd-kit** for drag-and-drop (task reordering, dragging tasks onto the
  calendar, moving/resizing time blocks)
- **next-themes** for light/dark mode
- A minimal hand-written **service worker** + Next.js `manifest.ts` for PWA
  installability (no `next-pwa` dependency)

## Getting started (local)

```bash
npm install
npx prisma dev -n hq -d      # starts a local Postgres in the background, prints its URL
cp .env.example .env         # then paste that URL into DATABASE_URL / DATABASE_URL_UNPOOLED
npx prisma migrate deploy    # applies the schema
npm run db:seed              # demo account + realistic demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the demo
account — **demo@hq.local** / **hq-demo-password** — or create your own
account (new accounts start empty, with the default company watchlist).

Set `BETTER_AUTH_SECRET` in `.env` to any long random string. Google sign-in
stays disabled (the button says so) until `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` are set — see [Google sign-in](#google-sign-in).

Other useful scripts:

```bash
npm run build       # production build (also runs prisma generate + migrate deploy)
npm run lint        # ESLint
npm run db:studio   # Prisma Studio — browse/edit the database
```

The seed script wipes the database first, so it refuses to run against
anything but a localhost database.

## Data model

See [`prisma/schema.prisma`](prisma/schema.prisma). Core entities:

- **User / Session / Account / Verification** — Better Auth's tables. An
  `Account` row is either a Google login or a hashed password.
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
- **CheckRun** — a log entry for each discovery check against a company

### Finance Opportunity Engine (FOE)

FOE's tables are the opposite shape and deliberately so — the firm universe and
the opportunities it verifies are **global**, discovered once and overlaid per
user, so a new account inherits the whole universe:

- **Firm / FirmSource** — the persistent finance firm universe and every source
  monitored for it (ATS, careers page, early-careers page, programme page,
  sitemap, announcement). `FirmSource.hotWatchUntil` marks a source for
  10-minute checks instead of hourly.
- **Programme / ProgrammeHistory** — the recurring identity behind a yearly
  opportunity, and its past cycles, which produce an *expected opening window*.
- **FoeOpportunity** — the canonical opportunity, keyed by a `fingerprint`
  (firm + programme + year + category + location) so the same programme found
  six ways is one row. Its `state` distinguishes `EXPECTED` (predicted from
  history), `ANNOUNCED` (the employer stated a date) and `OPEN` (a live
  application was verified on an official source). **These never blur.**
- **OpportunitySource / OpportunitySnapshot** — every place it was seen, marked
  official or discovery, plus content hashes over time.
- **ScanRun / ScanResult / SourceFailure / ScanLock** — monitoring runs, health,
  and a lease that stops two sweeps overlapping.
- **WatchlistItem / FoePreferences / AlertSubscription / Alert / Application** —
  the per-user overlay. `Alert.dedupeKey` is unique, so the database itself
  prevents one programme becoming six WhatsApp messages.

The rules live as pure, tested modules in
[`src/lib/foe/`](src/lib/foe) — run them with `npm test`.

Every non-FOE row belongs to a user. API routes read the user from the session
([`src/lib/session.ts`](src/lib/session.ts)), scope every query by it, and
check that any linked id in a request body (project, task, opportunity,
company) belongs to the same user.

## How the pieces connect

- **Auth**: [`src/proxy.ts`](src/proxy.ts) sends visitors without a session
  cookie to `/login`; [`src/app/(app)/layout.tsx`](<src/app/(app)/layout.tsx>)
  validates the session for real before rendering any page, and every API
  route returns 401 without one.
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
- **FOE** (`Finance Opportunities` in the sidebar) is the front door of the
  opportunities section; the original spreadsheet tracker and company watchlist
  are preserved at `/opportunities/tracker`. Clicking **Mark applied** on a FOE
  opportunity creates an `Application` *and* an HQ task, so FOE feeds the
  existing task/calendar system rather than duplicating it.
- FOE only shows an opportunity as **OPEN** once a live application has been
  verified on the employer's own domain or a known ATS. A third-party tracker or
  search result can raise a candidate but never verify one
  ([`src/lib/foe/status.ts`](src/lib/foe/status.ts)). A source that could not be
  reached becomes `UNREACHABLE` — never "no opportunities found".
- **The sweep** runs hourly (`/api/foe/cron/sweep`) over every source in the
  global universe, and a **hot watch** runs every 10 minutes
  (`/api/foe/cron/hot-watch`) over firms whose programme is about to open. Both
  are driven by `.github/workflows/foe-sweep.yml`; a database lease stops two
  runs overlapping, and a 409 response means "already running", not an error.
  See [`src/lib/foe/engine/`](src/lib/foe/engine).
- Each source check is conditional (ETag / If-Modified-Since) and hash-compared,
  so an unchanged page costs almost nothing and is never re-analysed. Failures
  are classified — blocked, missing URL, rate limited, CAPTCHA — and surfaced in
  the health indicator instead of becoming a silent zero.
- `POST /api/foe/universe/sync` (idempotent) builds the global firm universe
  from [`src/lib/foe/firm-universe.ts`](src/lib/foe/firm-universe.ts).
- **Themes**: Light, Dark, Navy and Midnight, picked from the sidebar. Navy puts
  a deep navy rail beside a light workspace; the sidebar has its own
  `--sidebar-*` tokens so it can be themed independently.
- `npm run db:seed` also seeds a FOE demo universe (22 firms, 28 opportunities)
  with **every row flagged `isDemo: true`**, so sample programmes can never be
  mistaken for live openings. See [`prisma/foe-demo.ts`](prisma/foe-demo.ts).
- Every new account starts with a broad default watchlist (~50 companies)
  spanning investment banking, private equity, asset management, and sales &
  trading / hedge funds / quant — see
  [`src/lib/default-watchlist.ts`](src/lib/default-watchlist.ts).

## Deploying to Vercel

1. **Push this repo to GitHub** and import it at
   [vercel.com/new](https://vercel.com/new) (framework: Next.js — no build
   settings to change). The first build will fail until steps 2–3 are done;
   that's expected.
2. **Database**: add **Prisma Postgres** (offered during import) or **Neon**
   from the project's **Storage** tab, and connect it to the project with no
   custom env-var prefix. This sets `DATABASE_URL` automatically. (Using
   another Postgres host? Set `DATABASE_URL` yourself.)
3. **Environment variables** (Settings → Environment Variables):
   - `BETTER_AUTH_SECRET` — a long random string (`openssl rand -base64 32`)
   - `CRON_SECRET` — another long random string
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional, see below
   - `BETTER_AUTH_URL` — only needed with a custom domain (the
     `*.vercel.app` production URL is detected automatically)
4. **Redeploy**. The build runs `prisma migrate deploy`, creating the tables.
5. Open the site and **Create an account**.

The production database starts empty — there's no demo data there, and you
shouldn't run the seed against it.

### Google sign-in

1. Go to [Google Cloud Console → APIs & Services](https://console.cloud.google.com/apis/credentials),
   create (or pick) a project, and configure the **OAuth consent screen**
   (External; add your own Google account as a test user, or publish it).
2. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorised JavaScript origin: `https://<your-app>.vercel.app`
   - Authorised redirect URI: `https://<your-app>.vercel.app/api/auth/callback/google`
   - (For local testing, also add `http://localhost:3000` and
     `http://localhost:3000/api/auth/callback/google`.)
3. Put the client ID and secret into `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET` on Vercel and redeploy.

Signing in with Google using the same email as an existing password account
links the two rather than creating a duplicate.

## Automatic hourly opportunity checks

`/api/cron/check-all` runs the discovery check for every account's enabled
watchlist companies (each careers page is fetched once per run, however many
accounts watch it). In production it only runs with
`Authorization: Bearer <CRON_SECRET>`.

Two things call it:

- **GitHub Actions, hourly** —
  [`.github/workflows/hourly-discovery.yml`](.github/workflows/hourly-discovery.yml).
  Vercel's free Hobby plan only allows once-a-day cron jobs, so the hourly
  schedule lives here. Add two repository secrets (GitHub → Settings →
  Secrets and variables → Actions): `APP_URL` (e.g.
  `https://hq-yourname.vercel.app`) and `CRON_SECRET` (same value as on
  Vercel). Until they're set the workflow skips itself. GitHub may delay
  scheduled runs by a few minutes at busy times.
- **Vercel Cron, daily** — [`vercel.json`](vercel.json), as a backstop. On a
  Vercel Pro plan you can change its schedule to `0 * * * *` and drop the
  GitHub workflow.

Any time, **Check all now** on the Watchlist tab runs the same check for your
account on demand.

**On the scope of "discovery":** this checks a curated list of company
careers pages for keyword mentions — it does not crawl the open web to find
companies you haven't listed. Genuinely open-ended web discovery would need
a search API (Google Programmable Search, Bing Web Search, SerpAPI, etc.),
which needs an API key and a billing account that only you can set up. It's
a small, additive change to `src/lib/discovery.ts` once you have one.

## What's next

See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for what's built, known issues,
and what's intentionally deferred to a later version.
