# ADR-0005: Update and release strategy

- Status: **Accepted** (approved by product owner 2026-11-22)
- Date: 2026-11-22

## Context

The app must evolve for years without breaking installed builds. Content changes must not
require store releases (brief §6).

## Decision

1. **Three update paths:** native → EAS Build + store submission; JS/assets → EAS Update;
   content → publish from Studio/backend.
2. **runtimeVersion policy `fingerprint`** so OTA updates reach only binary-compatible builds.
3. **Channels:** `development`, `preview` (internal testers, staging backend),
   `production`. Branch per release line; promote tested updates from preview to production.
4. **Rollouts:** staged EAS Update rollouts for risky changes; monitor with EAS Update insights
   and crash reporting; `eas update:rollback` documented.
5. **Compatibility gates:**
   - remote config `min_supported_app_version` → blocking "update the app" screen;
   - `api_v1` stays backward compatible; breaking change → `api_v2` alongside;
   - DB migrations follow expand → migrate → contract;
   - `content_schema_version` negotiation (ADR-0003).
6. **Local SQLite migrations** ship inside the app, run in a transaction at startup, with tests.
7. **Versioning:** semantic `version` in app config; build numbers managed remotely by EAS
   (`appVersionSource: remote`).
8. CI: EAS Workflows (or GitHub Actions) to build preview on merge to `main`, production
   builds on tags.

## Consequences

- Requires an Expo account/organization and EAS plan (free tier may suffice early; open Q-9).
- Every native dependency change must be treated as a store release.
