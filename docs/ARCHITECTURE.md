# RICINGO — Architecture

> Status: ADRs 0001–0005 and 0007 **accepted** (2026-11-22); ADR-0006 (Teacher Studio) open.
> Implemented so far: M1 foundation and a demo slice of the learning experience on bundled content
> (domain schemas, repository + query layer, lesson screens). See DEVELOPMENT_PLAN.
> Product source of truth: `ricingo_koncepce.md` (product specification, Czech).

---

## 1. Product summary (what the architecture must serve)

RICINGO is a private, premium learning companion for clients of one Italian lecturer
(possibly more lecturers later). It is **not** a generic gamified app. Its core is:

| Area                     | Requirement (spec §)                                                                           | Architectural consequence                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Grammar in context       | Thematic dialogues → turns → sentences → layered sentence analysis, CZ translation, audio (§3) | Rich, hierarchical, **relational** content model with stable IDs  |
| Full dialogue + practice | Continuous dialogue view, then exercises built from the same sentences (§4)                    | Exercises reference content items, not free text                  |
| Vocabulary               | Thematic dictionary, personal selections, practice, links to sentences/grammar (§5)            | Lexeme ↔ sentence ↔ grammar-topic graph; per-student mastery      |
| Cross-lesson grammar     | Topics recur, short reminders, re-explain on errors (§6)                                       | Grammar topics as first-class entities, mastery tracked per topic |
| AI with lecturer control | Three automation levels, human approval (§8)                                                   | Draft → review → publish workflow; AI only writes drafts          |
| Fixed exercise types     | Reusable typed exercise components, AI supplies JSON (§9)                                      | Exercise **type registry** with schema + evaluator + renderer     |
| Teacher Studio           | Students, lessons, library, results, planning (§10)                                            | Role-based access, authoring backend, separate UI surface         |
| Not now                  | Video calls, payments, social, leaderboards, chat (§12)                                        | Explicitly out of scope                                           |

---

## 2. System overview

```
┌──────────────────────────┐        ┌──────────────────────────┐
│ Student app (Expo)       │        │ Teacher Studio (web)     │
│ iOS / Android            │        │ Expo Router web (prop.)  │
│                          │        │                          │
│ UI ─ features ─ domain   │        │ UI ─ features ─ domain   │
│        │                 │        │        │                 │
│  data layer (repos)      │        │  data layer (repos)      │
│  ├ local SQLite cache    │        │  (online only)           │
│  ├ outbox (events)       │        │                          │
│  └ API client (api_v1)   │        │  API client (api_v1 +    │
└────────────┬─────────────┘        │   studio RPCs)           │
             │ HTTPS (JWT)          └────────────┬─────────────┘
             ▼                                   ▼
┌───────────────────────────────────────────────────────────────┐
│ Supabase (EU region)                                          │
│  Auth (invite-only)   Postgres (RLS)   Storage (audio, CDN)   │
│  api_v1 schema: views + RPC functions = public contract       │
│  Edge Functions: invitations, publishing, audio/AI pipelines  │
└───────────────────────────────────────────────────────────────┘
```

Key ideas:

1. **Content is authored mutably, consumed immutably.** The Studio edits drafts in normalized
   tables. Publishing compiles a lesson into an immutable, versioned **lesson bundle**
   (validated JSON + content-addressed audio). Students only ever read published versions.
2. **Student data is append-only events + derived state.** Every answer, completed step and
   vocabulary review is a `learning_event` with a client-generated UUID. Mastery/progress
   tables are derived and can be recomputed. This makes offline sync conflict-free.
3. **The client never talks to tables directly.** It talks to a versioned `api_v1` schema
   (views + RPC functions). Tables can evolve; the contract stays stable for old app builds.
4. **Pure domain package.** Content types, schemas, exercise evaluation, answer normalization
   and progress rules live in a framework-free TypeScript package shared by app, Studio and
   tooling, and are unit-tested in isolation.

---

## 3. Repository structure

Monorepo with pnpm workspaces (see ADR-0007).

