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

- [ ] API: `POST /api/v1/items`, `GET /api/v1/items` (list), `GET /api/v1/items/:id`.
- [ ] API: unified `items` CRUD with `type` defaulting to inbox.
- [ ] Mobile: navigation shell (React Navigation) with an Inbox screen.
- [ ] Mobile: quick-capture input (single text field, big, always visible).
- [ ] Mobile: list captures from the API; optimistic add.
- [ ] Mobile: dark theme tokens module wired to screens.
- [ ] Mobile: API base URL config (`EXPO_PUBLIC_API_URL`) for device testing.

## Phase 3 — Tasks and reminders

Goal: a capture can become a to-do with a due date and an in-app reminder.

- [ ] API: `PATCH /api/v1/items/:id` (status, `due_at`, `reminder_at`).
- [ ] API: `DELETE /api/v1/items/:id`.
- [ ] API: scheduler that polls due reminders and marks them fired.
- [ ] Mobile: task view (mark done, set due date).
- [ ] Mobile: reminder picker (date/time) on a capture.
- [ ] Mobile: local notification when app is open (in-app reminder).
- [ ] API: push-token registration endpoint (stub — real push in Phase 6).

## Phase 4 — Notes, ideas, learning, links

Goal: the four non-task capture types are first-class but still one inbox.

- [ ] API: `url` field on items; link handling (store URL, extract title).
- [ ] Mobile: type badges and per-type filter tabs (All / Tasks / Notes /
      Ideas / Learning / Links).
- [ ] Mobile: link capture shortcut (paste URL → prefilled item).
- [ ] Mobile: longer-form note editing screen.
- [ ] API: update classification on existing items (manual re-type).

## Phase 5 — Search

Goal: find anything you have ever captured.

- [ ] API: FTS (SQLite FTS5) index over items; `GET /api/v1/items?q=…`.
- [ ] API: filter by type/status + sort by created/updated/due.
- [ ] Mobile: search entry point in header; results screen with snippets.
- [ ] Mobile: search from a share-sheet-style quick action (if cheap).

## Phase 6 — Voice capture and push

Goal: speak a capture; get real push reminders.

- [ ] Mobile: record audio (expo-av / expo-audio), upload to API.
- [ ] API: `POST /api/v1/transcriptions` → transcribe via hosted STT (Whisper).
- [ ] Pipeline: transcription output flows through the normal capture path.
- [ ] Mobile: mic button on the capture surface.
- [ ] API: send push via Expo push service for fired reminders.
- [ ] Mobile: register push token; handle push → open item.

## Phase 7 — AI organization

Goal: captures classify themselves.

- [ ] API: optional LLM post-processor on create (classify `type`, suggest
      `due_at`, clean title).
- [ ] API: validation of LLM output against `@kosh/shared` types; fallback to
      inbox on failure.
- [ ] API: batch re-classify of existing inbox items (manual trigger).
- [ ] Mobile: show confidence / suggestion UI ("Looks like a task — confirm?").
- [ ] API: natural-language parse ("remind me friday 9am …").

## Phase 8 — Polish and deployment

Goal: a shippable personal tool.

- [ ] Mobile: empty states, loading/error states, haptics, animations polish.
- [ ] Mobile: EAS build → TestFlight / store builds.
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
- Web / desktop interface.
- Tags and custom views.
- Attachments.
