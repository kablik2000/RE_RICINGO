# Changelog

All notable project changes. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Fixed

- 2026-11-23 — Studio "Smazat" and "Zrušit zveřejnění" could silently do nothing: they asked
  with the browser's `confirm()`, which a browser may suppress ("prevent this page from creating
  additional dialogs"). They now use an in-page Material dialog.
- 2026-11-23 — Root scripts (`verify`, `test`, `typecheck`, `studio:dev`) failed with
  "'pnpm' is not recognized" when pnpm was only available through Corepack; they now call
  `corepack pnpm`. The VS Code task for the Studio is now named
  "Teacher Studio (web administrace): start".
- 2026-11-23 — Teacher Studio opened from another device (`http://<PC IP>:3000`) rendered but
  did not react to clicks: the Next.js dev server blocks its scripts for other hosts than
  localhost. `next.config.ts` now allows this PC's local network addresses (`allowedDevOrigins`).
- 2026-11-23 — Studio lesson check said only "Seznam je prázdný." for a sentence without parts;
  it now says that the sentence has no parts and how to add them (also for an empty dialogue
  or turn).
- 2026-11-23 — Android demo pronunciation was always English: `expo-speech` turns the tag `it-IT`
  into an invalid Java locale and falls back to the device language. Android now passes `it`.
- 2026-11-23 — Jest worker no longer leaks after tests (query cache GC timers disabled in
  `renderWithProviders`).

### Added

- 2026-11-23 — **Sign-in to the Teacher Studio** (ADR-0012): operator-created teacher accounts in
  organizations (`flask create-teacher`, VS Code task "Teacher Studio: create a teacher account"),
  Argon2id passwords of at least 15 characters, sign-in throttling, server-side sessions (2 h idle,
  12 h maximum) in an `httpOnly`, `SameSite=Strict` cookie, sign-out, lessons scoped to the
  teacher's organization, Content Security Policy with nonces and security headers. The Studio
  endpoints now need a session in every environment. API: `/api/v1/auth/login|logout|me`,
  migration `0003_accounts`. `backend:seed` imports the demo lesson into organization "RICI".
- 2026-11-23 — **Deleting lessons in the Studio** ("Smazat" in the editor, with a confirmation):
  a draft that was never published is deleted; a published lesson must be unpublished first and
  is then archived, its versions kept. API: `DELETE /api/v1/studio/lessons/<id>`.
- 2026-11-23 — **Student app shows what an update changed**: after lessons were downloaded or
  removed without asking (Wi-Fi), Home, Lessons and Profile show "Lekce jsou aktualizované" with
  the new, changed and removed lessons until the student taps OK. The app now checks for updates
  on every return to the foreground (previously only after 15 minutes).
- 2026-11-23 — **Unpublishing lessons**: the Studio editor has "Zrušit zveřejnění" (with a
  confirmation); the lesson is hidden from students ("Skryto studentům · vN", filter "Skryté"),
  its draft and published versions stay, and "Znovu zveřejnit" restores it (the same version if
  the draft did not change). API: `POST /api/v1/studio/lessons/<id>/unpublish`, migration
  `0002_lesson_unpublished_at`. The student app removes lessons that are no longer in the
  catalog at the next update check (an open lesson after the student leaves it).
- 2026-11-23 — **Student app downloads published lessons and works offline** (M7 start, Q-18):
  lessons live in an on-device SQLite store (seeded with the bundled demo lesson); the app
  checks the API's new content catalog (`/api/v1/content`) at start, on return and when the
  connection changes, downloads updates on Wi-Fi automatically and offers them on mobile data
  (banner on Home and Lessons). Profile → **Aktualizace lekcí** lets the student choose
  _Automaticky přes Wi-Fi_ / _Vždy automaticky_ / _Vždy se zeptat_ and check manually. An open
  lesson is never swapped mid-lesson. New native modules `expo-sqlite`, `expo-network` → a new
  development build is required.
- 2026-11-23 — **Teacher Studio built to the approved design** (ADR-0011): overview dashboard
  with real counts, lessons list with filters and search, new-lesson form, and the lesson
  editor (dialogue tree, sentence and segment editing with layered explanations, vocabulary and
  grammar tabs, lesson info, live phone preview, autosave, check, publish).
  Backend: `lessons` + immutable `lesson_versions` (Alembic migration, trigger), semantic lesson
  checks in Python, Studio endpoints (development only until auth), demo lesson import
  (`pnpm backend:seed`), tests against PostgreSQL (also in CI).
- 2026-11-23 — **Teacher Studio shell** (`apps/studio`, Next.js 16): overview page with the
  backend status, shared design tokens as CSS variables (`@ricingo/design-system/web`), same
  typefaces as the app, Vitest, own ESLint config, CI build.
- 2026-11-23 — **One lesson schema for TypeScript and Python:** JSON Schema generated from the
  zod schema, committed for the API; the Flask API validates lesson structure with it.