```
RE_RICINGO/
├─ apps/
│  ├─ mobile/                    Student app (Expo SDK 58, iOS + Android)
│  │  ├─ src/app/                Expo Router routes — thin: compose feature screens only
│  │  │  ├─ (auth)/              sign-in, accept invitation
│  │  │  ├─ (student)/           tabs: Learn, Vocabulary, Practice, Profile
│  │  │  └─ _layout.tsx          providers, auth gate, error boundary
│  │  ├─ src/features/<feature>/ see §4
│  │  ├─ src/navigation/         navigator definitions shared by native/web layouts
│  │  ├─ src/data/               repositories + query hooks; later local db, sync/outbox, api adapters
│  │  ├─ src/core/               config, errors, i18n catalog, telemetry, app-level UI (providers,
│  │  │                          error boundary, not-found)
│  │  ├─ src/testing/            test-only helpers (render with providers)
│  │  ├─ modules/                local Expo native modules (ADR-0008), e.g. tts-voice-data
│  │  ├─ plugins/                local config plugins (e.g. Windows CMake for Android builds)
│  │  ├─ app.config.ts           single source of app configuration (APP_ENV per EAS profile)
│  │  └─ eas.json                build profiles and update channels
│  └─ studio/                    Teacher Studio (later milestone; platform decision pending)
├─ packages/
│  ├─ domain/                    pure TS: content model, zod schemas, exercise registry
│  │                             (schemas + evaluators), answer normalization, SRS, progress rules
│  ├─ design-system/             tokens, themes, typography, primitives & components (RN)
│  └─ api/                       typed client for api_v1, generated DB types, DTO mappers
├─ supabase/
│  ├─ migrations/                SQL migrations (forward-only, reviewed)
│  ├─ functions/                 Edge Functions (Deno)
│  ├─ tests/                     pgTAP tests: RLS, constraints, RPCs, migrations
│  └─ seed.sql                   local dev seed (no real personal data)
├─ content/                      Content-as-code source for the first lessons (until Studio)
├─ tools/                        content compiler/validator CLI, audio pipeline scripts
├─ docs/                         this documentation
├─ tsconfig.base.json            strict compiler options shared by all packages
├─ eslint.config.mjs             one flat config for the workspace, incl. import boundaries
└─ .github/workflows/ci.yml      typecheck, lint, format, tests, bundle check
```

Status: `apps/mobile`, `packages/design-system`, `packages/domain` (content schema + validator)
and `src/data` (repository interface with a bundled demo implementation) exist. `content/`/`tools/`
arrive in M3, `api` and `supabase/` in M2, `apps/studio` in M8.

Dependency direction (enforced with ESLint `no-restricted-imports` rules):

```
app routes → features → (domain, design-system, data) ; data → (api, domain) ; domain → nothing
```

- `packages/domain` imports no React, no React Native, no Supabase.
- Features import other features only through their public `index.ts`.
- Only `src/data` (and `packages/api`) know Supabase or SQLite exist.

---

## 4. Frontend architecture

### 4.1 Feature module layout

```
src/features/dialogue/
├─ index.ts              public API of the feature (screens, hooks, types)
├─ screens/              screen components used by routes
├─ components/           feature-private UI
├─ hooks/                view-model hooks (compose queries + domain logic)
└─ services/             use-cases (pure-ish orchestration, testable without UI)
```

Tests are colocated with the code they test (`button.tsx` + `button.test.tsx`). Shared test
helpers live in `src/testing/`.

Planned features: `auth`, `lessons`, `dialogue`, `sentence-analysis`, `grammar`, `vocabulary`,
`exercises`, `progress`, `audio`, `profile`, `settings` (+ Studio: `students`, `authoring`, `library`,
`assignments`, `results`).

### 4.2 State management

| Kind of state                                             | Tool                                    | Notes                                                              |
| --------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| Server/cached data                                        | **TanStack Query**                      | Query functions call repositories, never `fetch`/Supabase directly |
| Persistent local data                                     | **expo-sqlite** via repositories        | Content bundles, outbox, cached mastery                            |
| Session/flow state (lesson walkthrough, exercise session) | `useReducer` + domain reducers          | Reducers live in `domain`, unit-tested                             |
| Global UI prefs (theme, audio speed)                      | small React context backed by SQLite kv | No global store library unless a need appears                      |
| Auth session                                              | Supabase client + `expo-secure-store`   | Exposed through `auth` feature hook                                |

