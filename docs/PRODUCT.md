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
or desktop interface as a secondary surface later. It is not a multi-user SaaS.
It is a personal productivity tool.

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

The user is **never required** to choose a category when capturing. Everything
starts as an untagged inbox item; type/status can be changed or inferred later.

## Future features

- **AI-assisted organization** — auto-classify captures, suggest due dates,
  summarize, and group related items.
- **Natural-language capture parsing** — e.g. "remind me to pay rent on the 1st"
  becomes a task with a reminder.
- **Web / desktop interface** — the same backend, new surface.
- **Widget / share-sheet capture** — capture from other apps (browser share,
  iOS share sheet).
- **Offline-first capture** — queue captures locally, sync when online.
- **Recurring reminders and smarter scheduling.**
- **Attachments** (images, files).
- **Tags / custom views.**

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
