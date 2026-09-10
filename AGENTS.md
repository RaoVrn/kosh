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
TWO CLIENTS (MOBILE + WEB) ON MOCK DATA / BACKEND PENDING
```

- **Mobile (`apps/mobile`)**: full application shell with 8 screens — Inbox,
  Today, Tasks, Notes, Ideas, Learning, Search, Settings. Dark, minimal,
  mobile-first UI with a responsive layout (bottom tab bar + capture button on
  mobile, sidebar on desktop). Inbox quick-capture, item detail sheet (edit
  type/priority/due/body, mark done, delete), client-side search, and rich
  mock data.
- **Web (`apps/web`)**: Vite + React + TypeScript, runs at
  `http://localhost:3000`. The same 8 screens, web-first layout (sidebar on
  desktop, compact top nav below 768px), capture input, item detail dialog,
  client-side search. Interaction tests via vitest + Testing Library.
- **Shared (`packages/shared`)**: types, design tokens, pure utilities, mock
  data, and the `ItemsProvider` item-state context are shared by **both**
  clients — one seam to swap for API-backed state in Phase 2.
- **API (`apps/api`)**: foundation only (`GET /api/v1/health`). No CRUD.
- Both clients use local/mock state; **nothing is wired to the API yet**.
- Next milestone: **Phase 2 — implement `/api/v1/items` CRUD and wire both
  clients to it** (see `docs/ROADMAP.md`).

This status section must be updated whenever a milestone completes or the
architecture changes.

## Architecture (summary)

- **Monorepo** — npm workspaces: `apps/mobile`, `apps/web`, `apps/api`,
  `packages/shared`.
- **Mobile:** Expo SDK + React Native + TypeScript. Dark, minimal, text-first.
  8 screens, responsive shell (custom navigation: bottom tabs on mobile,
  sidebar on desktop). Runs on web via React Native Web.
- **Web:** Vite + React + TypeScript (web-first laptop/desktop client), same
  8 screens, CSS-mirrors the shared design tokens.
- **API:** Hono on Node 26, TypeScript, run via `tsx`.
- **DB:** SQLite via Node's built-in `node:sqlite` (`DatabaseSync`). No server,
  no native deps. Migrations are plain SQL in `apps/api/migrations/`.
- **Shared:** `@kosh/shared` holds the API contract types, design tokens,
  platform-neutral utilities, mock data and `ItemsProvider` — used by both
  clients (including `Item.priority` and `Item.tags` — the future backend
  schema must include them).
- **No auth** in the MVP, **no AI**, **no voice**, **no ORM**, **no state
  library**, **no UI kit**, **no react-navigation** (custom shells) yet —
  these are deliberate (see `docs/DECISIONS.md`).

Full detail: `docs/ARCHITECTURE.md` · `docs/PRODUCT.md` · `docs/DECISIONS.md`.

## Project structure

```
apps/
  api/            Hono HTTP API (TypeScript, Node 26)
    migrations/   SQL migration files, applied in order on startup
    src/
      index.ts    server bootstrap (open DB → migrate → listen)
      app.ts      Hono app / route registration
      db.ts       SQLite connection + migration runner
      routes/     HTTP handlers
    test/         vitest tests
  mobile/         Expo app (React Native, TypeScript)
    src/
      components/ shared UI (AppShell, ItemCard, CaptureInput, …)
      screens/     one file per screen (Inbox, Today, Tasks, …)
      state/       React context (navigation) with mock data
      navigation/  screen names + icons
    test/         vitest tests for utils
  web/            Vite + React app (laptop/desktop, TypeScript)
    src/
      components/ web UI (Shell, Sidebar, ItemCard, …)
      screens/     one file per screen (same 8 screens as mobile)
      state/       navigation context
      test/        vitest + Testing Library interaction tests
packages/
  shared/         Shared types, design tokens, utils, mock data, ItemsProvider
docs/             PRODUCT / ARCHITECTURE / ROADMAP / DECISIONS
```

## How to run the project

Prerequisites: **Node 26+**, **npm 11+**. No Docker, no database server.

```
npm install          # install all workspaces (hoisted at root)
npm run dev:api      # API on http://localhost:3001 (auto-reload)
npm run dev:mobile   # Expo dev server / Metro (press w for web)
npm run dev:web      # Web client on http://localhost:3000 (Vite)
```

Environment (all optional):

- `PORT` — API port (default `3001`).
- `KOSH_DB_PATH` — SQLite file path (default `apps/api/data/kosh.db`).
- `EXPO_PUBLIC_API_URL` — API base URL the mobile app calls (default
  `http://localhost:3001`; use the host LAN IP when testing on a real device).
- `VITE_API_URL` — API base URL the web app calls (default
  `http://localhost:3001`).

## How to run tests / checks

```
npm run typecheck    # tsc --noEmit across all workspaces
npm run lint         # ESLint across all workspaces
npm test             # vitest (API + mobile utils + web interaction)
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
- **API:** Hono, routes under `/api/v1/*`. Errors are
  `{ "error": { "message": "…" } }`. ISO-8601 UTC strings for all timestamps.
- **DB:** use `node:sqlite`. New schema changes = a new numbered SQL file in
  `apps/api/migrations/` that is idempotent (`IF NOT EXISTS`).
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
