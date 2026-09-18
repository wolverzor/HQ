# HQ — Project Status

_Last updated: 2026-09-18_

## Completed (V1)

**Accounts & deployment readiness**
- Sign in with **Google** or **email + password** (Better Auth, database
  sessions, 30-day sessions). Google is only enabled once OAuth credentials
  are configured; until then the login page says so rather than showing a
  button that fails
- Styled `/login` page with sign-in / create-account modes, inline errors,
  and a safe `?next=` redirect back to the page you came from
- Account menu (sidebar on desktop, avatar on mobile) with sign-out, which
  also clears cached query data and the service-worker cache
- Every row is owned by a user: all API routes scope by the session user,
  return 401 without a session, and reject linking another user's
  project/task/opportunity/company (verified with two accounts)
- New accounts start with the ~50-company default watchlist
- Postgres everywhere (local `prisma dev`, Neon in production), with a
  committed Postgres migration applied automatically on deploy
- Scheduled discovery runs across all accounts, fetching each careers page
  once per run; hourly via GitHub Actions, daily via Vercel Cron

**Shell & design**
- Responsive app shell: desktop sidebar nav, mobile bottom nav with a
  floating quick-add button, mobile top bar
- Light/dark mode (system-aware, toggle in sidebar) with a calm, premium
  design system (Inter font, custom color tokens, soft shadows, restrained
  radii) — built on Tailwind v4 + hand-rolled Radix-based UI primitives
- PWA: `manifest.ts`, dynamically generated icons (`/icons/[size]`), a
  minimal hand-written service worker (app-shell caching, network-first),
  installable on desktop and mobile

**Task manager**
- Create/edit/delete, complete/reopen, only title required
- Fields: description, deadline, priority, category, estimated duration,
  status, optional project, optional linked opportunity (read-only badge)
- Views: All / Today / Upcoming (7 days) / Completed, with counts
- Sort by manual order (drag to reorder via dnd-kit), deadline, or priority
- Filter by category
- Fast quick-add (dialog with a collapsed "Add details" section) plus an
  inline quick-add bar on the dashboard

**Time-blocking calendar**
- Day and week views, vertical time grid, live "now" indicator, today
  highlight
- Click-drag on empty grid to create a block (opens a small title/time
  dialog)
- Drag existing blocks to a new time/day; resize from the top or bottom edge
- Full edit/delete dialog per block; marking a block complete also completes
  its linked task
- Side panel of unscheduled tasks (collapses to a bottom sheet on mobile);
  drag a task onto the grid to create a linked block, duration taken from
  the task's estimate (defaults to 30 min)

**Home dashboard**
- Today: schedule (time blocks) + today's/overdue tasks
- Upcoming: tasks due in the next 7 days
- Finance opportunities: newly added + approaching deadlines
- Inline quick-add

**Finance opportunity tracker**
- Full field set: company, programme, division, programme type, location,
  opening date, deadline, application link, status, date applied, notes,
  source, source URL, official URL, verification status, last checked/
  verified
- Status pipeline (Not Open → ... → Offer/Rejected/Closed) and a separate
  verification status (Confirmed Open / Needs Verification / Closed /
  Unknown), filterable list sorted by deadline
- **Spreadsheet view**: the Tracker tab is a real editable data grid (sortable
  columns, inline-editable cells for every field — text, date, and dropdown —
  no dialog needed for routine edits) instead of a card list. See
  `src/components/opportunities/opportunity-sheet.tsx`.
- **Start Application** action: sets status to Applying, creates a linked
  task (deadline carried over, category Finance / Career) that immediately
  appears in the task list and calendar side panel

**Opportunity discovery**
- Company watchlist: add/remove, enable/disable monitoring, pre-filled for
  every new account with a broad default list of ~50 major employers across
  investment banking, private equity, asset management, and sales & trading
  / hedge funds / quant (see `src/lib/default-watchlist.ts`) — not limited
  to companies you add yourself
