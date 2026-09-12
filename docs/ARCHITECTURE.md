# Kosh — Architecture

This is the technical architecture for the MVP. It is deliberately simple.

## Overview

**Kosh has two client applications:**

1. **Mobile client** (`apps/mobile`) — Expo / React Native, the primary phone
   surface (iOS/Android; also runs on web via React Native Web).
2. **Web client** (`apps/web`) — Vite + React, the laptop/desktop browser
   surface, a web-first interface.

**Both clients communicate with the same backend API (`apps/api`).** The
backend is now the **source of truth**. Data is **NOT** stored independently
in the mobile and web applications — both go through the same shared API
client (`@kosh/shared`), the same REST API, and the same SQLite database.

```
Web ───────────────────┐
                       │
Mobile ─────────────┐  │
                   ↓  ↓
         shared API client (@kosh/shared)
                   ↓
             Hono REST API (/api/v1/items)
                   ↓
              SQLite (single file)
```

Concretely:

```
Web                    Mobile
 ↓                       ↓
API client (shared)      API client (shared)
 ↓                       ↓
Hono API                 Hono API
 ↓                       ↓
SQLite                   SQLite
```

The mock dataset is no longer a source of truth — it exists only as an
explicit, opt-in seed (`npm run db:seed -w @kosh/api`) and as test fixtures.

```
┌──────────────────┐    ┌──────────────────┐     HTTP / JSON      ┌───────────────────┐
│  apps/mobile      │    │  apps/web        │ ──────────────────► │  apps/api (Hono)   │
│  Expo / RN / TS   │    │  Vite / React/TS │                     │  Node 26 / TS      │
└──────────────────┘    └──────────────────┘ ◄────────────────── │                    │
      one codebase,          web-first UI,      JSON responses   │       │            │
      mobile-first UI        laptop/desktop                      │       │ node:sqlite│
                                                                 │       ▼            │
                                                                 │  SQLite file       │
                                                                 └───────────────────┘
```

- One repository (npm workspaces monorepo).
- Both clients share `packages/shared`: types, constants, design tokens, pure
  utilities, mock data, and the item-state context.
- The API is the only system of record; it persists to a SQLite file.

## Clients

All five content types (Task, Note, Idea, Learning, Link) are represented by
the **same `Item` model** and the same `/api/v1/items` endpoints — there are no
separate tables or endpoints per type:

```
                 Item
                   │
       ┌───────────┼───────────┐
       │           │           │
     Task        Note        Idea
       │           │           │
   Learning       Link
```

- `type` distinguishes them; type-specific rules are validated in
  `apps/api/src/items/validation.ts` (e.g. `link` requires a valid http(s)
  `url`; reminders only on tasks).
- The **Inbox** is the universal capture layer: captures start as `status =
'inbox'` items and can be converted in place (same id) to any type via
  `PATCH` — the same workflow future AI classification will use.
- Tags live on the `Item.tags` field (no separate tag table) and are FTS5
  indexed.

### Mobile client (apps/mobile)

- **Stack:** Expo SDK + React Native + TypeScript.
- **Screens:** 8 — Inbox, Today, Tasks, Notes, Ideas, Learning, Search,
  Settings. One file per screen under `src/screens/`.
- **Navigation:** custom responsive shell (see DECISIONS D11) — bottom tab bar
  with a center capture button on mobile, sidebar on desktop (≥768px).
  Screens are rendered from a `screen` value in a React context.
- **Rendering:** React Native primitives, styled with plain `StyleSheet` and
  design tokens from `@kosh/shared` (dark theme).
- **Item detail:** a shared bottom-sheet/dialog (`ItemDetailSheet`) opens any
  item for viewing and editing (type, priority, due date, body, done, delete).

### Web client (apps/web)

- **Stack:** Vite + React + TypeScript. Runs at `http://localhost:3000`.
- **Purpose:** the laptop/desktop surface. Web-first: sidebar navigation on
  wide screens, a compact top nav bar under 768px. It intentionally is _not_
  a second mobile app — it uses the wider screen with a content column.
- **Screens:** the same 8 screens, one file per screen under `src/screens/`.
- **Rendering:** plain HTML/CSS with a single `styles.css` that mirrors the
  `@kosh/shared` design tokens (same dark visual identity as mobile).
