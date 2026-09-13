# HQ — Project Status

_Last updated: 2026-09-13_

## Completed (V1)

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
- **Start Application** action: sets status to Applying, creates a linked
  task (deadline carried over, category Finance / Career) that immediately
  appears in the task list and calendar side panel

**Opportunity discovery**
- Company watchlist: add/remove, enable/disable monitoring
- **Check opportunities**: real fetch of the company's careers page, scanned
  for relevant keywords (spring week, insight programme, internship, division
  names, etc.). Matches are recorded as opportunities tagged **Needs
  Verification** with the source URL and a timestamp — deadlines, opening
  dates and application links are never invented, and nothing is
  auto-marked Confirmed Open
- `CheckRun` log per company (start/finish time, success, message, match
  count) — architecture is in place for a scheduled/automatic version later
  without any data-model changes

**Data & demo data**
- Prisma schema covering User, Project, Task, TimeBlock, Company,
  Opportunity, CheckRun — SQLite for local dev, documented one-step swap to
  Postgres for deployment (see README)
- Seed script with realistic tasks, time blocks, companies and opportunities

## Current

Nothing in progress — V1 scope is feature-complete and manually tested
(desktop + mobile viewport, light + dark mode) via the flows above,
including a real end-to-end discovery check against a live careers page.

## Known issues

- **SQLite won't persist on Vercel** — must switch `prisma/schema.prisma`'s
  datasource to Postgres before deploying (documented step-by-step in
  `README.md`). This is the one required step before going live.
- The opportunity discovery keyword scan is intentionally simple (plain-text
  keyword matching, no structured parsing) so it stays honest and doesn't
  silently misreport dates. Some careers pages block automated requests or
  render entirely client-side (JS-rendered content won't appear in the
  fetched HTML) — those show up as a failed/empty check rather than a false
  positive, by design.
- No automatic/scheduled checking yet — "Check opportunities" is manual
  only (see Future features).
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
generator, finance news, complex notifications, multi-user auth, and any
broader "HQ" modules beyond the four covered here.

Natural next steps when V1 is ready to grow:
- Scheduled/automatic opportunity checks (the `CheckRun` model and
  `runCompanyCheck()` function are already structured for a cron job to
  call directly)
- Real auth (the whole app is scoped through a single `DEMO_USER_ID`
  constant, so adding multi-user support is additive, not a rewrite)
- Richer opportunity discovery (structured parsing per known career-site
  platforms, still verification-gated)
- Undo for destructive actions; styled confirm dialogs
