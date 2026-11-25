# ADR-0014: Hosting on Render (Frankfurt) from a Blueprint

- Status: **Accepted** (owner chose Render, 2026-11-25)
- Date: 2026-11-25
- Answers: Q-19 (hosting for the API and PostgreSQL) — files (audio, artwork) stay open.

## Context

The Teacher Studio (Next.js, server-rendered), the Flask API and PostgreSQL (ADR-0010) need a
public home with HTTPS: the Studio's session cookie is `__Host-` and `Secure` in production
(ADR-0012), and the mobile app needs a production API URL (ADR-0013). Students can be under 15,
so data stays in the EU. The team has no operations staff; the owner already has a Render
account linked to the GitHub repository. A self-run VM (Compute Engine, Hetzner) was considered:
cheaper, but we would own OS updates, TLS, backups and monitoring.

## Decision

1. **Render, region Frankfurt**, for all three parts, described in **`render.yaml`** (a Render
   Blueprint) at the repository root, so the setup is reviewed in git and recreated in one step:
   - `rici-db`: managed PostgreSQL 17, paid plan (the free one is deleted after 30 days), no
     outside access (`ipAllowList: []`).
   - `rici-api`: web service from `services/api/Dockerfile` (gunicorn). Migrations run as the
     pre-deploy command (`flask db-upgrade`); health check `/api/v1/health`.
   - `rici-studio`: Node web service; installs only the Studio and its workspace packages and
     runs `next start`. It reaches the API over Render's **private network** (`RICI_API_HOSTPORT`).
2. **Paid instances** for the API and the Studio: free web services sleep, cannot receive
   private-network requests and have no Shell (needed for the operator commands).
3. **Deploys follow CI:** `autoDeployTrigger: checksPass` — a commit to `main` deploys only after
   `.github/workflows/ci.yml` passed. The Studio redeploys only for Studio-related paths.
4. **Configuration from the environment only** (no secrets in git). The API accepts the
   platform's `postgres://`/`postgresql://` URL and switches it to the psycopg 3 driver.
5. **Client address behind the load balancer:** `TRUSTED_PROXY_HOPS=1` makes the API take the
   address Render's load balancer appended to `X-Forwarded-For` (sign-in throttling per address);
   entries a client sent itself are ignored. Render does not document the header's exact shape,
   so it is checked after the first deploy (`docs/setup/NASAZENI_RENDER.md`).
6. **Operator steps stay manual** and are documented: first lecturer account through the
   service Shell (`create-teacher`), SMTP settings once a provider is chosen (Q-10), custom
   domain.

## Consequences

- Roughly 20 USD a month for the smallest paid database and two web services (check Render's
  current prices); no servers to patch.
- Backups are Render's managed database backups; a restore drill is still to be documented.
- The Studio sees all lecturers' sign-ins as coming from its own address until it passes the
  real client address to the API over a trusted channel (open item).
- Changing the region or a service's name later means recreating it (Render does not allow it).
- Files (audio, artwork) need storage when they arrive (Render disk or S3-compatible bucket).
