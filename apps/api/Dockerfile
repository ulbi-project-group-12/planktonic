# apps/api image: multi-stage pnpm build of the NestJS api (D-16).
# Build from the repo root: docker build -f apps/api/Dockerfile .
# The product name comes only from the PRODUCT_NAME build-arg, so this file stays rename-proof (D-34).
# OCI labels come from docker/metadata-action in release.yml, not from this file.
# Base: node:26.13.0-alpine3.24, digest built 2026-11-05 (amd64 19:25Z, arm64 20:10Z). It is
# younger than 14 days until 2026-11-19 and kept under the Phase 1 D-29 exception until then
# (no older Node 26 image exists; re-check recorded in STATE.md).
# Prisma: the generated client is compiled into dist, and @prisma/client, @prisma/adapter-pg and
# pg ship as production dependencies. The Prisma CLI stays a devDependency and is not in the
# runtime image; the Phase 4 migrate service decides how migrations run in production.

# --- build: install the api's workspace graph, compile, then deploy prod deps to /out ---
FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS build
# No NODE_ENV here: production would skip the devDependencies the build needs.
ENV HUSKY=0 CI=true
# Node 26 ships no corepack, so pnpm comes from npm at the exact root pin.
RUN npm install -g pnpm@12.15.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
# Every app, so the frozen lockfile finds all of its importers; only the api is deployed.
COPY apps/ ./apps/
RUN pnpm install --frozen-lockfile --ignore-pnpmfile --filter "@app/api..."
# Outside Turbo the generate -> build order is explicit. No DATABASE_URL is needed for it.
RUN pnpm --filter @app/api generate
RUN pnpm --filter @app/api build
# Copies the package `files` (dist), package.json and production node_modules only.
RUN pnpm --filter @app/api deploy --prod /out

# --- runtime: dist + production dependencies, non-root ---
FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS runtime
ARG APP_VERSION=dev
ARG PRODUCT_NAME
ENV NODE_ENV=production APP_VERSION=$APP_VERSION PRODUCT_NAME=$PRODUCT_NAME
WORKDIR /app
# Code stays root-owned: the runtime user can read it but not rewrite it. If the app ever
# needs a writable directory, create that one explicitly and chown only it.
COPY --from=build /out ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
