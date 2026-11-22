# ADR-0004: Authentication and authorization

- Status: **Accepted** (approved by product owner 2026-11-22)
- Date: 2026-11-22

## Context

The app is for the lecturer's clients only (spec §1). Two roles with very different rights.
Possibly more lecturers in future. Personal data of Czech/EU residents (GDPR).

## Options

- **Public sign-up + paywall** — contradicts "only for clients", adds payments (spec §12: not now).
- **Invite-only** (lecturer creates invitation → email link/OTP → student sets credentials) — fits.
- **Access codes** handed out in lessons — simpler but weaker identity, harder recovery.

## Decision

1. Supabase Auth, **invite-only**; public sign-up disabled.
2. Sign-in: email + password, with email OTP as fallback/passwordless option.
   No social logins initially (also avoids Apple's Sign in with Apple obligation).
3. Roles `student | teacher | admin` in `profiles`, injected into the JWT through a
   custom access-token hook; RLS reads the claim. Only `admin` changes roles.
4. `organization_id` on all tenant-owned rows from day one (single organization initially).
5. `teacher_students` relation scopes what a teacher can see.
6. Session tokens in `expo-secure-store`.
7. In-app account deletion and data export.

## Consequences

- An App Store reviewer needs a demo student account (documented in release checklist).
- Invitation emails need a custom SMTP sender (domain decision, open question Q-10).