No Redux/Zustand at the start: the only truly global state is auth and preferences.
Revisit if cross-feature client state grows (tracked in DEVELOPMENT_PLAN technical debt).

### 4.3 Navigation

Expo Router (file-based, typed routes). Route groups: `(auth)` and `(student)`; a root
auth gate redirects based on session. Routes stay thin — they import a screen from a feature.
Deep links (`ricingo://lesson/<id>`) supported from day one for teacher assignment links.

### 4.4 Error handling

- Data layer returns typed errors (`AppError` with `kind`: `network`, `auth`, `forbidden`,
  `notFound`, `validation`, `conflict`, `unexpected`) — no raw Supabase errors leak upward.
- Every route exports an Expo Router `ErrorBoundary`; a root boundary catches the rest.
- Screens render explicit **loading / empty / error / success** states via shared components.
- Crash and error reporting through a single `core/telemetry` adapter (Sentry proposed).
- No swallowed exceptions: catch only to translate, report, or recover deliberately.

### 4.5 Design system

`packages/design-system`, Material Design 3–inspired, RICINGO identity:

- **Tokens:** color (light/dark roles: primary = RICI red, surfaces, on-*, outline, error,
  success), typography scale, spacing scale (4-pt base), radius, elevation, motion durations,
  component sizes (touch target ≥ 44/48 pt).
  Because the brand accent is red, the `error` role is a cooler crimson so mistakes are not
  confused with brand emphasis; every `on*`/base pair is checked for WCAG AA contrast in tests.
- **Theme:** `ThemeProvider` exposes resolved tokens; components never hardcode values.
- **Components:** Text, Button, IconButton, Card, ListItem, Chip, Surface, Screen, Header,
  AudioButton, ProgressBar, StateViews (Loading/Empty/Error), Sheet, TextField.
- **Italian text presentation:** dedicated typographic roles for Italian original vs Czech
  translation vs analysis annotations — the core reading experience of the product.
- Custom components on tokens rather than React Native Paper: Paper gives generic Android
  MD3 look; RICINGO needs its own premium identity (see ADR-0007).

### 4.6 Internationalization

UI language is Czech. Strings live in a typed catalog (`core/i18n`) from day one so a second
UI language (e.g. Slovak/English) does not require touching screens. Learning content
(Italian + Czech translation) is data, not UI strings.

---

## 5. Domain & content model

### 5.1 Content entities (authoring side, server)

```
GrammarTopic ─┐                         Lexeme (lemma, POS, gender, number, notes)
              │                            ▲
Lesson ── DialogueTurn ── Sentence ── Segment ─┘   (segment = one analysed unit, e.g. "un cappuccino")
  │                         │           │
  │                         │           └─ ExplanationLayer[1..3]  (basic meaning → grammar → depth)
  │                         ├─ translation (cs), audio (normal, slow)
  │                         └─ GrammarTopic refs
  └─ Exercise (type, payload validated by type schema, refs to sentences/lexemes/topics)
```

- **Segment** covers spec §3 "rozbor věty": a span of tokens with lemma, morphology
  (e.g. `volere` · condizionale presente · 1st sg), linked lexeme and grammar topics,
  and up to three explanation layers (spec: basic meaning → grammatical function → depth).
- **GrammarTopic** gives the hybrid structure (spec §13A): topics are standalone,
  browsable entries, and every lesson/segment links to them. Recurrence across lessons
  (spec §6) = the same topic referenced again, with a "reminder" explanation variant.
- **Lexeme** is the dictionary entry; vocabulary categories are tags; each lexeme
  knows the sentences where it occurs (spec §5 "propojení slovníku s gramatikou").

### 5.2 Exercise type registry

Spec §9 types (`MultipleChoice`, `FillInBlank`, `SentenceTranslation`, `WordMatching`,
`ListeningExercise`, `SpeakingExercise`, `TextComprehension`, `FreeWriting`) plus
`SentenceBuilder` (spec §4 "skládání vět", missing from the §9 list).

Each type is one self-contained module:

```ts
// packages/domain/exercises/<type>/
interface ExerciseTypeDefinition<TPayload, TAnswer, TEvaluation> {
  type: ExerciseTypeId; // e.g. "fill_in_blank"
  payloadSchema: ZodType<TPayload>; // validates authored/AI content
  answerSchema: ZodType<TAnswer>;
  evaluate(payload: TPayload, answer: TAnswer): TEvaluation; // pure, deterministic
}
// apps/mobile/src/features/exercises/renderers/<type>/ — React renderer for the type
```

