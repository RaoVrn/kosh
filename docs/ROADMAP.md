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

- [x] API: `url` field with validation; `link` type requires a valid http(s)
      URL; type-specific rules (reminders only on tasks).
- [x] Type badges, per-type sections and per-type create flows (New Note /
      Idea / Learning / Link) on both clients, reusing one generic editor.
- [x] Notes: create/edit/delete with title, body, tags, URL; previews sorted
      by updatedAt.
- [x] Ideas: create/edit/delete with title, description, optional link, tags.
- [x] Learning: create/edit/delete, mark active/done/archive, priority, link,
      tags; backlog grouped into High priority / Active / Not started /
      Completed.
- [x] Links: dedicated Links screen; URL required + validated; external open
      button in the detail view.
- [x] Tags: add/remove/edit on every type via TagInput; FTS5-indexed.
- [x] Manual type conversion (convert inbox/any item to any type in place,
      same id, content preserved) — the workflow AI classification will use.
- [ ] Link capture shortcut (paste URL → prefilled item).
- [ ] URL metadata extraction (future; explicitly not scraping yet).

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

## Phase 7 — Smart Capture + Voice

Goal: capture by voice, and let Kosh understand captures — as a suggestion the
user confirms, never an automatic action.

- [x] Smart Capture API: `POST /api/v1/capture/interpret` (interpret only,
      never persists), with timezone/currentTime context and validated,
      structured `CaptureResult` output.
- [x] AI provider abstraction (`AiProvider`) with one OpenAI-compatible
      implementation via plain `fetch`; env-only config; graceful 503 when not
      configured.
- [x] Versioned system prompt (`capturePromptV1`) with task/note/idea/learning/
      link examples and date/reminder extraction rules; server-side output
      validation (type/URL/dates/reminder≤due/tags), safe fallbacks (note,
      original text as title, URL extraction).
- [x] Confirmation UI on web + mobile: editable preview (type, title, body,
      URL, priority, due, reminder, tags), Save → Items API, Cancel, and
      "Save to Inbox" fallback that never loses the original capture.
- [x] Transcription API: `POST /api/v1/transcribe` (multipart, MIME + size
      limits, no permanent audio storage) behind a `TranscriptionProvider`
      abstraction.
- [x] Mobile voice: `expo-audio` recording (permission on tap), transcript
      editing, then Smart Capture. Web voice: `MediaRecorder` foundation with
      honest unsupported-browser messaging.
- [x] Tests with fake providers: interpretation for all five types, invalid/
      timeout/unavailable AI output, no-item-created guarantee, transcription
      validation, and a mocked end-to-end capture → item → search flow.
- [ ] Real push delivery for fired reminders (deferred).
- Future AI work: semantic understanding, automatic organization, relationship
  extraction, personalized prioritization, knowledge graph, proactive
  suggestions — none of it automatic-persistence in this phase.

## Phase 8 — Polish and deployment

Goal: a shippable personal tool.

- [ ] Empty states, loading/error states, haptics, animations polish.
- [ ] Mobile: EAS build → TestFlight / store builds.
- [ ] Web: build/preview + deploy alongside the API.
- [ ] API: deploy on a single VPS (or cheap container host), process manager,
      on-disk SQLite, `cp`-based backups.
- [ ] API: add simple token auth before any public exposure.
- [ ] Privacy: data is only yours; document backups.
- [ ] Refresh `docs/` status sections and the roadmap checkboxes.

## Phase 9 — Inbox processing + Today command center

Goal: make Kosh a daily command center — capture → inbox → process → today →
do → complete → remember.

- [x] Inbox is a processing queue: quick per-card actions (Process → active,
      Archive, Convert to task, Open link) on web + mobile; editing an inbox
      item in the detail editor/sheet moves it to `active` (explicit user
      intent, no automatic bulk transitions); badge counts `status = inbox`
      live.
- [x] Today command center (web + mobile): greeting + quick actions (New
      capture/task/note/idea/learning), sections Overdue → Due today → Up next
      with deterministic precedence and no duplicates, plus unread Reminders
      (mark-read + open linked item) and Recently captured (inbox items).
- [x] Shared `getTodayCommandCenter` (`packages/shared`) — pure, tested,
      local-day timezone handling via existing date utilities; done/archived
      excluded from active sections.
- [x] Task execution: complete (done + `done_at`), reopen (active + null
      `done_at`), priority, due date, reminder, tags, archive via status chips
      in the detail editor/sheet; reminder scheduler untouched.
- [x] Web keyboard shortcuts: `N` → capture, `T` → tasks, `/` → search
      (guarded while typing); Escape closes the detail modal.
- [x] Intentional empty states across screens; priority stays subtle (no
      warning-style UI).