- **Check** (per company) and **Check all now** (every enabled company):
  a real fetch of the careers page, scanned for relevant keywords (spring
  week, insight programme/day, first-year/off-cycle internship, summer
  analyst, division names, etc.). Matches are recorded as opportunities
  tagged **Needs Verification** with the source URL and a timestamp —
  deadlines, opening dates and application links are never invented, and
  nothing is auto-marked Confirmed Open. Standard "Summer" programmes are
  still surfaced but flagged in their notes as normally penultimate-year
  only, since that can't be told apart from a first-year programme by
  keyword matching alone (see below)
- **Automatic hourly checks in production**: a GitHub Actions workflow calls
  `/api/cron/check-all` every hour (Vercel's Hobby plan only allows daily
  cron, which `vercel.json` keeps as a backstop). The endpoint requires
  `CRON_SECRET` in production (see README)
- `CheckRun` log per company (start/finish time, success, message, match
  count)

**Data & demo data**
- Prisma schema covering the auth tables plus Project, Task, TimeBlock,
  Company, Opportunity, CheckRun — on Postgres
- Local-only seed script (refuses non-localhost databases) with a demo
  account (`demo@hq.local` / `hq-demo-password`) and realistic tasks, time
  blocks, companies and opportunities

## Finance Opportunity Engine (FOE) — Phases 1-3 complete

A high-recall monitoring engine for early-career finance opportunities, built
inside HQ (not a separate app). Lives at **Finance Opportunities** in the
sidebar; the original tracker is preserved at `/opportunities/tracker`.

**Guiding principle:** missing an eligible programme, or finding it late, is a
system failure. Recall beats tidiness, and a source we could not check is never
reported as "nothing found".

### Phase 1 — data foundation (done)
- **Global firm universe** (`Firm`, `FirmSource`, `Programme`,
  `ProgrammeHistory`) — shared across accounts, so a new user inherits the whole
  universe instead of rediscovering the industry. The legacy per-user
  `Company`/`Opportunity` tracker is untouched.
- **Canonical opportunities** (`FoeOpportunity` + `OpportunitySource`,
  `OpportunitySnapshot`) with an 11-state lifecycle. `EXPECTED` (predicted),
  `ANNOUNCED` (employer said so) and `OPEN` (verified live application) are
  distinct states and never blur.
- **Monitoring tables**: `ScanRun`, `ScanResult`, `SourceFailure`, `ScanLock`
  (overlap protection for the hourly sweep).
- **Per-user overlay**: `WatchlistItem`, `FoePreferences`, `AlertSubscription`,
  `Alert` (unique `dedupeKey` — the database itself prevents duplicate alerts),
  `Application` (links to an HQ `Task`).
- **Pure rule modules** in `src/lib/foe/`: `taxonomy` (all programme terms and
  divisions in one editable file — never just "spring week"), `sources`
  (official vs discovery hierarchy), `status` (`canMarkOpen`, transition rules),
  `fingerprint` (dedupe), `eligibility`, `priority` (explainable buckets and
  reasons, no opaque score), `expected-window`, `alerts`, `applications`,
  `scan-lock`.
- **57 tests** (`npm test`) covering the invariants the engine's honesty rests
  on: a tracker/search result can never produce `OPEN`; an official verified
  source can; a failed scraper becomes `UNREACHABLE`, never `CLOSED`; history
  produces a hedged window, never a date; `UNCLEAR` eligibility is never
  silently filtered; one programme found six ways is one row and one alert;
  hot watch fires on imminent and overdue openings; concurrent sweeps are
  blocked while a lease is live.

### Phase 2 — interface (done)
Recreated from the supplied reference design, using HQ's existing tokens,
primitives and layout.
- **Overview** (`/opportunities`): four clickable summary counters (Open / New
  Today / Opening Soon / Urgent) that act as filters; "Priority for you" cards
  with opened/verified recency; "Opening soon" panel; searchable, filterable,
  sortable open-opportunities table (desktop table, mobile cards).
- **Opening soon** (`/opportunities/opening-soon`): Timeline | Calendar.
  Confirmed openings use a solid marker and an exact date; expected ones use a
  dashed marker, a hedged period, and say how many past cycles they rest on.
