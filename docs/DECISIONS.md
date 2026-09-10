# Kosh — Decisions

Every decision below records _what_ was chosen and _why_. Update this file
whenever an important technical or product decision is made.

## Technical decisions

### D1 — Monorepo with npm workspaces

- **Status:** Accepted (foundation)
- **Decision:** One repository containing `apps/mobile` (Expo), `apps/api`
  (Hono server), and `packages/shared` (shared TypeScript types). Uses npm
  built-in workspaces (npm 11+).
- **Why:**
  - One codebase, one PR, shared types between mobile and backend without a
    published package.
  - npm workspaces are already installed — no extra tooling (pnpm/bun) needed.
  - The future web/desktop UI slots in as another `apps/*` workspace.
- **Alternatives rejected:** Separate repos (type duplication, harder to keep in
  sync); pnpm/bun (extra tooling with no real benefit here); a single package
  (blurred boundaries).

### D2 — Expo (React Native) for mobile

- **Status:** Accepted (foundation)
- **Decision:** Mobile app is built with Expo SDK + React Native + TypeScript.
- **Why:**
  - Fastest path to a real iOS/Android app from one codebase.
  - Managed workflow means no native tooling on the dev machine (no Android SDK
    installed; no full Xcode required for most work — Expo Go + web work).
  - The same app can later run on web/desktop via React Native Web if desired.
- **Alternatives rejected:** Flutter (Dart ecosystem separate from the Node
  backend; adds a second language). Native Swift/Kotlin (two codebases, slow
  for an MVP). A pure web app (PWA) — weaker on notifications and voice capture
  on mobile.

### D3 — Hono for the API

- **Status:** Accepted (foundation)
- **Decision:** The backend is a Hono server running on Node 26, written in
  TypeScript, executed with `tsx` in development.
- **Why:**
  - Minimal, fast, TypeScript-first with first-class request validation support
    (usable later with zod).
  - Small surface area; easy for future agents to understand and extend.
  - Runs on plain Node — no serverless-specific coupling; can still be deployed
    anywhere Node runs.
- **Alternatives rejected:** Express (heavier middleware model, no better fit);
  Fastify (more features than the MVP needs); NestJS (framework overhead).

### D4 — SQLite via Node's built-in `node:sqlite`

- **Status:** Accepted (foundation)
- **Decision:** Persistence is a single SQLite file accessed through Node's
  built-in `node:sqlite` (`DatabaseSync`) module.
- **Why:**
  - Zero infrastructure: no database server to install, run, or deploy.
  - Perfect fit for a single-user personal app.
  - Built into Node 22.5+/26 — no native dependency, no `node-gyp`, nothing to
    install.
  - The file DB is trivially backup-able and portable.
- **Alternatives rejected:** PostgreSQL (installed locally but requires running
  a server — unnecessary infrastructure for a personal app); better-sqlite3
  (native module, requires compilation — `node:sqlite` removes the dependency
  entirely); Prisma/Drizzle ORM (extra layer; plain SQL is simpler to audit and
  the MVP schema is small).

### D5 — Plain SQL migrations, no ORM

- **Status:** Accepted (foundation)
- **Decision:** Schema changes are hand-written SQL files in `apps/api/migrations/`
  applied in filename order on startup. No ORM.
- **Why:** The MVP schema is a handful of tables. Plain SQL is transparent,
  easy to review, and has no codegen or magic. An ORM can be added later if the
  schema genuinely grows complex.
- **Decision may be revisited** when/if queries get complicated enough to
  justify it.

### D6 — TypeScript everywhere, shared types package

- **Status:** Accepted (foundation)
- **Decision:** Mobile, API, and a `packages/shared` package are all
  TypeScript. API response/request shapes are defined in `@kosh/shared` and
  imported by both ends.
- **Why:** Compile-time contract between mobile and backend prevents a whole
  class of bugs; no codegen, no OpenAPI round-trip needed for an MVP.

### D7 — No authentication in the MVP foundation

- **Status:** Accepted (foundation)
- **Decision:** The initial API has no auth. It is intended to run on the
  local network / localhost.
- **Why:** Single-user product; auth adds friction to every phase. When the
  API is exposed beyond local use, add a simple token or user/password auth
  (see ROADMAP — hardening step), not before.

### D8 — No state-management library for the mobile app

- **Status:** Accepted (foundation)
- **Decision:** Mobile app uses plain React state + a small fetch/API client.
  No Redux/Zustand/etc. initially.
- **Why:** The MVP is a few screens. Adding a state library before there is a
  real state problem is over-engineering. Revisit if cross-screen state grows.

### D9 — Native React Native styling (StyleSheet), no UI kit

- **Status:** Accepted (foundation)
- **Decision:** UI is styled with plain `StyleSheet` and a small set of dark
  theme tokens. No component library.
- **Why:** A dark, minimal, text-first app needs very few components. A UI kit
  (e.g. NativeBase, Tamagui) adds a dependency and design opinion without
  adding MVP value. A tiny design-tokens file keeps the dark theme consistent.

### D10 — Notifications via push (Expo push) in a later phase

- **Status:** Accepted (foundation, implemented later)
- **Decision:** Reminders will be delivered via Expo push notifications; the
  API stores `reminder_at` and a small scheduler process emits pushes at the
  right time.
- **Why:** Expo's push service is the least-infrastructure way to get reliable
  mobile notifications without running APNs/FCM ourselves.

## Product decisions

### P1 — No category selection at capture time

- **Status:** Accepted (foundation)
- **Decision:** Captures land in an inbox and are not required to be typed.
  Classification happens later, automatically (Phase 7) or manually.
- **Why:** Zero-friction capture is the core promise. Forcing a category is the
  #1 reason capture tools fail.

### P2 — Single unified "item" data model

- **Status:** Accepted (foundation)
- **Decision:** Tasks, notes, ideas, learning, and links are all one `items`
  record with a `type` field, plus optional metadata (`due_at`, `url`,
  `reminder_at`).
- **Why:** It matches the product reality (a capture is a capture) and makes
  auto-classification a simple field update instead of a data migration.

### P3 — Dark theme only, minimal UI

- **Status:** Accepted (foundation)
- **Decision:** Dark theme is the default and the only theme in the MVP.
- **Why:** The product targets a text-first, low-noise surface. Multiple themes
  are out of scope until the app is functional.

### P4 — Local-first data is a future concern

- **Status:** Accepted (foundation, future)
- **Decision:** MVP stores data on the backend. Offline capture queue is a
  future feature, not a foundation requirement.
- **Why:** Keeps Phase 1–6 simple. Revisit once captures demonstrably lose to
  connectivity.
