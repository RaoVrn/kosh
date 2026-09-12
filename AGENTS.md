# AGENTS.md

Primary context file for AI coding agents (and humans) working on **Kosh**.

---

## What Kosh is

Kosh is a personal "second brain" / life-management app. One place to dump
anything from your phone — tasks, reminders, ideas, notes, things to learn,
links, things people asked you to do — and have Kosh organize them and remind
you when necessary.

> **Capture everything. Forget nothing. Do what matters.**

## Current Project Status

```
ALL FIVE CONTENT TYPES + REMINDERS + NOTIFICATIONS + SEARCH + SMART & VOICE CAPTURE
+ INBOX PROCESSING QUEUE + TODAY COMMAND CENTER + RECURRING TASKS
```

- **API (`apps/api`)**: `/api/v1/items` CRUD for all five types + FTS5 search +
  `/api/v1/notifications` + `/api/v1/capture/interpret` (AI-suggested,
  validated `CaptureResult`; never persists) + `/api/v1/transcribe`
  (multipart audio → text). Reminder scheduler fires exactly once. Root `.env`
  auto-loaded on startup (`src/env.ts`).
- **Recurring tasks**: recurrence (`none|daily|weekly|monthly`) + `recurrenceId`
  on items (tasks only, validated server-side, migration `006`). Completing a
  recurring task runs an atomic SQLite transaction
  (`recurrence/service.ts`): mark done → calculate next occurrence on the
  local calendar (`recurrence/calculation.ts`, month-end clamped) → create
  exactly ONE active next occurrence with the same metadata, reminder offset,
  and series id. Idempotent (done/archived can't re-generate); deleting or
  archiving never replaces. Clients refresh after completing a recurring task.
- **Inbox is a processing queue**: quick per-card actions (Process → active,
  Archive, Convert to task, Open link); editing an inbox item in the detail
  editor moves it to `active`; the inbox badge counts `status = inbox` live.
- **Today is the command center**: Overdue → Due today → Up next (deterministic
  precedence, no duplicates) + unread Reminders + Recently captured; greeting
  and quick actions (New capture/task/note/idea/learning). Shared logic in
  `getTodayCommandCenter` (`packages/shared`).
- **Web**: keyboard shortcuts `N`/`T`/`/` (guarded while typing), Escape closes
  the detail modal, status chips (incl. archive) in the detail editor.
- **Mobile**: same processing actions (thumb-friendly), Today sections,
  status chips in the detail sheet.
- Mock data is only an explicit seed (`npm run db:seed -w @kosh/api`) and test
  fixtures.
- No auth, push, recurring reminders, or semantic search yet.
- Next milestone: **Phase 8 — Polish and deployment** (see `docs/ROADMAP.md`).

This status section must be updated whenever a milestone completes or the
architecture changes.

## Architecture (summary)

- **Monorepo** — npm workspaces: `apps/mobile`, `apps/web`, `apps/api`,
  `packages/shared`.
- **Data flow:** both clients → shared API client (`@kosh/shared`) → Hono API
  (`/api/v1/items`) → SQLite. The backend is the source of truth; clients
  never store data independently.
- **Mobile:** Expo SDK + React Native + TypeScript. Dark, minimal, text-first.
  8 screens, responsive shell (custom navigation: bottom tabs on mobile,
  sidebar on desktop). Runs on web via React Native Web.
- **Web:** Vite + React + TypeScript (web-first laptop/desktop client), same
  8 screens, CSS-mirrors the shared design tokens.
- **API:** Hono on Node 26, TypeScript, run via `tsx` (dev and start). CORS
  for localhost dev origins. Hand-rolled validation.
- **DB:** SQLite via Node's built-in `node:sqlite` (`DatabaseSync`). Migrations
  are plain SQL in `apps/api/migrations/`, applied once and tracked in a
  `schema_migrations` table. Default DB at `apps/api/data/kosh.db`.
- **Reminders:** in-process scheduler in `apps/api` (interval
  `KOSH_REMINDER_INTERVAL_MS`, default 30000) → `NotificationService` →
  `notifications` table. Exactly-once via `reminded_at`.
- **Search:** SQLite FTS5 `items_fts` over `title`/`body`/`url`/`tags`,
  synced by triggers (migration `005`). `GET /api/v1/items?q=…` with bm25
  ranking, `type`/`status` filters, `limit`/`offset`. Client Search screens
  use the shared `useServerSearch` hook (debounced ~300 ms).
- **Smart Capture:** `POST /api/v1/capture/interpret` → `AiProvider` (one
  OpenAI-compatible `fetch` implementation, env-only) → validated
  `CaptureResult` **suggestion** → client preview → user confirms →
  `POST /api/v1/items`. Never automatic; original text always preserved.
- **Voice:** `POST /api/v1/transcribe` (multipart → text, transient) behind
  `TranscriptionProvider`; mobile records via `expo-audio`, web via
  `MediaRecorder` where supported.
- **Shared:** `@kosh/shared` holds the API contract types, design tokens,
  platform-neutral utilities, the typed API client, mock data (seed/tests
  only), and the API-backed `ItemsProvider` + `NotificationsProvider` +
  `useServerSearch` + `useSmartCapture`.
- **No auth** in the MVP, **no push**, **no ORM**, **no state library**, **no
  UI kit**, **no react-navigation** (custom shells) yet — these are deliberate
  (see `docs/DECISIONS.md`).

Full detail: `docs/ARCHITECTURE.md` · `docs/PRODUCT.md` · `docs/DECISIONS.md`.

## Project structure

```
apps/
  api/            Hono HTTP API (TypeScript, Node 26)
    migrations/   SQL migration files, applied once & tracked (schema_migrations)
    src/
      index.ts    server bootstrap (open DB → migrate → scheduler → listen)
      app.ts      Hono app / routes / CORS / error handling / service injection
      db.ts       SQLite connection + migration runner
      items/      repo.ts (row mapping + CRUD + FTS search) · validation.ts
                  search.ts (safe FTS query builder)
      ai/         config.ts · types.ts (AiProvider/TranscriptionProvider)
                  providers/openaiCompatible.ts
                  capture/ (prompt.ts · validate.ts · service.ts)
                  transcription/service.ts
      reminders/  scheduler.ts (clock-injected, exactly-once)
      notifications/ repo.ts
      routes/     HTTP handlers (health, items, notifications, capture, transcribe)
      seed.ts     explicit mock-data seed (npm run db:seed)
    test/         vitest tests (items, search, reminders, notifications,
                  types, smart capture + transcription with fake providers)
  mobile/         Expo app (React Native, TypeScript)
    src/
      components/ shared UI (AppShell, ItemCard, CaptureInput, ItemCreateSheet,
                  SmartCaptureSheet, VoiceCaptureSheet, TagInput, …)
      screens/     one file per screen (Inbox, Today, Tasks, Notes, Ideas,
                  Learning, Links, Search, Notifications, Settings)
      notifications/ plan.ts (pure) · schedule.ts (expo-notifications)
      state/       React context (navigation)
      navigation/  screen names + icons
    test/         vitest tests for utils + reminder plan
  web/            Vite + React app (laptop/desktop, TypeScript)
    src/
      components/ web UI (Shell, Sidebar, ItemCard, ItemCreateModal,
                  SmartCaptureModal, VoiceCaptureModal, TagInput, …)
      screens/     one file per screen (same 10 screens as mobile)
      state/       navigation context
      test/        vitest + Testing Library interaction tests (fetch-mocked)
packages/
  shared/         Types, tokens, utils, mock data (seed/tests only),
                  typed API client, ItemsProvider, NotificationsProvider,
                  useServerSearch, useSmartCapture
docs/             PRODUCT / ARCHITECTURE / ROADMAP / DECISIONS
```

## How to run the project

Prerequisites: **Node 26+**, **npm 11+**. No Docker, no database server.

```
npm install          # install all workspaces (hoisted at root)
npm run dev:api      # API on http://localhost:3001 (auto-reload)
npm run dev:mobile   # Expo dev server / Metro (press w for web)
npm run dev:web      # Web client on http://localhost:3000 (Vite)
npm run start -w @kosh/api   # run the API (same code as dev, no watch)
npm run db:seed -w @kosh/api # seed mock items (only when the table is empty)
```

Environment (all optional):

- `PORT` — API port (default `3001`).
- `KOSH_DB_PATH` — SQLite file path (default `apps/api/data/kosh.db`).
- `KOSH_REMINDER_INTERVAL_MS` — reminder scheduler tick (default `30000`).
- `EXPO_PUBLIC_API_URL` — API base URL the mobile app calls (default
  `http://localhost:3001`; use the host LAN IP when testing on a real device).
- `VITE_API_URL` — API base URL the web app calls (default
  `http://localhost:3001`).
- `AI_API_KEY` — enables Smart Capture + transcription (absent → 503
  "not configured", everything else keeps working).
- `AI_BASE_URL` — OpenAI-compatible endpoint (default `https://api.openai.com/v1`;
  for Groq use `https://api.groq.com/openai/v1`).
- `AI_MODEL` — interpretation model (default `gpt-4o-mini`).
- `TRANSCRIPTION_MODEL` — transcription model (default `whisper-large-v3-turbo`,
  valid on both Groq and OpenAI — `whisper-1` is NOT valid on Groq).
- `AI_TIMEOUT_MS` — provider timeout (default `15000`).
- `TRANSCRIPTION_TIMEOUT_MS` — transcription timeout (default `30000`).

The API automatically loads a **root `.env`** (monorepo root) at startup via
`apps/api/src/env.ts` — real environment variables always take precedence over
`.env` values. This is why a single root `.env` works with `npm run dev` from
the repository root. `.env` is git-ignored; never commit credentials.

See `.env.example`. Never commit real API keys.

## How to run tests / checks

```
npm run typecheck    # tsc --noEmit across all workspaces
npm run lint         # ESLint across all workspaces
npm test             # vitest (API + shared client + mobile utils + web interaction)
npm run build        # build API to dist/ + web app to dist/
```

Run all verification before finishing any task. **Never claim something works
without actually running it.**

## How to make changes safely

- **Check first, write second.** Read existing code before creating anything —
  do not duplicate functionality that already exists.
- **Keep the MVP simple.** If a change needs a new dependency, a new abstraction,
  or a new service, ask yourself (and ideally the user) whether it earns its
  place. Add dependencies only with a reason; prefer Node built-ins.
- **Keep components modular** but do not create abstractions before there is
  real duplication. One screen, one file. One route, one file.
- **Don't rewrite working code unnecessarily.** Prefer small, targeted edits.
  If code works and only needs an extension, extend it — don't refactor it.
- **Don't break the docs contract.** The API contract and shared logic live in
  `@kosh/shared` and must stay in sync with the API and both clients. If a
  change affects both mobile and web (types, tokens, utils, item behavior),
  make it in `packages/shared` — do not copy it into a single client.
- **Don't introduce auth, AI, voice, or complex UI** unless explicitly asked —
  these are later phases.
- **Only commit when the user asks.**

## Coding conventions

- **TypeScript everywhere.** Strict mode is on (`tsconfig.base.json`).
- **Plain style:** no semicolons, single quotes, ~100-char lines (Prettier).
  Run `npx prettier --write .` to format.
- **API:** Hono, routes under `/api/v1/*`. Success responses are
  `{ "data": … }`; errors are `{ "error": { "message": "…" } }`. ISO-8601 UTC
  strings for all timestamps; the server generates `id`/`createdAt`/`updatedAt`
  (never trust the client's).
- **Recurrence:** stored as `recurrence_frequency` (`none|daily|weekly|monthly`)
  - `recurrence_weekdays` (JSON) + `recurrence_month_day` on `items`; tasks
    only; server-validated; `recurrenceId` links occurrences of one series.
    Calculation is local-calendar (`recurrence/calculation.ts`); completion is
    transactional and idempotent (`recurrence/service.ts`).
- **DB:** use `node:sqlite`. New schema changes = a new numbered SQL file in
  `apps/api/migrations/`, applied once and tracked in `schema_migrations`.
  Prefer additive, non-destructive changes.
- **Mobile:** plain `StyleSheet` + the shared design-tokens module for the
  dark theme. No UI kit, no state library, no react-navigation (custom
  responsive shell: bottom tabs on mobile, sidebar on desktop).
  **Platform guards:** the mobile app also runs on web (Expo). Native-only
  APIs (`expo-notifications` scheduling, permissions, etc.) must be guarded by
  `Platform.OS` checks — `canUseLocalNotifications(Platform.OS)` in
  `src/notifications/platform.ts` is the pattern; never call native-only
  notification APIs on web.
- **Web:** plain CSS (one `styles.css` mirroring the shared tokens) + small
  React components. No CSS framework, no component library, no router —
  a `NavContext` drives the screens.
- **Naming:** `camelCase` for code, `snake_case` for DB columns,
  `kebab-case` for files. PascalCase for React components/types.
- **No code comments unless they explain a non-obvious decision.** Prefer clear
  code over comments.

## Keeping documentation current

- Update **`docs/ARCHITECTURE.md`** whenever the architecture changes.
- Update **`docs/DECISIONS.md`** whenever an important architectural or product
  decision is made (what + why).
- Update **`docs/ROADMAP.md`** checkboxes as phases/tasks complete.
- Update **`AGENTS.md`** (this file) — especially the **Current Project Status**
  — when the state of the project changes materially.

## The point of the product (never lose sight of it)

- **Capture is zero-friction** — the user must never be forced to choose a
  category when capturing. Everything lands in an inbox.
- **Organize later, automatically** — classification is a later, automatic
  step, not a capture-time burden.
- **Dark, minimal, fast.**
