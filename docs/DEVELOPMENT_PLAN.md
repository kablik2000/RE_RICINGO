# RICINGO — Development Plan

> Central tracking document. Update it before starting, while doing, and after finishing every task.
> Legend: `[x]` done · `[ ] ⏳` in progress · `[ ]` pending · `[ ] ⛔` blocked
> Last updated: 2026-11-22 (M1 foundation + demo lesson)

---

## A. Project overview

RICINGO is a private, premium Italian learning app for a lecturer's clients. Students learn
through thematic dialogues: every sentence has a Czech translation, audio and a layered
grammatical analysis; vocabulary and exercises are built from the same sentences; grammar topics
recur across lessons. A Teacher Studio lets the lecturer manage students and author, review and
publish content (AI assists later, always under lecturer approval).

Architecture in one line: **Expo (React Native, TypeScript) student app + Teacher Studio, on a
Supabase (Postgres, EU) backend with immutable versioned content, event-based progress and an
on-device SQLite cache/outbox for offline use.**
Details: [ARCHITECTURE.md](ARCHITECTURE.md) · Decisions: [DECISIONS/](DECISIONS/README.md)

## B. Architecture

| Concern            | Choice                                                                        | Status                   |
| ------------------ | ----------------------------------------------------------------------------- | ------------------------ |
| Mobile stack       | Expo SDK 58, React Native 0.88, TypeScript strict                             | Accepted — ADR-0001      |
| Navigation         | Expo Router, typed routes                                                     | Accepted — ADR-0001      |
| Backend & DB       | Flask (Python) REST API `/api/v1` + PostgreSQL, S3-compatible files           | Accepted — ADR-0010      |
| On-device data     | expo-sqlite (+ Drizzle) as cache + outbox                                     | Accepted — ADR-0002/0007 |
| Content versioning | Immutable published lesson versions, stable item IDs                          | Accepted — ADR-0003      |
| Progress & sync    | Append-only learning events, idempotent upload, derived state                 | Accepted — ADR-0003      |
| Auth               | Invite-only, API-issued tokens, roles + scoping in the API, `organization_id` | Accepted — ADR-0004/0010 |
| Updates            | EAS Build / EAS Update (`fingerprint`) / content via backend                  | Accepted — ADR-0005      |
| Teacher Studio     | Content-as-code first, then Expo web app                                      | **Open** — ADR-0006      |
| Repo & frontend    | pnpm monorepo, feature modules, TanStack Query, zod, own design system        | Accepted — ADR-0007      |

Major modules: `auth`, `lessons`, `dialogue`, `sentence-analysis`, `grammar`, `vocabulary`,
`exercises` (type registry), `progress`, `audio`, `profile`, `settings`; Studio: `students`,
`authoring`, `library`, `assignments`, `results`. Shared packages: `domain`, `design-system`, `api`.
Shared tooling config (tsconfig base, ESLint, Prettier) lives at the repository root.

Dependency policy: every added dependency is listed below with a reason; Expo packages via
`npx expo install`.

| Dependency (M1)                                                                                                                                            | Where                       | Reason                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------- |
| expo, expo-router, react-native-screens, react-native-safe-area-context, expo-linking, expo-constants, expo-status-bar, expo-system-ui, expo-splash-screen | mobile                      | Expo SDK 58 runtime, navigation, safe areas, config, system UI                        |
| react-native-reanimated, react-native-worklets, react-native-gesture-handler                                                                               | mobile                      | Template defaults kept for planned motion/gesture work (ADR-0007); first use in M4/M5 |
| react-dom, react-native-web                                                                                                                                | mobile                      | Web target for development previews only (Q-4)                                        |
| expo-dev-client                                                                                                                                            | mobile                      | Development builds instead of Expo Go (ADR-0001)                                      |
| zod                                                                                                                                                        | mobile, domain              | Runtime validation of config and content bundles (ADR-0007)                           |
| @tanstack/react-query                                                                                                                                      | mobile                      | Async/server state for repositories (ADR-0007)                                        |
| expo-speech                                                                                                                                                | mobile                      | DEMO pronunciation via device text-to-speech until real audio exists (Q-3)            |
| jest, jest-expo, @testing-library/react-native, @types/jest                                                                                                | mobile, design-system (dev) | Unit/component testing                                                                |
| eslint, eslint-config-expo, typescript-eslint, eslint-config-prettier, prettier, typescript                                                                | root (dev)                  | Code quality tooling                                                                  |

## C. Roadmap

Spec phases (§11 of the specification) map to milestones:

| Milestone                          | Goal                                                                                                                                | Spec phase |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **M0 Analysis**                    | Requirements, architecture, ADRs, plan — approval gate                                                                              | —          |
| **M1 Foundation**                  | Monorepo, Expo app, tooling, CI, design system, navigation shell, error handling, config                                            | 1          |
| **M2 Backend foundation**          | Flask API + PostgreSQL, schema v1 + migrations, invite auth, `/api/v1` + OpenAPI, generated TS client                               | 1          |
| **M3 Content pipeline**            | Domain schemas, content-as-code, compiler/publisher, versioning, audio pipeline, lesson "Al bar" end-to-end                         | 1          |
| **M4 Core learning**               | Lesson list, lesson intro, turn-by-turn dialogue, layered sentence analysis, audio, full dialogue, grammar topic pages              | 1          |
| **M5 Exercises v1**                | Exercise engine + registry; MultipleChoice, FillInBlank, SentenceBuilder, SentenceTranslation, Listening; result events             | 1          |
| **M6 Vocabulary v1**               | Thematic dictionary, lexeme detail with context sentences + audio                                                                   | 1          |
| **M7 Offline & progress**          | SQLite cache, outbox sync, progress overview, multi-device                                                                          | 1–2        |
| **M8 Teacher Studio MVP**          | Students, invitations, assignments, authoring + publish, results view                                                               | 1–2        |
| **M9 Stabilization & release 1.0** | E2E, security & performance review, migration verification, EAS production, store submission                                        | —          |
| **M10 Practice & personalization** | Custom vocab selections, more activity types, SRS (FSRS), accuracy tracking, progressive difficulty, cross-lesson grammar reminders | 2          |
| **M11 AI assistant for lecturer**  | AI drafts of lessons/variants, error analysis, recommendations, study plans                                                         | 3          |

