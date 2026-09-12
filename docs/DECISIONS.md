# Kosh — Decisions

Every decision below records _what_ was chosen and _why_. Update this file
whenever an important technical or product decision is made.

## Technical decisions

### D1 — Monorepo with npm workspaces

- **Status:** Accepted (foundation)
- **Decision:** One repository containing `apps/mobile` (Expo), `apps/api`
  (Hono server), and `packages/shared` (shared TypeScript types). Uses npm
  built-in workspaces (npm 11+).
- **Why:**
  - One codebase, one PR, shared types between mobile and backend without a
    published package.
  - npm workspaces are already installed — no extra tooling (pnpm/bun) needed.
  - The future web/desktop UI slots in as another `apps/*` workspace.
- **Alternatives rejected:** Separate repos (type duplication, harder to keep in
  sync); pnpm/bun (extra tooling with no real benefit here); a single package
  (blurred boundaries).

### D2 — Expo (React Native) for mobile

- **Status:** Accepted (foundation)
- **Decision:** Mobile app is built with Expo SDK + React Native + TypeScript.
- **Why:**
  - Fastest path to a real iOS/Android app from one codebase.
  - Managed workflow means no native tooling on the dev machine (no Android SDK
    installed; no full Xcode required for most work — Expo Go + web work).
  - The same app can later run on web/desktop via React Native Web if desired.
- **Alternatives rejected:** Flutter (Dart ecosystem separate from the Node
  backend; adds a second language). Native Swift/Kotlin (two codebases, slow
  for an MVP). A pure web app (PWA) — weaker on notifications and voice capture
  on mobile.

### D3 — Hono for the API

- **Status:** Accepted (foundation)
- **Decision:** The backend is a Hono server running on Node 26, written in
  TypeScript, executed with `tsx` in development.
- **Why:**
  - Minimal, fast, TypeScript-first with first-class request validation support
    (usable later with zod).
  - Small surface area; easy for future agents to understand and extend.
  - Runs on plain Node — no serverless-specific coupling; can still be deployed
    anywhere Node runs.
- **Alternatives rejected:** Express (heavier middleware model, no better fit);
  Fastify (more features than the MVP needs); NestJS (framework overhead).

### D4 — SQLite via Node's built-in `node:sqlite`

- **Status:** Accepted (foundation)
- **Decision:** Persistence is a single SQLite file accessed through Node's
  built-in `node:sqlite` (`DatabaseSync`) module.
- **Why:**
  - Zero infrastructure: no database server to install, run, or deploy.
  - Perfect fit for a single-user personal app.
  - Built into Node 22.5+/26 — no native dependency, no `node-gyp`, nothing to
    install.
  - The file DB is trivially backup-able and portable.
- **Alternatives rejected:** PostgreSQL (installed locally but requires running
  a server — unnecessary infrastructure for a personal app); better-sqlite3
  (native module, requires compilation — `node:sqlite` removes the dependency
  entirely); Prisma/Drizzle ORM (extra layer; plain SQL is simpler to audit and
  the MVP schema is small).

### D5 — Plain SQL migrations, no ORM

- **Status:** Accepted (foundation)
- **Decision:** Schema changes are hand-written SQL files in `apps/api/migrations/`
  applied in filename order on startup. No ORM.
- **Why:** The MVP schema is a handful of tables. Plain SQL is transparent,
  easy to review, and has no codegen or magic. An ORM can be added later if the
  schema genuinely grows complex.
- **Decision may be revisited** when/if queries get complicated enough to
  justify it.

### D6 — TypeScript everywhere, shared types package

- **Status:** Accepted (foundation)
- **Decision:** Mobile, API, and a `packages/shared` package are all
  TypeScript. API response/request shapes are defined in `@kosh/shared` and
  imported by both ends.
- **Why:** Compile-time contract between mobile and backend prevents a whole
  class of bugs; no codegen, no OpenAPI round-trip needed for an MVP.

### D7 — No authentication in the MVP foundation

- **Status:** Accepted (foundation)
- **Decision:** The initial API has no auth. It is intended to run on the
  local network / localhost.
- **Why:** Single-user product; auth adds friction to every phase. When the
  API is exposed beyond local use, add a simple token or user/password auth
  (see ROADMAP — hardening step), not before.

### D8 — No state-management library for the mobile app

- **Status:** Accepted (foundation)
- **Decision:** Mobile app uses plain React state + a small fetch/API client.
  No Redux/Zustand/etc. initially.
- **Why:** The MVP is a few screens. Adding a state library before there is a
  real state problem is over-engineering. Revisit if cross-screen state grows.

