# Architecture Decision Records

Format: short MADR-style records. One decision per file, never rewritten after acceptance —
a changed decision gets a new ADR that supersedes the old one.

Status values: **Proposed** (awaiting approval) · **Accepted** · **Superseded by ADR-xxxx** · **Rejected**

| ADR                                                        | Title                                                              | Status                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------- |
| [0001](0001-mobile-stack.md)                               | Mobile stack: Expo SDK 58, React Native, TypeScript, Expo Router   | Accepted                  |
| [0002](0002-backend-and-database.md)                       | Backend & database: Supabase Postgres + on-device SQLite           | Superseded by 0010        |
| [0003](0003-content-versioning-and-sync.md)                | Immutable content versions, event-based progress, sync             | Accepted                  |
| [0004](0004-authentication-and-authorization.md)           | Invite-only auth, roles, tenancy, RLS                              | Accepted                  |
| [0005](0005-update-and-release-strategy.md)                | EAS Build/Update, runtime versions, content delivery               | Accepted                  |
| [0006](0006-teacher-studio-platform.md)                    | Teacher Studio platform                                            | Decided by 0010 (Next.js) |
| [0007](0007-monorepo-and-frontend-architecture.md)         | Monorepo, feature modules, state, design system                    | Accepted                  |
| [0008](0008-local-native-modules.md)                       | Local Expo native modules for missing device APIs                  | Accepted                  |
| [0009](0009-visual-design-v1.md)                           | Visual design v1: Material 3, typefaces, icons, artwork            | Accepted                  |
| [0010](0010-flask-postgresql-backend-and-nextjs-studio.md) | Flask + PostgreSQL backend, Next.js Studio, monorepo               | Accepted                  |
| [0011](0011-lesson-drafts-as-documents.md)                 | Lesson drafts as validated JSON documents (Studio MVP)             | Accepted                  |
| [0012](0012-teacher-studio-sign-in.md)                     | Teacher Studio sign-in: accounts, sessions, organizations          | Accepted                  |
| [0013](0013-public-app-and-invited-students.md)            | Public app, invited students, lesson visibility, recommendations   | Accepted                  |
| [0014](0014-hosting-on-render.md)                          | Hosting on Render (Frankfurt) from a Blueprint                     | Superseded by 0015        |
| [0015](0015-hosting-on-a-vps.md)                           | Hosting on our VPS: images from GitHub Actions, per-release deploy | Accepted                  |
