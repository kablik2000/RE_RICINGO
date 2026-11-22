# ADR-0006: Teacher Studio platform

- Status: **Open — needs product owner decision**
- Date: 2026-11-22

## Context

Teacher Studio (spec §10) is form- and table-heavy content authoring, student management,
results review and planning. It is mostly used on a computer. The student app is mobile.

## Options

| Option                                                                                              | Pros                                                                                       | Cons                                                                                       |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **A. Separate Expo app `apps/studio`, web-first (Expo Router web)**                                 | One stack and language; shares design system, domain, API packages; can also run on tablet | React Native Web is less mature for dense desktop UIs (data grids, rich editors)           |
| **B. Separate Next.js web app** sharing `domain` + `api` packages                                   | Best-in-class web tooling for complex editors and tables                                   | Second UI stack, design system must be re-implemented for web                              |
| **C. Teacher screens inside the student app** (role-based route group)                              | Least code, single deploy                                                                  | Authoring on a phone is poor; student bundle contains teacher code; couples release cycles |
| **D. No Studio initially — content-as-code** (YAML/JSON in `content/`, validated + compiled by CLI) | Fastest path to validating the content model with real lessons                             | Requires a developer to publish content; only a bridge                                     |

## Recommendation

**D now, then A.** Use content-as-code for the first lessons (Al bar …) so the content model is
proven before building an editor around it; the same validator/compiler later powers the Studio's
publish step. Build Studio as `apps/studio` with Expo Router web (A); switch to B only if editor
needs exceed what RN Web handles well — the shared `domain`/`api` packages keep that switch cheap.

Minimal teacher functions needed earlier (invite student, assign lesson) can be done in Studio MVP
or via admin scripts until then.

## Decision

Pending.