## D. Task checklist

### M0 — Analysis

- [x] Read product specification (`ricingo_koncepce.md`).
- [x] Inspect repository (empty git repo, no commits, no code).
- [x] Verify current Expo SDK (58, RN 0.88, React 19.3, Node ≥ 22.13).
- [x] Compare backend/database options (ADR-0002).
- [x] Draft architecture (ARCHITECTURE.md) and ADRs 0001–0007.
- [x] Create DEVELOPMENT_PLAN, CHANGELOG, README.
- [x] Owner approval of ADRs 0001–0005 and 0007 (2026-11-22). ADR-0006 stays open.
- [ ] Answers to open questions (§H) — see each question's "Blocks" column.
- [ ] Add product spec to repo as `docs/product/ricingo_koncepce.md` (owner to confirm it may be committed).

### M1 — Foundation

- [x] pnpm workspace, root scripts, `.gitignore`, `.gitattributes`, `.editorconfig`, `.nvmrc` (Node 22).
- [x] `apps/mobile` from `create-expo-app` (SDK 58, React Native 0.88), Expo Router with `src/app`; template example code removed.
- [x] Strict TypeScript base config (`tsconfig.base.json` at root; `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, …).
- [x] ESLint (flat, `strictTypeChecked`) + Prettier + import-boundary rules (verified to fire).
- [x] Jest (`jest-expo`) + React Native Testing Library v14 in `apps/mobile` and `packages/design-system`.
- [x] Environment config: `app.config.ts` + `APP_ENV` per EAS profile + validated `core/config`.
- [x] Design tokens: palette, light/dark colour roles (WCAG AA verified by tests), typography incl. learning-content roles, spacing, radius, sizes, elevation, motion.
- [x] Theme provider + `useThemedStyles` + components: Text, Button, Surface, Screen, Loading/Empty/Error state views.
- [x] Navigation shell: `(student)` tab group (native tabs; JS tabs on web), four tab screens, not-found route, `ricingo://` scheme.
- [x] Error handling: `AppError` kinds, `toAppError`, route error boundaries with localized, kind-specific copy, telemetry port.
- [x] i18n: typed Czech catalog (`t()` keys checked at compile time).
- [x] CI workflow (`.github/workflows/ci.yml`): typecheck, lint, format, tests, bundle check. Not yet run — no Git remote.
- [x] EAS build profiles (`eas.json`: development / preview / production with channels and `APP_ENV`).
- [x] Verification: Android, iOS and web bundles build (`expo export`); `expo-doctor` 20/20; web preview checked in light and dark mode.
- [ ] ⛔ EAS project init, bundle identifiers, first development build on Android + iOS devices (Q-16 account ownership).
- [ ] ⛔ Brand typefaces, app icon and splash (Q-10) — template placeholders in use.
- [ ] ⛔ Crash-reporting provider (Sentry proposed, Q-9) — telemetry port exists with console adapter only.
- [ ] `ListItem` and `AudioButton` components — deferred to M4, when a screen first needs them.

### Demo — "Al bar" vertical slice (pre-M2, requested 2026-11-22)

A runnable demo of the core learning experience on bundled content, built on the real
architecture (domain schemas, repository interface, query layer) so it is reused, not thrown away.

- [x] `packages/domain`: lesson-bundle zod schema (lesson → turns → sentences → segments with layered explanation; grammar topics; lexemes), semantic validator (unique IDs, references, segment order), reading-order and vocabulary queries + tests.
- [x] Demo lesson "Al bar" (`apps/mobile/src/data/demo/al-bar.lesson.json`): 7 turns, 12 sentences, 7 grammar topics, 21 lexemes. **Explanations drafted by the developer — need lecturer review.**
- [x] Data layer: `LessonRepository` interface, bundled (demo) implementation validated with the domain validator, TanStack Query hooks and provider.
- [x] Screens: lesson list, lesson intro, sentence-by-sentence walkthrough with layered analysis, full dialogue with translation toggle, vocabulary with "where I met this word".
- [x] Pronunciation via device text-to-speech (normal + slow) behind a `SpeechPlayer` interface — DEMO, replaced by recorded audio in M3.
- [x] Design system: Card, Chip, Disclosure, ProgressBar; `Screen.safeAreaTop`.
- [x] Integration test of the full lesson flow (list → intro → 12 sentences → dialogue).
- [x] VS Code `tasks.json`: install, verify, start Metro/web, start emulator, Android local build & run, release APK, prebuild, EAS cloud builds, bundle export, expo-doctor.
- [x] Provisional application ID `com.ricingo.mobile` (+ `.dev`/`.preview`) for local builds — to be confirmed (Q-16).
- [x] Runs on Android (emulator, Expo Go SDK 58): lesson list, intro and walkthrough checked; speech plays (emulator has no Italian voice, falls back to English).
- [x] pnpm switched to `nodeLinker: hoisted` (native builds on Windows loop with pnpm's symlinked layout).
- [x] Repository moved to `C:\dev\ricingo` (2026-11-22, copy; old folder left for the owner to delete). Reanimated now compiles.
- [x] Config plugin `plugins/with-android-cmake.js`: on Windows points Gradle at an SDK CMake whose ninja supports long paths (≥ 1.12) via `android/local.properties`. Windows long paths are already enabled on the dev PC.
- [x] CMake 3.31.6 (ninja 1.12.1) installed into the Android SDK from Google's SDK repository (SHA-1 verified); native Android development build `com.ricingo.mobile.dev` built and running on the emulator (2026-11-22).
- [x] App display name **"Italština RICI"** (owner request 2026-11-23; `Dev` / `Preview` suffix for non-production builds). Internal identifiers — `ricingo` code name, `@ricingo/*` packages, URL scheme, provisional app ID `com.ricingo.mobile` — are unchanged.
- [x] Italian voice for demo text-to-speech (requested 2026-11-23; checked on the emulator: notice shown, Google TTS voice download opens):
  - [x] Fix: Android spoke English because `expo-speech` turns the language tag `it-IT` into an invalid Java locale and silently falls back to the device language → pass `it` on Android.
  - [x] Detect whether an Italian voice is installed; when it is missing, show a notice instead of playing a wrong (English-accented) pronunciation.
  - [x] One tap opens the text-to-speech engine's voice download (Android, local native module `modules/tts-voice-data`); the status is re-checked when the user comes back. iOS/web: instructions only (no system API).

### Design v1 — Material 3 visual design (approved 2026-11-23)

Owner approved the mockup (Design canvas "Italština RICI – návrh designu", 4 screens). Implemented and checked on the Android emulator 2026-11-23 (ADR-0009); iOS not built yet.

- [x] Typefaces: Roboto (UI) and Noto Serif (Italian content), loaded at startup (`@expo-google-fonts/*`, `expo-font`).
- [x] Icons: Material Symbols on Android/web, SF Symbols on iOS (`expo-symbols`), via a design-system `Icon` with a curated name set.
- [x] Design system: typography scale, illustration colours, `Icon`, `IconButton`, `ListItem`, `SearchField`, Button icons and sizes, Chip variants (tag / filter), Card variants and tones, ProgressBar sizes.
- [x] Lesson illustrations (vector, `react-native-svg`): café artwork for "Al bar", a neutral fallback for lessons without artwork.
- [x] Lessons: greeting, highlighted first lesson, lesson list with thumbnails, note about upcoming lessons.
- [x] Lesson intro: hero illustration, level chip, stats tiles, actions, grammar list.
- [x] Sentence study: compact progress header, tappable words with one analysis panel, play / slow controls, fixed previous / next bar.
- [x] Full dialogue: restyled to match.
- [x] Vocabulary: search, filters (all / per lesson / part of speech), alphabetical sections, list rows with pronunciation.
- [x] Owner feedback 2026-11-23: tab labels always visible (Android `labelVisibilityMode="labeled"`); a fifth tab **Domů**, first in the bar — its content is to be designed with the owner (for now: greeting and a "being prepared" note); **Lekce** keeps the approved content (greeting, first lesson, list); scrolling content no longer runs under the status bar.
- [x] Design the **Domů** (home) tab content together with the owner — owner's sketch 2026-11-27 (ADR-0018): greeting over a Roman illustration, "Procházet sbírku lekcí", rows Tematické okruhy / Úrovně / Všechny lekce (`/browse?by=theme|level`), "Od vaší lektorky", "Doporučujeme začít". Verified on the Android emulator 2026-11-27.
- [x] Progress ("Pokračovat", "věta 4 z 12" in the mockup) is NOT shown until progress tracking exists (M7); the home card offers the first lesson instead.

### M2 — Backend foundation (Flask + PostgreSQL, ADR-0010)

The Supabase plan (ADR-0002) was superseded on 2026-11-23; tasks rewritten for the Flask backend.

- [x] Local stack defined for Docker (Q-20 answered: Docker): `compose.yaml` with PostgreSQL 17, Mailpit (e-mail catcher) and the API; `.env.example`; VS Code tasks "Backend: …".
- [x] Docker Desktop installed on the dev PC (2026-11-23: Docker 29.9, Compose v5.7, WSL 2). Stack verified: `docker compose up --build` → `/api/v1/health` reports the database `ok`; Mailpit UI answers; the production image (gunicorn) also passes the health check.
- [ ] Object storage for files (S3-compatible) in the local stack — added with the audio pipeline.
- [x] `services/api` skeleton: Flask app factory, settings from environment, `/api/v1/health` (database check), JSON errors, Dockerfile (gunicorn), uv + Ruff + mypy (strict) + pytest; part of `pnpm verify` and a CI job that also builds the Docker image.
- [ ] SQLAlchemy 2 models + Alembic migrations; constraints/triggers for immutability and idempotency. (Lessons + immutable lesson versions done with ADR-0011; idempotency comes with learning events.)
- [x] Organizations and teacher accounts (`users`, role `teacher`), sessions, sign-in throttling; lessons scoped to an organization (ADR-0012, migration `0003_accounts`).
- [x] Student accounts (role `student`), `teacher_students`, invitations (ADR-0013, migration `0005`).
- [ ] Schema v1: content authoring tables (lessons, turns, sentences, segments, explanation layers, lexemes, grammar topics, exercises).
- [ ] Schema v1: lesson_versions (immutable), assignments, learning_events, derived progress tables.
- [ ] Auth: invitations, password (Argon2) + email one-time code, access + rotating refresh tokens, role/organisation checks, tests for every endpoint's access rules.
- [ ] `/api/v1` endpoints: assigned lessons, lesson version, submit events (idempotent), progress, remote config; OpenAPI document.
- [ ] Generated TypeScript client → `packages/api`; error mapping to `AppError`.
- [ ] File storage (audio, artwork): S3-compatible bucket, signed URLs.
- [ ] Hosting (EU) for API + PostgreSQL + files; backups and a documented restore drill (Q-19).
  - [x] ~~Render Blueprint (ADR-0014)~~ — superseded by the VPS before the first deploy (ADR-0015); `render.yaml` removed.
  - [x] VPS stack (ADR-0015): Studio Docker image (Next.js standalone), production `deploy/compose.yaml` (PostgreSQL, API, Studio on loopback ports), shared Caddy proxy (`deploy/proxy/`, `deploy/ricingo.caddy`), `deploy/deploy.sh` (tag's files, pull, migrations, health checks, return to the previous version); release workflow (tag `vX.Y.Z` → CI → images to GHCR → deploy over SSH; dispatch = rollback); guide `docs/setup/NASAZENI_VPS.md`. Stack tested locally with the production compose file (health, Studio sign-in).
  - [x] Server prepared over SSH: `deploy` user with a key restricted to `deploy.sh`, `/srv/ricingo` with `.env` (random database password), `/srv/proxy` with Caddy running.
  - [x] Owner: DNS `rici` and `api.rici` (A + AAAA) at Wedos; `DEPLOY_SSH_KEY` secret in the GitHub environment `production`.
  - [x] First release `v0.1.1` live 2026-11-26 (`v0.1.0` stopped at CI lint, fixed): health OK over HTTPS (Let's Encrypt), HTTP → HTTPS, Studio sends HSTS/CSP, API records the real client address through Caddy (a sent `X-Forwarded-For` is ignored).
  - [ ] First lecturer account (`create-teacher`, guide) and a check of the `__Host-` `Secure` session cookie after sign-in.
  - [x] Firewall: ufw (preinstalled, deny incoming) now allows 22, 80, 443 (IPv4 + IPv6), 2026-11-26.
  - [ ] Server hardening: no password login for root.
  - [ ] Database backups (scheduled `pg_dump` off the server) and a documented restore drill.
  - [ ] File storage for audio and artwork (S3-compatible bucket or server volume with backups).
- [ ] Mobile data layer: API-backed `LessonRepository` (secure token storage done with student sign-in, ADR-0013).
- [x] Student sign-in screens (accept invitation, sign in) — no auth gate: the app works without an account (ADR-0013).
- [ ] Profile: account details, sign-out, account deletion entry point.
- [x] `docs/ARCHITECTURE.md` rewritten for ADR-0010 (system overview, repository layout, backend, auth, testing, security).
- [x] Lesson JSON Schema generated from the zod schema (`packages/domain/schema/`, copy in `services/api/src/rici_api/schemas/`); a domain test fails when a copy is stale (`pnpm --filter @ricingo/domain schema:update`); the API validates bundle structure with it (`rici_api.content`), demo lesson passes.
- [x] Semantic lesson checks in the API (references, segment order) — port of `validateLessonBundle` (`rici_api.content`), enforced on publish.

### M3 — Content pipeline

- [x] Domain model + zod schemas (lesson, turn, sentence, segment, layers, lexeme, grammar topic) — done in the demo slice.
- [x] Content validator (IDs, references, segment order) — done in the demo slice.
- [ ] Exercise type registry interface + schema/evaluator for first types.
- [ ] Answer normalization rules (Italian apostrophes, accents, punctuation) + tests.
- [ ] Content-as-code format in `content/` + validator CLI.
- [ ] Compiler → lesson bundle; publish through the API (new immutable version).
- [ ] Audio pipeline (hybrid per Q-3; provider pending): cloud TTS at publish time, lecturer review/re-generate/replace with recording, naming, hashing, upload, normal + slow variants.
- [ ] Author lesson "Al bar" (8 exchanges) with lecturer — reference content. A developer-drafted 4-exchange demo version exists and needs review/extension.

### M4 — Core learning experience

- [ ] Lessons list (assigned, progressive order) with states.
- [ ] Lesson intro (goal, grammar topics, vocabulary preview).
- [ ] Turn-by-turn dialogue walkthrough.
- [ ] Sentence analysis screen with layered explanations (basic → grammar → depth).
- [ ] Audio playback service (normal/slow, replay, preload).
- [ ] Full dialogue view with per-line audio and "play all".
- [ ] Grammar topic pages + links from segments.
- [ ] Learning events emitted for completed steps.

### M5 — Exercises v1

- [x] Practice generated from lesson content (ADR-0017, owner 2026-11-27): `packages/domain/src/practice` — vocabulary (choice, both directions), dialogues (pick the reply), listening (pick the meaning of a spoken sentence), grammar (fill in a grammar-linked segment), translations (build the sentence from tiles); distractors from the same lesson; tests.
- [x] Exercise session engine (reducer, check, solution, summary) and Leitner review schedule; 10 items per session, new and due first.
- [x] App: Procvičování tab (Doporučené / Podle lekcí, per grammar topic), session screen per the owner's sketch (progress, options, tiles, green/red feedback with the solution and pronunciation, summary); progress per item in SQLite (`practice_reviews`), saved per answer. Verified on the Android emulator 2026-11-27.
- [x] Studio: lesson editor tab _Procvičování_ — preview of every generated exercise, sentences and words left out (`practice` in the lesson bundle, JSON Schema regenerated). Verified in the browser 2026-11-27.
- [ ] Typed answers (translation by typing, accent mistakes reported separately) — owner chose choices and tiles for v1.
- [ ] More types: word matching, text comprehension; authored or AI-generated exercises through the type registry (ARCHITECTURE §5.2).
- [ ] Graceful handling of unknown exercise types (once exercises can come as data).
- [ ] Results recorded as events / synced to the server (ADR-0013 step 6); until then progress stays on the device.

### M6 — Vocabulary v1

- [ ] Thematic categories and lexeme list.
- [ ] Lexeme detail: translation, gender/article, audio, example sentences from lessons.
- [ ] "Where I met this word" links back to dialogues.

### M7 — Offline & progress

- [x] Local SQLite schema + migrations (`lessons`, `settings`; `PRAGMA user_version`) — logic tested against the in-memory store; the SQLite adapter itself is checked on the device only.
- [ ] SQLite adapter tests on a device or emulator (Maestro / dev build) — Jest has no native SQLite.
- [ ] Content bundle and audio download/cache per assigned lesson. (Bundles done: `/api/v1/content` catalog + versions, validated install; audio comes with the audio pipeline; "assigned" with M2 auth.)
- [x] Owner requirement 2026-11-23: the app works fully offline; when online it checks for new or changed lessons and updates them (Q-18: automatic on Wi-Fi, offered on mobile data). A lesson in progress is never swapped mid-lesson.
- [x] Settings → "Aktualizace lekcí" (owner request 2026-11-23, in the Profile tab): _Automaticky jen přes Wi-Fi, jinak se zeptat_ (default) / _Vždy automaticky_ / _Vždy se zeptat_; stored on the device.
- [ ] Outbox with idempotent upload, backoff, connectivity awareness.
- [ ] Progress overview screen.
- [ ] Multi-device verification.

### Public app & lecturer recommendations (ADR-0013, decided 2026-11-24)

Order: each step is usable on its own.

- [x] 1. Lesson visibility: Studio switch "Veřejná / Jen pro mé studenty" (default: students only); public catalog of all organizations' public lessons without sign-in; content API for public lessons leaves development-only. Done 2026-11-24 (migration `0004_lesson_visibility`; already published lessons stay public); verified in the browser, the student app on a device not re-checked (its removal logic is unchanged).
- [x] 2. Students and invitations in the Studio: student list, invite by e-mail (Mailpit in development), parental-consent confirmation for students under 15, revoke access. Done 2026-11-24: page Studenti, invitation e-mail with a 12-character one-time code (valid 14 days, stored hashed), resend, revoke, remove a student (a student without any teacher is disabled), max 50 invitations per teacher a day; migration `0005_students_and_invitations`. Verified in the browser with Mailpit.
- [x] 3. Student sign-in in the app: accept invitation with the code alone (account takes the invited e-mail), set password, sign in/out on any device, at most 3 signed-in devices (a 4th is refused; the student removes a device in the app, the lecturer can sign the student out everywhere in the Studio), tokens in `expo-secure-store`; the app keeps working without an account. Done 2026-11-25: Profile → \"Účet studenta\" (Mám pozvánku / Přihlásit se / Moje zařízení / Odhlásit se), device-limit chooser, `expo-secure-store` (new development build), Studio column \"Zařízení\" and \"Odhlásit všude\"; student passwords at least 12 characters; migration `0006_session_device_name`. Verified on the Android emulator against the Docker API (accept with a code typed in lower case, restart keeps the session, 4th device refused and replaced, device removed, lecturer signs the student out everywhere).
- [x] 4. Recommendations per student: Studio student detail → recommend lessons and topics ("okruhy"); recommended private lessons download for that student. Done 2026-11-25 (owner: recommend practice, lessons and words): Studio Studenti → student page with "Doporučit" — _Lekce_ (go through a lesson), _Procvičování_ (a whole lesson or one of its grammar topics), _Slovíčka_ (chosen words of a lesson), optional note; list with remove; only published lessons of the teacher's organization; migration `0007_recommendations`; `GET /api/v1/student/recommendations`; the content catalog with the student's token adds recommended lessons (also "Jen studenti"), the app sends the token and checks lessons right after sign-in and sign-out. Verified in the Studio and on the Android emulator (a students-only lesson downloads after sign-in and is removed after sign-out).
- [x] 5. Home block "Od vaší lektorky" for signed-in students (ADR-0018): `GET /api/v1/student/recommendations`, kept on the device for offline use and forgotten on sign-out; lesson → opens it, practice → the topic or the whole lesson mixed (`kind=mixed`), words → vocabulary practice of exactly those words. Verified on the Android emulator 2026-11-27 with a local test lecturer and student.
- [x] Lesson themes (ADR-0018): optional `lesson.theme` from a fixed list, chosen in the Studio (Informace o lekci → Téma); the app groups lessons by theme. The demo lesson Al bar is "Jídlo a pití".
- [ ] Set themes on the lessons in production and publish them again (lecturer).
- [ ] Recommendations: recommend public lessons of other organizations (the Studio lists only its own); mark a recommendation done (with progress, step 6).
- [ ] 6. Server-side progress for signed-in students (with M7 progress sync); keep anonymous progress after signing in.

### M8 — Teacher Studio MVP (Next.js `apps/studio`, ADR-0010)

- [x] Studio shell (2026-11-23): Next.js 16 App Router, TypeScript strict, ESLint (own config), Vitest, Roboto + Noto Serif, design tokens from `@ricingo/design-system/web` as CSS variables; overview page with backend status; in `pnpm verify`, CI build, VS Code task, preview config.

- [x] Studio design approved 2026-11-23 (Design canvas "Teacher Studio – návrh designu": overview, lessons, lesson editor; Material 3 admin dashboard).
- [x] Lesson storage (ADR-0011): `lessons` (draft as validated JSON) + immutable `lesson_versions`, Alembic migration, semantic checks in Python, Studio endpoints (dev/test only until auth), demo lesson seed, tests against PostgreSQL.
- [x] Studio shell per design: navigation drawer (rail in the editor), top app bar, overview dashboard with real counts.
- [x] Lessons list per design: filters, data table, status.
- [x] Lesson editor per design: dialogue tree, sentence + segment editing, layered explanations, vocabulary and grammar links, lesson info, live phone preview, autosave, check, publish (checked in the browser 2026-11-23 on the demo lesson).
- [x] Student app reads published lessons from the API instead of the bundled demo (offline cache, M7 update rules). Development only until auth; verified on the Android emulator against the Docker API.
- [ ] Content API for real builds: authentication, assigned lessons only, production URL (`RICI_API_URL`), HTTPS — with M2 auth and hosting (Q-19).
- [x] Unpublish lessons (Studio "Zrušit zveřejnění", `POST …/unpublish`): the lesson leaves the content catalog, its draft and versions stay, "Znovu zveřejnit" restores the same version. Verified in the browser and on the Android emulator 2026-11-23.
- [x] Lessons no longer in the catalog are removed from the device on the next check (also the bundled demo; an open lesson is removed when the student leaves it).
- [ ] With assignments: an unassigned lesson leaves the student's catalog and is removed the same way; decide what happens to the student's progress in a removed lesson.
- [x] Delete lessons in the Studio ("Smazat"): a never-published draft is deleted; a published lesson must be unpublished first and is then archived (its versions stay). Verified in the browser 2026-11-23.
- [x] Student app tells what an automatic update changed ("Lekce jsou aktualizované": new, changed, removed lessons, until the student taps OK) and checks again on every return to the app (30 s guard). Verified on the Android emulator 2026-11-23.
- [ ] Studio: drag-and-drop reordering of turns/sentences; selecting segment text with the mouse (now typed); lesson import from file.
- [x] Operator import of a lesson as a draft (2026-11-26): `flask import-lesson <file> --organization <org> --draft [--public]` stores the bundle unpublished (version reset to 1, incomplete drafts allowed, problems listed) for review and publishing in the Studio; bad files and existing IDs are refused with a clear message.
- [x] Development lessons `al-bar` and `al-barro` copied to production as drafts (organization RICI, visibility public) after v0.2.0, 2026-11-26.
- [ ] Studio validation messages: the API's schema messages are translated for known patterns only; unknown ones show in English.
- [x] Teacher sign-in (ADR-0012): login page, `httpOnly` session cookie, every page/action/API call checks the session, organization scoping, CSP + security headers, operator commands and VS Code tasks to create accounts. Verified in the browser 2026-11-23 (production build: sign-in, wrong password, forged cookie, sign-out).
- [ ] Two-factor sign-in for teachers (postponed by the owner, ADR-0012) and a breached-password check.
- [ ] Self-service password reset by e-mail (with invitations); until then the operator command `set-password`.
- [x] Change one's own password in the Studio (2026-11-26): avatar → "Můj účet" (`/account`), `POST /api/v1/auth/password` (current password checked like a sign-in and throttled; new one by the same rules, refused with a `password_*` code; the account's other sessions end, this one stays). Verified in the browser (mismatch, wrong current password, the e-mail as password, success).
- [x] Studio usable on phones (2026-11-26): below 840 px the navigation is a modal drawer behind a menu button (also in the editor), tighter page margins, overview rows wrap, the editor is one column with a scrolling header and tabs. Checked at 375 px: overview, lessons, account, editor.
- [x] Statistics page in the Studio (2026-11-26, "Statistiky" in the navigation): tiles (lessons, sentences, words, grammar topics, students, students active in 7/30 days, recommendations), lessons by level and by status, invitations by state, monthly new students and published lesson versions for 12 months; `GET /api/v1/studio/statistics` (lessons per organization, students per teacher). Checked in the browser on desktop and at 375 px.
- [ ] Learning results in the statistics (finished lessons, frequent mistakes): needs progress sync from the app (M2/M7), then the "Výsledky" page.
- [ ] Studio on phones, next: tables (lessons, students, vocabulary) still scroll sideways inside their card; card layouts for compact widths.
- [ ] Pass the real client address from the Studio to the API over a trusted channel (sign-in throttling per address), with hosting (Q-19). The app's requests carry it through Caddy (ADR-0015); the Studio's sign-ins still all come from the Studio's own address.
- [ ] The student's account section needs the server: offline it shows an error instead of the last known account (cache the profile with the token).
- [ ] Production e-mail: SMTP provider and sender domain for invitations (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_STARTTLS`, `MAIL_FROM`; Q-10).
- [x] Students: list, invite, resend, revoke, remove (ADR-0013 step 2). Student profile and level: later.
- [ ] Assignments: assign/reorder lessons per student.
- [ ] Authoring: edit lesson drafts, preview, publish (reusing compiler/validator).
- [ ] Results: per-student progress and frequent mistakes.

### Android APK download (ADR-0016)

- [x] App icon in the italstinarici.cz brand (white Merriweather "RICI", beige swash on `#D2454B`): icon, adaptive icon layers, monochrome, splash, favicon (2026-11-26).
- [x] Application ID `eu.esprog.rici`; release key (keystore outside the repo, `~/.gradle/gradle.properties`), config plugin `with-android-release-signing` (+ test), build script `apps/mobile/scripts/build-release-apk.ps1`, guide `docs/setup/ANDROID_APK.md`.
- [x] Download page `deploy/www/app` (brand style, self-hosted fonts, real QR code, install steps, iPhone "Připravujeme"); Caddy serves `/app/` from `/srv/www/rici-app`.
- [ ] Back up the release keystore and `gradle.properties` outside this computer (owner).
- [ ] Android `versionCode` policy and an in-app notice when a newer APK is available.
- [ ] App palette to the brand red `#D2454B` (`packages/design-system` palette, Q-10).
- [ ] iPhone: Apple Developer account → TestFlight / App Store (Q-9, Q-16).

### M9 — Stabilization & release 1.0

- [ ] Maestro E2E for critical flows.
- [ ] Security review (RLS, secrets, storage policies).
- [ ] Performance review (startup, lists, audio).
- [ ] Migration verification on staging copy of production data.
- [ ] EAS Update channels and rollback drill.
- [ ] Account deletion + data export.
- [ ] Store listings, privacy labels, reviewer demo account, submission.

### M10 / M11

Tasks to be broken down when M9 is near completion (see roadmap).

## E. Current status

|                 |                                                                                   |
| --------------- | --------------------------------------------------------------------------------- |
| **Completed**   | M0 analysis; M1 foundation except the blocked items below; demo lesson slice      |
| **In progress** | M2 backend (Docker stack, lessons); M7 offline content updates; M8 Teacher Studio |
| **Pending**     | M2 backend foundation                                                             |
| **Blocked**     | EAS project + store builds (Q-16); brand assets (Q-10); crash reporting (Q-9)     |

## F. Known issues and technical debt

- **Demo content is not lecturer-reviewed.** Italian sentences follow the spec's example; Czech explanations are developer drafts (spec §8 requires lecturer approval).
- **Demo audio is device text-to-speech** (quality depends on the device's Italian voice); real audio is open question Q-3.
- **Release builds have no API URL yet** (hosting, Q-19): they use the bundled demo lesson. The public catalog itself is served in every environment (ADR-0013).
- **Application ID** is `eu.esprog.rici` since 2026-11-26 (ADR-0016) and must not change; development builds are `eu.esprog.rici.dev` (a new development build is needed on devices that had `com.ricingo.mobile.dev`).
- iOS has not been built (requires EAS cloud build or a Mac).
- Local Android builds fail inside the AI assistant's sandbox (Java cannot open its loopback socket); run them from a normal terminal or VS Code task.
- **Native Android builds on Windows need long-path support**: generated C++ object paths of React Native libraries exceed 260 characters. Requires Windows long paths (enabled on the dev PC) and an SDK CMake with ninja ≥ 1.12, selected by `plugins/with-android-cmake.js`. Builds are local only (owner decision 2026-11-22: no EAS cloud builds).
- The Android emulator has no Italian text-to-speech voice preinstalled; the app now shows a notice with a one-tap download. Downloading the voice and playback afterwards has not been verified end-to-end yet.
- Free disk space on the dev PC is low (≈ 23 GB of 440 GB); Docker images and volumes need several GB more over time.
- pnpm pinned to 10.34: pnpm 12 cannot run through the corepack shipped with Node 22 (corepack 0.32). Revisit when upgrading Node/corepack.
- `eslint-plugin-react` cannot auto-detect the React version under ESLint 10 → version pinned in `eslint.config.mjs` (keep in sync with `react`).
- Expo's config loader cannot import TypeScript modules → `app.config.ts` repeats the `APP_ENV` list; a test keeps it identical to `core/config/app-env.ts`.
- Telemetry logs to the console in every environment; production errors are not collected remotely until a provider is approved (Q-9).
- App icon and splash image are Expo template placeholders; splash colour and brand red are provisional (Q-10).
- Web tab bar (development preview only) shows default placeholder icons and slightly clipped labels.
- CI typechecks without generated typed routes (`.expo/types` is created by `expo start`), so route strings are only loosely typed there.
- Lesson artwork is chosen by lesson id in app code (`features/lessons/artwork`); it moves into lesson content (artwork key set in Teacher Studio) in M3.
- The study screen's tappable words are nested `Text` elements; screen-reader navigation between them should be checked on a real device with TalkBack / VoiceOver.
- CI workflow has not run yet (repository has no remote).
- Spec §9 omits a `SentenceBuilder` type although §4 requires "skládání vět" — added to the registry plan.
- Spec phases do not include teacher tooling in Phase 1, yet content must be authored → content-as-code bridge (ADR-0006).
- `SpeakingExercise` and `FreeWriting` have no evaluation method defined (Q-8); not scheduled before M10.
- "Difficulty adapts to the student" (spec §7) has no defined rules (Q-13).

## G. Next steps

1. Decide account ownership (Q-16) → create Expo/EAS project, set bundle identifiers, run first development builds on Android and iOS.
2. Answer questions that shape the M2 schema: Q-9 (hosting budget), Q-17 (vy/ty). (Q-2 and Q-7 answered 2026-11-23.)
3. Continue M2 on the running Docker stack: schema v1 + migrations, auth.
4. Push the repository to a Git host so CI runs.
5. Start M2 Backend foundation.
6. In parallel: lecturer prepares the "Al bar" reference lesson and grammar-topic list (Q-6, Q-14).

## H. Open questions

| ID   | Question                                                                                                                                                                                                                                                                                                                                                 | Why it matters                | Blocks              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------- |
| Q-1  | Teacher Studio platform. **Answered 2026-11-23:** Next.js + React + TypeScript in the monorepo (`apps/studio`), backend Flask + PostgreSQL (ADR-0010).                                                                                                                                                                                                   | Second app/stack, timeline    | M8 (and M3 format)  |
| Q-2  | One lecturer only, or several lecturers/schools in future? **Answered 2026-11-23:** several lecturers → organizations and teacher accounts (ADR-0012).                                                                                                                                                                                                   | Tenancy, roles, pricing       | M2 schema           |
| Q-3  | Audio source: lecturer/native-speaker recordings, neural TTS reviewed by lecturer, or hybrid? **Direction approved 2026-11-23: hybrid** — cloud neural TTS generated server-side when a lesson is published (normal + slow), reviewed by the lecturer, any line replaceable by her recording; files cached offline. Open: TTS provider and budget (Q-9). | Cost, quality, pipeline       | M3 audio (provider) |
| Q-4  | Student platforms: iOS + Android only, or also web?                                                                                                                                                                                                                                                                                                      | Testing scope, offline on web | M1                  |
| Q-5  | Distribution: public store listing with invite-only login, or private/unlisted distribution? **Answered 2026-11-24:** public listing; usable without an account, accounts by invitation (ADR-0013).                                                                                                                                                      | Store review, discoverability | M9                  |
| Q-6  | Level framework (CEFR A1–B2?) and grammar-topic taxonomy — will the lecturer provide it?                                                                                                                                                                                                                                                                 | Content model fields          | M3                  |
| Q-7  | Can students be minors (under 15 in CZ)? **Answered 2026-11-23:** yes → student accounts need GDPR parental consent and child-appropriate data handling (M2 student sign-in, M9).                                                                                                                                                                        | GDPR parental consent         | M2/M9               |
| Q-8  | Speaking and free-writing exercises: speech recognition, AI grading or teacher grading — and when?                                                                                                                                                                                                                                                       | Scope, cost, privacy          | M10+                |
| Q-9  | Budget approval: hosting for API + PostgreSQL + files (Q-19), EAS plan, Apple (99 USD/yr) + Google (25 USD) accounts, Sentry, TTS                                                                                                                                                                                                                        | Hosting choices               | M1/M2               |
| Q-10 | Brand assets: RICI logo, exact red, typefaces; email sender domain for invitations                                                                                                                                                                                                                                                                       | Design tokens, auth emails    | M1/M2               |
| Q-18 | Content updates when online. **Answered 2026-11-23:** on Wi-Fi, new/changed lessons incl. audio download automatically in the background; on mobile data the app offers the update and downloads only after the student confirms. This is the default of a student setting (Settings → Aktualizace lekcí).                                               | Sync UX, data usage           | M7                  |
| Q-19 | Hosting for the Flask API, PostgreSQL and files (EU): e.g. a managed platform (Render, Fly.io, Railway) + managed Postgres, or a VPS (Hetzner) run by us?                                                                                                                                                                                                | Cost, operations, backups     | M2                  |
| Q-20 | Local PostgreSQL for development. **Answered 2026-11-23:** Docker (Docker Desktop with WSL 2), useful for the whole backend stack.                                                                                                                                                                                                                       | Dev setup                     | M2                  |
| Q-11 | Offline scope: all assigned lessons incl. audio downloadable?                                                                                                                                                                                                                                                                                            | Storage, sync design          | M7                  |
| Q-12 | When the lecturer edits a published sentence, how to decide "minor edit" vs "new sentence"?                                                                                                                                                                                                                                                              | Progress continuity           | M3/M8               |
| Q-13 | Adaptive difficulty: rule-based (proposed for M10) — which signals and limits?                                                                                                                                                                                                                                                                           | Personalization design        | M10                 |
| Q-14 | Who authors the first 50–100 units; do existing materials (Word, PDF) need importing?                                                                                                                                                                                                                                                                    | Import tooling                | M3                  |
| Q-15 | Practice reminders / push notifications wanted? (not in spec)                                                                                                                                                                                                                                                                                            | Native capability, consent    | M9+                 |
| Q-16 | Who owns developer accounts (Apple, Google, Expo, hosting, domain)?                                                                                                                                                                                                                                                                                      | Legal ownership, access       | M1                  |
| Q-17 | Czech UI tone: formal "vy" (current, provisional) or informal "ty"?                                                                                                                                                                                                                                                                                      | Brand voice, all copy         | M4                  |