- **Watchlist** (`/opportunities/watchlist`): per-item WhatsApp / in-app / email
  channels.
- **Applications** (`/applications`): stage pipeline fed by "Mark applied",
  which also creates an HQ task (Finance / Career, deadline carried over).
- **Detail drawer**: state meaning, eligibility verdict *with its reasoning*,
  verification method and timestamp, and every source marked Official or
  Discovery.
- **Filter drawer**, **notification settings** (WhatsApp explicitly opt-in, with
  a recorded consent timestamp), and an unobtrusive **engine health indicator**
  ("Last scan 20:36 · All critical sources healthy") whose popover lists open
  source failures.
- Filters persist in `localStorage`; the list states plainly how many rows the
  filters are hiding and offers one click to show everything.

### Phase 3 — monitoring framework (done)
The engine that actually watches the universe. Modules in
[`src/lib/foe/engine/`](src/lib/foe/engine):

- **`fetcher`** — conditional requests (ETag / If-Modified-Since), timeouts, and
  failure *classification*: 403 is `BLOCKED`, 404 is `CAREERS_URL_MISSING`, 429
  is `RATE_LIMITED`. Also detects a bot wall that returns HTTP 200, which would
  otherwise parse as "a careers page with no programmes on it".
- **`content`** — HTML to text, normalisation that strips timestamps, tokens and
  view counters (without it every page looks changed every hour), a stable
  content hash, and deterministic change classification. An unchanged page costs
  one conditional request and stops; only a change with real signal —
  application opened/closed, deadline, eligibility — is escalated.
- **`queue`** — bounded concurrency with per-domain spacing, an overall run
  budget, and failure isolation: one broken careers page never ends a sweep.
- **`health`** — pure health transitions (three strikes to FAILING, a bot wall
  is BLOCKED immediately), severity by tier, and a baseline check that flags a
  sweep whose yield collapses — the only way to catch a broken parser when every
  source still returns 200.
- **`adapters`** — the normalisation seam. Every source becomes a list of
  `Candidate`s. Ships the generic text adapter (works everywhere, no
  credentials); ATS adapters register in front of it in Phase 4.
- **`dedupe`** — the write path. Finds or creates the canonical row by
  fingerprint, attaches evidence, then asks `canMarkOpen` whether the row may
  become OPEN. There is no other route into that state.
- **`lock`** + **`sweep`** — the orchestrator, with a database lease so an
  hourly sweep can never overlap itself, plus hot-watch refresh, scan-run
  recording and cron-miss detection.

**Schedule**: `.github/workflows/foe-sweep.yml` runs the full sweep hourly and
the hot watch every 10 minutes (`/api/foe/cron/sweep`, `/api/foe/cron/hot-watch`);
`vercel.json` keeps a daily sweep as a backstop. A 409 from either endpoint means
a run is already in flight and is treated as success, not failure.

**Firm universe**: [`src/lib/foe/firm-universe.ts`](src/lib/foe/firm-universe.ts)
promotes the 50-firm roster to global `Firm` + `FirmSource` rows, idempotently
(`POST /api/foe/universe/sync`).

**Verified against live sites**: a real sweep covered 50 firms / 50 sources in
~25s, discovered 20 genuine opportunities, and classified 17 real failures
(403 blocks, dead careers URLs) as failures rather than as "nothing found".

**Not yet built (Phases 4-10)**: ATS adapters, per-posting verification, the
alert delivery pipeline, search-based discovery, and admin tooling.

## Themes

