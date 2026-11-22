# ADR-0001: Mobile stack

- Status: **Accepted** (stack given by project brief; SDK 58, Expo Router and development builds approved 2026-11-22)
- Date: 2026-11-22

## Context

The brief fixes React Native, Expo and TypeScript. Remaining choices: SDK version,
navigation, and how developers run the app.

As of 2026-11-22 the latest stable Expo SDK is **58** (released 2026-10-15; React Native 0.88,
React 19.3, Node ≥ 22.13). Expo Go for SDK 58 was announced as arriving "within weeks" of the
release; the store builds may lag.

## Decision

1. **Expo SDK 58**, TypeScript `strict` plus `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `noImplicitOverride`.
2. **Expo Router** (typed routes) for navigation — Expo's first-party, file-based, deep-link
   ready, works on web for the Studio option.
3. **Development builds** (`expo-dev-client`) rather than Expo Go as the default workflow:
   we will need config plugins (Sentry, secure store, audio background modes) and want parity
   with production builds; also removes dependence on Expo Go's SDK-58 availability.
4. **Continuous Native Generation** (no committed `ios/`/`android/`): native config lives in
   `app.config.ts` + config plugins.
5. All Expo packages installed with `npx expo install` to keep versions SDK-compatible.

## Consequences

- Need EAS account and a development build per platform before first device run.
- SDK upgrades (3× per year) are planned tasks, run with `expo-upgrade` guidance;
  never skip more than one SDK.
- Windows development machine: iOS builds via EAS cloud; Android locally or EAS.
