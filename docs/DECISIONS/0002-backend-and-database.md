# ADR-0002: Backend and database

- Status: **Accepted** (approved by product owner 2026-11-22)
- Date: 2026-11-22

## Context

RICINGO needs: accounts with two roles, a strongly relational content model (lesson → turn →
sentence → segment ↔ lexeme ↔ grammar topic), content versioning, per-student progress across
devices, audio file hosting, offline use, backups, safe migrations, and (later) server-side AI.
Expected scale: tens to low hundreds of students, one or a few lecturers, small dev team.

## Options

| Option                                                                         | Pros                                                                                                                                                                                                      | Cons                                                                                                                                                |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Supabase** (managed Postgres + Auth + Storage + Edge Functions + RLS)     | Real Postgres (constraints, FKs, triggers, JSONB, migrations); auth, storage/CDN and backups included; RLS fits teacher/student isolation; EU region; open-source → can self-host or move to any Postgres | RLS policies need discipline and tests; Edge Functions are Deno; auth vendor coupling; PITR is a paid add-on                                        |
| **B. Custom API** (Node/NestJS or Fastify) + managed Postgres (Neon, RDS, Fly) | Full control, conventional layered backend, any language features                                                                                                                                         | Must build and operate auth, file storage, signed URLs, deploys, monitoring; slows Phase 1 significantly for a small team                           |
| **C. Firebase** (Firestore)                                                    | Mature offline SDK, auth                                                                                                                                                                                  | Document DB is a poor fit for a relational content graph and integrity constraints; complex queries/reports for Studio are hard; data model lock-in |
| **D. SQLite only (on device)**                                                 | Simple, offline by default                                                                                                                                                                                | No multi-device, no teacher visibility, no central content publishing — fails core requirements                                                     |
| **E. PocketBase / self-hosted SQLite server**                                  | Very simple single binary                                                                                                                                                                                 | Single-node, self-operated, weaker migration/backup story, smaller ecosystem                                                                        |
| **F. Sync engines** (PowerSync, ElectricSQL, Zero) on top of Postgres          | Automatic Postgres ↔ SQLite sync                                                                                                                                                                          | Extra service and cost; not needed while student data is append-only and content read-only (see ADR-0003)                                           |

## Decision

**Option A — Supabase in an EU region (Frankfurt) as the system of record, plus expo-sqlite on
device as an offline cache and outbox.**

Guardrails that keep us portable and safe:

1. Clients use only the versioned `api_v1` schema (views + RPCs); tables are private.
   This is our API contract and lets the schema evolve behind it.
2. Business rules that must hold for everyone (immutability of published versions,
   idempotent event ingestion, role checks) are enforced in Postgres (constraints, triggers,
   RLS), not only in clients.
3. Migrations: Supabase CLI, SQL files in `supabase/migrations`, reviewed in PRs, applied by CI
   to staging then production; expand → migrate → contract.
4. pgTAP tests for RLS and constraints run in CI against a local Supabase.
5. Three projects: local (CLI/Docker), staging, production.
6. Backups: Pro plan daily backups + PITR for production; scheduled `pg_dump` to separate
   storage; quarterly restore drill.
7. Escape hatch: because it is plain Postgres + S3-compatible storage, moving to self-hosted
   Supabase or a custom API later is a migration, not a rewrite. Option B can be added
   incrementally (e.g. a dedicated service for AI pipelines) without replacing A.

PostgreSQL is **not** distributed as a file; it is hosted by Supabase and accessed over HTTPS
(PostgREST/RPC) with JWT auth. SQLite exists only on devices as a disposable cache + outbox.

## Consequences

- Cost: Supabase Pro (~25 USD/month) + PITR add-on for production; staging can be Free or Pro.
  Needs owner approval (open question Q-9).
- Developers need Docker locally for `supabase start`.
- RLS mistakes are the main security risk → mandatory pgTAP coverage per table.
