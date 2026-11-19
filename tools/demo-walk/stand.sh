#!/usr/bin/env bash
# The demo stand: the realtime compose stack (two api replicas behind Traefik, web) under its own
# compose project and ports, so it never shares a database or a Traefik with another checkout.
#
#   tools/demo-walk/stand.sh up         build and start, migrate, seed
#   tools/demo-walk/stand.sh reset      empty the seeded test channel (before every walk)
#   tools/demo-walk/stand.sh test-log   run the phase 2 exit test against the stand's Postgres and
#                                       Redis, output to $DEMO_OUT/test-run.log (the closing card)
#   tools/demo-walk/stand.sh down       stop, remove the volumes and the stand's images
#
# Override the project or ports with DEMO_PROJECT / DEMO_PG_PORT / DEMO_REDIS_PORT / DEMO_S3_PORT /
# DEMO_TRAEFIK_PORT. The walk's --base must match: http://127.0.0.1:$DEMO_TRAEFIK_PORT.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

export COMPOSE_PROJECT_NAME="${DEMO_PROJECT:-demo-walk}"
export POSTGRES_PORT="${DEMO_PG_PORT:-55190}"
export REDIS_PORT="${DEMO_REDIS_PORT:-56190}"
export S3_PORT="${DEMO_S3_PORT:-58190}"
export TRAEFIK_PORT="${DEMO_TRAEFIK_PORT:-58290}"
COMPOSE=(docker compose -f compose.yaml -f tools/demo-walk/compose.demo.yaml --profile realtime)
DB_URL="postgresql://app:app_dev_password@127.0.0.1:${POSTGRES_PORT}"
CHANNEL='00000000-0000-7000-8000-000000000001'

case "${1:-}" in
  up)
    # Traefik's Docker provider is scoped to this project by compose.demo.yaml, but another
    # stack's Traefik without that scope would still route here: say so before starting.
    others="$(docker ps --filter 'label=com.docker.compose.service=traefik' --format '{{.Label "com.docker.compose.project"}}' | grep -vx "$COMPOSE_PROJECT_NAME" || true)"
    if [ -n "$others" ]; then
      echo "another compose Traefik is running (project: $others); stop it first" >&2
      exit 1
    fi
    "${COMPOSE[@]}" up -d --build --wait api web traefik
    DATABASE_URL="$DB_URL/app" pnpm --filter @app/api generate
    DATABASE_URL="$DB_URL/app" pnpm db:migrate
    DATABASE_URL="$DB_URL/app" pnpm db:seed
    echo "stand: http://127.0.0.1:${TRAEFIK_PORT}/prototype"
    ;;
  reset)
    "${COMPOSE[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U app -d app -c \
      "DELETE FROM messages WHERE channel_id = '$CHANNEL'; UPDATE channels SET last_seq = 0 WHERE id = '$CHANNEL';"
    ;;
  test-log)
    : "${DEMO_OUT:?set DEMO_OUT to the output folder}"
    mkdir -p "$DEMO_OUT"
    pnpm --filter @app/contracts build
    DATABASE_URL="$DB_URL/app_test" pnpm db:migrate
    # Verbose, so the card lists the three tests; the checkout path is cut out of the log.
    DATABASE_URL="$DB_URL/app_test" REDIS_URL="redis://127.0.0.1:${REDIS_PORT}/1" NO_COLOR=1 \
      pnpm --filter @app/api exec vitest run --config vitest.integration.config.ts --reporter=verbose phase2-exit 2>&1 |
      sed "s|$ROOT|.|g" | tee "$DEMO_OUT/test-run.log"
    ;;
  down)
    "${COMPOSE[@]}" down -v --rmi local
    ;;
  *)
    echo "usage: $0 up|reset|test-log|down" >&2
    exit 2
    ;;
esac
