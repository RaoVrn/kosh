# Kosh

A personal "second brain" / life-management app. One place to dump anything
from your phone — tasks, reminders, ideas, notes, things to learn, links,
things people asked you to do — and let Kosh organize them and remind you when
necessary.

> **Capture everything. Forget nothing. Do what matters.**

## Status

```
FOUNDATION / NOT YET IMPLEMENTED
```

The monorepo and tooling are in place; the API and mobile app boot. No
application features are built yet. See `docs/ROADMAP.md` for the plan.

## Stack

| Layer    | Choice                                                            |
| -------- | ----------------------------------------------------------------- |
| Mobile   | Expo SDK + React Native + TypeScript (dark, text-first UI)        |
| API      | Hono on Node 26, TypeScript, run via `tsx`                        |
| Database | SQLite via Node's built-in `node:sqlite` (single file, no server) |
| Shared   | `@kosh/shared` TypeScript types (API contract)                    |
| Tooling  | npm workspaces · TypeScript strict · ESLint · Prettier · vitest   |

Deliberate non-choices for the MVP: no auth, no AI, no voice, no ORM, no state
library, no UI kit, no Docker. The reasoning for every choice is in
`docs/DECISIONS.md`.

## Repository layout

```
apps/
  api/            Hono HTTP API (SQLite, migrations, routes)
  mobile/         Expo app (React Native)
packages/
  shared/         Shared TypeScript types + constants
docs/             PRODUCT · ARCHITECTURE · ROADMAP · DECISIONS
```

## Quickstart

Prerequisites: **Node 26+**, **npm 11+**. No Docker, no database server.

```sh
npm install          # install all workspaces
npm run dev:api      # API on http://localhost:3001 (auto-reload)
npm run dev:mobile   # Expo dev server / Metro
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
