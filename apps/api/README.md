# @app/api

The api of this project: NestJS 12 as native ESM, compiled with `tsc`, with zod-validated config,
Prisma 7 on Postgres and terminus health endpoints. The multi-stage `Dockerfile` ships `dist`
plus production dependencies as a non-root image.

## Running locally

Run these commands from the repo root after installing dependencies and copying
`.env.example` to `.env`:

```sh
pnpm services:up
pnpm db:migrate
```

Compose builds and starts two API replicas behind Traefik. The API is available at
http://127.0.0.1:58080/api/health (`TRAEFIK_PORT` changes the host port). The API's internal
port `3001` is not published to the host. `services:up` waits for S3 initialization, so check
`docker compose ps` for API health and `/api/health/ready` for database readiness.

For hot reload, run the API on the host instead:

```sh
docker compose stop api traefik
docker compose up -d postgres redis seaweedfs s3-init
docker compose wait s3-init
pnpm db:migrate
pnpm --filter @app/api dev
```

The host API listens on http://127.0.0.1:3001/api/health by default. Use `pnpm dev` instead of
the last command to start both the web app and API in watch mode.
See the [root README](../../README.md#local-services) for Traefik routing and sticky sessions.

## Layout

```
src/main.ts               bootstrap: binds API_HOST:API_PORT, exits 1 on a startup failure
src/app.module.ts         root module: ConfigModule, PrismaModule, feature modules
src/app.setup.ts          configureApp(): global prefix `api`, shutdown hooks (also used by e2e)
src/core/config/          env schema (zod) and validation
src/core/prisma/          PrismaService, PrismaHealthIndicator, global PrismaModule
src/modules/<feature>/    feature modules: controller, service, repository, specs
src/generated/prisma/     generated Prisma client (git-ignored)
prisma/                   schema.prisma and migrations/
prisma.config.ts          Prisma CLI config
test/                     app-level e2e specs (*.e2e-spec.ts)
```

ESM rule: relative imports end in `.js` (`./app.module.js`), as Node resolves them at runtime.

## Layering

STACK §3.1 layering, enforced by the `nest()` ESLint preset (`packages/config/README.md`) at
`--max-warnings=0`. File names decide the role:

- `*.controller.ts` and gateways are adapters: they call services and never touch Prisma.
- `*.service.ts` holds the business rules: it calls repositories and other services.
- `*.repository.ts` is the only place for Prisma queries and raw SQL, next to `src/core/prisma`.

A database health ping goes controller → service → an indicator in `src/core/prisma`, as
`modules/health` shows.

## Environment

`src/core/config/env.ts` validates the environment with zod at startup. A failure names the
variable and the rule, never the value, and the process exits 1.

| Variable       | Rule                                  | Default       |
| -------------- | ------------------------------------- | ------------- |
| `NODE_ENV`     | `development`, `test` or `production` | `development` |
| `API_PORT`     | integer 1–65535                       | `3001`        |
| `API_HOST`     | interface to bind; image: `0.0.0.0`   | `127.0.0.1`   |
| `DATABASE_URL` | `postgres://` or `postgresql://` URL  | required      |

An empty value counts as unset. In development the api reads the repo-root `.env` only, found from
the module's location rather than the current directory, so it works however the api is started.
There is no per-package `.env`: the api and the Prisma CLI always read the same file. Under
`NODE_ENV` `test` or `production` it reads no env file, only the process environment. The root
README lists every variable.

Host development and Prisma CLI commands use `DATABASE_URL` from the root `.env`, normally
pointing to `127.0.0.1:55432`. Compose explicitly sets the Docker API's `API_HOST=0.0.0.0`,
`API_PORT=3001` and `DATABASE_URL` using the `POSTGRES_*` credentials and `postgres:5432`.
The Docker API runs with `NODE_ENV=production`; it does not load `.env` itself or use the
host's `DATABASE_URL` and `API_PORT` values.

## Prisma 7

- `prisma/schema.prisma` uses the `prisma-client` generator (ESM, `.js` imports) and writes the
  client to `src/generated/prisma`, which is git-ignored. Turbo's `generate` task regenerates it
  before `build`, `typecheck`, `lint` and `test`, and `dev` runs `prisma generate` first.
- `prisma.config.ts` takes the URL from `process.env.DATABASE_URL`, so `prisma generate` works
  without a database. For `migrate`, `db` and `studio` with `DATABASE_URL` unset, it loads the
  repo-root `.env`, under the api's rule: never under `NODE_ENV` `test` or `production`, so there
  `DATABASE_URL` must be exported.
- The runtime connects through `@prisma/adapter-pg` (a `pg` pool). `PrismaService` never connects
  at startup; the first query does.
- Migrations: `pnpm db:migrate` (`prisma migrate deploy`) applies the committed ones; the README
  quick start and later deploys use it. `pnpm db:migrate:dev` (`prisma migrate dev`) creates a new
  migration after a schema change; it is interactive, so run it in a terminal.
- The first migration, `init`, only runs `CREATE EXTENSION IF NOT EXISTS vector`. Product tables
  arrive with their features.

## Health endpoints

- `GET /api/health`: liveness, no database. Returns `status: "ok"` and a nonempty `instanceId`
  provided by `src/modules/health/instance-id.provider.ts` using the hostname. In Docker this
  identifies the replica serving the request.
- `GET /api/health/ready`: readiness, Prisma `SELECT 1`; 503 with `database unreachable` when the
  database is down, without connection details. The cause goes to the server log as a value-free
  warning, for example `database readiness failed: P2010 AuthenticationFailed 28P01` (Prisma code,
  driver error kind, Postgres SQLSTATE).

The Compose healthcheck calls `/api/health` every 10 seconds, with a 5-second timeout,
3 retries and a 20-second start period. It checks liveness only; `/api/health/ready` also checks
the database. Traefik currently has no explicit active readiness probe configured.
An `unhealthy` status alone does not trigger `restart: unless-stopped`.

## Scripts

| Script           | What it does                                        |
| ---------------- | --------------------------------------------------- |
| `dev`            | `prisma generate`, then `nest start --watch`        |
| `build`          | `tsc -p tsconfig.build.json` into `dist/`           |
| `start`          | `node dist/main.js`                                 |
| `generate`       | `prisma generate`                                   |
| `db:migrate`     | `prisma migrate deploy` (committed migrations)      |
| `db:migrate:dev` | `prisma migrate dev` (new migration, interactive)   |
| `typecheck`      | `tsc --noEmit`                                      |
| `lint`           | ESLint with the `nest()` preset, `--max-warnings=0` |
| `test`           | `vitest run`                                        |

The root scripts `pnpm db:migrate` and `pnpm db:migrate:dev` forward to the two migrate scripts.

## Tests

Vitest 5 with `unplugin-swc`, because Nest's dependency injection needs decorator metadata, which
Vite's own transform drops. Unit specs sit next to the code as `*.spec.ts`; app-level e2e specs
live in `test/` as `*.e2e-spec.ts`. They boot the whole `AppModule` against an unreachable
database URL set in `vitest.config.ts`, so `pnpm test` never needs a database (CI has none).
Import `describe`/`it`/`expect` from `vitest` (no globals).

`test/health.e2e-spec.ts` checks that liveness returns 200 and uses Zod to validate
`status: "ok"` and a nonempty string `instanceId`. It also checks that readiness returns 503
without exposing database credentials or the host and port.
Run only these tests from the repo root with:

```sh
pnpm --filter @app/api exec vitest run test/health.e2e-spec.ts
```

## Image

`Dockerfile` builds from the repo root: a frozen pnpm install of `@app/api` and its workspace
dependencies, `prisma generate`, `tsc`, then `pnpm deploy --prod`. The runtime stage holds `dist`,
`package.json` and production `node_modules`, runs as uid 1000 and starts `node dist/main.js`. The
Prisma CLI stays a dev dependency; Phase 4 decides how migrations run in production.

The Docker API runs compiled code without hot reload. After API source changes, rebuild and
recreate the replicas from the repo root:

```sh
docker compose up -d --build api
```

Compose does not apply migrations automatically. Run `pnpm db:migrate` separately from the
host; the runtime image does not include the Prisma CLI.
