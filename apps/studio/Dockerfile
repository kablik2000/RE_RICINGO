# syntax=docker/dockerfile:1
# Teacher Studio image (ADR-0015). Build context: the repository root —
#   docker build -f apps/studio/Dockerfile .
# Built by .github/workflows/release.yml and run by deploy/compose.yaml on the server.

FROM node:22-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Manifests first, so code changes do not reinstall dependencies. Every workspace manifest is
# copied (the lockfile lists them all); only the Studio and its workspace packages are installed.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/studio/package.json apps/studio/
COPY apps/mobile/package.json apps/mobile/
COPY packages/domain/package.json packages/domain/
COPY packages/design-system/package.json packages/design-system/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@ricingo/studio..."

COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/studio ./apps/studio
RUN pnpm --filter @ricingo/studio build

FROM node:22-slim AS runtime
# HOSTNAME: Docker sets it to the container id; the standalone server would listen only there.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/studio/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/studio/.next/static ./apps/studio/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/studio/server.js"]
