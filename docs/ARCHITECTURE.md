# Kosh — Architecture

This is the technical architecture for the MVP. It is deliberately simple.

## Overview

```
┌──────────────────┐     HTTP / JSON      ┌───────────────────┐
│  apps/mobile      │ ──────────────────► │  apps/api (Hono)   │
│  Expo / React     │                      │  Node 26 / TS      │
│  Native / TS      │ ◄────────────────── │                    │
└──────────────────┘       JSON responses │       │            │
                                          │       │ node:sqlite│
                                          │       ▼            │
                                          │  SQLite file       │
                                          └───────────────────┘
```

- One repository (npm workspaces monorepo).
- The mobile app talks to the API over HTTP with JSON.
- The API is the only system of record; it persists to a SQLite file.
- Shared TypeScript types in `packages/shared` keep the two ends in sync.

## Frontend (apps/mobile)

- **Stack:** Expo SDK + React Native + TypeScript. Also runs on the web via
  React Native Web (`react-dom`, `react-native-web`) — the same codebase is
  the desktop surface.
- **Screens:** 8 — Inbox, Today, Tasks, Notes, Ideas, Learning, Search,
  Settings. One file per screen under `src/screens/`.
- **Navigation:** custom responsive shell (see DECISIONS D11) — bottom tab bar
  with a center capture button on mobile, sidebar on desktop (≥768px).
  Screens are rendered from a `screen` value in a React context.
- **Rendering:** React Native primitives, styled with plain `StyleSheet` and a
  design-tokens module (`src/theme.ts`, dark theme).
- **State:** plain React context (`ItemsContext` for items + actions,
  `NavContext` for navigation). Data starts as mock items in
  `src/data/mockItems.ts`; a thin context boundary keeps swapping to API calls
  (Phase 2) local. No state library (see DECISIONS D8).
- **Item detail:** a shared bottom-sheet/dialog (`ItemDetailSheet`) opens any
  item for viewing and editing (type, priority, due date, body, done, delete).
- **Search:** client-side over the mock data (`src/utils/search.ts`); replaced
  by backend/FTS search in Phase 5.

## Backend (apps/api)

- **Stack:** Hono on Node 26, TypeScript, run with `tsx` in dev.
- **Server lifecycle:** open SQLite DB → apply pending migrations → start HTTP
  listener.
- **Config:** environment variables only — `PORT` (default `3001`) and
  `KOSH_DB_PATH` (default `<repo>/apps/api/data/kosh.db`). No config file, no
  secrets manager.
- **Routes:** versioned under `/api/v1/*`. Foundation exposes only
  `/api/v1/health`.

## Database

- **Engine:** SQLite via Node's built-in `node:sqlite` (`DatabaseSync`) —
  no server, no native dependency.
- **Location:** single file at `apps/api/data/kosh.db` (dev), in-memory for
  tests.
- **Migrations:** plain SQL files in `apps/api/migrations/`, applied in
  filename order on startup. Each migration must be idempotent
  (`IF NOT EXISTS`) so re-applying is safe.
- **Schema (MVP foundation):** a single `items` table representing every
  capture (task / note / idea / learning / link) with optional `due_at`,
  `reminder_at`, and `url`. Timestamps are ISO-8601 strings.

## API structure

```
GET  /api/v1/health          → liveness + DB check
```

Future endpoints (Phases 2–5) will follow a consistent pattern:

```
POST   /api/v1/items            create a capture
GET    /api/v1/items            list / query items (filters, search)
GET    /api/v1/items/:id        single item
PATCH  /api/v1/items/:id        update (type, status, due, reminder…)
DELETE /api/v1/items/:id        delete
POST   /api/v1/search           (or GET /api/v1/items?q=…)  full-text search
```

Conventions:

- All endpoints under `/api/v1/*`.
- Request/response types come from `@kosh/shared`.
- Errors are JSON: `{ "error": { "message": "…" } }`.
- Timestamps are ISO-8601 UTC strings.

## Authentication approach

- **Now:** none. The API is designed to run on localhost / a private network
  (single-user personal app). See DECISIONS D7.
- **Later (before any public exposure):** simple token auth — a shared secret
  sent as `Authorization: Bearer <token>`, enforced by a Hono middleware. No
  multi-user accounts.

## Notification / reminder architecture

- The API stores `reminder_at` on an item.
- A small scheduler inside `apps/api` (Phase 5/6) polls items whose
  `reminder_at` has passed and are not yet reminded, then sends a push via
  **Expo push notifications** (the least-infrastructure option).
- The mobile app registers its push token with the API.
- In-app reminders (badge / local notification when the app is open) can
  complement push later.

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

## How mobile and backend communicate

- HTTP/JSON over a local network. In development the phone (Expo Go) reaches
  the API at the host machine's LAN IP.
- The mobile app reads its API base URL from `EXPO_PUBLIC_API_URL`
  (defaults to `http://localhost:3001`). When running on a physical device,
  set it to `http://<host-lan-ip>:3001`.
- No WebSockets, no streaming, no GraphQL in the MVP.

## Local development

Prerequisites: Node 26+, npm 11+.

```
npm install            # install everything (hoisted by workspaces)
npm run dev:api        # API on http://localhost:3001 (tsx watch)
npm run dev:mobile     # Expo dev server / Metro (press w for web)
npm run typecheck      # tsc --noEmit across all workspaces
npm test               # vitest (API + mobile utils)
npm run lint           # ESLint
```

The API stores its DB in `apps/api/data/kosh.db` (git-ignored). Delete it to
reset local data.

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