Adding a type = add a domain module + a renderer + register both. No other module changes.
Unknown types (content newer than the app) render a graceful "update the app" placeholder
and are skipped in sessions — never a crash.

**Answer normalization** is a domain concern with explicit rules: case, whitespace,
typographic vs straight apostrophes (`un'amica`), punctuation; **accents are significant**
(`è` ≠ `e`) but can be reported as "accent mistake" rather than plain wrong. Teacher-defined
accepted alternatives per item.

### 5.3 Content versioning

- Authoring tables are mutable drafts. **Publishing** creates an immutable `lesson_version`
  (monotonic `version_no`, `content_schema_version`, checksum, published_by/at). An
  immutability trigger rejects updates to published versions.
- Items carry **stable IDs** (sentence, segment, lexeme, grammar topic, exercise) that survive
  cosmetic edits. A substantive change (different sentence) creates a new item ID.
  The Studio must make this choice explicit to the lecturer (open design point Q-12).
- Student events always store `lesson_version_id` + stable item ID → historical results stay
  interpretable forever, even after the lesson is edited or retired.
- The client declares the highest `content_schema_version` it understands; the API returns
  the newest published version compatible with it.

### 5.4 Student data

- `learning_events` (append-only): `id` (client UUID, primary key → idempotent upload),
  `student_id`, `occurred_at`, `type` (`step_completed`, `exercise_answered`,
  `vocab_reviewed`, `audio_played`…), `lesson_version_id`, `item_ref`, `payload` (validated).
- Derived (recomputable): `lesson_progress`, `item_mastery` (per stable item: sentence,
  lexeme, grammar topic; holds SRS state — FSRS proposed for Phase 2), `vocab_selections`.
- Assignments: `assignments` (student, lesson, assigned_by, order, due date) drive
  progressive order with lecturer overrides (spec §13B).

---

## 6. Backend & data

Recommended: **Supabase (managed PostgreSQL) in an EU region + local SQLite on device**.
Full comparison and reasoning: [ADR-0002](DECISIONS/0002-backend-and-database.md).

- **Postgres** = system of record (content, versions, users, events, derived progress).
- **Row Level Security** on every table; policies tested with pgTAP.
- **API contract:** `api_v1` schema of views and `SECURITY INVOKER` RPC functions; generated
  TypeScript types. Breaking changes → `api_v2` side by side; `api_v1` kept until no supported
  build uses it.
- **Storage:** audio files under content-addressed paths (`audio/<sha256>.m4a`) → immutable,
  cache-forever, safe to share across lesson versions.
- **Edge Functions:** invitation flow, publishing/compilation, audio generation, later AI jobs.
  AI/TTS provider keys exist only server-side.
- **Migrations:** Supabase CLI SQL migrations in git, applied by CI to staging then production;
  expand → migrate → contract pattern so older app builds keep working.
- **Backups:** daily backups + point-in-time recovery (Supabase Pro + PITR add-on) for
  production; periodic logical dump to separate storage; restore drill documented and tested.

### 6.1 On-device data (expo-sqlite)

| Table             | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `content_bundles` | Downloaded lesson versions (JSON + checksum) for offline reading     |
| `audio_cache`     | Index of downloaded audio files (content-addressed)                  |
| `outbox`          | Pending `learning_events` to upload (retry with backoff, idempotent) |
| `mastery_cache`   | Last known derived progress for offline practice scheduling          |
| `kv`              | Preferences, sync cursors, schema version                            |

Local schema migrations ship with the app and run at startup inside a transaction.
The device cache is disposable: it can always be rebuilt from the server, except the
un-synced outbox, which is never dropped silently.

### 6.2 Sync strategy

Asymmetric data makes a general sync engine unnecessary at the start:

- **Down (content):** read-only, versioned bundles → simple fetch-if-newer + cache.
- **Up (progress):** append-only events with client UUIDs → upload outbox; server upsert by
  `id` ignores duplicates; no conflicts possible.
- **Derived state:** recomputed on server; client pulls the latest snapshot.
- Multi-device works because events from all devices merge on the server.

