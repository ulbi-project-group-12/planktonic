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
pnpm --filter @app/contracts build
pnpm --filter @app/api generate
pnpm db:seed
```

`generate` writes the Prisma client to `src/generated/prisma` (git-ignored), which the seed
imports. `@app/contracts` is read from its built `dist/index.js` at runtime. Turbo builds
contracts and runs `generate` before `dev`, `build` and `test`, but `db:seed` and the commands
below that call vitest directly do not.
`pnpm db:seed` (`prisma db seed`, run by `tsx`) upserts one test user and one test channel,
`00000000-0000-7000-8000-000000000001`.

Then `pnpm dev` (web + api) or `pnpm --filter @app/api dev` (api only) runs it in watch mode on
http://127.0.0.1:3001/api. With the api running, try the messages endpoints:

```sh
curl -X POST -H 'content-type: application/json' \
  -d '{"clientMsgId":"019a8f00-0000-7000-8000-000000000004","body":"hello"}' \
  http://127.0.0.1:3001/api/channels/00000000-0000-7000-8000-000000000001/messages
curl http://127.0.0.1:3001/api/channels/00000000-0000-7000-8000-000000000001/messages
```

`GET` returns one page, oldest first, as `{ messages, hasMore }` (UL-130):

- no query: the newest `limit` messages; `hasMore` means older ones exist;
- `?afterSeq=<seq>`: the first `limit` messages with a greater `seq` (the client's catch-up after
  a reconnect); `hasMore` means it fell more than a page behind, and the client then reloads the
  newest page instead of paging forward;
- `?limit=` is `1..100`, default `100`. Both values are digits only (`1e2` or ` 7` are a 400),
  and `afterSeq` must fit a Postgres `bigint`. `hasMore` comes from reading one row past the page,
  not from a second query.

`POST` is idempotent (UL-126). `clientMsgId` is a UUIDv7 the client makes once per message and
sends again on every retry. A retry with a key the author already used returns the stored
message: same `id` and `seq`, `201` again, and nothing new is saved. The stored message wins
even if the retried `body` differs. The channel's `last_seq` does not move, because the
conflicting insert rolls back the transaction that took the number. Reusing a key in another
channel is a client bug and returns `409`. Run the `POST` above twice to see it.
`MessagesService.create` also returns `created` (`true` for the insert, `false` for a retry),
so the `message:new` broadcast (UL-127) goes out once.

Rows that existed before the migration got their own `id` as the key.

Two compiled replicas behind Traefik start only with the compose profile `realtime`:
`docker compose --profile realtime up -d --build`, then http://127.0.0.1:58080/api/health
(`TRAEFIK_PORT`). See the [root README](../../README.md#api-replicas-and-traefik-ul-123).

## Layout

```
src/main.ts               bootstrap: binds API_HOST:API_PORT, exits 1 on a startup failure
src/app.module.ts         root module: ConfigModule, PrismaModule, feature modules
src/app.setup.ts          configureApp(): global prefix `api`, shutdown hooks (also used by e2e)
src/core/config/          env schema (zod) and validation
src/core/prisma/          PrismaService, PrismaHealthIndicator, global PrismaModule
src/core/realtime/        Redis Streams IoAdapter and Redis connection lifecycle
src/modules/realtime/     Socket.IO gateway and server-managed debug room
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

| Variable         | Rule                                                 | Default       |
| ---------------- | ---------------------------------------------------- | ------------- |
| `NODE_ENV`       | `development`, `test` or `production`                | `development` |
| `API_PORT`       | integer 1–65535                                      | `3001`        |
| `API_HOST`       | interface to bind; image: `0.0.0.0`                  | `127.0.0.1`   |
| `DATABASE_URL`   | `postgres://` or `postgresql://` URL                 | required      |
| `REDIS_URL`      | Redis connection URL (`redis://` or `rediss://`)     | required      |
| `REALTIME_DEBUG` | `true` or `false`: diagnostic room and ping endpoint | `false`       |

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

The API uses `REDIS_URL` to connect to Redis Streams for cross-instance Socket.IO event delivery.
In Docker Compose, the API replicas use `redis://redis:6379`, while host-based development and
integration tests connect through `redis://127.0.0.1:56379`.

The Redis Streams adapter is configured before the HTTP server starts. Socket.IO uses the
`/socket.io` path, which is not affected by the global `/api` prefix. Connection State Recovery
remains disabled; missed messages will be retrieved through REST.

