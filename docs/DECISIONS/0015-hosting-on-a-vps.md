# ADR-0015: Hosting on our VPS — images built by GitHub Actions, deployed per release

- Status: **Accepted** (owner chose the VPS and tag-based releases, 2026-11-26)
- Date: 2026-11-26
- Supersedes: ADR-0014 (Render was never deployed)
- Answers: Q-19 (hosting for the API and PostgreSQL) — files (audio, artwork) stay open.

## Context

The owner now has a VPS at Forpsi (`esprog-vps`, 80.211.213.195 and IPv6, Ubuntu 24.04, 2 vCPU,
3.8 GB RAM, 39 GB disk, Docker preinstalled), meant for the Teacher Studio and possibly other
sites later. The Studio is to live at `rici.esprog.eu` (DNS at Wedos). Compared with Render
(ADR-0014) it costs nothing extra, but we run the OS, TLS, backups and deploys ourselves.

Building the Next.js Studio on a 3.8 GB server would take 1–2 GB of RAM and both cores for
minutes while the live sites run on it. The owner wants the server to receive finished releases
only. Platforms such as Coolify were considered: they add a web UI but use about 2 GB of RAM
themselves, keep the configuration outside git and are another internet-facing admin panel.

## Decision

1. **Docker Compose on the VPS**, configuration in git (`deploy/`):
   - `/srv/ricingo` — `deploy/compose.yaml`: PostgreSQL 17 (named volume), the API and the Studio,
     both on `127.0.0.1` ports only (8100, 3100). The Studio calls the API on the stack's private
     network (`RICI_API_URL=http://api:8000`). Secrets and the deployed version are in
     `/srv/ricingo/.env` (mode 600), never in git.
   - `/srv/proxy` — `deploy/proxy/`: one **Caddy** for every site on the server, with host
     networking so it serves IPv4 and IPv6 on 80/443 itself and sees real client addresses.
     Each site adds a file to `/srv/proxy/sites/` (RICI: `deploy/ricingo.caddy`). Caddy obtains
     and renews Let's Encrypt certificates.
   - Names: `rici.esprog.eu` (Studio), `api.rici.esprog.eu` (API for the Studio and the app).
2. **Images are built outside the server** by `.github/workflows/release.yml` and pushed to
   GitHub Container Registry (`ghcr.io/kablik2000/rici-api`, `rici-studio`), tagged with the
   version and the commit. The Studio image is a Next.js standalone server
   (`apps/studio/Dockerfile`, `output: 'standalone'`).
3. **A release is a git tag `vX.Y.Z`.** The workflow runs CI on the tagged commit, builds both
   images and deploys that version. A dispatch of the workflow with a version redeploys existing
   images (rollback) without building.
4. **Deploy over SSH with a single-purpose key.** The workflow connects as the `deploy` user
   whose key is restricted to `command="/srv/ricingo/deploy.sh"` (`restrict`: no shell, no
   forwarding). It passes the job's short-lived `GITHUB_TOKEN` on stdin; `deploy.sh` fetches
   `deploy/compose.yaml` and `deploy/ricingo.caddy` of the tag, pulls the images, runs the
   migrations (`flask db-upgrade`) with the new API image, starts the containers and waits for
   their health checks — if they fail it starts the previous version again — and reloads Caddy.
   The only secret in GitHub is the deploy key (environment `production`).
5. **Client address:** Caddy replaces any client-sent `X-Forwarded-For` with the client's
   address; the API trusts one hop (`TRUSTED_PROXY_HOPS=1`).

## Consequences

- No hosting bill beyond the VPS; the server only downloads and runs images.
- We own the server: OS updates (unattended-upgrades is on), SSH hardening and a firewall
  (open items), **database backups** and a restore drill (open item; until then a lost volume is
  lost data), monitoring.
- `deploy` is in the `docker` group, which is root-equivalent: a leaked deploy key would still
  only run `deploy.sh` with a version argument, but anything that can write to the server as
  `deploy` owns it. `deploy.sh` itself is root-owned and changed by hand when it changes
  (`docs/setup/NASAZENI_VPS.md`).
- Migrations are forward-only: a rollback starts the previous images against the migrated
  schema, so migrations must stay backward-compatible for one release.
- Changes to `deploy/compose.yaml` or `deploy/ricingo.caddy` take effect with the next release;
  `deploy/proxy/` is installed by hand.
- `render.yaml` and the Render guide are removed; ADR-0014 is superseded.
