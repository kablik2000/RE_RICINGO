#!/usr/bin/env bash
# Deploys one RICI release on the VPS (ADR-0015). Installed as /srv/ricingo/deploy.sh.
#
# Called over SSH by .github/workflows/release.yml as the `deploy` user, whose key in
# ~deploy/.ssh/authorized_keys may run nothing else (command="/srv/ricingo/deploy.sh").
#   SSH command: deploy <version>     e.g. "deploy 1.2.0" (images and files of tag v1.2.0)
#   stdin:       a GitHub token that may read the repository and its packages (the job's token)
#
# Steps: fetch compose.yaml and ricingo.caddy of the tag, pull the images, migrate the database,
# start the new containers (waits for their health checks; on failure the previous version is
# started again), then reload Caddy. Database migrations are not rolled back.
set -euo pipefail

APP_DIR=/srv/ricingo
PROXY_DIR=/srv/proxy
REPOSITORY="${REPOSITORY:-kablik2000/RE_RICINGO}"

log() { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

# shellcheck disable=SC2086 # split the SSH command into words on purpose (no glob expansion)
set -f
set -- ${SSH_ORIGINAL_COMMAND:-$*}
set +f
[[ "${1:-}" == deploy && $# -eq 2 ]] || fail "usage: deploy <version>"
version="$2"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] || fail "not a version: $version"

IFS= read -r token || true
[[ -n "${token:-}" ]] || fail "no GitHub token on stdin"

cd "$APP_DIR"
[[ -f .env ]] || fail "$APP_DIR/.env is missing (see docs/setup/NASAZENI_VPS.md)"
compose() { docker compose --project-directory "$APP_DIR" "$@"; }

work="$(mktemp -d)"
trap 'rm -rf "$work"; docker logout ghcr.io >/dev/null 2>&1 || true' EXIT

fetch() { # <path in the repository> <destination>
  curl --fail --silent --show-error --location \
    --header "Authorization: Bearer $token" \
    --header 'Accept: application/vnd.github.raw' \
    --output "$2" \
    "https://api.github.com/repos/$REPOSITORY/contents/$1?ref=v$version"
}
log "fetching deploy files of v$version"
fetch deploy/compose.yaml "$work/compose.yaml"
fetch deploy/ricingo.caddy "$work/ricingo.caddy"

previous="$(sed -n 's/^RICI_VERSION=//p' .env)"
set_version() {
  if grep -q '^RICI_VERSION=' .env; then
    sed -i "s/^RICI_VERSION=.*/RICI_VERSION=$1/" .env
  else
    printf 'RICI_VERSION=%s\n' "$1" >>.env
  fi
}

cp compose.yaml "$work/compose.previous.yaml" 2>/dev/null || true
cp "$work/compose.yaml" compose.yaml
set_version "$version"
compose config --quiet || fail "compose.yaml of v$version is invalid"

log "pulling images $version"
printf '%s' "$token" | docker login ghcr.io --username "${REPOSITORY%%/*}" --password-stdin >/dev/null
compose pull --quiet api studio
docker logout ghcr.io >/dev/null

log "migrating the database"
compose up --detach --wait db
compose run --rm --no-deps api flask --app rici_api.wsgi db-upgrade

log "starting v$version"
if ! compose up --detach --wait --remove-orphans; then
  compose ps
  compose logs --tail 50 api studio || true
  if [[ -n "$previous" ]]; then
    log "v$version is not healthy: starting the previous version $previous again"
    [[ -f "$work/compose.previous.yaml" ]] && cp "$work/compose.previous.yaml" compose.yaml
    set_version "$previous"
    compose up --detach --wait --remove-orphans || true
  fi
  fail "v$version did not start"
fi

log "updating Caddy"
cp "$work/ricingo.caddy" "$PROXY_DIR/sites/ricingo.caddy"
docker compose --project-directory "$PROXY_DIR" exec -T caddy \
  caddy reload --config /etc/caddy/Caddyfile

# Images of releases unused for 30 days; a rollback to one pulls it again.
docker image prune --all --force --filter 'until=720h' >/dev/null

compose ps
log "v$version is live"