### D9 — Native React Native styling (StyleSheet), no UI kit

- **Status:** Accepted (foundation)
- **Decision:** UI is styled with plain `StyleSheet` and a small set of dark
  theme tokens. No component library.
- **Why:** A dark, minimal, text-first app needs very few components. A UI kit
  (e.g. NativeBase, Tamagui) adds a dependency and design opinion without
  adding MVP value. A tiny design-tokens file keeps the dark theme consistent.

### D10 — Notifications via push (Expo push) in a later phase

- **Status:** Accepted (foundation, implemented later)
- **Decision:** Reminders will be delivered via Expo push notifications; the
  API stores `reminder_at` and a small scheduler process emits pushes at the
  right time.
- **Why:** Expo's push service is the least-infrastructure way to get reliable
  mobile notifications without running APNs/FCM ourselves.

### D11 — Custom responsive navigation shell, not React Navigation

- **Status:** Accepted (MVP shell)
- **Decision:** Navigation is a small custom shell: a screen name held in React
  context, a bottom tab bar on mobile, a sidebar on desktop, and a bottom-sheet
  detail view for items. No react-navigation, no expo-router.
- **Why:**
  - The MVP needs exactly one level of navigation (sections + one detail
    overlay); a library would add version-matching constraints (RN 0.86 /
    Expo 57) for little gain.
  - A custom shell gives full control over the responsive pattern (bottom tabs
    - center capture button on mobile, sidebar on desktop) that React
      Navigation does not do out of the box.
  - Adding dependencies only when they earn their place (AGENTS.md convention).
- **Revisit if:** deep linking, nested stacks, or complex gestures are needed —
  then adopt expo-router/react-navigation and delete the shell.

### D12 — Desktop/web via React Native Web on the same codebase

- **Status:** Accepted (MVP shell)
- **Decision:** The "desktop" experience is the same `apps/mobile` codebase
  running on the web through React Native Web (`react-dom`, `react-native-web`).
  Responsive layout switches on window width (sidebar ≥ 768px, tab bar below).
- **Why:** One codebase, one UI kit, zero duplication. The phone app stays the
  primary surface; the web build is the secondary surface for testing and quick
  capture from a computer.
- **Alternatives rejected:** A separate `apps/web` (duplicated UI for the same
  screens); a native macOS app (out of scope for MVP).

### D13 — Web client: Vite + React + TypeScript

- **Status:** Accepted (web client)
- **Decision:** `apps/web` is a plain Vite + React + TypeScript single-page
  app, served at `http://localhost:3000`. No framework, no router, no CSS
  framework — a small `NavContext` + one `styles.css` that mirrors the shared
  dark design tokens.
- **Why:**
  - Web-first desktop/laptop UI wants real DOM + CSS; Vite is the simplest
    standard tooling for it.
  - Reuses `@kosh/shared` (types, tokens, utilities, mock data, item state)
    and the same screen set as mobile, so both clients feel like Kosh and swap
    to the same API later.
  - No SSR, no routing library, no component library — intentionally minimal.
- **Alternatives rejected:** React Native Web for `apps/web` (duplicative — the
  mobile app already runs on web; a separate RNW app would add little and be
  harder to keep web-first); Next.js (SSR/complexity not needed for a personal
  tool); a native desktop app (out of scope).

### D14 — Shared package owns mock data + item state

- **Status:** Accepted (web client)
- **Decision:** `@kosh/shared` now contains more than types: design tokens,
  platform-neutral utilities (time, search, grouping, labels, id), the mock
  data generator (`createMockItems`), and the React `ItemsProvider`/`useItems`
  context. Both clients render the same item-state context.
- **Why:** One implementation of item behavior and one mock dataset across
  both clients, and a single seam to replace with API-backed state when the
  backend lands (Phase 2). Avoids two divergent models.
- **Note:** this makes `@kosh/shared` a React library (it declares `react` as a
  peer dependency). API-facing types remain there too.

### D15 — Items schema & server-owned timestamps

- **Status:** Accepted (persistent data)
- **Decision:** One `items` table with `snake_case` columns mirroring the
  shared `Item` model. `tags` is a JSON string column (no normalized tag
  tables). The server always sets `id`, `created_at`, `updated_at`, and
  `done_at`; clients never send timestamps or ids.
- **Status values** stay `inbox · active · done · archived` (not the prompt's
  `pending/completed`) — they already match the shared model, the UI, and the
  mock data. `done_at` is derived server-side: PATCHing status to `done` sets
  it, any other status clears it.
