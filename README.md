# RICINGO

Private Italian learning app for the clients of an Italian lecturer: thematic dialogues,
sentence-by-sentence grammar analysis, audio, contextual vocabulary, exercises and a Teacher Studio.

> **Status: M1 Foundation done.** App shell, design system and tooling are in place; no backend
> or learning content yet. Progress and next steps: [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md).

## Documentation

- [Development plan & status](docs/DEVELOPMENT_PLAN.md) — roadmap, checklist, open questions
- [Architecture](docs/ARCHITECTURE.md)
- [Architecture Decision Records](docs/DECISIONS/README.md)
- [Changelog](docs/CHANGELOG.md)

## Stack

Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript (strict) · Expo Router · zod ·
Jest + React Native Testing Library · pnpm workspaces. Planned: Supabase (Postgres, EU),
expo-sqlite, TanStack Query, EAS Build / Update.

## Repository layout

```
apps/mobile               Student app (Expo)
packages/design-system    Design tokens, theme and shared components
docs/                     Plan, architecture, ADRs, changelog
```

## Prerequisites

- Node.js 22 (≥ 22.13) — see `.nvmrc`
- pnpm 10 via Corepack (bundled with Node): `corepack pnpm --version`
- For device builds: an Expo account and EAS CLI (`npx eas-cli@latest`); Android Studio for local
  Android builds. On Windows, iOS builds run in EAS cloud.
- From M2: Docker (local Supabase via the Supabase CLI)

## Setup

```sh
corepack pnpm install
```

## Development

```sh
# start Metro (development build or web preview)
cd apps/mobile
npx expo start            # press "w" for web, or open a development build on a device

# web preview only
npx expo start --web
```

The app is designed for development builds (`expo-dev-client`), not Expo Go. Until the EAS project
is created (see DEVELOPMENT_PLAN, Q-16), use the web preview for UI work.

Install Expo packages with `npx expo install <package>` (inside `apps/mobile`) so versions match
the SDK.

## Quality checks

Run from the repository root:

```sh
corepack pnpm verify        # typecheck + lint + format check + all tests
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm format        # apply Prettier
corepack pnpm test
```

CI (`.github/workflows/ci.yml`) runs the same checks plus an Android/iOS/web bundle build.

## Environments

`APP_ENV` selects the environment (`development` default, `preview`, `production`). EAS build
profiles in `apps/mobile/eas.json` set it per build. Nothing secret may be placed in
`app.config.ts` — its values ship inside the app.
