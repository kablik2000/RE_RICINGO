# RICINGO — Architecture

> Status (2026-11-23): backend is **Flask + PostgreSQL**, Teacher Studio **Next.js**, all in this
> monorepo (ADR-0010, superseding the Supabase plan of ADR-0002). Implemented so far: the student
> app with a demo lesson on bundled content, visual design v1, the Flask API skeleton in Docker
> and the Teacher Studio (overview, lessons, lesson editor) on lessons stored in PostgreSQL. See
> DEVELOPMENT_PLAN.
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
│ iOS / Android            │        │ Next.js + React + TS     │
│                          │        │                          │
│ UI ─ features ─ domain   │        │ UI ─ features ─ domain   │
│        │                 │        │        │                 │
│  data layer (repos)      │        │  server components /     │
│  ├ local SQLite cache    │        │  route handlers          │
│  ├ outbox (events)       │        │  (online only)           │
│  └ API client            │        │  API client              │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │ HTTPS, bearer token               │ HTTPS, HTTP-only cookie
             ▼                                   ▼
┌───────────────────────────────────────────────────────────────┐
│ Flask API (services/api) — REST /api/v1 + OpenAPI             │
│  invite-only auth · roles and scoping · publishing            │
│  lesson check with the JSON Schema generated from zod         │
├──────────────────────────────┬────────────────────────────────┤
│ PostgreSQL (EU)              │ S3-compatible files (audio,    │
│  migrations (Alembic)        │  artwork), signed URLs         │
└──────────────────────────────┴────────────────────────────────┘
```

Key ideas:

1. **Content is authored mutably, consumed immutably.** The Studio edits a lesson draft (one
   validated JSON document per lesson, ADR-0011). Publishing compiles a lesson into an immutable, versioned **lesson bundle**
   (validated JSON + content-addressed audio). Students only ever read published versions.
2. **Student data is append-only events + derived state.** Every answer, completed step and
   vocabulary review is a `learning_event` with a client-generated UUID. Mastery/progress
   tables are derived and can be recomputed. This makes offline sync conflict-free.
3. **Clients never talk to the database.** They use the versioned REST API `/api/v1` (OpenAPI,
   generated TypeScript client). Tables can evolve; the contract stays stable for old app builds.
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
│  │  │  ├─ (student)/           tabs: Home, Lessons, Vocabulary, Practice, Profile
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
│  └─ studio/                    Teacher Studio: Next.js App Router, TypeScript, CSS modules on the
│                                shared tokens, Vitest (ADR-0010)
├─ services/
│  └─ api/                       Flask backend (Python, uv): /api/v1, SQLAlchemy + Alembic, Ruff,
│                                mypy, pytest, Dockerfile (gunicorn); generated lesson JSON Schema
├─ compose.yaml                 local backend stack: PostgreSQL, Mailpit, API (Docker)
├─ packages/
│  ├─ domain/                    pure TS: content model, zod schemas (+ generated JSON Schema),
│  │                             exercise registry, answer normalization, SRS, progress rules
│  ├─ design-system/             tokens, themes, typography, components (RN); `./web` = tokens as
│  │                             CSS custom properties for the Studio
│  └─ api/                       generated TypeScript client for /api/v1 (from OpenAPI)
├─ content/                      Content-as-code source for the first lessons (until Studio)
├─ tools/                        content compiler/validator CLI, audio pipeline scripts
├─ docs/                         this documentation
├─ tsconfig.base.json            strict compiler options shared by all packages
├─ eslint.config.mjs             flat config incl. import boundaries (the Studio has its own;
│                                ESLint uses the nearest config per file)
└─ .github/workflows/ci.yml      TS checks + tests, Studio build, bundle check; Python checks + image
```

Status: `apps/mobile`, `apps/studio` (shell), `services/api` (skeleton), `packages/design-system`
and `packages/domain` exist. `packages/api` arrives with the first real endpoints (M2),
`content/`/`tools/` in M3.

Dependency direction (enforced with ESLint `no-restricted-imports` rules):

```
app routes → features → (domain, design-system, data) ; data → (api, domain) ; domain → nothing
```

- `packages/domain` imports no React, no React Native, no network or storage code.
- Features import other features only through their public `index.ts`.
- Only `src/data` (and `packages/api`) know the API or SQLite exist.
- The lesson schema has one source (zod in `packages/domain`); the Flask API validates with the
  JSON Schema generated from it, and a test fails when the committed copy is stale.

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

| Kind of state                                             | Tool                                    | Notes                                                     |
| --------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| Server/cached data                                        | **TanStack Query**                      | Query functions call repositories, never `fetch` directly |
| Persistent local data                                     | **expo-sqlite** via repositories        | Content bundles, outbox, cached mastery                   |
| Session/flow state (lesson walkthrough, exercise session) | `useReducer` + domain reducers          | Reducers live in `domain`, unit-tested                    |
| Global UI prefs (theme, audio speed)                      | small React context backed by SQLite kv | No global store library unless a need appears             |
| Auth session                                              | API tokens in `expo-secure-store`       | Exposed through `auth` feature hook                       |

