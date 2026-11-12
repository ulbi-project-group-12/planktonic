# apps/web placeholder image. Phase 1.1/4 replace it with a multi-stage pnpm build.
# Build from the repo root: docker build -f apps/web/Dockerfile .
# The product name comes only from the PRODUCT_NAME build-arg, so this file stays rename-proof (D-34).
# OCI labels come from docker/metadata-action in release.yml, not from this file.
FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216
ARG APP_VERSION=dev
ARG PRODUCT_NAME
ENV NODE_ENV=production APP_VERSION=$APP_VERSION PRODUCT_NAME=$PRODUCT_NAME
WORKDIR /app
# Code stays root-owned: the runtime user can read it but not rewrite it. If the app ever
# needs a writable directory, create that one explicitly and chown only it.
COPY apps/web/package.json ./package.json
COPY apps/web/src ./src
USER node
CMD ["node", "src/main.ts"]
