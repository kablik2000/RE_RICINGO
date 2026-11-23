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

| Concern            | Choice                                                                 | Status                   |
| ------------------ | ---------------------------------------------------------------------- | ------------------------ |
| Mobile stack       | Expo SDK 58, React Native 0.88, TypeScript strict                      | Accepted — ADR-0001      |
| Navigation         | Expo Router, typed routes                                              | Accepted — ADR-0001      |
| Backend & DB       | Supabase (Postgres, Auth, Storage, Edge Functions), EU region          | Accepted — ADR-0002      |
| On-device data     | expo-sqlite (+ Drizzle) as cache + outbox                              | Accepted — ADR-0002/0007 |
| Content versioning | Immutable published lesson versions, stable item IDs                   | Accepted — ADR-0003      |
| Progress & sync    | Append-only learning events, idempotent upload, derived state          | Accepted — ADR-0003      |
| Auth               | Invite-only Supabase Auth, roles via JWT claim, RLS, `organization_id` | Accepted — ADR-0004      |
| Updates            | EAS Build / EAS Update (`fingerprint`) / content via backend           | Accepted — ADR-0005      |
| Teacher Studio     | Content-as-code first, then Expo web app                               | **Open** — ADR-0006      |
| Repo & frontend    | pnpm monorepo, feature modules, TanStack Query, zod, own design system | Accepted — ADR-0007      |

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
| **M2 Backend foundation**          | Supabase projects, schema v1, RLS + pgTAP, invite auth, `api_v1`, type gen                                                          | 1          |
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
- [ ] Design the **Domů** (home) tab content together with the owner.
- [x] Progress ("Pokračovat", "věta 4 z 12" in the mockup) is NOT shown until progress tracking exists (M7); the home card offers the first lesson instead.

### M2 — Backend foundation

- [ ] ⛔ Docker on the development machine (required by the Supabase CLI for the local stack).
- [ ] Supabase CLI local setup, staging + production projects (EU).
- [ ] Schema v1: organizations, profiles, teacher_students, invitations.
- [ ] Schema v1: content authoring tables (lessons, turns, sentences, segments, explanation layers, lexemes, grammar topics, exercises).
- [ ] Schema v1: lesson_versions (immutable), assignments, learning_events, derived progress tables.
- [ ] RLS policies for all tables + pgTAP tests (isolation, role checks, immutability).
- [ ] Custom access-token hook (role, organization claims).
- [ ] Invitation flow (Edge Function + email template).
- [ ] `api_v1` views/RPCs: get assigned lessons, get lesson version, submit events, get progress, remote config.
- [ ] Generated DB types → `packages/api`; typed client + error mapping.
- [ ] Backup/PITR configuration and documented restore drill.
- [ ] Data layer: TanStack Query provider, repository pattern, Supabase client with secure session storage.
- [ ] `(auth)` route group: sign-in, accept invitation, auth gate in the root layout (moved from M1).
- [ ] Profile: account details, sign-out, account deletion entry point.

### M3 — Content pipeline

- [x] Domain model + zod schemas (lesson, turn, sentence, segment, layers, lexeme, grammar topic) — done in the demo slice.
- [x] Content validator (IDs, references, segment order) — done in the demo slice.
- [ ] Exercise type registry interface + schema/evaluator for first types.
- [ ] Answer normalization rules (Italian apostrophes, accents, punctuation) + tests.
- [ ] Content-as-code format in `content/` + validator CLI.
- [ ] Compiler → lesson bundle; publish to Supabase (new immutable version).
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

- [ ] Exercise session engine (reducer, ordering, feedback, summary).
- [ ] Renderers: MultipleChoice, FillInBlank, SentenceBuilder, SentenceTranslation, ListeningExercise.
- [ ] Graceful handling of unknown exercise types.
- [ ] Results recorded as events.

### M6 — Vocabulary v1

- [ ] Thematic categories and lexeme list.
- [ ] Lexeme detail: translation, gender/article, audio, example sentences from lessons.
- [ ] "Where I met this word" links back to dialogues.

### M7 — Offline & progress

- [ ] Local SQLite schema + migrations + tests.
- [ ] Content bundle and audio download/cache per assigned lesson.
- [ ] Outbox with idempotent upload, backoff, connectivity awareness.
- [ ] Progress overview screen.
- [ ] Multi-device verification.

### M8 — Teacher Studio MVP (platform per ADR-0006)

- [ ] Studio app shell + teacher auth.
- [ ] Students: list, invite, profile, level.
- [ ] Assignments: assign/reorder lessons per student.
- [ ] Authoring: edit lesson drafts, preview, publish (reusing compiler/validator).
- [ ] Results: per-student progress and frequent mistakes.

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

|                 |                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------- |
| **Completed**   | M0 analysis; M1 foundation except the blocked items below; demo lesson slice                  |
| **In progress** | —                                                                                             |
| **Pending**     | M2 backend foundation                                                                         |
| **Blocked**     | EAS project + device builds (Q-16); brand assets (Q-10); crash reporting (Q-9); Docker for M2 |

## F. Known issues and technical debt