No Redux/Zustand at the start: the only truly global state is auth and preferences.
Revisit if cross-feature client state grows (tracked in DEVELOPMENT_PLAN technical debt).

### 4.3 Navigation

Expo Router (file-based, typed routes). Route groups: `(auth)` and `(student)`; a root
auth gate redirects based on session. Routes stay thin — they import a screen from a feature.
Deep links (`ricingo://lesson/<id>`) supported from day one for teacher assignment links.

### 4.4 Error handling

- Data layer returns typed errors (`AppError` with `kind`: `network`, `auth`, `forbidden`,
  `notFound`, `validation`, `conflict`, `unexpected`) — no raw HTTP/API errors leak upward.
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
- **Visual design v1 (ADR-0009):** Roboto for the interface, Noto Serif for Italian content
  (bundled Google Fonts, one family name per weight); icons through the design-system `Icon`
  (Material Symbols on Android/web, SF Symbols on iOS via `expo-symbols`) from a curated name
  set; lesson artwork is vector (`react-native-svg`) drawn only from theme `illustration`
  colours.
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

**Flask (Python) REST API over PostgreSQL in an EU region + local SQLite on device**
([ADR-0010](DECISIONS/0010-flask-postgresql-backend-and-nextjs-studio.md), superseding the
Supabase plan of ADR-0002). Code in `services/api`; local stack in `compose.yaml` (Docker).

- **PostgreSQL** = system of record (content drafts, published versions, users, events, derived
  progress). Schema via SQLAlchemy 2 models and **Alembic** migrations in git, applied by CI to
  staging then production; expand → migrate → contract so older app builds keep working.
- **Rules in the database too:** published lesson versions are immutable (trigger), learning
  events are inserted idempotently (unique client UUID), foreign keys and checks everywhere —
  the API is not the only guard.
- **API contract:** REST `/api/v1`, JSON, OpenAPI document generated from the code; the
  TypeScript client in `packages/api` is generated from it. Breaking changes → `/api/v2` side by
  side; `/api/v1` kept until no supported build uses it. Errors are JSON
  `{"error": {"code", "message"}}` and map to `AppError` kinds in the clients.
- **Content schema:** the zod schema in `packages/domain` is the single source; its generated
  JSON Schema (`services/api/src/rici_api/schemas/`) validates every lesson the API publishes.
- **Files:** audio and artwork in S3-compatible object storage under content-addressed paths
  (`audio/<sha256>.m4a`) → immutable, cache-forever, shared across lesson versions; clients get
  signed URLs.
- **Background work** (publishing, audio generation, later AI jobs) runs in the API service or a
  worker next to it; provider keys exist only server-side.
- **Backups:** managed PostgreSQL backups + point-in-time recovery where the host offers it,
  periodic logical dump to separate storage; restore drill documented and tested (hosting: Q-19).

### 6.1 On-device data (expo-sqlite)

| Table           | Purpose                                                              |
| --------------- | -------------------------------------------------------------------- |
| `lessons`       | Installed lesson versions (JSON + checksum) for offline reading      |
| `audio_cache`   | Index of downloaded audio files (content-addressed)                  |
| `outbox`        | Pending `learning_events` to upload (retry with backoff, idempotent) |
| `mastery_cache` | Last known derived progress for offline practice scheduling          |
| `settings`      | Preferences (e.g. the lesson update policy), sync cursors            |

Implemented so far: `lessons` and `settings` (`apps/mobile/src/data/local/`); the schema version
is SQLite's `PRAGMA user_version`. Web previews and tests use an in-memory store instead.
Local schema migrations ship with the app and run at startup inside a transaction.
The device cache is disposable: it can always be rebuilt from the server, except the
un-synced outbox, which is never dropped silently.

### 6.2 Sync strategy

Asymmetric data makes a general sync engine unnecessary at the start:

- **Down (content):** read-only, versioned bundles → simple fetch-if-newer + cache.
  Implemented in `src/data/content/` against `GET /api/v1/content/lessons` (public catalog,
  no account: newest version + checksum of every public published lesson, ADR-0013) and `…/lessons/<id>/versions/<n>` (immutable bundle):
  - checks at start, whenever the app returns to the foreground (at most every 30 s), and when
    the connection changes;
  - changes made without asking (downloads on Wi-Fi, removals) are listed to the student
    ("Lekce jsou aktualizované") until acknowledged;
  - the student's policy (Q-18, Profile → Aktualizace lekcí) decides: automatic on Wi-Fi and
    offered on mobile data (default), always automatic, or always offered;
  - every download is validated with the domain schema before it is installed; a broken one is
    skipped and the installed version stays;
  - a lesson open on screen is never replaced: its update waits until the student leaves it;
  - the catalog is the source of truth: an installed lesson that is no longer in it (the
    lecturer unpublished it) is removed on any connection and policy, the bundled demo included
    (it is seeded only once, so it does not come back); an open lesson goes when it closes;
  - first start works offline: the store is seeded with the lessons bundled in the app.
    A signed-in student will additionally get the lessons their lecturer recommends
    (ADR-0013, student sign-in and recommendations).
