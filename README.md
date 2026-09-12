# Kosh

A personal "second brain" / life-management app. One place to dump anything
from your phone — tasks, reminders, ideas, notes, things to learn, links,
things people asked you to do — and let Kosh organize them and remind you when
necessary.

> **Capture everything. Forget nothing. Do what matters.**

## Status

```
ALL FIVE CONTENT TYPES + TASKS/REMINDERS + NOTIFICATIONS + SERVER-SIDE SEARCH
```

The backend API (Hono + SQLite) is the source of truth. **Both** the mobile
app and the web app share the same data through a shared API client. Kosh
stores five first-class content types — **Task, Note, Idea, Learning, Link** —
on one `Item` model, plus tasks/reminders, an in-process reminder scheduler,
in-app notifications, and server-side FTS5 search.

### What works now

- Five content types, fully CRUD, on web + mobile (Notes, Ideas, Learning,
  Links have dedicated screens and New-item flows)
- Type-specific validation (links require a valid URL; reminders task-only)
- Manual type conversion in place (same id, content preserved) — the future
  AI-classification workflow
- Tags on every item: add/remove/edit, FTS5-searchable
- Tasks: priority, due date/time, reminder, completion
- Reminders fire exactly once; completed/archived tasks are skipped
- Server-side search (debounced, ranked, with type filters)
- In-app notification center with unread badge on both clients
- Web browser notifications (opt-in); mobile local notifications
- **Mobile:** bottom tabs on phone, sidebar on desktop
- **Web:** sidebar on desktop, compact top nav below 768px
- Phone + laptop share the same item model, API client, and backend data

## Stack

| Layer       | Choice                                                              |
| ----------- | ------------------------------------------------------------------- |
| Mobile      | Expo SDK + React Native + TypeScript (dark, text-first UI)          |
| Web/desktop | Vite + React + TypeScript (web-first browser UI)                    |
| API         | Hono on Node 26, TypeScript, run via `tsx`                          |
| Database    | SQLite via Node's built-in `node:sqlite` (single file, no server)   |
| Shared      | `@kosh/shared` — types, tokens, utils, typed API client, item state |
| Tooling     | npm workspaces · TypeScript strict · ESLint · Prettier · vitest     |

Deliberate non-choices for the MVP: no auth, no AI, no voice, no ORM, no state
library, no UI kit, no react-navigation, no Docker. The reasoning for every
choice is in `docs/DECISIONS.md`.

## Repository layout

```
apps/
  api/            Hono HTTP API (SQLite, migrations, items CRUD, seed)
  mobile/         Expo app (React Native) — phone client
  web/            Vite + React app — laptop/desktop client
packages/
  shared/         Types, design tokens, utils, typed API client, item state
docs/             PRODUCT · ARCHITECTURE · ROADMAP · DECISIONS
```

## Quickstart

Prerequisites: **Node 26+**, **npm 11+**. No Docker, no database server.

```sh
npm install                 # install all workspaces
npm run dev:api             # API on http://localhost:3001 (auto-reload)
npm run dev:web             # Web client on http://localhost:3000 (Vite)
npm run dev:mobile          # Expo dev server / Metro (press w for web)
npm run db:seed -w @kosh/api  # optional: seed demo items (only if empty)
```

Environment variables (all optional):

- `PORT` — API port (default `3001`)
- `KOSH_DB_PATH` — SQLite file path (default `apps/api/data/kosh.db`)
- `KOSH_REMINDER_INTERVAL_MS` — reminder scheduler tick (default `30000`)
- `EXPO_PUBLIC_API_URL` — API base URL for the mobile app (default
  `http://localhost:3001`; on a physical device set it to
  `http://<your-mac-lan-ip>:3001` — the phone's `localhost` is the phone)
- `VITE_API_URL` — API base URL for the web app (default `http://localhost:3001`)

## Checks

```sh
npm run typecheck    # tsc --noEmit across all workspaces
npm run lint         # ESLint across all workspaces
npm test             # vitest (API + shared client + mobile utils + web interaction)
npm run build        # build the API and web app to dist/
```

## Documentation

- `docs/PRODUCT.md` — what Kosh is, MVP vs future, out of scope
- `docs/ARCHITECTURE.md` — mobile + web clients, backend, DB, API, voice, AI
- `docs/ROADMAP.md` — phased implementation plan
- `docs/DECISIONS.md` — technical and product decisions + reasoning
- `AGENTS.md` — context and conventions for AI agents working on this repo
