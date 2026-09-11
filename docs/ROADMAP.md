# Kosh — Roadmap

Fast, incremental implementation. Each phase ends in a working, verifiable
state. Phases are ordered to ship a usable capture-and-remind loop as early as
possible.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Phase 1 — Foundation

Goal: a running monorepo, a booting API, a booting mobile app, and tooling that
future phases build on.

- [x] Repo, npm workspaces, shared tooling (TS, ESLint, Prettier, vitest).
- [x] `packages/shared` with core domain types (`Item`, `ItemType`, …).
- [x] `apps/api`: Hono server, SQLite via `node:sqlite`, SQL migrations,
      `GET /api/v1/health`, vitest smoke test.
- [x] `apps/mobile`: Expo (blank TS) app with a minimal dark screen.
- [x] Verification: install, typecheck, lint, test, API boot, mobile bundle.
- [ ] CI-style checks (single command that runs typecheck + lint + test).
- [ ] `docs/` current-status refresh at end of phase.

## Phase 2 — Core capture (inbox)

Goal: dump a text capture from the phone and see it come back from the API.

Frontend shell (mock, done — built before the API):

- [x] Mobile: responsive navigation shell — bottom tab bar + center capture
      button on mobile, sidebar on desktop.
- [x] Mobile: 8 screens (Inbox, Today, Tasks, Notes, Ideas, Learning, Search,
      Settings) with dark theme tokens wired in.
- [x] Mobile: quick-capture input on Inbox ("What's on your mind?") that adds
      an item to the inbox (mock).
- [x] Mobile: item detail sheet (edit type/priority/due/body, mark done,
      delete) across all screens.
- [x] Mobile: mock data layer + client-side search (swappable for the API).
- [x] Mobile: `EXPO_PUBLIC_API_URL` config for device testing.

Persistent shared data (implemented — API + both clients):

- [x] API: `POST /api/v1/items`, `GET /api/v1/items` (list), `GET /api/v1/items/:id`.
- [x] API: unified `items` CRUD (`PATCH`/`DELETE` too) with server-set
      id/timestamps; schema includes `priority` and `tags` (migrations tracked
      in `schema_migrations`; see DECISIONS P2/D15–D17).
- [x] API: validation, CORS for localhost dev origins, error/`{ data }`
      response conventions, `npm run db:seed`.
- [x] Shared: typed API client (`createItemsApi`) + API-backed `ItemsProvider`
      (loading/error/refresh) replaces the mock-data source on **both** clients.
- [x] Mobile: fetches/creates/updates/deletes/toggles through the API; loading + error states; capture keeps input text on failure.
- [x] Web: wired to the API the same way; fetch-mocked interaction tests
      (load, create, error, complete, delete).
- [x] Tests: API CRUD + SQLite persistence; shared client; web interaction.
- [x] Data survives API restart, client restart and browser refresh.

## Phase 3 — Web client (desktop)

Goal: Kosh also works in the browser on a laptop/desktop, sharing the same
backend as mobile.

- [x] `apps/web`: Vite + React + TypeScript app on `http://localhost:3000`.
- [x] Same 8 screens (Inbox, Today, Tasks, Notes, Ideas, Learning, Search,
      Settings) reusing `@kosh/shared` types, tokens, utilities and item state.
- [x] Responsive: sidebar on desktop, compact top nav below 768px, capture
      stays accessible.
- [x] Capture, item detail dialog, client-side search, task completion.
- [x] Interaction tests (render, capture, navigation, search, detail dialog).
- [x] `packages/shared` consolidated: types, design tokens, pure utils, mock
      data, typed API client and `ItemsProvider` shared by both clients.
- [x] Web client wired to the API (persistent data, shared with mobile).

## Phase 4 — Tasks and reminders

Goal: a capture can become a to-do with a due date and a reminder that fires
exactly once.

- [x] API: task fields (`due_at`, `reminder_at`, `priority`) validated and
      persisted; `PATCH`/`DELETE` supported.
- [x] API: validation rules — valid ISO dates, reminder only on tasks,
      reminder not after due, useful 400s.
- [x] API: in-process `ReminderScheduler` (interval via
      `KOSH_REMINDER_INTERVAL_MS`, default 30 s) claims due reminders once
      (`reminded_at`), skips completed/archived, stops cleanly on shutdown.
