# Kosh — Product

## What Kosh is

Kosh is a personal "second brain" / life-management application. It is one place
to dump anything from your phone — tasks, reminders, ideas, notes, things to
learn, links, things people asked you to do — and let Kosh organize it and
remind you when necessary.

Long-term vision:

> **Capture everything. Forget nothing. Do what matters.**

## The problem it solves

People forget things. Captures are scattered across chat apps, notes apps,
email, screenshots, and memory. There is no single, low-friction place to dump
something the moment it occurs, and nothing that surfaces the right thing at the
right time.

Kosh removes the friction of _organizing_ at capture time. You dump raw text
(or your voice), and Kosh figures out the rest.

## Target usage

A single person ("second brain") using Kosh primarily from a phone, with a web
(or desktop) interface as a secondary surface. It is not a multi-user SaaS.
It is a personal productivity tool. Both surfaces share the same backend and,
once persistence ships, the same data.

## Core philosophy

1. **Capture is zero-friction.** Adding something must take under a few seconds.
   No required category, no required form, no required metadata.
2. **Organize later, automatically.** The user should never be forced to choose
   a category at capture time. Kosh keeps an inbox, and classification
   (task vs note vs idea vs learning vs link) is derived automatically over time.
3. **Surfaces are secondary.** The inbox and search matter more than fancy
   views. If you can find it, you can use it.
4. **Dark, minimal, fast.** The UI is a dark, text-first surface. No visual
   noise, no distractions.
5. **Simple beats clever.** The MVP is deliberately boring: plain capture,
   plain storage, plain reminders.
6. **Reminders only when they matter.** Reminders are an explicit, opt-in
   follow-up — not an automatic noisy system.

## MVP features

Core MVP (the initial build):

1. **Inbox / quick capture** — one place, one button, everything lands here
   first.
2. **Text capture** — type anything, save it.
3. **Voice capture** — speak, have it transcribed into a capture.
4. **Tasks** — a capture that becomes a to-do (with optional due date).
5. **Notes** — longer free-form text.
6. **Ideas** — short thoughts, kept separate from tasks.
7. **Learning** — things you want to learn or are learning.
8. **Links** — a URL capture (optionally with a title/description).
9. **Due dates** — set when needed, on any capture.
10. **Reminders** — surface captures at a chosen time (in-app + push).
11. **Basic search** — full-text search over everything.
12. **Dark theme** — default, minimal, text-first UI.
13. **Mobile-first UI** — the phone experience is the primary one.
14. **Smart Capture** — AI suggests type/title/due/reminder/priority/tags for a
    capture; the user edits and confirms before saving. Never automatic.
15. **Voice Capture** — speak a capture; it is transcribed (server-side),
    editable, and then runs through Smart Capture.

The user is **never required** to choose a category when capturing. Everything
starts as an untagged inbox item; type/status can be changed or inferred later.

### The everyday loop

```
CAPTURE → INBOX → PROCESS → TODAY → DO → COMPLETE → REMEMBER
```

- **Capture** — text, voice, or Smart Capture; everything lands in the Inbox
  first.
- **Inbox** is a processing queue: Process (→ active), Archive, Convert to
  task, Open link, or edit — editing an inbox item moves it out of the Inbox.
- **Today** is the daily command center: Overdue → Due today → Up next, plus
  unread reminders and recently captured items, with quick actions for new
  captures/tasks/notes/ideas/learning.
- Completing a task moves it out of active Today sections; reopening returns
  it; reminders and notifications keep the loop closed.
- **Recurring tasks** repeat automatically: does not repeat / every day /
  every week on selected weekdays / every month on a chosen day. Completing
  the current occurrence marks it done and creates exactly ONE next active
  occurrence (same time, same reminder offset) — nothing is pre-generated,
  so Today only ever shows the relevant occurrence. Completed occurrences
  stay in history and remain searchable. Archive or delete a recurring task
  and the series ends there.
