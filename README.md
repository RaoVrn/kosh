# Kosh

A personal "second brain" / life-management app. One place to dump anything
from your phone — tasks, reminders, ideas, notes, things to learn, links,
things people asked you to do — and let Kosh organize them and remind you when
necessary.

> **Capture everything. Forget nothing. Do what matters.**

## Status

```
ALL FIVE CONTENT TYPES + REMINDERS + NOTIFICATIONS + SEARCH + SMART & VOICE CAPTURE
```

The backend API (Hono + SQLite) is the source of truth. **Both** the mobile
app and the web app share the same data through a shared API client. Kosh
stores five content types — **Task, Note, Idea, Learning, Link** — with
reminders, in-app notifications, server-side FTS5 search, **Smart Capture**
(AI _suggests_ structure; you confirm before anything persists) and **Voice
Capture** (record → transcribe → edit → confirm).

### What works now

- Smart Capture: type/title/body/URL/priority/due/reminder/tags suggested by
  AI, editable preview, Save / Cancel / "Save to Inbox" fallback — AI is a
  suggestion, never automatic
- Voice Capture on mobile (`expo-audio`) and web (`MediaRecorder` where
  supported): record → transcribe → edit transcript → Smart Capture
- Five content types, fully CRUD, web + mobile; type conversion in place
- Tags on every item (add/remove/edit, FTS5-searchable)
- Tasks with priority, due dates and exactly-once reminders
- Server-side search (debounced, ranked, type filters)
- In-app notification center; web browser notifications; mobile local
  notifications
- Raw capture still works without AI — `npm run dev` runs with no AI key

### AI configuration (optional)

Smart Capture and transcription are disabled until you provide a key
(`AI_API_KEY`, OpenAI-compatible — also works with OpenRouter/Groq/Ollama via
`AI_BASE_URL`). See `.env.example`. Provider calls happen only server-side;
keys never reach the clients.

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

Environment variables (all optional). The API automatically loads a root
`.env` file (repo root) at startup — real environment variables always take
precedence. See `.env.example`:

- `PORT` — API port (default `3001`)
- `KOSH_DB_PATH` — SQLite file path (default `apps/api/data/kosh.db`)
- `KOSH_REMINDER_INTERVAL_MS` — reminder scheduler tick (default `30000`)
- `EXPO_PUBLIC_API_URL` — API base URL for the mobile app (default
  `http://localhost:3001`; on a physical device set it to
  `http://<your-mac-lan-ip>:3001` — the phone's `localhost` is the phone)
- `VITE_API_URL` — API base URL for the web app (default `http://localhost:3001`)
- `AI_API_KEY` — enables Smart Capture + transcription (absent → "not
  configured", everything else keeps working)
- `AI_BASE_URL` — OpenAI-compatible endpoint (default `https://api.openai.com/v1`)
- `AI_MODEL` — interpretation model (default `gpt-4o-mini`)
- `TRANSCRIPTION_MODEL` — transcription model (default
  `whisper-large-v3-turbo`; valid on Groq and OpenAI — `whisper-1` is not valid
  on Groq)
- `AI_TIMEOUT_MS` — provider timeout (default `15000`)
- `TRANSCRIPTION_TIMEOUT_MS` — transcription timeout (default `30000`)

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