- **Why:** one canonical representation across project (AGENTS.md contract),
  additive schema, no client-generated timestamps to trust.

### D16 — API conventions

- **Status:** Accepted (persistent data)
- **Decision:** Item endpoints return `{ "data": … }` (array for lists);
  errors are `{ "error": { "message": "…" } }`. Hard DELETE (`204`, then
  `404` on a missing id). Hand-rolled validation in
  `apps/api/src/items/validation.ts` (enums, required title, max lengths,
  ISO-date checks, id sanity) instead of a validation framework.
- **Why:** consistent client/server contract, tiny API surface, and a
  lightweight validator is all the model needs (no framework dependency).

### D17 — Migration runner tracks applied migrations

- **Status:** Accepted (persistent data)
- **Decision:** The migration runner now records applied files in a
  `schema_migrations` table and applies only pending ones, each inside a
  transaction. Migration `002` adds `priority`/`tags` via additive
  `ALTER TABLE` (non-destructive).
- **Why:** the old runner re-ran every SQL file on each start (safe only with
  `IF NOT EXISTS` everywhere); `ALTER TABLE ADD COLUMN` can't be idempotent,
  and destructive recreation is unacceptable. Tracking keeps existing data
  safe across restarts (see prompt §18).

### D18 — Shared typed API client + API-backed ItemsProvider

- **Status:** Accepted (persistent data)
- **Decision:** `@kosh/shared` exposes `createItemsApi(baseUrl)` — the single
  typed HTTP boundary (`getItems/getItem/createItem/updateItem/deleteItem`)
  used by both clients. The shared `ItemsProvider` is API-backed: it exposes
  `items / loading / error / refresh / addItem / updateItem / toggleDone /
removeItem`, updates state only from server responses (no optimistic
  pretend-success), and surfaces failures via an `error` state (plus rethrowing
  on `addItem` so the capture input can preserve text).
- **Why:** one API client, one state implementation, one seam — web and mobile
  can't diverge, and the provider accepts an injected client for tests.
- **Note:** mutations set the shared `error` state (shown as a banner with a
  Retry); `addItem` additionally rethrows so screens keep failed input.

### D19 — Environment configuration & CORS

- **Status:** Accepted (persistent data)
- **Decision:** API base URLs are env-driven per client:
  `VITE_API_URL` (web, default `http://localhost:3001`) and
  `EXPO_PUBLIC_API_URL` (mobile, default `http://localhost:3001`; set to
  `http://<mac-lan-ip>:3001` for physical-device testing). The API enables
  CORS only for `localhost`/`127.0.0.1` origins (Hono `cors`), covering the
  web client `:3000` and Expo web `:8081`.
- **Why:** no hard-coded production URLs; phone `localhost` means the phone,
  so the mobile URL must be configurable; localhost-only CORS is safer than a
  wildcard for a personal tool.

### D20 — API runs via `tsx` in dev and production

- **Status:** Accepted (persistent data)
- **Decision:** `apps/api` runs from TypeScript source with `tsx`
  (`npm run dev` = watch, `npm run start` = run). `npm run build` still
  type-checks and emits `dist/` as a verification artifact.
- **Why:** `@kosh/shared` ships as TypeScript source (also consumed by
  Metro/Vite), which plain `node` cannot load from the compiled API output.
  `tsx` runs the same code in dev and prod, avoiding a shared-package build
  step; it is declared in the API's dependencies so a production install has
  it.

### D21 — One reminder per task; `reminded_at` for once-only processing

- **Status:** Accepted (tasks/reminders)
- **Decision:** MVP supports a single `reminder_at` per task. `reminded_at`
  (migration `003`) records the processing time; the scheduler claims reminders
  atomically (`UPDATE … WHERE reminded_at IS NULL` + row-count check) so a
  reminder can never produce more than one notification, including across API
  restarts. Changing `reminder_at` clears `reminded_at` (re-arms); completing
  or archiving a task makes it ineligible.
- **Why:** minimal persistence, exactly-once semantics without a queue.

### D22 — Reminder rules

- **Status:** Accepted (tasks/reminders)
- **Decision:** `reminderAt` is only valid on tasks; `reminderAt` must not be
  after `dueAt` (both are ISO-8601). A past reminder is allowed and simply
  fires on the next scheduler tick (documented, predictable behavior).
- **Why:** "only tasks have task-specific reminder behavior" per scope, and a
  useful 400 for the reminder-after-due case; past reminders are treated as
  "remind me now".

### D23 — Scheduler as an in-process loop with an injectable clock