Re-evaluate PowerSync (Postgres ↔ SQLite sync, Supabase-compatible) if bidirectional
editable student data appears (e.g. personal notes edited on two devices).

---

## 7. Authentication & authorization

[ADR-0004](DECISIONS/0004-authentication-and-authorization.md)

- Supabase Auth, **invite-only** (no public sign-up): the lecturer invites a student by email;
  the student sets a password or uses an email OTP code.
- Roles: `student`, `teacher`, `admin` stored in `profiles` and exposed to RLS through a
  custom access-token hook (JWT claim). Role changes are admin-only.
- Tenancy: every row carries `organization_id` (one organization initially). Cheap now,
  very expensive to retrofit if a second lecturer/school is added.
- Teacher ↔ student relationship table; a teacher sees only own students' data.
- Tokens stored with `expo-secure-store`; refresh handled by the Supabase client.
- In-app account deletion (App Store requirement) + data export (GDPR).

---

## 8. Application updates & delivery

[ADR-0005](DECISIONS/0005-update-and-release-strategy.md)

Three independent update channels:

| What changes                                    | Mechanism                                                | Store release? |
| ----------------------------------------------- | -------------------------------------------------------- | -------------- |
| Native code / native deps / SDK upgrade         | **EAS Build** → store submission                         | Yes            |
| JS/TS code, UI, assets                          | **EAS Update** (OTA) on channel `production` / `preview` | No             |
| Educational content (lessons, audio, exercises) | **Publish in Studio** → backend                          | No             |

- `runtimeVersion` policy **`fingerprint`**: OTA updates only reach builds with an identical
  native layer.
- Server-side **minimum supported app version** (remote config) → "please update" screen when a
  build is too old for the API/content schema.
- API compatibility via `api_v1`/`api_v2` coexistence; DB via expand/contract migrations.
- Environments: `development` (local Supabase via CLI), `staging`, `production` —
  separate Supabase projects, separate EAS channels, config through `app.config.ts` +
  EAS environment variables (no secrets in the client bundle beyond the public anon key).

---

## 9. Audio

- Each sentence: normal-speed and slow-speed file; each lexeme: one file.
- Playback: `expo-audio` behind an `audio` feature service (queue, speed, replay, preloading).
- Source of recordings is an **open decision** (human recordings vs neural TTS reviewed by the
  lecturer vs hybrid) — affects cost and pipeline, not the client architecture.
- Lessons downloadable with their audio for offline use.

---

## 10. AI (Phase 3, designed for now)

- AI never writes to published content. It produces **drafts** in the same schemas
  (zod-validated) that the Studio shows for lecturer review (spec §8 levels 2–3).
- Automatic checks before review: schema validation, answer/prompt consistency, vocabulary
  level checks, deterministic rules; a second model is an extra signal, not the gate.
- Provider calls only in Edge Functions; prompts and outputs logged for audit.

---

## 11. Testing strategy

| Layer        | Tooling                                            | Focus                                                                                             |
| ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Domain       | Jest (ts)                                          | Exercise evaluators, normalization, schemas, progress/SRS rules, reducers                         |
| Components   | Jest + React Native Testing Library (`jest-expo`)  | Design-system components, exercise renderers, state views                                         |
| Data layer   | Jest with in-memory fakes + SQLite migration tests | Repositories, outbox retry/idempotency, local migrations                                          |
| Database     | pgTAP via `supabase test db`                       | RLS isolation (student A ≠ student B), constraints, immutability, RPCs, migrations on seeded data |
| API contract | Integration tests against local Supabase           | `api_v1` shape, auth flows, invitation flow                                                       |
| E2E          | Maestro                                            | Sign-in, complete lesson, exercise session, offline → online sync                                 |

CI (GitHub Actions or EAS Workflows): typecheck, lint, unit/component tests, pgTAP, content
validation on every PR; E2E on release branches.

---

## 12. Security & privacy

- RLS on all tables, default deny; service-role key never in clients.
- EU data residency; GDPR: data minimization, export, deletion, processing records.
- Input validation at boundaries (zod on client, constraints/RPC checks on server).
- Secrets only in EAS/Supabase environment configuration.
- Dependency auditing in CI; minimal dependency policy.
