# ADR-0007: Monorepo, frontend architecture, state and design system

- Status: **Accepted** (approved by product owner 2026-11-22)
- Date: 2026-11-22

## Decision

### Repository

- **pnpm workspaces monorepo**: `apps/mobile`, `apps/studio` (later), `packages/domain`,
  `packages/design-system`, `packages/api`, `packages/tooling`, plus `supabase/`, `content/`,
  `tools/`. Expo supports pnpm monorepos; shared code is needed by ≥ 2 consumers
  (app, Studio, content tooling), which justifies the split.
- No Nx/Turborepo initially; plain pnpm scripts. Add Turborepo only if CI time demands caching.

### Frontend

- Feature-based modules with public `index.ts`; routes are thin.
- Import boundaries enforced with ESLint `no-restricted-imports` (no extra plugin).
- **TanStack Query** for async/server state; **expo-sqlite** repositories for local data;
  `useReducer` with domain reducers for flows; no global store library at the start.
- **zod** for runtime validation of content bundles, API payloads and exercise payloads —
  one schema shared by app, Studio, tooling and AI-draft validation.
- **Drizzle ORM** (expo-sqlite driver) for the on-device schema and migrations — typed queries and
  bundled migrations; alternative is hand-written SQL + own migration runner (fewer deps,
  more code). Recommendation: Drizzle.
- Forms (Studio): react-hook-form + zod, when Studio starts.

### Design system

- Own component library on tokens (MD3-inspired), not React Native Paper — Paper's stock MD3
  visuals would make RICINGO look generic; we need a premium, brand-specific identity.
- `react-native-reanimated` for motion (Expo-supported), `expo-font` for brand typefaces,
  `expo-image` for images, `@expo/vector-icons` or a single icon set chosen with the design.

### Quality tooling

- ESLint (flat config, `eslint-config-expo` + `typescript-eslint` strict-type-checked),
  Prettier, `tsc --noEmit` in CI, Jest via `jest-expo`, React Native Testing Library, Maestro.

## Consequences

- Slightly more setup up front; shared packages must stay framework-free where stated.
- Every new dependency is noted in DEVELOPMENT_PLAN with its reason.

## Implementation notes (2026-11-22, M1)

Clarifications made while implementing; the decision itself is unchanged.

- Shared tooling config lives at the repository root (`tsconfig.base.json`, `eslint.config.mjs`,
  `.prettierrc.json`) instead of a `packages/tooling` package — one ESLint config for the whole
  workspace is simpler and needs no publishing of presets.
- pnpm is pinned to 10.x: pnpm 12 does not run through the corepack bundled with Node 22.
- Tests are colocated with source files (Expo's recommended project structure).