- [x] Tests: command-center grouping (precedence, exclusions, caps, reminders),
      greeting, web inbox processing actions, Today sections, shortcuts.

## Phase 10 — Recurring tasks + advanced reminder management

Goal: responsibilities that repeat automatically, without pre-generating rows.

- [x] Data model: migration `006` adds `recurrence_frequency` (none|daily|
      weekly|monthly), `recurrence_weekdays` (JSON), `recurrence_month_day`,
      `recurrence_id` to `items`; tasks only; existing rows default to none.
- [x] Recurrence validation (`recurrence/validation.ts`): task-only, weekly
      requires 1–7 unique weekdays (0–6), monthly requires day 1–31,
      recurrence (non-none) requires a due date; malformed input → Kosh error
      format.
- [x] Calculation (`recurrence/calculation.ts`): local-calendar arithmetic —
      daily +1 day, weekly next selected weekday (strictly after), monthly
      next month clamped to its last valid day (Jan 31 → Feb 28/29, then
      recovers Mar 31); time of day preserved.
- [x] Atomic completion (`recurrence/service.ts`): BEGIN IMMEDIATE → mark done + done_at → calculate next due → preserve reminder offset → insert
      exactly one active next occurrence (same metadata, series `recurrenceId`)
      → COMMIT. Idempotent: re-completing a done/archived occurrence never
      generates; delete/archive never replace; removing recurrence stops
      generation. PATCH stays the completion API; the shared ItemsProvider
      refreshes after completing a recurring task.
- [x] Smart Capture: prompt v2 extracts recurrence (daily/weekly weekdays/
      monthly day); AI recurrence is validated server-side, dropped when
      malformed or on non-tasks, and never applied without user confirmation;
      previews (web + mobile) show and allow editing the Repeat control.
- [x] UI: Repeat control (Does not repeat / Every day / Every week + M T W T F
      S S / Every month + day) in web + mobile create/edit editors and smart
      previews; subtle recurrence chips on task cards; changing recurrence
      only edits config, never generates occurrences.
- [x] Tests: calculation (daily/weekly/multi-weekday/monthly/day-31/leap/
      time preservation), validation (all rules), completion API (exactly-one
      next, metadata + reminder copied, double-complete, chained series,
      archive/delete/convert rules), Smart Capture recurrence parsing,
      RecurrenceControl + app-level wiring on web, label utils on mobile.

## Phase 11 — Projects + contextual organization

Goal: group related items around a project/context without folder-manager
complexity.

- [x] Data model: migration `007` adds `projects` (`id, name, description,
created_at, updated_at, archived_at`, case-insensitive unique name via
      `lower(name)` index) and `items.project_id` (nullable FK,
      `ON DELETE SET NULL`, `PRAGMA foreign_keys = ON`). One item ≤ one
      project; any item type; existing items unaffected.
- [x] API: `GET/POST /api/v1/projects`, `GET/PATCH/DELETE /api/v1/projects/:id`;
      items accept `projectId` on create/patch; `GET /items?projectId=…`
      composes with type/status/q; assignment to archived/unknown projects is
      rejected (400). Deleting a project nulls `project_id` on its items;
      archiving touches nothing.
- [x] Smart Capture: prompt v3 extracts `projectName` when explicitly stated;
      the server resolves it to an existing ACTIVE project
      (case-insensitive, never creates) and returns `projectId`; the
      confirmation preview shows an editable project selector; voice benefits
      automatically.
- [x] Recurring tasks: the generated next occurrence preserves `projectId`
      (verified by tests).
- [x] Clients: Projects screen (web + mobile) with list/detail, per-type
      filters, accurate counts, create/archive/restore/delete-confirm;
      subtle `↳ Project` labels on task/card items; project selector in the
      detail editor and smart capture preview; archived projects appear in
      selectors only for existing associations.
- [x] Tests: projects CRUD/uniqueness/validation, delete-detach + archive-
      keeps-associations, assignment restrictions, item association for all
      five types, filtering (projectId × type/status/q), conversion preserves
      projectId (and clears recurrence on task→non-task), recurrence copies
      projectId, inbox processing preserves projectId, persistence across
      connections, Smart Capture name resolution (match/no-match/archived),
      web UI (list/create/detail/filter/label/editor/smart preview/
      archive/delete).

## Phase 12 — Attachments

Goal: first-class local attachments on items — SQLite metadata + local-file
storage, no cloud.

- [x] Data model: migration `008` `attachments` table (FK `ON DELETE
CASCADE`, `item_id` index); bytes stored under `KOSH_ATTACHMENT_DIR`
      (default `apps/api/data/attachments`, git-ignored) as
      `<attachment-id>.<ext>`.