- **Item detail:** a centered dialog (`ItemDetailModal`) with the same
  edit/done/delete model as mobile.
- **Navigation:** a `NavContext` (screen + selected item + capture focus);
  responsive via `window.innerWidth` (sidebar ↔ compact top bar).

### Shared package (packages/shared)

- Types & constants (`Item`, `ItemType`, `Priority`, `ScreenName`, …).
- Design tokens (`colors`, `spacing`, `radius`, `layout`, `typeColors`, …).
- Pure utilities used by both clients: time formatting/grouping, search,
  labels, id generation.
- **Typed API client** (`createItemsApi`) — the single HTTP boundary both
  clients use: `getItems / getItem / createItem / updateItem / deleteItem`.
  It handles HTTP errors, malformed responses, and network failures and throws
  friendly `Error`s.
- **Item state** (`ItemsProvider` / `useItems`) — API-backed React context
  shared by both clients. It exposes `items`, `loading`, `error`, `refresh`,
  `addItem`, `updateItem`, `toggleDone`, `removeItem`. The provider takes a
  `baseUrl` (from each client's env config) and can take an injected `api`
  client for tests.
- Mock data (`createMockItems`) — used only for tests and explicit seeding.

## Backend (apps/api)

- **Stack:** Hono on Node 26, TypeScript, run with `tsx` (dev and `start`).
- **Server lifecycle:** open SQLite DB → apply pending migrations → start HTTP
  listener.
- **Config:** environment variables only — `PORT` (default `3001`) and
  `KOSH_DB_PATH` (default `<repo>/apps/api/data/kosh.db`). No config file, no
  secrets manager.
- **Routes:** versioned under `/api/v1/*` — health plus the full items CRUD.

## Database

- **Engine:** SQLite via Node's built-in `node:sqlite` (`DatabaseSync`) —
  no server, no native dependency.
- **Location:** single file at `apps/api/data/kosh.db` (dev), in-memory for
  tests, opt-in seed data via `npm run db:seed`.
- **Migrations:** plain SQL files in `apps/api/migrations/`, applied in
  filename order **once** (tracked in a `schema_migrations` table). Each
  migration runs inside a transaction; re-running `migrate()` is a no-op.
  New schema changes = a new numbered SQL file. The runner never drops or
  recreates tables, so existing data survives restarts.
- **Schema:** a single `items` table representing every capture:

  | column   | type | notes                                  |
  | -------- | ---- | -------------------------------------- |
  | `id`     | TEXT | PK, generated by the server            |
  | `type`   | TEXT | `task · note · idea · learning · link` |
  | `status` | TEXT | `inbox · active · done · archived`     |
  | `title`  | TEXT | NOT NULL                               |
  | `body`   | TEXT | nullable                               |
  | `url`    | TEXT | nullable (links)                       |

| `due_at` | TEXT | ISO-8601, nullable |
| `reminder_at` | TEXT | ISO-8601, nullable (tasks only) |
| `reminded_at` | TEXT | set by the scheduler when fired |
| `priority` | TEXT | `low · medium · high`, nullable |
| `tags` | TEXT | JSON array, nullable |
| `created_at` | TEXT | ISO-8601, set by the server |
| `updated_at` | TEXT | ISO-8601, set by the server |
| `done_at` | TEXT | set by the server when status → `done` |

All timestamps are ISO-8601 UTC strings. `priority` and `tags` were added by
migration `002`; `reminded_at` by `003` (both additive `ALTER TABLE`s). A
second table, `notifications` (`id, item_id, type, title, body, created_at,
  read_at`), was added by migration `004`. Migration `005` adds the full-text
search index (see Search below).

## API structure

```
GET  /api/v1/health           → liveness + DB check
GET  /api/v1/items            → list items (?type=…&status=…&limit=…&offset=…)
GET  /api/v1/items?q=…        → full-text search (FTS5) + same filters
GET  /api/v1/items/:id        → single item (404 if missing)
POST /api/v1/items            → create (server sets id, createdAt, updatedAt)
PATCH /api/v1/items/:id       → partial update (server bumps updatedAt,
                                sets/clears doneAt with status changes)
DELETE /api/v1/items/:id      → hard delete (404 if missing)
GET  /api/v1/notifications    → list (?unread=true filters)
PATCH /api/v1/notifications/:id → mark read (server sets readAt)
```

Conventions:

- All endpoints under `/api/v1/*`.
- Request/response types come from `@kosh/shared`.
- Success responses wrap the payload: `{ "data": … }` (array for lists).
- Errors are JSON: `{ "error": { "message": "…" } }`.
- Status codes: `201` created · `200` ok · `400` validation error · `404` not
  found · `500` internal error.
- Timestamps are ISO-8601 UTC strings. The server always generates `id`,
  `createdAt`, `updatedAt`, and `doneAt` — clients never supply them.
- Validation is hand-rolled and lightweight (type/status/priority enums,
  required title, max lengths, ISO date checks, id sanity) in
  `src/items/validation.ts`. No validation framework is used.

## CORS / local networking

- The API allows requests from local development origins (`localhost` and
  `127.0.0.1`, any port) via Hono's `cors` middleware — this covers the web
  client on `:3000` and the Expo web output on `:8081`. Native mobile apps
  don't send an `Origin` header and are unaffected.
- No wildcard CORS: non-localhost origins get no CORS headers (dev-only rule,
  documented in `docs/DECISIONS.md`).

## Search (SQLite FTS5)

```
Search UI (web/mobile)
        ↓
Shared API client  →  GET /api/v1/items?q=…
        ↓
SQLite FTS5 (items_fts)
        ↓
items
```

- **Index:** an FTS5 virtual table `items_fts` over `title`, `body`, `url`,
  `tags` (migration `005`), using `content='items'` external content mode.
  Timestamps, status, priority and ids are intentionally **not** indexed.
- **Synchronization:** the index stays in sync automatically via SQL triggers
  (`items_fts_ai/ad/au` on insert/delete/update), so POST/PATCH/DELETE never
  leave the index stale. The migration also runs an FTS5 `rebuild` so **all
  pre-existing items become searchable** without touching the `items` table.
- **Ranking:** results are ordered by FTS5 `bm25(items_fts)` relevance when
  `q` is present; title matches rank above body-only matches.
- **Query safety:** user input is normalized into quoted, alphanumeric tokens
  joined with `AND` (single-char/symbol-only input yields an empty result, never
  a 500). The MATCH expression is always a bound parameter — no raw SQL
  interpolation.
- **Pagination:** `limit`/`offset` (search default `limit=50`, list default
  `limit=1000`, max `1000`), so the API never returns unbounded result sets.
- **No `q`:** behavior is unchanged — full list ordered by `created_at DESC`.
- The mobile/web Search screens use a shared `useServerSearch` hook (debounced
  ~300 ms, stale-response-safe) backed by the shared API client; search state
  is kept separate from the normal item collection.

## Authentication approach

- **Now:** none. The API is designed to run on localhost / a private network
  (single-user personal app). See DECISIONS D7.
- **Later (before any public exposure):** simple token auth — a shared secret
  sent as `Authorization: Bearer <token>`, enforced by a Hono middleware. No
  multi-user accounts.

## Notification / reminder architecture

```
Task
 ↓ reminderAt (+ remindedAt for once-only tracking)
 ↓
ReminderScheduler (in-process, every KOSH_REMINDER_INTERVAL_MS)
 ↓
NotificationService (abstraction — today persists in-app notifications)
 ↓
In-app notification (notifications table + GET/PATCH /api/v1/notifications)
```

- **Model:** one reminder per task for the MVP. `reminder_at` is set on the
  item; `reminded_at` records when the reminder was processed, so a reminder
  can never fire twice. Changing `reminder_at` re-arms the reminder
  (clears `reminded_at`). Completing or archiving a task makes it ineligible.
- **Scheduler:** a lightweight `setInterval` inside `apps/api` (default every
  30 s, configurable via `KOSH_REMINDER_INTERVAL_MS`), started with the API and
  stopped on SIGINT/SIGTERM. It claims each due reminder atomically
  (`UPDATE … WHERE reminded_at IS NULL`, checking the row count) and delivers
  exactly one notification event.
- **Notification service abstraction:** the scheduler depends only on a
  `NotificationService.deliver(db, item)` interface. The MVP implementation
  persists an in-app notification row; future mobile push / web push / email
  are additional implementations. `processDueReminders(db, clock, notifier)`
  accepts an injected clock for tests.
- **In-app notifications:** persisted in a `notifications` table
  (`id, item_id, type, title, body, created_at, read_at`). Exposed via
  `GET /api/v1/notifications` (optional `?unread=true`) and
  `PATCH /api/v1/notifications/:id` (mark read). Both clients render a
  notification center (bell + unread badge) and poll every ~30 s.
- **Web notifications:** a Settings toggle requests the browser Notification
  permission (never on page load) and shows OS notifications for new unread
  reminders when granted. Real web push (service worker) is future work.
- **Mobile notifications:** local notifications are scheduled on the device
  _derived from_ the persisted API data (`planTaskReminders` →
  `syncTaskReminderNotifications` via `expo-notifications`), so there is no
  mobile-only task store. When a task is completed, deleted, or its reminder
  changes, the scheduled local notification is cancelled and re-synced. Full
  delivery can only be verified on a real device / dev build (Expo Go
  limitations are documented).

## Voice transcription architecture

- Phase 6. The mobile app records audio and sends it to a transcription
  service (e.g. OpenAI Whisper / a hosted STT endpoint) via the API.
- The transcribed text then flows through the normal capture pipeline
  (becomes an inbox item), so voice and text are handled identically after
  transcription.
- No on-device transcription in the MVP.

## Future AI processing architecture

- Phase 7. The API will call an LLM (e.g. hosted completions) with the raw
  capture text and ask it to classify the item (`type`), suggest `due_at` /
  `reminder_at`, and extract a clean title/body.
- The LLM output is validated against `@kosh/shared` types before being
  written, so bad LLM output can never corrupt the store.
- This keeps AI as an optional post-processing step: captures always succeed
  even if the AI call fails.

## How clients and backend communicate

- HTTP/JSON over a local network. In development the phone (Expo Go) reaches
  the API at the host machine's LAN IP; the web client reaches it at
  `http://localhost:3001`.
- Both clients go through the shared `createItemsApi(baseUrl)` client in
  `@kosh/shared`; the `ItemsProvider` is the only place that talks to it.
- The mobile app reads its API base URL from `EXPO_PUBLIC_API_URL`
  (defaults to `http://localhost:3001`). When running on a physical device,
  set it to `http://<host-lan-ip>:3001` (the phone's `localhost` is the phone,
  not your Mac).
- The web app reads its API base URL from `VITE_API_URL` (defaults to
  `http://localhost:3001`).
- No WebSockets, no streaming, no GraphQL in the MVP.

## Local development

Prerequisites: Node 26+, npm 11+.

```
npm install            # install everything (hoisted by workspaces)
npm run dev:api        # API on http://localhost:3001 (tsx watch)
npm run dev:mobile     # Expo dev server / Metro (press w for web)
npm run dev:web        # Web client on http://localhost:3000 (Vite)
npm run typecheck      # tsc --noEmit across all workspaces
npm test               # vitest (API + shared client + mobile utils + web interaction)
npm run lint           # ESLint
npm run build          # build the API dist/ + web app dist/
```

Environment: `PORT`, `KOSH_DB_PATH`, `EXPO_PUBLIC_API_URL`, `VITE_API_URL`,
and `KOSH_REMINDER_INTERVAL_MS` (reminder scheduler tick, default 30000).

The API stores its DB in `apps/api/data/kosh.db` (git-ignored). Delete it to
reset local data. To start from the demo dataset instead of an empty inbox,
run `npm run db:seed -w @kosh/api` (only inserts when the table is empty).

## Deployment approach

- **Now:** nothing deployed. Everything runs locally.
- **Later:** the API is a small Node process. Deploy it on any single VM or a
  small container host (e.g. a cheap VPS) with the SQLite file on disk;
  run it with a process manager. The mobile app is distributed via Expo's
  build service (EAS) to app stores / TestFlight.
- Avoid serverless for the MVP: SQLite + a long-running process is simpler and
  cheaper than a stateless serverless DB setup.
- Keep deployment reversible: the DB is a single file, so backups are `cp`.

## What this architecture deliberately does NOT include

- No message queue, no Redis, no Docker required, no cloud services.
- No authentication in the MVP (see above).
- No AI/voice processing in the MVP (later phases).
- No ORM, no state-management library, no UI kit.
- Each of these is a _decision_, not an omission by accident — see
  `docs/DECISIONS.md`.
