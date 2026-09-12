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
ALL FIVE CONTENT TYPES + TASKS/REMINDERS + NOTIFICATIONS + SERVER-SIDE SEARCH
```

- **API (`apps/api`)**: `/api/v1/items` CRUD for **all five types** (task,
  note, idea, learning, link) with type-specific validation (`link` requires a
  valid http(s) URL; reminders task-only) + FTS5 search (`?q=…`, filters,
  limit/offset, bm25) + `/api/v1/notifications`, on Hono + SQLite, tracked
  migrations, CORS, explicit `db:seed`. In-process reminder scheduler fires
  due reminders exactly once.
- **Mobile (`apps/mobile`)**: 10 screens incl. **Links**; Notes/Ideas/
  Learning/Links have dedicated create sheets and are fully CRUD; Learning
  backlog grouped by priority/status; tags editable everywhere; search is
  server-side (debounced).
- **Web (`apps/web`)**: Vite + React on `http://localhost:3000`, same screens;
  generic New-item modal per type, tag editing, detail editor with URL + tags,
  links screen with external-open.
- **Shared (`packages/shared`)**: typed API client, `ItemsProvider` (+
  `search`), `NotificationsProvider`, `useServerSearch`, task/learning
  grouping utils, url utils, types.
- Type conversion = in-place `PATCH` of `type` (same id, content preserved) —
  the future AI-classification workflow.
- Mock data is only an explicit seed (`npm run db:seed -w @kosh/api`) and test
  fixtures.
- No AI, voice, auth, push, recurring reminders, or semantic search yet.
- Next milestone: **Phase 7 — Smart Capture + Voice** (see `docs/ROADMAP.md`).

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
- **Shared:** `@kosh/shared` holds the API contract types, design tokens,
  platform-neutral utilities, the typed API client, mock data (seed/tests
  only), and the API-backed `ItemsProvider` + `NotificationsProvider` +
  `useServerSearch`.
- **No auth** in the MVP, **no AI**, **no voice**, **no ORM**, **no state
  library**, **no UI kit**, **no react-navigation** (custom shells) yet —
  these are deliberate (see `docs/DECISIONS.md`).

Full detail: `docs/ARCHITECTURE.md` · `docs/PRODUCT.md` · `docs/DECISIONS.md`.

## Project structure

```
apps/
  api/            Hono HTTP API (TypeScript, Node 26)
    migrations/   SQL migration files, applied once & tracked (schema_migrations)
    src/
      index.ts    server bootstrap (open DB → migrate → scheduler → listen)
      app.ts      Hono app / routes / CORS / error handling
      db.ts       SQLite connection + migration runner
      items/      repo.ts (row mapping + CRUD + FTS search) · validation.ts
                  search.ts (safe FTS query builder)
      reminders/  scheduler.ts (clock-injected, exactly-once)
      notifications/ repo.ts
      routes/     HTTP handlers (health, items, notifications)
      seed.ts     explicit mock-data seed (npm run db:seed)
    test/         vitest tests (health, items CRUD, search, reminders,
                  notifications, content types + conversion)
  mobile/         Expo app (React Native, TypeScript)
    src/
      components/ shared UI (AppShell, ItemCard, CaptureInput, ItemCreateSheet,
                  TagInput, …)
      screens/     one file per screen (Inbox, Today, Tasks, Notes, Ideas,
                  Learning, Links, Search, Notifications, Settings)
      notifications/ plan.ts (pure) · schedule.ts (expo-notifications)
      state/       React context (navigation)
      navigation/  screen names + icons
    test/         vitest tests for utils + reminder plan
  web/            Vite + React app (laptop/desktop, TypeScript)
    src/
      components/ web UI (Shell, Sidebar, ItemCard, ItemCreateModal, TagInput, …)
      screens/     one file per screen (same 10 screens as mobile)
      state/       navigation context
      test/        vitest + Testing Library interaction tests (fetch-mocked)
packages/
  shared/         Types, tokens, utils, mock data (seed/tests only),
                  typed API client, ItemsProvider, NotificationsProvider,
                  useServerSearch
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
- **DB:** use `node:sqlite`. New schema changes = a new numbered SQL file in
  `apps/api/migrations/`, applied once and tracked in `schema_migrations`.
  Prefer additive, non-destructive changes.
- **Mobile:** plain `StyleSheet` + the shared design-tokens module for the
  dark theme. No UI kit, no state library, no react-navigation (custom
  responsive shell: bottom tabs on mobile, sidebar on desktop).
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