Rooms are assigned on the server only: there is no client `join` event. `RealtimeService` is the
emitter that services and controllers use; the gateway only binds the Socket.IO server and assigns
rooms. While `REALTIME_DEBUG=true` (always under `NODE_ENV=test`) every socket joins the
diagnostic room `debug`, and `POST /api/debug/realtime/ping` broadcasts `debug:ping` with
the sender's `instanceId` to it (202 with the same payload). While it is off the endpoint answers
404 and sockets join no room. The compose profile `realtime` turns it on; a deployment leaves it
unset.

On shutdown `RedisConnectionLifecycle` closes the publishing client within 5 seconds and destroys
it after that. It also tracks the adapter's read and sub duplicates and destroys any still open
once the publisher is done, so shutdown never waits on Redis longer than that deadline, even when a
duplicate is still connecting to an unreachable Redis.

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
- Models live in `prisma/schema/*.prisma` (one file per model). Names are `camelCase` in Prisma and
  `snake_case` in Postgres through `@@map`/`@map` (`channels.last_seq`), so raw SQL in a
  repository needs no quotes. Sequence counters (`seq`, `last_seq`) are `BigInt` and go over the
  wire as decimal strings (UL-212).
- Seed: `prisma/seed.ts`, run with `tsx`. Node 26's own TypeScript runner cannot load it: the
  generated client imports its siblings as `.js`, which exist only as `.ts`.

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
An `unhealthy` status alone does not trigger `restart: unless-stopped`. Phase 4 smoke-checks
`GET /api/health` on each replica after a deploy, and a load balancer can gate traffic on
`/api/health/ready` (D-12).

## Scripts

| Script             | What it does                                                    |
| ------------------ | --------------------------------------------------------------- |
| `dev`              | `prisma generate`, then `nest start --watch`                    |
| `build`            | `tsc -p tsconfig.build.json` into `dist/`                       |
| `start`            | `node dist/main.js`                                             |
| `generate`         | `prisma generate`                                               |
| `db:migrate`       | `prisma migrate deploy` (committed migrations)                  |
| `db:migrate:dev`   | `prisma migrate dev` (new migration, interactive)               |
| `db:seed`          | `prisma db seed` (test user and channel)                        |
| `typecheck`        | `tsc --noEmit`                                                  |
| `lint`             | ESLint with the `nest()` preset, `--max-warnings=0`             |
| `test`             | `vitest run`                                                    |
| `test:integration` | `vitest run` on `vitest.integration.config.ts` (needs services) |

The root scripts `pnpm db:migrate`, `pnpm db:migrate:dev` and `pnpm db:seed` forward to the api
scripts.

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
pnpm --filter @app/contracts build
pnpm --filter @app/api generate
pnpm --filter @app/api exec vitest run test/health.e2e-spec.ts
```

### Integration tests (real services)

Specs in `test/integration/` as `*.int-spec.ts` run against real Postgres and Redis.
`vitest.integration.config.ts` runs them one file at a time; `pnpm test` never does and needs no
services. Both URLs must be set: under `NODE_ENV` `test` nothing reads `.env`, and a missing
URL fails the run rather than skipping it.

The stand wipes both stores before every test, so it only accepts a database whose name ends with
`_test` and a Redis database other than 0. Use the compose services with their own test database
(`pnpm db:migrate` creates `app_test` on first run) and Redis database 1:

```sh
pnpm services:up
pnpm --filter @app/contracts build
pnpm --filter @app/api generate
DATABASE_URL=postgresql://app:app_dev_password@127.0.0.1:55432/app_test pnpm db:migrate
DATABASE_URL=postgresql://app:app_dev_password@127.0.0.1:55432/app_test \
REDIS_URL=redis://127.0.0.1:56379/1 pnpm --filter @app/api test:integration
```

The URLs are set per command, not exported, so a later `pnpm dev` or `pnpm db:migrate` in the
same shell still uses the dev database.

`generate` and the contracts build are needed because the specs import the git-ignored Prisma
client and `@app/contracts` (from its `dist`), and `test:integration` does not go through Turbo.
The host, ports and password are the `.env.example` defaults. In CI the `integration` job runs the
same commands against Postgres and Redis service containers.

#### The stand (`test/integration/support/`)

Every integration spec builds on one helper (UL-132), so realtime tests in later phases do not
grow their own copies:

```ts
const stand = useStand({ instances: ['test-api-1', 'test-api-2'] });