- [x] API: upload (multipart `file`, MIME allow-list, max
      `KOSH_MAX_ATTACHMENT_SIZE_BYTES` 25 MB), list metadata, serve
      (inline for images/pdf/text, download otherwise), delete (row + file),
      item delete cleans physical files; item lists carry `attachmentCount`,
      detail carries `attachments`.
- [x] Safety: sanitized stored names (never the original), path-traversal-
      proof path builder, no client trust (MIME/name/size validated
      server-side), missing physical file → 404, no arbitrary reads.
- [x] Smart Capture: pending attachments are picked locally, uploaded only
      AFTER the user confirms and the item exists; failed uploads keep the
      item and allow retry; original capture never lost. Voice benefits via
      the shared preview.
- [x] Web: attachments section in the detail modal (thumbnails for images,
      open/view/delete, uploading state, errors), paperclip count on cards,
      pending files in the capture preview.
- [x] Mobile: same via `expo-document-picker` (new dep) + `Linking` open,
      native-safe errors, pending files in the capture preview.
- [x] Recurrence: next occurrences do NOT copy attachments (documented).
- [x] Tests: API (upload/list/serve/delete/limits/unsupported/path-safety/
      item-cleanup/recurrence-no-copy/persistence/counts), web UI (section,
      empty, upload success/failure, delete, count, pending flow, failed
      upload keeps item), shared client (multipart shape, URLs).

## Phase 13 — Global search 2.0 + knowledge discovery

Goal: deterministic, local, FTS5-powered retrieval with filters and
discovery, no vector/embedding/external search.

- [x] FTS index (migration `009`): `items_fts` gains a `project_name` column
      (standalone FTS5 table + item triggers + project-rename trigger +
      backfill); project rename/assignment/removal stays searchable.
- [x] Query syntax: `type:` / `status:` / `project:"Name"` / `tag:` (AND) /
      `before:` / `after:` (UTC day boundaries on created_at) /
      `has:attachment`; quoted phrases; deterministic parser with 400 on
      invalid values and on contradictory explicit params.
- [x] Ranking + snippets: bm25 with title/tag boost; FTS5 `snippet()` with
      `<mark>` highlighting rendered by clients; pagination
      `meta {limit, offset, total, hasMore}`; search fully inside SQLite
      (no N+1, no JS filtering).
- [x] Web: redesigned Search screen (debounced input, type/status/attachment
      chips, operator suggestions for project:/tag:/type:/status:, recent
      searches (device-local, max 8, clearable), Load more, useful empty
      states, snippets with highlights, result opens the detail modal).
- [x] Mobile: equivalent Search screen (chips, recent searches, load more,
      result opens detail sheet).
- [x] Tests: parser (all operators, quoting, invalid input), API (project
      name searchable + rename/assign/detach updates, archived projects,
      type/status/tag/date/attachment filters, quoted projects, ranking,
      snippets, pagination, contradiction 400s, inbox/archived search,
      recurrence occurrences, persistence), web UI (debounce, filters,
      load more, recent searches, suggestions, snippet highlight, result
      open), shared (client searchItems, recent searches).

## Phase 14 — Smart Inbox processing + action extraction

Goal: turn messy captures into user-confirmed structured items, with the AI
as a quiet assistant — never an actor.

- [x] Processing endpoint: `POST /api/v1/items/:id/process` — user-triggered,
      ephemeral suggestions (max 5), source NEVER modified, project names
      resolved to active projects only, 502 on AI failure with source intact.
- [x] Accept endpoint: `POST /api/v1/items/:id/process/accept` — suggestions
      re-validated via the standard item validation, batch created in one
      transaction, source archived only when `markSourceProcessed` AND ≥1 item
      created; partial acceptance keeps the source in inbox; deterministic
      duplicate skip via `skipDuplicateTitles`.
- [x] Dedicated processing prompt (`processingPromptV1`): multi-action
      extraction, no over-processing (informational input → note/learning),
      no chain-of-thought, no invented projects/facts.
- [x] Web: Process button on inbox cards (old status action renamed
      "Activate"), review modal (original capture + attachment notice,
      suggestion cards with select/edit/remove, duplicate warnings, Accept
      selected/all, cancel, mark-as-processed toggle, success/error states).
- [x] Mobile: equivalent bottom-sheet flow.
- [x] Tests: API (fixtures A–E, source-untouched guarantees, atomic rollback,
      partial/full acceptance, duplicates, project resolution, field
      validation, persistence), web (full review flow), shared client.

---

## Later (beyond MVP)

- Share sheet / widget capture.
- Offline-first capture queue with sync.
- Recurring reminders.
- Tags and custom views.
- Attachments.