- **Projects** group related items around a context ("what does this belong
  to?"). Any item type can belong to one project; project state is
  independent from item state — archiving a project keeps its items (only
  blocks new assignments), deleting a project detaches items without deleting
  them. Smart Capture can suggest an existing project by name when it is
  explicitly mentioned, and you confirm before anything is saved.
- **Attachments** let you pin files (images, PDFs, text/markdown/CSV) to any
  item — e.g. a screenshot with a task. Files are stored locally with the
  API (metadata in SQLite, bytes on disk) and travel with the item across
  editing, projects, and search results. In Smart Capture you can pick
  attachments first; they are uploaded only after you confirm the capture, so
  a failed upload never loses your original note. Completed recurring
  occurrences keep their attachments; the next occurrence starts fresh.
- **Search** is a global retrieval tool: text plus filters
  (`type:task python`, `project:"Kosh" architecture`, `tag:ai type:learning`,
  `has:attachment`, `status:done before:2026-09-01`) with ranked results,
  highlighted snippets, and load-more pagination. Project names are
  searchable (kept in sync automatically). Search is local, deterministic,
  and metadata-based — no OCR, no document-content indexing, no semantic
  search yet.
- **Inbox processing** turns a messy capture into a reviewable list of
  suggested actions: press **Process** on an inbox item and Kosh suggests up
  to 5 structured items (tasks/notes/ideas/learning, with due dates,
  priorities, tags, projects, reminders, recurrence). You select, edit,
  remove, and confirm what gets created — nothing is persisted just because
  the AI suggested it, and the original capture is never lost. Accepting
  everything archives the source capture; partial acceptance keeps it in the
  inbox for more processing. Attachments stay on the capture.

### Five content types

Kosh stores everything as one of five first-class content types, all carried by
the same `Item` model (no separate stores):

| Type     | Purpose                                | Key fields                     |
| -------- | -------------------------------------- | ------------------------------ |
| Task     | to-dos with due dates and reminders    | priority · dueAt · reminderAt  |
| Note     | longer thoughts and information        | body · tags · optional url     |
| Idea     | project ideas and half-formed thoughts | body · tags · optional url     |
| Learning | things to learn / backlog              | priority · status · url · tags |
| Link     | saved URLs                             | url (required) · tags · body   |

**Inbox** is the universal capture layer: anything captured lands there first
and can later be converted (in place, same item id) into any of the five types.

## Future features

- **Smart Capture** (implemented in MVP) — AI _suggests_ a structured
  interpretation (type, title, due date, reminder, priority, tags) of a raw
  capture; the user confirms before anything is persisted. **AI is an
  assistant, not the source of truth**: nothing is created automatically.
- **Voice Capture** (implemented in MVP) — record on mobile (or the web
  browser where supported), transcribe server-side, edit the transcript, then
  run it through Smart Capture. Audio is not stored permanently.
- **AI-assisted organization** — auto-classify captures, suggest due dates,
  summarize, and group related items.
- **Natural-language capture parsing** — e.g. "remind me to pay rent on the 1st"
  becomes a task with a reminder (Smart Capture's date/reminder extraction).
- **Web / desktop interface** — the same backend, new surface.
- **Widget / share-sheet capture** — capture from other apps (browser share,
  iOS share sheet).
- **Offline-first capture** — queue captures locally, sync when online.
- **Recurring reminders and smarter scheduling.**
- **Attachments** (images, files).
- **Tags / custom views.**

Future AI directions (explicitly not in this phase): semantic understanding,
automatic organization without confirmation, relationship extraction,
personalized prioritization, knowledge graphs, proactive suggestions.

## Explicitly out of scope for MVP

- Multi-user accounts and collaboration.
- Team / shared workspaces.
- Attachments and rich media (files, images).
- Offline-first sync (device-local capture queue).
- Complex natural-language processing or AI features (Phase 7+).
- Widgets, share extensions, and platform integrations.
- Third-party integrations (calendar, email, chat apps).
- A public API or SDK for external consumers.
- Configurable themes or light mode (dark only, for now).
- Localization / i18n.
