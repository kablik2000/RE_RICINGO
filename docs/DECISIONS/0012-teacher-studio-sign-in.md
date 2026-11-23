# ADR-0012: Teacher Studio sign-in (accounts, sessions, organizations)

- Status: **Accepted** (2026-11-23, requested by the product owner: "sign-in to the Teacher Studio
  only, no known vulnerabilities, no two-factor yet")
- Date: 2026-11-23
- Refines: ADR-0004 (invite-only, roles, tenancy), ADR-0010 point 5 (API-issued tokens)

## Context

Until now the Studio endpoints ran only in development, without any sign-in. The owner wants the
Studio protected before anything else: several lecturers (answer to Q-2), students may be under
15 (Q-7, relevant for the student side later). Two-factor authentication is explicitly not wanted
yet. Students and invitations come later (M2).

The browser only ever talks to the Studio (Next.js); the Studio's server calls the Flask API
(backend-for-frontend). The API must not trust the Studio blindly: it checks every request.

## Decision

1. **Accounts.** `organizations` and `users` (role `teacher`; students later). No public sign-up:
   an operator creates teacher accounts with `flask create-teacher` (the password is typed into a
   hidden prompt, never stored in shell history). `set-password`, `disable-teacher` and
   `enable-teacher` manage them. Every lesson belongs to an organization; a teacher sees and
   changes only the lessons of their organization (another organization's lesson answers 404,
   like a missing one).
2. **Passwords.** Argon2id (`argon2-cffi`, RFC 9106 low-memory profile: 64 MiB, 3 passes,
   4 lanes), rehashed on sign-in when the parameters change. 15–128 characters after NFKC
   normalisation, no composition rules (NIST SP 800-63B-4 for single-factor passwords); not the
   e-mail itself, not one repeated character.
3. **Sign-in** (`POST /api/v1/auth/login`). The same answer for an unknown e-mail, a wrong
   password and a disabled account; an unknown e-mail still verifies a dummy hash, so timing
   does not reveal accounts. **Throttling** in PostgreSQL: after 5 failures for one e-mail within
   15 minutes that e-mail is blocked for the rest of the window (also for e-mails without an
   account, so blocking reveals nothing); one client address is blocked after 50 failures. The
   e-mail is stored only as a SHA-256 key; attempts are kept for a day.
4. **Sessions.** A 256-bit random token; the database keeps only its SHA-256, so a database leak
   does not hand out sessions. A session ends after 2 hours without use, 12 hours after sign-in,
   on sign-out (deleted on the server), and when the password changes or the account is disabled.
5. **Studio transport.** The token lives in a cookie `httpOnly`, `SameSite=Strict`, `Path=/`;
   in production also `Secure` with the `__Host-` prefix. Page scripts cannot read it (XSS) and
   other sites cannot send it (CSRF; Server Actions additionally compare `Origin` with `Host`).
   The Studio's server forwards it as `Authorization: Bearer`. The API has no CORS, so browsers
   cannot call it from other origins.
6. **Defence in depth in the Studio.** `src/proxy.ts` only redirects requests without a cookie to
   `/login` (fast path). Every page and every Server Action calls `requireTeacher()`, which asks
   the API to validate the session; the API validates it again on each Studio request. Nothing
   relies on the proxy alone (the 2025 Next.js middleware bypass, CVE-2025-29927, is the reason).
   After sign-in only local paths are accepted as redirect targets (no open redirect).
7. **Browser hardening.** Content Security Policy with a per-request nonce and `strict-dynamic`
   (no inline scripts without the nonce, `eval` only in development), `frame-ancestors 'none'`,
   `object-src 'none'`, `base-uri`/`form-action 'self'`; `X-Frame-Options: DENY`, `nosniff`,
   `Referrer-Policy: same-origin`, `Permissions-Policy`, HSTS in production; no `X-Powered-By`.
   Request bodies to the API are limited to 2 MiB.
8. **Dependencies.** Checked with `pnpm audit --prod` and `pip-audit` on 2026-11-23: no known
   vulnerability in the Studio or the API (4 moderate findings only in the mobile app's build
   tooling: `glob`, `minimatch` via Expo/Jest).

## Options considered

- **Stateless JWT in the cookie** — no database lookup, but cannot be revoked on sign-out or
  password change without a deny-list; needs a signing secret to manage. Rejected for the Studio.
- **Sessions only in Next.js** (e.g. an auth library) — the API would still be unprotected for
  any other caller. Rejected: the API is the security boundary.
- **Two-factor (TOTP / passkeys)** — the strongest option, postponed at the owner's request; the
  15-character minimum compensates partly. To be added before real student data goes live.

## Consequences

- The Studio endpoints now run in every environment (behind sign-in); the student content API
  stays development-only until student sign-in exists.
- Throttling by client address sees the Studio server's address for requests that come through
  the Studio; it then acts as a global brake. When hosting is set up, the Studio must pass the
  real client address over a trusted channel (Q-19), so one attacker cannot slow everyone down.
- Lecturers cannot reset a forgotten password themselves yet (operator command `set-password`);
  e-mail reset comes with invitations.
- Not covered yet: two-factor, a breached-password list (e.g. Have I Been Pwned k-anonymity),
  audit log of sign-ins visible to the owner, student accounts.
