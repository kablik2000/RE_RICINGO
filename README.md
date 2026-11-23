# RICINGO

Private Italian learning app for the clients of an Italian lecturer: thematic dialogues,
sentence-by-sentence grammar analysis, audio, contextual vocabulary, exercises and a Teacher Studio.

> **Status: M1 Foundation + demo lesson.** The app runs with one bundled demo lesson ("Al bar"):
> lesson list, sentence-by-sentence analysis, full dialogue, vocabulary, device text-to-speech.
> No backend yet. Progress and next steps: [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md).

## Documentation

- [Development plan & status](docs/DEVELOPMENT_PLAN.md) — roadmap, checklist, open questions
- [Architecture](docs/ARCHITECTURE.md)
- [Architecture Decision Records](docs/DECISIONS/README.md)
- [Changelog](docs/CHANGELOG.md)

## Stack

Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript (strict) · Expo Router · TanStack Query ·
zod · Jest + React Native Testing Library · pnpm workspaces. Planned: Supabase (Postgres, EU),
expo-sqlite, EAS Build / Update.

## Repository layout

```
apps/mobile               Student app (Expo)
packages/design-system    Design tokens, theme and shared components
packages/domain           Content schema, validation and pure learning logic
docs/                     Plan, architecture, ADRs, changelog
.vscode/tasks.json        Build & run tasks
```

## Prerequisites

- Node.js 22 (≥ 22.13) — see `.nvmrc`
- pnpm 10 via Corepack (bundled with Node): `corepack pnpm --version`
- Android: Android Studio with SDK, an emulator (AVD) and JDK 17 (`java -version`)
- iOS on Windows: only through EAS cloud builds (Expo account + EAS project, see DEVELOPMENT_PLAN Q-16)
- From M2: Docker (local Supabase via the Supabase CLI)

## Build & run from VS Code

Open the repository folder in VS Code, then **Terminal → Run Task…**:

| Task                                       | What it does                                                          |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `Install dependencies`                     | `pnpm install` for the whole workspace (run first)                    |
| `Android: start emulator`                  | Boots an Android Virtual Device (asks for its name)                   |
| `Expo Go: run on Android emulator`         | Runs the app in Expo Go on the emulator — no native build (default)   |
| `Expo Go: start for a phone (QR code)`     | Runs the app in Expo Go on your phone via QR code                     |
| `Android: build & run (local)`             | Builds the development build with Gradle, installs it, starts Metro   |
| `Start dev server (Metro)`                 | Metro only — for an already installed development build               |
| `Start web preview`                        | Browser preview at http://localhost:8081                              |
| `Android: build release APK (local)`       | Release build with embedded JS, debug-signed (for testers, not store) |
| `Android: regenerate native project`       | Clean `expo prebuild` after native config changes                     |
| `EAS: development / preview build (cloud)` | Cloud builds for Android or iOS (needs an EAS project)                |
| `Verify (typecheck, lint, format, tests)`  | Same checks as CI (default test task)                                 |
| `Export JS bundles`, `Expo doctor`         | Bundle check, dependency diagnostics                                  |

`Ctrl+Shift+B` runs the default build task, **Android: build & run (local)**: start the emulator
first (`Android: start emulator`); the task builds the native development build, installs it and
starts Metro. Without a native build, `Expo Go: run on Android emulator` runs the app in Expo Go.
On a phone, install **Expo Go** from the store and use `Expo Go: start for a phone (QR code)`.
Code changes reload instantly.

**Native development build on Windows:** React Native libraries generate C++ files with paths over 260 characters. One-time setup: Windows long paths enabled (registry `LongPathsEnabled = 1`) and a newer CMake in the Android SDK — **CMake 3.31.6** (bundles ninja 1.12.1; Android Studio → SDK Manager → SDK Tools → CMake, tick _Show Package Details_). CMake 4.x is not recommended: it rejects the old `cmake_minimum_required` versions some libraries use. The config plugin `apps/mobile/plugins/with-android-cmake.js` then selects it automatically; run `Android: regenerate native project` once after installing it.

## Command line

```sh
corepack pnpm install

cd apps/mobile
npx expo run:android     # build + install + start Metro (emulator or USB device)
npx expo start           # Metro only, for an installed development build
npx expo start --web     # browser preview
```

Install Expo packages with `npx expo install <package>` (inside `apps/mobile`) so versions match
the SDK.

## Quality checks

```sh
corepack pnpm verify        # typecheck + lint + format check + all tests
```

CI (`.github/workflows/ci.yml`) runs the same checks plus an Android/iOS/web bundle build.

## Environments

`APP_ENV` selects the environment (`development` default, `preview`, `production`); EAS build
profiles in `apps/mobile/eas.json` set it per build. The application ID is
`com.ricingo.mobile` (+ `.dev` / `.preview`) — **provisional** until confirmed by the account owner.
Nothing secret may be placed in `app.config.ts` — its values ship inside the app.