- **Up (progress):** append-only events with client UUIDs → upload outbox; server upsert by
  `id` ignores duplicates; no conflicts possible.
- **Derived state:** recomputed on server; client pulls the latest snapshot.
- Multi-device works because events from all devices merge on the server.

Re-evaluate a sync engine (e.g. PowerSync, Postgres ↔ SQLite) if bidirectional
editable student data appears (e.g. personal notes edited on two devices).

---

## 7. Authentication & authorization

[ADR-0004](DECISIONS/0004-authentication-and-authorization.md),
[ADR-0012](DECISIONS/0012-teacher-studio-sign-in.md)

**Implemented (Teacher Studio, ADR-0012):** operator-created teacher accounts in organizations;
Argon2id passwords (15–128 characters); sign-in throttling per e-mail and address; opaque
session tokens stored hashed (2 h idle, 12 h maximum); the Studio keeps the token in an
`httpOnly`, `SameSite=Strict` cookie and forwards it to the API; every page, Server Action and
API request checks the session; lessons are scoped to the teacher's organization; CSP with nonces
and security headers. No two-factor yet.

**Implemented (students, ADR-0013 step 2):** a teacher invites a student from the Studio; the
e-mail carries a one-time code (60 bits, 14 days, stored as SHA-256); students under 15 need the
teacher's confirmation of the parents' consent (only a flag and the time are stored); a teacher
sees and manages only their own students (`teacher_students`).

**Planned (students, M2):**

- Implemented by the Flask API (ADR-0010). **Invite-only** (no public sign-up): the lecturer
  invites a student by email; the student sets a password (Argon2) or uses an email one-time code.
- The API issues short-lived access tokens and rotating refresh tokens. Roles `student`,
  `teacher`, `admin`; every endpoint checks role and scope, and each rule has a test. Role changes
  are admin-only.
- Tenancy: every row carries `organization_id` (one organization initially). Cheap now,
  very expensive to retrofit if a second lecturer/school is added.
- Teacher ↔ student relationship table; a teacher sees only own students' data.
- Mobile keeps tokens in `expo-secure-store`; the Studio uses HTTP-only, secure cookies (done).
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
- API compatibility via `/api/v1`/`/api/v2` coexistence; DB via expand/contract migrations.
- Environments: `development` (local Docker stack), `staging`, `production` — separate databases
  and API deployments; app config through `app.config.ts`; no secrets in any client bundle.

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
- Provider calls only in the backend; prompts and outputs logged for audit.

---

## 11. Testing strategy

| Layer        | Tooling                                            | Focus                                                                                    |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Domain       | Jest (ts)                                          | Exercise evaluators, normalization, schemas, progress/SRS rules, reducers                |
| Components   | Jest + React Native Testing Library (`jest-expo`)  | Design-system components, exercise renderers, state views                                |
| Data layer   | Jest with in-memory fakes + SQLite migration tests | Repositories, outbox retry/idempotency, local migrations                                 |
| Backend      | pytest (+ PostgreSQL in Docker), Ruff, mypy strict | Access rules per endpoint (student A ≠ student B), constraints, immutability, migrations |
| API contract | Generated OpenAPI + TS client; JSON Schema check   | `/api/v1` shape, auth and invitation flows, lesson schema identical to the zod source    |
| Studio       | Vitest + Testing Library, `next build` in CI       | Studio components, data helpers                                                          |
| E2E          | Maestro                                            | Sign-in, complete lesson, exercise session, offline → online sync                        |

CI (GitHub Actions): TypeScript checks and tests, Studio build, mobile bundle check, Python
checks (Ruff, mypy, pytest) and the API Docker image on every PR; E2E on release branches.

---

## 12. Security & privacy

- Authorization in the API with default deny and a test per rule; database credentials only in
  the backend.
- EU data residency; GDPR: data minimization, export, deletion, processing records.
- Input validation at boundaries (zod on clients, JSON Schema + checks in the API, constraints
  in PostgreSQL).
- Secrets only in the hosting environment configuration (never in git or client bundles).
- Dependency auditing in CI; minimal dependency policy. Manual audit 2026-11-23 (`pnpm audit
--prod`, `pip-audit`): Studio and API clean.
- Teacher Studio: CSP with per-request nonces, `frame-ancestors 'none'`, security headers, no
  open redirects, sessions verified on every page, action and API call (ADR-0012).