it('A on instance 1 sends, B on instance 2 receives message:new', async () => {
  const channelId = await createChannel(stand.prisma);
  const b = await stand.connect(stand.apps[1]!, 'B');
  const received = waitForEvent(b, MESSAGE_NEW_EVENT, { parse: MessageNewEvent.parse });
  await postMessage(stand.apps[0]!, channelId, 'hello');
  expect(await received).toMatchObject({ message: { body: 'hello' } });
});
```

- `useStand` registers its own hooks. `beforeAll` starts one full `AppModule` per entry of
  `instances` on port 0, with the Redis Streams adapter (`realtime: false` leaves the default
  adapter). Each app gets its instance id through `overrideProvider(INSTANCE_ID)`: in one process
  every app has the same `os.hostname()`, and `ConfigModule` caches one `process.env`.
- `startApp` returns once the app's Redis Streams reader is confirmed reading (watched with `MONITOR`), so an app started inside a
  test receives what other instances emit right away.
- `beforeEach` truncates every table except Prisma's migration history, seeds the placeholder
  author and flushes the Redis database. Before the first write the stand also checks what the
  servers report (`current_database()`, the Redis connection's database), not only the URLs.
  Arrange data inside the test (or a spec `beforeEach`), not in a spec `beforeAll`: the reset
  wipes it.
- Apps and clients started inside a test (`stand.startApp`, `stand.connect`) are closed after that
  test; those from `beforeAll` after the file. Teardown goes clients → apps → Redis → Prisma.
- `stand.prisma` and `stand.redis` are for arranging and checking data.
- `waitForEvent(client, event, { timeoutMs, parse, match })` waits for the event itself, never a
  timer, and fails with the event, the client label and its instance:
  `Timed out after 5000 ms waiting for "message:new" on client "B" (instance test-api-2)`. It also
  fails at once if the client disconnects. `recordEvents` keeps the full list for tests that prove
  "this and nothing else" with a control event, and `waitForCount(n)` says how many arrived.
- `support/http.ts` has `createChannel`, `postMessage` and `getMessages`.
- The stand's hooks run around the spec's own (Vitest's `stack` order). A spec `afterEach` or
  `afterAll` that throws stops the hooks after it, the stand's cleanup included, so keep them
  from throwing.
- Redis database 1 separates keys and the stream, not pub/sub channels, which Redis shares across
  databases. Stop a local `pnpm dev` api while the suite runs, or its adapter may answer the test
  apps' cluster requests.

The specs:

- `stand.int-spec.ts` checks the stand itself: explicit instance ids, the reset, teardown, the
  store guards and the error texts.
- `messages.int-spec.ts` (UL-125, UL-126): 20 parallel POSTs to one channel get `seq` 1..20 with
  no gaps and no duplicates; retries with the same `clientMsgId`, also racing, make one row.
- `message-new.int-spec.ts` (UL-127, UL-132): a message sent on instance 1 reaches the client on
  instance 2 as `message:new` after the commit, and nothing is published for a rollback, a retry or
  a missing channel.
- `catch-up.int-spec.ts` (UL-130): `afterSeq`/`limit` pages and `hasMore` at the limit boundary;
  then a client that missed five messages while disconnected runs the web client's own `catchUp`
  (`@app/contracts`) over HTTP and gets all five once, in order, and `hasMore` resets it to the
  newest page.
- `realtime.int-spec.ts` (UL-124): without the Redis Streams adapter a broadcast stays on its app;
  with it, a broadcast from either app reaches both, `POST /api/debug/realtime/ping` crosses
  instances, a socket outside the room gets nothing, and `app.close()` leaves no Redis connection.

#### Manual check on two replicas

```sh
docker compose --profile realtime up -d --build --wait
```

Connect two Socket.IO clients to `http://127.0.0.1:58080` without sharing cookies, so the `io_srv`
cookie puts them on different replicas, then
`curl -X POST http://127.0.0.1:58080/api/debug/realtime/ping`. The answer names the replica that
emitted, and both clients receive `debug:ping` with that `instanceId`.

## Image

`Dockerfile` builds from the repo root: a frozen pnpm install of `@app/api` and its workspace
dependencies, `prisma generate`, `tsc`, then `pnpm deploy --prod`. The runtime stage holds `dist`,
`package.json` and production `node_modules`, runs as uid 1000 and starts `node dist/main.js`. The
Prisma CLI stays a dev dependency; Phase 4 decides how migrations run in production.

The Docker API runs compiled code without hot reload. After API source changes, rebuild and
recreate the replicas from the repo root:

```sh
docker compose --profile realtime up -d --build api
```

Compose does not apply migrations automatically. Run `pnpm db:migrate` separately from the
host; the runtime image does not include the Prisma CLI.
