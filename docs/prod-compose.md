# Production compose runbook (UL-162)

`compose.prod.yml` is the stack the server runs: Traefik in front of the web app and two api
replicas, with Postgres, Redis and S3 behind them. It starts from ready-built images and can be
tried on a laptop first. The server (UL-163) and the release deploy (UL-164) build on this file.

## What runs

| Service     | Image                                | Networks       | Notes                                                    |
| ----------- | ------------------------------------ | -------------- | -------------------------------------------------------- |
| `traefik`   | `traefik:v3.7.17`                    | `edge`         | The only published port (HTTP). Sticky cookie `io_srv`.  |
| `web`       | `${IMAGE_PREFIX}-web:${APP_VERSION}` | `edge`         | Next.js standalone server, port 3000.                    |
| `api` ×2    | `${IMAGE_PREFIX}-api:${APP_VERSION}` | `edge`, `data` | REST and Socket.IO, port 3001. `API_REPLICAS` sets ×N.   |
| `migrate`   | same image as `api`                  | `data`         | One-shot `prisma migrate deploy`, then exits.            |
| `postgres`  | `pgvector/pgvector:0.8.6-pg18`       | `data`         | Volume `pgdata`.                                         |
| `redis`     | `redis:8.10.3`                       | `data`         | Password required. Volume `redisdata`.                   |
| `seaweedfs` | `chrislusf/seaweedfs:4.51`           | `data`         | S3 gateway on 8333. Volume `s3data`. Unused until files. |
| `s3-init`   | same image as `seaweedfs`            | `data`         | One-shot: creates `S3_BUCKET` if it is missing.          |

Routing on one origin (`APP_HOST`): `/api`, `/api/*` and `/socket.io/*` go to the api replicas,
everything else goes to web. A request for any other host name gets 404.

## Ports and networks

- **Published:** Traefik's HTTP entrypoint only, on `HTTP_BIND:HTTP_PORT` (`127.0.0.1:58180` by
  default; the server sets `0.0.0.0` and `80`). TLS on 443 arrives with UL-163.
- **Not published:** Postgres 5432, Redis 6379, SeaweedFS 8333/8888/9333, the api 3001, the web
  3000, and Traefik's internal entrypoint 8082 (`/ping` and its Prometheus `/metrics`).
- **`data` network** is `internal`: containers on it have no route to or from the outside. The
  api joins both networks; Postgres, Redis and S3 join only `data`.
- The api's future `/metrics` port (prom-client) must stay off the Traefik routers: Prometheus
  (UL-171) scrapes it and Traefik's 8082 from inside the networks.
- Traefik only reads containers of its own compose project (a constraint on the
  `com.docker.compose.project` label), so two stacks on one host never route to each other.

## Run it locally

Prerequisites: Docker with Compose v5.7.0 and a free port 58180.

```bash
cp .env.prod.example .env.prod   # then fill in the four empty secrets (see Environment)

# Build the two app images under the names the stack expects (app-web:local, app-api:local).
docker compose --env-file .env.prod -f compose.prod.yml -f compose.prod.build.yml build

docker compose --env-file .env.prod -f compose.prod.yml up -d
scripts/check-sticky.sh http://localhost:58180

docker compose --env-file .env.prod -f compose.prod.yml down -v   # stop and drop the volumes
```

`up -d` starts Postgres, Redis, S3, web and Traefik, runs `migrate` and `s3-init` to
completion, then starts the api replicas. Open `http://localhost:58180` in a browser; use `localhost`,
not `127.0.0.1`, because the routers match `APP_HOST`.

Do not add `--wait` to `up`: compose treats a one-shot service that exits as a failure there. The
check script waits for the replicas instead (`WAIT_SECONDS`, 60 by default).

The dev stack (`compose.yaml`, project `app`) and this one (project `app-prod`) can run at the
same time. A second copy of this stack needs its own project name and port:
`docker compose -p app-prod2 ...` with another `HTTP_PORT`.

## The sticky check

```bash
scripts/check-sticky.sh [BASE_URL]   # default http://localhost:58180
```

The script needs only `bash` and `curl`, so it runs on the server as well
(`scripts/check-sticky.sh https://<domain>`). It exits 0 only when all three hold:

1. **Without the cookie** requests reach every replica: `GET /api/health` returns
   `EXPECTED_INSTANCES` (default 2) distinct `instanceId` values, and every response sets `io_srv`.
2. **With one cookie value** every request lands on the same `instanceId`, and each cookie value
   pins a different replica.
3. **A Socket.IO long-polling session lives on one replica.** The session id is accepted with
   the cookie it was opened with and refused with HTTP 400 when sent with the other replica's
   cookie. This is the failure a client would hit without sticky sessions.

Expected output:

