# ADR-0003: Content versioning, progress events and sync

- Status: **Accepted** (approved by product owner 2026-11-22)
- Date: 2026-11-22

## Context

Lessons will be edited after students have used them. Editing must not invalidate historical
results (brief §5). Students practise offline and on several devices. Content must update
without an app release.

## Decision

### Content

1. Authoring happens in mutable draft tables.
2. **Publishing** compiles a lesson into an immutable `lesson_version` bundle (JSON validated
   by the shared zod schema, `content_schema_version`, checksum). A trigger forbids updates.
3. Content items have **stable IDs** that survive cosmetic edits; a substantive change creates a
   new item ID. Lecturer chooses explicitly when publishing.
4. Audio is content-addressed (`sha256` path), immutable and shared across versions.
5. Clients send the max `content_schema_version` they support and receive the newest compatible
   published version. Unknown exercise types degrade gracefully.

### Student data

6. Progress is recorded as **append-only `learning_events`** with client-generated UUIDv7 IDs,
   always referencing `lesson_version_id` + stable item ID.
7. Derived tables (`lesson_progress`, `item_mastery`, SRS state) are computed server-side and
   can be rebuilt from events at any time (e.g. after a scoring-rule fix).

### Sync

8. Down: fetch-if-newer of bundles and audio into SQLite / file cache.
9. Up: outbox in SQLite, uploaded via an idempotent `api_v1.submit_events` RPC
   (insert … on conflict do nothing), exponential backoff, never dropped silently.
10. No general-purpose sync engine for now; re-evaluate PowerSync if mutable, multi-device
    student-owned data appears.

## Consequences

- Historical results remain interpretable forever; scoring changes can be replayed.
- Storage grows with versions (small: JSON bundles of tens of KB).
- Lecturer UX must explain "minor edit vs new sentence" (open question Q-12).
- Event payload schemas are themselves versioned (`event_schema_version`).
