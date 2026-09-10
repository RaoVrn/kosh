# Kosh

A personal "second brain" / life-management app. One place to dump anything
from your phone — tasks, reminders, ideas, notes, things to learn, links,
things people asked you to do — and let Kosh organize them and remind you when
necessary.

> **Capture everything. Forget nothing. Do what matters.**

## Status

```
FRONTEND MVP SHELL COMPLETE / BACKEND PENDING
```

The mobile app has a complete, usable frontend shell (8 screens, capture,
client-side search, mock data). The backend is foundation-only (health check).
See `docs/ROADMAP.md` for the plan.

### What works now (frontend, mock data)

- Inbox with quick capture ("What's on your mind?") — adds items, mic
  placeholder
- Today view grouped into Overdue / Important / Today / Upcoming
- Tasks with filters (All / Pending / Completed / Overdue), priority, due dates,
  mark-done
- Notes, Ideas, and a Learning backlog
- Search across everything (client-side)
- Item detail sheet: edit type/priority/due date/body, mark done, delete
- Responsive layout — bottom tab bar + center capture button on mobile,
  sidebar on desktop (runs in a browser via React Native Web)

## Stack

| Layer       | Choice                                                            |
| ----------- | ----------------------------------------------------------------- |
| Mobile      | Expo SDK + React Native + TypeScript (dark, text-first UI)        |
| Desktop/web | Same codebase via React Native Web                                |
| API         | Hono on Node 26, TypeScript, run via `tsx`                        |
| Database    | SQLite via Node's built-in `node:sqlite` (single file, no server) |
| Shared      | `@kosh/shared` TypeScript types (API contract)                    |
| Tooling     | npm workspaces · TypeScript strict · ESLint · Prettier · vitest   |

Deliberate non-choices for the MVP: no auth, no AI, no voice, no ORM, no state
library, no UI kit, no react-navigation, no Docker. The reasoning for every
choice is in `docs/DECISIONS.md`.

## Repository layout

```
apps/
  api/            Hono HTTP API (SQLite, migrations, routes)
  mobile/         Expo app (React Native) — screens, components, state, data
packages/
  shared/         Shared TypeScript types + constants
docs/             PRODUCT · ARCHITECTURE · ROADMAP · DECISIONS
```

## Quickstart

Prerequisites: **Node 26+**, **npm 11+**. No Docker, no database server.

```sh
npm install          # install all workspaces
npm run dev:api      # API on http://localhost:3001 (auto-reload)
npm run dev:mobile   # Expo dev server / Metro (press w for web)
```

Environment variables (all optional):

- `PORT` — API port (default `3001`)
- `KOSH_DB_PATH` — SQLite file path (default `apps/api/data/kosh.db`)
- `EXPO_PUBLIC_API_URL` — API base URL for the mobile app (default
  `http://localhost:3001`; use the host LAN IP when testing on a device)

## Checks

```sh
npm run typecheck    # tsc --noEmit across all workspaces
npm run lint         # ESLint across all workspaces
npm test             # vitest (API tests)
npm run build        # build the API to dist/
```

## Documentation

- `docs/PRODUCT.md` — what Kosh is, MVP vs future, out of scope
- `docs/ARCHITECTURE.md` — frontend, backend, DB, API, notifications, voice, AI
- `docs/ROADMAP.md` — phased implementation plan
- `docs/DECISIONS.md` — technical and product decisions + reasoning
- `AGENTS.md` — context and conventions for AI agents working on this repo