- [x] API: `NotificationService` abstraction + persisted in-app notifications
      (`GET`/`PATCH /api/v1/notifications`).
- [x] Web: Tasks screen grouped into Overdue / Today / Upcoming / No due date /
      Completed; New Task modal with priority + due + reminder; item detail
      edits due/reminder via datetime inputs; notification center with unread
      badge; browser-notification toggle in Settings.
- [x] Mobile: grouped Tasks screen + TaskCreateSheet; detail sheet reminder
      chips; Today regrouping; notifications screen in the More menu; local
      notification scheduling derived from API data (`expo-notifications`).
- [x] Shared: time-based overdue, `formatDueAt`/`formatReminderAt`, task
      grouping with priority ordering, `KoshNotification` types,
      `NotificationsProvider`, API client notification methods.
- [x] Scheduler tests with an injected clock (exactly-once, restart safety,
      re-arm on change) + web/mobile/shared tests.
- [ ] Push-token registration + real push delivery (deferred — see Phase 7).
      Mobile delivery is currently local-notification based and only verifiable
      on a real device / dev build.

## Phase 5 — Notes, ideas, learning, links

Goal: the four non-task capture types are first-class but still one inbox.

- [ ] API: `url` field on items; link handling (store URL, extract title).
- [~] Type badges and per-type filter tabs (All / Tasks / Notes /
  Ideas / Learning / Links) on both clients. _(badges + per-section screens
  exist; per-type filter tabs inside a section are partial — Tasks screen has
  filters)_
- [ ] Link capture shortcut (paste URL → prefilled item).
- [ ] Longer-form note editing screen.
- [ ] API: update classification on existing items (manual re-type).

## Phase 6 — Search

Goal: find anything you have ever captured, without downloading everything.

- [x] API: SQLite FTS5 index over `title`, `body`, `url`, `tags` (migration
      `005`), synchronized by triggers + backfilled for existing items.
- [x] API: `GET /api/v1/items?q=…` with bm25 relevance ranking, `type`/`status`
      filters, `limit`/`offset` pagination, and safe query normalization
      (no 500s on unusual input).
- [x] Shared: `getItems({ q, type, status, limit, offset })`, `ItemsProvider.search`,
      and a debounced, stale-safe `useServerSearch` hook used by both clients.
- [x] Web + Mobile: server-side Search screens with debounce, type filters,
      loading / empty / error states, result count, and clear.
- [x] Tests: migration backfill, index sync (create/update/delete), ranking,
      filters, edge cases, pagination; shared client + hook; web interaction.
- [ ] Search from a share-sheet-style quick action (if cheap).
- Semantic/vector search, embeddings and AI retrieval remain future work.

## Phase 7 — Voice capture and push

Goal: speak a capture; get real push reminders.

- [ ] Mobile: record audio (expo-av / expo-audio), upload to API.
- [ ] API: `POST /api/v1/transcriptions` → transcribe via hosted STT (Whisper).
- [ ] Pipeline: transcription output flows through the normal capture path.
- [ ] Mobile: mic button on the capture surface.
- [ ] API: send push via Expo push service for fired reminders.
- [ ] Mobile: register push token; handle push → open item.

## Phase 8 — AI organization

Goal: captures classify themselves.

- [ ] API: optional LLM post-processor on create (classify `type`, suggest
      `due_at`, clean title).
- [ ] API: validation of LLM output against `@kosh/shared` types; fallback to
      inbox on failure.
- [ ] API: batch re-classify of existing inbox items (manual trigger).
- [ ] Clients: show confidence / suggestion UI ("Looks like a task — confirm?").
- [ ] API: natural-language parse ("remind me friday 9am …").

## Phase 9 — Polish and deployment

Goal: a shippable personal tool.

- [ ] Empty states, loading/error states, haptics, animations polish.
- [ ] Mobile: EAS build → TestFlight / store builds.
- [ ] Web: build/preview + deploy alongside the API.
- [ ] API: deploy on a single VPS (or cheap container host), process manager,
      on-disk SQLite, `cp`-based backups.
- [ ] API: add simple token auth before any public exposure.
- [ ] Privacy: data is only yours; document backups.
- [ ] Refresh `docs/` status sections and the roadmap checkboxes.

---

## Later (beyond MVP)

- Share sheet / widget capture.
- Offline-first capture queue with sync.
- Recurring reminders.
- Tags and custom views.
- Attachments.