- **Status:** Accepted (tasks/reminders)
- **Decision:** `apps/api` runs a `setInterval` (default 30 s, configurable via
  `KOSH_REMINDER_INTERVAL_MS`) that calls
  `processDueReminders(db, clock, notifier)`. The clock and notification
  service are injected so tests simulate 09:59/10:00/10:01 without waiting.
  The loop starts with the API and is cleared on SIGINT/SIGTERM. No Redis,
  queues, or external infrastructure.
- **Why:** testable, no new infrastructure, honest MVP.

### D24 — NotificationService abstraction + persisted in-app notifications

- **Status:** Accepted (tasks/reminders)
- **Decision:** The scheduler depends on `NotificationService.deliver(db,
item)`. The MVP implementation persists a row in the `notifications` table
  (migration `004`: `id, item_id, type, title, body, created_at, read_at`),
  exposed via `GET`/`PATCH /api/v1/notifications`. Mobile push / web push /
  email are future implementations of the same interface.
- **Why:** the scheduler never knows the delivery channel; in-app notifications
  are the reliable MVP channel.

### D25 — Mobile local notifications derived from API data

- **Status:** Accepted (tasks/reminders)
- **Decision:** The mobile app schedules **local** notifications on-device
  (`expo-notifications`) but the plan is derived from the persisted API item
  list (`planTaskReminders` → `syncTaskReminderNotifications`), and re-synced
  whenever items change. There is no mobile-only task store. Delivery can only
  be verified on a real device/dev build; Expo Go limitations are documented.
  Web push (service worker) is deferred.

### D26 — SQLite FTS5 is the search engine

- **Status:** Accepted (search)
- **Decision:** Search is implemented entirely with SQLite FTS5 (migration
  `005`): a virtual `items_fts` table (external-content mode over `title`,
  `body`, `url`, `tags`), ordered by `bm25`. **Why FTS5:** Kosh is a
  single-user, local-first application; FTS5 gives fast, ranked full-text
  search inside the existing SQLite database with **no additional
  infrastructure** — no Elasticsearch/Meilisearch/Typesense/vector DB.
  Embeddings/semantic retrieval are explicitly future work.

### D27 — Search index synchronization via triggers

- **Status:** Accepted (search)
- **Decision:** `items_fts` is kept in sync automatically by SQLite triggers
  (`items_fts_ai/ad/au` on INSERT/DELETE/UPDATE), so every mutation path
  (POST/PATCH/DELETE) updates the index atomically within the same statement —
  no application-level sync that could silently drift. The migration ends with
  an FTS5 `rebuild`, backfilling **existing** items into the index without
  touching the `items` table.
- **Why:** correctness and zero application bookkeeping; SQLite guarantees the
  trigger runs in the same transaction as the write.

### D28 — Safe FTS query normalization + pagination

- **Status:** Accepted (search)
- **Decision:** User queries are normalized into quoted alphanumeric tokens
  joined with `AND` (single-char/symbol-only input yields empty results, never
  a 500), and the MATCH expression is always a bound parameter — no raw SQL
  interpolation. `?q=` accepts `limit`/`offset` (search default 50, list
  default 1000, max 1000) so the API never returns unbounded result sets.
- **Why:** injection-safe and crash-free for arbitrary user text
  (`C++`, `Rahul's`, `-`, `:`…), with predictable (not perfect-recall) results.
  Cursor pagination deferred — offset pagination is sufficient for the MVP.

### D29 — One `Item` model for all content types

- **Status:** Accepted (content types)
- **Decision:** Task, Note, Idea, Learning and Link all remain one `Item`
  record distinguished by `type`. There are **no separate tables, endpoints or
  client models** per type — `POST/PATCH/GET/DELETE /api/v1/items` with the
  right `type` is the entire API.
- **Why:** matches the product reality (a capture is a capture), keeps the
  backend minimal, and makes future AI classification a simple field update.

### D30 — Inbox is the universal capture layer; conversion preserves the id

- **Status:** Accepted (content types)
- **Decision:** Captures always land with `status='inbox'`. Converting an item
  to another type is a plain `PATCH` of `type` — same id, title/body/url/tags
  and timestamps preserved, `updatedAt` bumped, never a duplicate. This is the
  exact workflow AI classification will automate later.
- **Why:** zero-friction capture + in-place organization; the manual
  conversion path is the future AI path.

### D31 — Type-specific validation (minimal)

