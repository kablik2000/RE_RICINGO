# RICINGO — agent instructions

pnpm monorepo: `apps/mobile` (Expo SDK 58 student app) and `packages/design-system`.
Read `docs/DEVELOPMENT_PLAN.md` and `docs/ARCHITECTURE.md` before starting work.

## Project rules

- **Tracking is mandatory.** Before a task, make sure it is in `docs/DEVELOPMENT_PLAN.md`; mark it
  in progress / done as you go; add discovered work; never mark unfinished work as done. Record
  notable changes in `docs/CHANGELOG.md`; architectural changes need an ADR in `docs/DECISIONS/`.
- Respect the import boundaries (enforced by ESLint): features import other features only through
  their `index.ts`; `src/core` never imports features; the design system never imports app code.
- UI uses design-system tokens and components only — no hardcoded colours, sizes or font styles.
- All UI strings go through `t()` (`src/core/i18n`); learning content is data, not UI strings.
- Errors crossing the data layer are `AppError`s; never swallow exceptions.
- Tests are colocated (`thing.tsx` + `thing.test.tsx`). React Native Testing Library v14 is
  async: `await render(...)`, `await fireEvent.press(...)`.

## Commands (run from the repo root)

```sh
corepack pnpm install
corepack pnpm verify      # typecheck + lint + format check + tests — run before declaring work done
```

Inside `apps/mobile`:

```sh
npx expo install <package>  # ALWAYS instead of pnpm add for Expo/RN packages (SDK-compatible versions)
npx expo start              # dev server
npx expo-doctor             # dependency/config diagnostics
```

## Expo has changed — do not trust training data

Expo ships breaking changes every SDK release. Before touching an Expo, EAS or React Native API,
check the versioned docs for the SDK in `apps/mobile/package.json`
(`https://docs.expo.dev/versions/v58.0.0/`), or https://docs.expo.dev/llms.txt.

- Expo Router: routes live in `apps/mobile/src/app/` and stay thin (they render feature screens).
- Continuous Native Generation: never create or edit `ios/` / `android/`; configure native
  behaviour in `app.config.ts` and config plugins.
- The app uses development builds (`expo-dev-client`); adding a native library requires a new build.
