# Changelog

All notable project changes. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

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

- 2026-11-22 — ADRs 0001–0005 and 0007 accepted by the product owner. ADR-0006 (Teacher Studio
  platform) remains open.