Four themes plus System, chosen from the sidebar: **Light**, **Dark**, **Navy**
(a deep navy rail against a light workspace — the reference design's look) and
**Midnight** (navy throughout). The sidebar draws from its own `--sidebar-*`
token set, which is what allows a dark rail beside a light working area without
darkening the whole app.

### Demo data
`prisma/foe-demo.ts` seeds 22 firms and 28 opportunities, **every row flagged
`isDemo: true`**, including deliberately awkward cases: a third-party-only
discovery that cannot become OPEN, and a 403-blocked source that surfaces as
UNREACHABLE rather than "no opportunities". The dashboard shows a Demo data
banner while they are present. `clearFoeDemoData()` removes them without
touching live rows.

### Not yet built (Phases 3-10)
The monitoring backend: scheduler and worker queue, ATS adapters
(Greenhouse/Lever/Workday/...), content hashing and change detection, official
verification, self-learning source discovery, the alert delivery pipeline
(WhatsApp provider), broad search discovery, and admin health tooling. The
schema, the rule modules and the UI are all in place for them.

## Current

FOE Phases 1-3 are complete and manually tested (desktop + mobile viewport,
light + dark mode). FOE Phase 4 (ATS adapters) is the next step.

The original V1 scope below remains feature-complete and manually tested
(desktop + mobile viewport, light + dark mode) via the flows above,
including a real end-to-end discovery check against a live careers page.

## Known issues

- **Not deployed yet** — needs a Vercel account, a Neon database and env vars
  set up by you (step-by-step in `README.md`). Google sign-in additionally
  needs an OAuth client from Google Cloud Console.
- **No password reset or email verification** — both need an email-sending
  service (e.g. Resend) and API key. Until then a forgotten password can't
  be recovered from the app; signing in with Google avoids that.
- Hourly checks depend on GitHub Actions scheduled runs, which GitHub can
  delay by a few minutes under load (or on a Vercel Pro plan, switch
  `vercel.json` to hourly instead).
- Locally, `prisma dev`'s Postgres needs `pgbouncer=true&connection_limit=1`
  on `DATABASE_URL` (already in `.env.example`) or queries fail with
  "prepared statement already exists".
- The opportunity discovery keyword scan is intentionally simple (plain-text
  keyword matching, no structured parsing) so it stays honest and doesn't
  silently misreport dates. Some careers pages block automated requests or
  render entirely client-side (JS-rendered content won't appear in the
  fetched HTML) — those show up as a failed/empty check rather than a false
  positive, by design.
- Discovery only covers the companies on your watchlist (~50 by default, plus
  any you add) — it does not crawl the open web for firms you haven't listed.
  True open-ended discovery needs a search API (Google Programmable Search /
  Bing / SerpAPI), which needs an API key only you can obtain — see README.
- "First-year eligible" is inferred from programme-type keywords (Spring
  Week, Insight, First-Year/Off-Cycle Internship), not verified — a keyword
  scan can't actually confirm a specific programme's year-of-study
  eligibility. Standard "Summer Analyst" mentions are surfaced too but
  flagged as normally penultimate-year-only in their notes, since summer
  programmes and first-year programmes aren't reliably distinguishable from
  page text alone.
- A handful of `eslint-disable` comments remain in dialog components and the
  calendar, for the (very new, quite aggressive) `react-hooks/set-state-in-
  effect` rule flagging standard "reset a form when a dialog opens" and
  "read the clock/viewport on mount" patterns. Reviewed individually; none
  indicate an actual bug.
- Company deletion and a couple of destructive actions use the browser's
  native `confirm()` rather than a styled confirmation dialog.

## Future features (explicitly deferred — not built in V1)

Per the brief, none of these are in V1: Gmail integration, AI assistant /
brain dump / scheduling, psychometric tracker, finance learning tracker,
university coursework system, interview preparation tools, cover-letter
generator, finance news, complex notifications, and any broader "HQ"
modules beyond the four covered here.

Natural next steps when V1 is ready to grow:
- Password reset + email verification (needs an email provider API key)
- Real, open-web opportunity discovery via a search API (Google Programmable
  Search / Bing / SerpAPI) instead of a curated watchlist — needs an API key
- Richer opportunity discovery (structured parsing per known career-site
  platforms, still verification-gated) and LLM-assisted eligibility
  classification (year-of-study, graduation year) — would reintroduce "AI"
  scope the original brief deferred, so worth a deliberate decision when
  the time comes
- Undo for destructive actions; styled confirm dialogs
