# apps/web image: multi-stage pnpm build of the Next.js standalone output (D-20).
# Build from the repo root: docker build -f apps/web/Dockerfile .
# The product name comes only from the PRODUCT_NAME build-arg, so this file stays rename-proof (D-34).
# OCI labels come from docker/metadata-action in release.yml, not from this file.
# Base: node:26.13.0-alpine3.24, digest built 2026-11-05 (amd64 19:25Z, arm64 20:10Z). It is
# younger than 14 days until 2026-11-19 and kept under the Phase 1 D-29 exception until then
# (no older Node 26 image exists; re-check recorded in STATE.md).

# --- build: install the web's workspace graph and run next build (standalone) ---
FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS build
# No NODE_ENV here: production would skip the devDependencies the build needs.
ENV HUSKY=0 CI=true NEXT_TELEMETRY_DISABLED=1
# Node 26 ships no corepack, so pnpm comes from npm at the exact root pin.
RUN npm install -g pnpm@12.15.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
# Every app, so the frozen lockfile finds all of its importers; only the web app is built.
COPY apps/ ./apps/
RUN pnpm install --frozen-lockfile --ignore-pnpmfile --filter "@app/web..."
# Plain next build: lint and typecheck run in CI through Turbo, not in the image.
RUN pnpm --filter @app/web build

# --- runtime: the standalone server, its static assets and public files, non-root ---
FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS runtime
ARG APP_VERSION=dev
ARG PRODUCT_NAME
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 APP_VERSION=$APP_VERSION PRODUCT_NAME=$PRODUCT_NAME
WORKDIR /app
# Code stays root-owned: the runtime user can read it but not rewrite it.
# outputFileTracingRoot is the repo root, so the server sits at apps/web/server.js.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
# Next writes its cache here at runtime; this is the only directory the runtime user owns.
RUN mkdir -p apps/web/.next/cache && chown node:node apps/web/.next/cache
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