- 2026-11-23 — **Backend skeleton (ADR-0010).** `services/api` (Flask, SQLAlchemy, psycopg,
  gunicorn; uv, Ruff, mypy, pytest) with `/api/v1/health`; `compose.yaml` (PostgreSQL 17, Mailpit,
  API), `.env.example`, VS Code backend tasks, CI job with Docker image build; Docker install guide
  `docs/setup/INSTALACE_DOCKERU.md`. Verified in Docker on the dev PC (health check reports the database `ok`).
- 2026-11-23 — **Visual design v1 (ADR-0009).**
  - Roboto + Noto Serif typefaces, Material Symbols / SF Symbols icons, vector lesson artwork.
  - Design system: `Icon`, `IconButton`, `ListItem`, `SearchField`, `FilterChip`, Button icons
    and sizes, Card variants and tones, Screen hero / top bar / footer, new type roles,
    illustration colours.
  - Lessons: greeting, highlighted first lesson, list with artwork. Lesson intro: hero
    illustration, stats, grammar list. Sentence study: tappable words with one analysis panel,
    progress header, fixed previous / next. Full dialogue and vocabulary restyled; vocabulary
    gained search and filters.
  - Czech plural forms in i18n (`tPlural`).
  - Navigation: new **Domů** tab (content to be designed; shows a "being prepared" note), tab
    labels always visible.
- 2026-11-23 — **Italian voice check for demo pronunciation.**
  - When the device has no Italian text-to-speech voice, pronunciation controls are replaced by a
    notice ("Chybí italský hlas") instead of playing English-accented Italian.
  - Android: one tap opens the speech engine's voice download; the status is re-checked when the
    app returns to the foreground or on "Zkontrolovat znovu". iOS/web: where to get the voice.
  - First local native module `apps/mobile/modules/tts-voice-data` (ADR-0008).
- 2026-11-22 — **Demo: "Al bar" lesson slice.**
  - `packages/domain`: lesson-bundle schema (zod) with layered explanations, grammar topics and
    lexemes; semantic content validator; reading-order and vocabulary queries.
  - Demo lesson "Al bar" bundled with the app (12 sentences, developer-drafted explanations
    pending lecturer review).
  - Data layer: `LessonRepository` with a bundled demo implementation, TanStack Query hooks.
  - Screens: lesson list and intro, sentence-by-sentence analysis, full dialogue, vocabulary.
  - Pronunciation through device text-to-speech (demo, normal + slow speed).
  - Design system: Card, Chip, Disclosure, ProgressBar.
  - VS Code `tasks.json` for verifying, running (Metro, web, emulator) and building (local
    Android, EAS cloud).
  - Provisional application ID `com.ricingo.mobile` for local builds.
- 2026-11-22 — **M1 Foundation.**
  - pnpm workspace (`apps/*`, `packages/*`), Node 22, strict shared TypeScript config.
  - `apps/mobile`: Expo SDK 58 / React Native 0.88 app with Expo Router, development-client
    workflow, `app.config.ts` with `APP_ENV` (development / preview / production), EAS build
    profiles and channels.
  - `packages/design-system`: palette, light/dark colour roles (WCAG AA verified by tests),
    typography with learning-content roles, spacing, radius, sizes, elevation, motion; theme
    provider; Text, Button, Surface, Screen, Loading/Empty/Error state components.
  - App core: validated runtime config, `AppError` + error presentation, route error boundaries,
    telemetry port (console adapter), typed Czech i18n catalog.
  - Navigation shell: student tab group (Lekce, Slovník, Procvičování, Profil) with empty states,
    profile with build info, not-found route.
  - Quality: ESLint (type-checked, import boundaries), Prettier, Jest + React Native Testing
    Library (65 tests), GitHub Actions CI workflow.
- 2026-11-22 — Phase 1 analysis documentation: `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_PLAN.md`,
  ADRs 0001–0007 in `docs/DECISIONS/`, `README.md`.

### Changed

- 2026-11-23 — **Backend decision changed (ADR-0010):** Flask + PostgreSQL replaces Supabase
  (ADR-0002 superseded); Teacher Studio in Next.js in this monorepo (ADR-0006 decided). Plan M2
  rewritten; content updates: automatic on Wi-Fi, offered on mobile data (Q-18), as a setting.
- 2026-11-23 — App display name is now **Italština RICI** (`Dev` / `Preview` suffixes); code name
  and identifiers stay `ricingo`.
- 2026-11-23 — Q-3 direction approved: hybrid audio (cloud neural TTS generated at publish time,
  lecturer review, optional lecturer recordings). Provider still open.

- 2026-11-22 — Repository moved to `C:\dev\ricingo`; pnpm uses a hoisted `node_modules`; config plugin selects a long-path-capable CMake for local Android builds on Windows; lesson routes no longer depend on generated typed-route definitions.

- 2026-11-22 — ADRs 0001–0005 and 0007 accepted by the product owner. ADR-0006 (Teacher Studio
  platform) remains open.