- **Status:** Accepted (content types)
- **Decision:** Validation adds only what each type genuinely needs: `link`
  requires a valid http(s) `url`; any supplied `url` must be a valid http(s)
  URL; reminders stay task-only. Optional fields (priority on notes, url on
  ideas, …) are **not** rejected.
- **Why:** prevents malformed data without a validation framework or
  over-rejection.

### D32 — Detail editing keeps live autosave; creation uses Save

- **Status:** Accepted (content types)
- **Decision:** The shared detail editor continues to save on change (deeply
  integrated autosave, allowed by scope). New-item flows (New Note / Idea /
  Learning / Link / Task) use a single generic create dialog with an explicit
  Create button, fields shown per type.
- **Why:** avoids rewriting the working editor; creation gets a clean,
  deliberate flow.

### D33 — AI is suggestion-first, never automatic

- **Status:** Accepted (smart capture)
- **Decision:** `POST /api/v1/capture/interpret` returns a **validated
  suggestion** and never persists. Clients show an editable preview; the item
  is created only through the normal `POST /api/v1/items` after the user
  confirms. The original capture text is preserved end-to-end, and "Save to
  Inbox" is always available as a fallback when AI fails.
- **Why:** AI is an assistant, not the source of truth — no silent, incorrect
  tasks/reminders. This is also the path future automatic capture would
  evolve from.

### D34 — Provider abstraction with one OpenAI-compatible implementation

- **Status:** Accepted (smart capture)
- **Decision:** The API depends on `AiProvider.interpretCapture` and
  `TranscriptionProvider.transcribe` interfaces. The single implementation
  talks to any OpenAI-compatible HTTP endpoint via plain `fetch` (no vendor
  SDK): OpenAI, OpenRouter, Groq, Ollama… all work through `AI_BASE_URL`.
  Config is env-only (`AI_API_KEY`, `AI_MODEL`, `TRANSCRIPTION_MODEL`,
  `AI_TIMEOUT_MS`); without a key the API returns 503 "not configured" and the
  rest of Kosh runs normally.
- **Why:** replaceable provider, zero SDK coupling, no new dependencies,
  secrets stay server-side.

### D35 — Structured AI output is re-validated server-side

- **Status:** Accepted (smart capture)
- **Decision:** The model is prompted (versioned `capturePromptV1`) to return
  JSON with a fixed schema; the server re-validates every field against the
  existing item rules (type enum, http(s) URLs, ISO dates, reminder ≤ due,
  tag count/length). Invalid dates are dropped, reminder-after-due is dropped,
  links without URLs fall back to the text URL or downgrade to `note`, and a
  missing title falls back to the original capture.
- **Why:** never trust model output; no fragile regex parsing of free text.

### D36 — Transcription is separate from interpretation; audio is transient

- **Status:** Accepted (voice capture)
- **Decision:** `POST /api/v1/transcribe` only turns audio into text
  (multipart, MIME + ≤10 MB limits, no permanent storage); the text then flows
  through Smart Capture like any typed capture. Mobile records via
  `expo-audio` (microphone permission requested only when the user taps the
  mic) and allows transcript editing before interpretation.
- **Why:** keeps the pipeline composable and testable; audio is processed in
  memory and discarded.

## Product decisions

### P1 — No category selection at capture time

- **Status:** Accepted (foundation)
- **Decision:** Captures land in an inbox and are not required to be typed.
  Classification happens later, automatically (Phase 7) or manually.
- **Why:** Zero-friction capture is the core promise. Forcing a category is the
  #1 reason capture tools fail.

### P2 — Single unified "item" data model

- **Status:** Accepted (foundation)
- **Decision:** Tasks, notes, ideas, learning, and links are all one `items`
  record with a `type` field, plus optional metadata (`due_at`, `url`,
  `reminder_at`).
- **Why:** It matches the product reality (a capture is a capture) and makes
  auto-classification a simple field update instead of a data migration.
- **Note:** the shared `Item` type now also carries optional `priority`
  (`low | medium | high`) and `tags`. The future backend `items` schema must
  include `priority` and `tags` columns to match (see ROADMAP Phase 2).

### P3 — Dark theme only, minimal UI

- **Status:** Accepted (foundation)
- **Decision:** Dark theme is the default and the only theme in the MVP.
- **Why:** The product targets a text-first, low-noise surface. Multiple themes
  are out of scope until the app is functional.

### P4 — Local-first data is a future concern

- **Status:** Accepted (foundation, future)
- **Decision:** MVP stores data on the backend. Offline capture queue is a
  future feature, not a foundation requirement.
- **Why:** Keeps Phase 1–6 simple. Revisit once captures demonstrably lose to
  connectivity.
