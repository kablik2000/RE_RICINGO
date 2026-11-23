# ADR-0010: Flask + PostgreSQL backend, Next.js Teacher Studio, all in the monorepo

- Status: **Accepted** (product owner decision 2026-11-23)
- Date: 2026-11-23
- Supersedes: ADR-0002 (Supabase); the Supabase-specific parts of ADR-0004 (Supabase Auth,
  RLS-based authorization). Decides ADR-0006 (Teacher Studio platform).

## Context

The owner wants the Teacher Studio as a Next.js + React + TypeScript web app, a PostgreSQL
database and a backend written in Flask (Python), and the Studio to live in the `ricingo`
monorepo next to the student app (not in the separate `WEB_RICI_TEACHER_STUDIO` repository).

## Decision

1. **Repository:** one monorepo.
   - `apps/mobile`: student app (Expo, unchanged).
   - `apps/studio`: Teacher Studio, Next.js + React + TypeScript.
   - `services/api`: backend, Flask (Python).
   - `packages/domain`: content schema and rules, shared by app, Studio and backend.
   - `packages/api`: typed TypeScript client for the backend API.
2. **Database:** PostgreSQL, the system of record. Schema managed by migrations in
   `services/api` (SQLAlchemy 2 + Alembic). Business rules that must always hold (published
   lesson versions are immutable, idempotent event ingestion) are enforced in the database as
   well (constraints, triggers), not only in Python.
3. **Backend:** Flask application, versioned REST API `/api/v1` with an OpenAPI description
   (generated from the code); the TypeScript client in `packages/api` is generated from it.
   Clients never talk to the database directly. Authorization is enforced in the API layer
   (roles `student | teacher | admin`, organisation and teacher–student scoping) with tests.
4. **One content contract:** the lesson schema stays defined once with zod in
   `packages/domain`; a JSON Schema is generated from it and the Flask API validates published
   lessons against that same schema. A CI check fails when the generated schema is stale.
5. **Auth (replaces Supabase Auth):** invite-only remains (ADR-0004 points 1–2, 4–7 still hold).
   The API issues short-lived access tokens + rotating refresh tokens; passwords hashed with
   Argon2; invitation and one-time codes by email. Mobile keeps tokens in `expo-secure-store`;
   the Studio uses HTTP-only cookies.
6. **Files (audio, artwork):** S3-compatible object storage, served through signed URLs;
   content-addressed names as in ADR-0003. Provider chosen with hosting.
7. ADR-0003 (immutable lesson versions, append-only learning events, offline sync) is unchanged;
   it is implemented by the Flask API instead of Supabase RPCs.

## Alternatives

- **Supabase (ADR-0002):** less code to run (auth, storage, RLS included), but the owner prefers
  a conventional backend in Flask that the team controls.
- **Studio in its own repository:** the content schema and API client would have to be copied or
  published as packages and could drift; the monorepo keeps one source.
- **Expo web Studio (ADR-0006 option A):** shares the mobile design system, but the owner chose
  Next.js, which has the stronger tooling for dense editors and tables.

## Consequences

- More to build and operate than Supabase: auth, file access, backups, monitoring, deployment.
- A Python toolchain joins the monorepo (uv, Ruff, mypy, pytest); `verify` and CI run it too.
- The Studio cannot reuse the React Native design system directly; it shares the **tokens**
  (colours, type scale, spacing) exported for the web, so both look like one product.
- Hosting (EU region, Postgres with backups, object storage) and local Postgres setup are open
  questions (DEVELOPMENT_PLAN Q-19, Q-20).
- The empty `WEB_RICI_TEACHER_STUDIO` repository is not used.
