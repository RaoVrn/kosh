# Kosh

A personal "second brain" / life-management app. One place to dump anything
from your phone — tasks, reminders, ideas, notes, things to learn, links,
things people asked you to do — and let Kosh organize them and remind you when
necessary.

> **Capture everything. Forget nothing. Do what matters.**

## Status

```
TWO CLIENTS (MOBILE + WEB) ON MOCK DATA / BACKEND PENDING
```

Both the mobile app and the web app have complete frontend shells (8 screens
each, capture, client-side search, mock data, shared item state). The backend
is foundation-only (health check). See `docs/ROADMAP.md` for the plan.

### What works now (frontend, mock data)

- Inbox with quick capture ("What's on your mind?") — adds items, mic
  placeholder
- Today view grouped into Overdue / Important / Today / Upcoming
- Tasks with filters (All / Pending / Completed / Overdue), priority, due dates,
  mark-done
- Notes, Ideas, and a Learning backlog
- Search across everything (client-side)
- Item detail (mobile sheet / web dialog): edit type/priority/due date/body,
  mark done, delete
- **Mobile:** bottom tab bar + center capture button on mobile, sidebar on
  desktop
- **Web:** sidebar on desktop, compact top nav below 768px
- Phone and laptop share the same item model, design tokens, mock data and
  item state via `@kosh/shared`

## Stack

| Layer       | Choice                                                              |
| ----------- | ------------------------------------------------------------------- |
| Mobile      | Expo SDK + React Native + TypeScript (dark, text-first UI)          |
| Web/desktop | Vite + React + TypeScript (web-first browser UI)                    |
| API         | Hono on Node 26, TypeScript, run via `tsx`                          |
| Database    | SQLite via Node's built-in `node:sqlite` (single file, no server)   |
| Shared      | `@kosh/shared` — types, design tokens, utils, mock data, item state |
| Tooling     | npm workspaces · TypeScript strict · ESLint · Prettier · vitest     |

Deliberate non-choices for the MVP: no auth, no AI, no voice, no ORM, no state
library, no UI kit, no react-navigation, no Docker. The reasoning for every
choice is in `docs/DECISIONS.md`.

## Repository layout

```
apps/
  api/            Hono HTTP API (SQLite, migrations, routes)
  mobile/         Expo app (React Native) — phone client
  web/            Vite + React app — laptop/desktop client
packages/
  shared/         Shared types, design tokens, utils, mock data, item state
docs/             PRODUCT · ARCHITECTURE · ROADMAP · DECISIONS
```

## Quickstart

Prerequisites: **Node 26+**, **npm 11+**. No Docker, no database server.

```sh
npm install          # install all workspaces
npm run dev:api      # API on http://localhost:3001 (auto-reload)
npm run dev:mobile   # Expo dev server / Metro (press w for web)
npm run dev:web      # Web client on http://localhost:3000 (Vite)
```

Environment variables (all optional):

- `PORT` — API port (default `3001`)
- `KOSH_DB_PATH` — SQLite file path (default `apps/api/data/kosh.db`)
- `EXPO_PUBLIC_API_URL` — API base URL for the mobile app (default
  `http://localhost:3001`; use the host LAN IP when testing on a device)
- `VITE_API_URL` — API base URL for the web app (default `http://localhost:3001`)

## Checks

```sh
npm run typecheck    # tsc --noEmit across all workspaces
npm run lint         # ESLint across all workspaces
npm test             # vitest (API + mobile utils + web interaction)
npm run build        # build the API and web app to dist/
```

## Documentation

- `docs/PRODUCT.md` — what Kosh is, MVP vs future, out of scope
- `docs/ARCHITECTURE.md` — mobile + web clients, backend, DB, API, voice, AI
- `docs/ROADMAP.md` — phased implementation plan
- `docs/DECISIONS.md` — technical and product decisions + reasoning
- `AGENTS.md` — context and conventions for AI agents working on this repo