```text
Sticky check against http://localhost:58180 (20 requests per step, 2 replicas expected)
1. Without the cookie
        8b4f57335cb5: 10 of 20
        ab969dcbe4e7: 10 of 20
  ok    every response set io_srv
  ok    requests reached 2 replicas
  ok    2 cookie values for 2 replicas
2. With the cookie
  ok    io_srv=0f81170601ee68c3: 20 of 20 on ab969dcbe4e7
  ok    io_srv=601cb6e15bf2f913: 20 of 20 on 8b4f57335cb5
3. Socket.IO long-polling session
  ok    handshake opened a session on the replica of io_srv=0f81170601ee68c3
  ok    the other replica refuses the session (400)
  ok    its own replica accepts the session (200)
PASS: sticky sessions work
```

Exit codes: 0 passed, 1 a check failed, 2 bad usage or the stack does not answer. Settings come
from the environment: `REQUESTS`, `EXPECTED_INSTANCES`, `COOKIE_NAME`, `WAIT_SECONDS`.

## Environment

Every variable is described in `.env.prod.example`. Secrets have no defaults in the compose
file: a missing one stops `up` and names the variable.

- **Local:** `.env.prod` in the repo root (git-ignored), passed with `--env-file .env.prod`.
  Without the flag compose would read the dev `.env`. The example leaves the four secrets
  empty; fill them with any generated values, e.g. `openssl rand -hex 24` each.
- **Server:** the filled-in file sits next to `compose.prod.yml` as `.env` with mode 600, so the
  commands need no `--env-file`. Generate every password and key (`openssl rand -hex 32`); they
  end up inside connection URLs, so keep to letters, digits, `-` and `_`.
- `STICKY_COOKIE_SECURE` is required: `false` on plain HTTP, `true` once the site is on HTTPS.
  A browser drops a `Secure` cookie on plain HTTP, and long-polling then fails.
- Only `.env.example` (dev) and `.env.prod.example` are committed.

## Images and deploying a tag

`release.yml` pushes `ghcr.io/<owner>/<slug>-web` and `ghcr.io/<owner>/<slug>-api`, each tagged
with the release tag. On the server `IMAGE_PREFIX=ghcr.io/<owner>/<slug>` is set once in `.env`,
and a deploy changes `APP_VERSION` there to the release tag, then runs:

```bash
docker compose -f compose.prod.yml pull &&
  docker compose -f compose.prod.yml run --rm migrate &&
  docker compose -f compose.prod.yml up -d &&
  scripts/check-sticky.sh https://<domain>
```

- **Write the tag into `.env`,** do not pass `APP_VERSION=...` inline: a later plain
  `docker compose up -d` would otherwise go back to the tag in the file.
- **`migrate` is a gate, so the steps are chained with `&&`.** It runs from the api image of the
  same tag, which ships the Prisma CLI, `prisma/schema` and `prisma/migrations`. If it fails,
  nothing else has been touched and the previous api keeps serving.
- **Never deploy a new tag with a bare `up -d`.** Compose removes the old api containers before
  it runs `migrate`, so a failed migration there leaves no api running. The `depends_on` on
  `migrate` only orders a first start.
- The api never migrates on start, so two replicas cannot race.
- **Rollback** is the same steps with the previous tag. Migrations are expand/contract, so the
  previous api still works on the newer schema.
- `up -d` recreates both replicas at once. Updating them one at a time is UL-164's job; this
  file guarantees that Traefik routes only to a replica that is healthy (`/api/health` every 5 s,
  and a new container gets traffic after its first healthy probe).

## Limits and health

- Memory limits: api 512 MB per replica, web 512 MB, Postgres 1 GB, SeaweedFS 512 MB, Redis
  384 MB, Traefik 256 MB. Raise them in the compose file when cAdvisor (UL-171) shows a need.
- Container logs are capped at 5 × 10 MB per container.
- Every long-running service has a healthcheck and `restart: unless-stopped`. An `unhealthy`
  status alone does not restart a container.
- Traefik closes idle keep-alive connections after 180 s, above Socket.IO's 45 s
  `pingInterval + pingTimeout`; upgraded WebSocket connections are not affected by it.

## Known gaps

- Traefik reads the Docker socket directly. The mount is `:ro`, but that only protects the
  socket file: the Docker API behind it stays fully usable, so a compromised Traefik could read
  every container's environment and start containers. A socket proxy limited to read-only
  container and network queries closes this; no release of one was old enough for the 14-day
  rule when this file was written.
- The api connects to Postgres as the role that owns the database (`POSTGRES_USER`, a superuser
  in this image). A separate non-superuser role for the api, with `migrate` keeping the owner,
  is a later hardening step.
- SeaweedFS's master, filer and volume ports have no authentication; only the S3 gateway checks
  keys. They are reachable only from the `data` network. Phase 7 must not attach `seaweedfs` to
  `edge`: route presigned URLs to port 8333 alone, or proxy them through the api.
- Traefik's access log records request paths with their query strings (headers and cookies are
  dropped). Never put a token in a query string.
- No TLS, rate limit or security headers at the edge yet: UL-163 and later tickets.
- The phase 7 worker is a commented placeholder in `compose.prod.yml`.