- **Demo content is not lecturer-reviewed.** Italian sentences follow the spec's example; Czech explanations are developer drafts (spec §8 requires lecturer approval).
- **Demo audio is device text-to-speech** (quality depends on the device's Italian voice); real audio is open question Q-3.
- **Lessons are bundled with the app** (`createBundledLessonRepository`) until the M2 backend exists.
- **Application ID is provisional** (`com.ricingo.mobile`); it cannot change after store publishing (Q-16).
- iOS has not been built (requires EAS cloud build or a Mac).
- Local Android builds fail inside the AI assistant's sandbox (Java cannot open its loopback socket); run them from a normal terminal or VS Code task.
- **Native Android builds on Windows need long-path support**: generated C++ object paths of React Native libraries exceed 260 characters. Requires Windows long paths (enabled on the dev PC) and an SDK CMake with ninja ≥ 1.12, selected by `plugins/with-android-cmake.js`. Builds are local only (owner decision 2026-11-22: no EAS cloud builds).
- The Android emulator has no Italian text-to-speech voice preinstalled; the app now shows a notice with a one-tap download. Downloading the voice and playback afterwards has not been verified end-to-end yet.
- Docker is not installed on the development machine; local Supabase (M2) needs it.
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
2. Answer questions that shape the M2 schema: Q-2 (tenancy), Q-7 (minors), Q-9 (Supabase plan budget), Q-17 (vy/ty).
3. Install Docker Desktop for the local Supabase stack.
4. Push the repository to a Git host so CI runs.
5. Start M2 Backend foundation.
6. In parallel: lecturer prepares the "Al bar" reference lesson and grammar-topic list (Q-6, Q-14).

## H. Open questions

| ID   | Question                                                                                                                                                                                                                                                                                                                                                 | Why it matters                | Blocks              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------- |
| Q-1  | Teacher Studio platform: content-as-code first, then Expo web Studio (recommended) vs Next.js vs in-app?                                                                                                                                                                                                                                                 | Second app/stack, timeline    | M8 (and M3 format)  |
| Q-2  | One lecturer only, or several lecturers/schools in future?                                                                                                                                                                                                                                                                                               | Tenancy, roles, pricing       | M2 schema           |
| Q-3  | Audio source: lecturer/native-speaker recordings, neural TTS reviewed by lecturer, or hybrid? **Direction approved 2026-11-23: hybrid** — cloud neural TTS generated server-side when a lesson is published (normal + slow), reviewed by the lecturer, any line replaceable by her recording; files cached offline. Open: TTS provider and budget (Q-9). | Cost, quality, pipeline       | M3 audio (provider) |
| Q-4  | Student platforms: iOS + Android only, or also web?                                                                                                                                                                                                                                                                                                      | Testing scope, offline on web | M1                  |
| Q-5  | Distribution: public store listing with invite-only login, or private/unlisted distribution?                                                                                                                                                                                                                                                             | Store review, discoverability | M9                  |
| Q-6  | Level framework (CEFR A1–B2?) and grammar-topic taxonomy — will the lecturer provide it?                                                                                                                                                                                                                                                                 | Content model fields          | M3                  |
| Q-7  | Can students be minors (under 15 in CZ)?                                                                                                                                                                                                                                                                                                                 | GDPR parental consent         | M2/M9               |
| Q-8  | Speaking and free-writing exercises: speech recognition, AI grading or teacher grading — and when?                                                                                                                                                                                                                                                       | Scope, cost, privacy          | M10+                |
| Q-9  | Budget approval: Supabase Pro + PITR, EAS plan, Apple (99 USD/yr) + Google (25 USD) accounts, Sentry, TTS                                                                                                                                                                                                                                                | Hosting choices               | M1/M2               |
| Q-10 | Brand assets: RICI logo, exact red, typefaces; email sender domain for invitations                                                                                                                                                                                                                                                                       | Design tokens, auth emails    | M1/M2               |
| Q-11 | Offline scope: all assigned lessons incl. audio downloadable?                                                                                                                                                                                                                                                                                            | Storage, sync design          | M7                  |
| Q-12 | When the lecturer edits a published sentence, how to decide "minor edit" vs "new sentence"?                                                                                                                                                                                                                                                              | Progress continuity           | M3/M8               |
| Q-13 | Adaptive difficulty: rule-based (proposed for M10) — which signals and limits?                                                                                                                                                                                                                                                                           | Personalization design        | M10                 |
| Q-14 | Who authors the first 50–100 units; do existing materials (Word, PDF) need importing?                                                                                                                                                                                                                                                                    | Import tooling                | M3                  |
| Q-15 | Practice reminders / push notifications wanted? (not in spec)                                                                                                                                                                                                                                                                                            | Native capability, consent    | M9+                 |
| Q-16 | Who owns developer accounts (Apple, Google, Expo, Supabase, domain)?                                                                                                                                                                                                                                                                                     | Legal ownership, access       | M1                  |
| Q-17 | Czech UI tone: formal "vy" (current, provisional) or informal "ty"?                                                                                                                                                                                                                                                                                      | Brand voice, all copy         | M4                  |
