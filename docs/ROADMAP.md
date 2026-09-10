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

Frontend shell (mock, done — everything below is mock data + client state):

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

Wire to the API:

- [ ] API: `POST /api/v1/items`, `GET /api/v1/items` (list), `GET /api/v1/items/:id`.
- [ ] API: unified `items` CRUD with `type` defaulting to inbox (schema must
      include `priority` and `tags` — see DECISIONS P2).
- [ ] Mobile: list captures from the API; optimistic add.
- [ ] Mobile: API client module replaces `src/data/mockItems.ts` behind the
      existing context boundary.

## Phase 3 — Web client (desktop)

Goal: Kosh also works in the browser on a laptop/desktop, sharing the same
model and (eventually) the same backend as mobile.

- [x] `apps/web`: Vite + React + TypeScript app on `http://localhost:3000`.
- [x] Same 8 screens (Inbox, Today, Tasks, Notes, Ideas, Learning, Search,
      Settings) reusing `@kosh/shared` types, tokens, utilities, mock data and
      item state.
- [x] Responsive: sidebar on desktop, compact top nav below 768px, capture
      stays accessible.
- [x] Capture, item detail dialog, client-side search, task completion
      (local state).
- [x] Interaction tests (render, capture, navigation, search, detail dialog).
- [x] `packages/shared` consolidated: types, design tokens, pure utils, mock
      data and `ItemsProvider` shared by both clients (single seam to swap for
      the API).
- [ ] Web client: wire to the API once `/api/v1/items` exists (replaces the
      shared mock context on both clients).

## Phase 4 — Tasks and reminders

Goal: a capture can become a to-do with a due date and an in-app reminder.

- [ ] API: `PATCH /api/v1/items/:id` (status, `due_at`, `reminder_at`).
- [ ] API: `DELETE /api/v1/items/:id`.
- [ ] API: scheduler that polls due reminders and marks them fired.
- [ ] Mobile: task view (mark done, set due date).
- [ ] Mobile: reminder picker (date/time) on a capture.
- [ ] Mobile: local notification when app is open (in-app reminder).
- [ ] API: push-token registration endpoint (stub — real push in Phase 7).

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

Goal: find anything you have ever captured.

- [ ] API: FTS (SQLite FTS5) index over items; `GET /api/v1/items?q=…`.
- [ ] API: filter by type/status + sort by created/updated/due.
- [~] Client search: entry point + client-side results on both clients.
  _(client-side; server search lands in this phase)_
- [ ] Search from a share-sheet-style quick action (if cheap).

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
