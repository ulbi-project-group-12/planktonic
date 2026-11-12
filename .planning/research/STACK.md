# Slack analog: reference architecture and pinned stack

*Research synthesis, 8 November 2026, for ulbi-project-group-12 (Ulbi TV stream 3). Audience: the team lead and the module owners. The stack follows the spec's recommendations. A component is replaced only where the spec's own requirements or the state of the tool in November 2026 force it, and each such deviation is marked **Deviation** with its reason.*

**How to read the evidence.** Each section ends with a confidence level:
- **High:** verified against primary docs or the npm registry today, or passed a 3-of-3 adversarial check in the deep-research run.
- **Medium:** one good source or a well-supported design inference.
- **Low:** a reasoned guess. Spike it before relying on it.

Source shorthand:
- [SPEC] `sources/tz-slack-analog.md`
- [RT] `research_notes/Slack analog delivery plan/realtime_messaging_architecture.md`
- [SAFI] `…/search_ai_files_integrations.md`
- [DPP] `…/delivery_plan_and_process.md`
- [RUS] `…/russia_stack_availability.md`
- [TRK] `project-tracker/docs/ARCHITECTURE.md`, the team tracker, live at ulbi.soadap.com
- [NPM] `npm view` / GitHub releases API, queried 2026-11-08
- [DR-A] the deep-research Run A, with claims verified 3-0 unless a vote is given

---

## 0. The decisions in one screen

| # | Decision | Why | Confidence |
|---|---|---|---|
| 1 | **pnpm workspaces + Turborepo**, with `apps/web` (Next.js), `apps/api` (NestJS: an HTTP+WS entry point and a worker entry point), `packages/contracts` (zod schemas + socket event maps), `packages/config` | One contract package stops FE/BE drift. Turborepo caches the four required CI checks | High |
| 2 | **Node 26 LTS, TypeScript 6.0.3** (not 7.x) | NestJS 12 has a TS 6 peer. typescript-eslint 8.72 supports TS `<6.1` only [NPM] | High |
| 3 | **Prisma 7.10.1** with `@prisma/adapter-pg`. The npm `latest` tag of `prisma` points to **8.0.0-rc.33**, so pin `7.10.1` explicitly | Readable schema for juniors. A driver adapter and an explicit generator output are now mandatory [DR-A] | High |
| 4 | **Send over REST, push over Socket.IO.** A server-assigned per-channel `seq` gives order. A client `clientMsgId` + unique index gives idempotency. Catch-up is `GET …/messages?afterSeq=` | Socket.IO delivery is at most once, and the socket is not storage [SPEC] | High |
| 5 | **`@socket.io/redis-streams-adapter` 0.3.1 with Connection State Recovery off.** Sticky cookie at **Traefik** | Survives Redis blips. Recovery can replay a private channel to a member removed while offline [RT §6] | High (adapter), Medium (CSR-off rationale) |
| 6 | **One `AccessService`** used by HTTP guards, WS joins and events, search SQL, file downloads, AI retrieval and GitHub data | The spec requires ACL "not only in HTTP" | High |
| 7 | **PostgreSQL 18 FTS** (tsvector + GIN + pg_trgm) for search. **pgvector 0.8.x** with in-query ACL filters and `hnsw.iterative_scan` for AI | No second datastore to sync on edit or delete | High |
| 8 | **AI through the `openai` npm package** with `OPENAI_BASE_URL`/model names from env. All generation runs in BullMQ workers. AI output is always a draft | Required by [SPEC]. Keeps the provider swappable | High |
| 9 | **GitHub App** (not an OAuth app or a PAT). HMAC over `rawBody`, dedupe on `X-GitHub-Delivery`, 2xx within 10 s, work in BullMQ | Per-repo grants, 1-hour installation tokens, one webhook | High |
| 10 | **BullMQ 6** Job Schedulers (`upsertJobScheduler` + `tz`) and `deduplication`. v6 removed repeatable jobs and `debounce` | Retry-safe reminders, webhooks and AI jobs [DR-A] | High |
| 11 | **S3 API everywhere** (`@aws-sdk/client-s3`). **Deviation:** SeaweedFS or Garage instead of MinIO for the local and self-hosted store | MinIO CE stopped shipping images in Oct 2025 and is archived [RUS] | High |
| 12 | **Grafana Alloy** replaces Promtail. Plus Loki, Prometheus, Grafana, node_exporter, cAdvisor. **Deviation**, to be confirmed with the organizer | Promtail is EOL since 2026-03-02 [SAFI], [DR-A] | High |
| 13 | **Sentry SDKs** (`@sentry/nextjs`, `@sentry/nestjs` 11.11.0). The backend is **self-hosted GlitchTip** (spec-allowed) | Same SDK either way. GlitchTip has no seat limit and sits next to the Grafana stack | Medium |
| 14 | **Trunk-based, protected `main`, release = cut `release/x.y` → publish a GitHub Release**. The `release: published` workflow builds images to GHCR, migrates and rolls out `api ×2` | The spec's release button, done literally | High |

---

## 1. Requirements that shape the architecture

These are taken from [SPEC]. Each one has an owner section below.

- **Several backend instances in prod**, with chat explicitly tested across instances (§4, §13).
- **No lost, duplicated or reordered messages.** Retry after a network error must not duplicate. History lives in the DB (§4).
- **Reconnect delivers what was missed.** Read ≠ received. Reading in one tab updates the others. Closing one tab must not show the user as offline (§4).
- **ACL in WS events, search, file downloads and AI.** A member removed from a private channel stops receiving its messages on an open socket. A private file link must not be downloadable by anyone with the URL (§2.3, §4.6, §5, §6, §8).
- **Webhooks, reminders and auto-transitions are safe to re-run** (§7, §9).
- **Heavy work runs in background jobs:** file processing, search preparation, AI (§9).
- **Limits** on file size, message rate and AI requests (§4.7, §6, §8).
- **No integration tokens or private message bodies in logs** (§12).
- **Linting with an FSD rule linter, CI on every PR** (lint, tests, build, typecheck), **release by branch cut + GitHub Release button**, containerized deploy, secrets in GitHub (§13).
- **FE quality:** a channel with thousands of messages must not hang, scrolling must not jump when a new message arrives, failed actions must show the true state and allow retry, concurrent kanban moves must not lose cards, and UI state, server data and socket state must have clear owners (§3.3, §4.8).

---

## 2. System overview

```
Browser (Next.js app, one origin: https://app.<domain>)
   │  HTTPS: /            → web (Next.js standalone, SSR shell + client chat)
   │  HTTPS: /api/*       → api   (REST, Swagger at /api/docs in non-prod)
   │  WSS:   /socket.io/* → api   (sticky cookie at Traefik)
   ▼
Traefik v3 (TLS, Let's Encrypt, sticky cookie for api, rate limit at the edge)
   ├── web ×1–2
   ├── api ×2+  (NestJS 12: REST + Socket.IO gateway; Redis Streams adapter)
   └── (internal only) worker ×1–2 (same NestJS codebase, worker entry point: BullMQ processors)
Data:  postgres 18 + pgvector   redis 8 (adapter streams, BullMQ, presence, rate limits, caches)
       s3 (SeaweedFS/Garage container, or a managed S3)
Integrations: GitHub App webhooks → api → BullMQ → worker;  Telegram Bot API ← worker (grammY)
              LLM / embeddings (OpenAI-compatible HTTP) ← worker only
Observability: alloy → loki;  prometheus ← api/worker /metrics, node_exporter, cadvisor;  grafana;  glitchtip
Optional ★: livekit-server (host network) + TURN/TLS 443
```

**One origin for web and API.** Routing `/api` and `/socket.io` to the api service on the same host has three benefits:
- CORS disappears.
- The refresh-token cookie can be `httpOnly; SameSite=Strict; Path=/api/auth`.
- The socket connects to the page's own origin.

Inference, medium.

### 2.1 Auth
- Use in-house JWTs: a short-lived access token (≈15 min, sent as a bearer header and in the socket `auth`) and a rotating refresh token in an httpOnly cookie with a server-side denylist. Libraries: `@nestjs/jwt` 12.0.4 and `argon2` 0.45.2 [NPM].
- The team tracker already runs this exact pattern (access + single-use refresh with a denylist, `token_version` bump to kill sessions) and can be read as a reference [TRK, "Sessions", ADR 0012].
- The socket handshake uses `io(url, { auth: cb => cb({ token }) })`. The callback form lets a reconnect pick up a refreshed token [RT §6].

### 2.2 Roles
- **Workspace:** `OWNER | ADMIN | MEMBER`. **Project:** `ADMIN | MEMBER`.
- **Channel:** `PUBLIC` is visible to project members. `PRIVATE`, `DM` and `GROUP` are visible to `channel_members` only.

Suggested matrix, for the lead to fix in an ADR in W1:

| Action | Owner | WS Admin | Project Admin | Member |
|---|---|---|---|---|
| Invite / remove / change role in workspace, revoke invite | ✓ | ✓ (not owners) | – | – |
| Create project | ✓ | ✓ | – | configurable flag |
| Edit project, connect GitHub repo, configure standups | ✓ | ✓ | ✓ | – |
| Create public channel | ✓ | ✓ | ✓ | ✓ |
| Create private channel, invite to it | ✓ | ✓ | ✓ | ✓ (becomes its admin) |
| Archive / rename channel | ✓ | ✓ | ✓ | channel creator |
| Delete others' messages, pin | ✓ | ✓ | ✓ | pin: ✓, delete: own only |

### 2.3 AccessService: one ACL code path
`AccessService` lives in `apps/api/src/core/access`. It is the only place that answers these questions:
- `listReadableChannelIds(userId, workspaceId)`
- `assertCanRead(userId, channelId)`
- `assertCanWrite(userId, channelId)`
- `canSeeRepo(userId, projectRepoId)`
- `assertProjectRole(userId, projectId, role)`

It is backed by a short-TTL Redis cache. The cache is invalidated on any membership change through `serverSideEmit('acl:invalidate', …)` [RT §6], [SAFI §1].

Slack states the property worth copying: AI search "will never surface any results to the user that standard search would not". Search and AI therefore share this function [SAFI §1]. Confidence: high (principle), medium (API shape).

---

## 3. Monorepo layout and module boundaries

```
/                         pnpm-workspace.yaml, turbo.json, .github/, docker/, infra/, docs/adr/
apps/web                  Next.js 16 App Router + FSD
  app/                    routing only; files re-export from src/_pages (FSD guide)
  src/_app/               providers (QueryClient, SocketProvider, Theme), global css, api-routes segment
  src/_pages/             workspace-home, channel, task, board, my-work, decisions, standups, settings, landing
  src/widgets/            channel-view, thread-panel, sidebar, kanban-board, task-card, notification-center, ai-panel
  src/features/           send-message, edit-message, react, pin, save, create-task-from-message, move-task,
                          connect-repo, mark-read, search-messages, ask-ai, save-decision, answer-standup
  src/entities/           user, workspace, project, channel, message, task, decision, standup, notification, pull-request
  src/shared/             ui (shadcn), api (http client, socket singleton), lib, config, i18n
apps/api                  NestJS 12 (ESM)
  src/main.ts             HTTP + Socket.IO entry point (producers only)
  src/worker.ts           NestFactory.createApplicationContext(WorkerModule): BullMQ processors
  src/core/               config, prisma, auth, access, realtime (gateway, publisher, presence), queue, outbox,
                          logging, metrics, rate-limit, errors
  src/modules/            workspaces, projects, channels, messages, threads, reactions, pins, saved, files,
                          search, tasks, boards, github, standups, decisions, notifications, telegram, ai, voice
  prisma/                 schema.prisma, migrations/ (raw SQL for tsvector, pgvector, partial indexes)
packages/contracts        zod schemas (DTOs), error codes, permission enum, socket event maps, limits constants
packages/config           eslint flat presets (base/next/nest), tsconfig bases, prettier, steiger config
```

Notes on the layout:
- **No `packages/ui`.** shadcn components are copied source and belong in `apps/web/src/shared/ui`. A separate package only adds a build step.
- **No separate `apps/worker` app.** A second entry point of the same NestJS app shares modules without duplication. Processors are registered only in `WorkerModule`, so API instances never consume jobs [SAFI §4]. Confidence: medium.

### 3.1 NestJS layering
- Each module has `*.controller.ts` (HTTP adapter only), `*.gateway-handlers.ts` (WS adapter only), `*.service.ts` (business rules) and `*.repository.ts` (Prisma access, the only place that writes raw SQL).
- Services publish realtime events through `RealtimePublisher` (§4.2) and enqueue side effects through `OutboxService` (§4.3).
- CODEOWNERS on `src/core/**` and `prisma/**` gives the BE owners the review gate [DPP §4].

The tracker enforces the same "routers are adapters, services own rules" split with a layering test (`test_layering.py`). That is worth copying as an `eslint-plugin-boundaries` or dependency-cruiser rule [TRK, Rules].

### 3.2 FSD in the Next.js App Router
- The official guide applies: keep the root `app/` for routing, rename the FSD layers to `_app`/`_pages`, give every slice an `index.ts` public API, and use `index.server.ts` for server-only exports [DPP §5].
- Steiger 0.9.0 + `@feature-sliced/steiger-plugin` 0.8.2 is the spec's "FSD linter". The project is beta, so pin exact versions [NPM].
- The tracker has the same FSD layout and admits FSD boundary lint is not enforced there [TRK, Known gaps]. The product should make Steiger a required check from day 1.

### 3.3 State ownership in the frontend (the spec's "clear zones of responsibility")
- **Server data → TanStack Query 5.** Messages are kept as `useInfiniteQuery(['messages', channelId])`, patched by socket events.
- **UI state → Zustand 5:** thread panel, drafts, the frozen unread divider, the "N new" pill.
- **Transport state → a socket singleton** (`shared/api/socket.ts`, `autoConnect: false`, typed events) plus a `useConnectionStore` (`connecting | connected | reconnecting | syncing | offline`) written only by socket lifecycle listeners.
- No server entities in Zustand [RT §8]. Confidence: high.

### 3.4 Contracts (FE never waits for BE)
- `packages/contracts` exports:
  - zod schemas for every request and response DTO;
  - `ServerToClientEvents` / `ClientToServerEvents` maps, used as `Server<…>` on Nest and `Socket<…>` on the client with the generics reversed;
  - error codes;
  - limits (message length, file size).
- **Validation in Nest:** a ~30-line in-house `ZodValidationPipe`. **Deviation:** `nestjs-zod` 5.5.0 declares peers `@nestjs/common ^10 || ^11` and does not support NestJS 12 yet [NPM].
- **Swagger:** `@nestjs/swagger` 12.1.1 with schemas from zod 4's native `z.toJSONSchema()` through a small `@ZodBody()` decorator. Spike this in W1; the fallback is class-validator DTOs mirrored from zod.
- **Mocks:** CI exports `openapi.json`, and **Orval** 8.47.0 generates TanStack Query hooks and **MSW** handlers for FE work against mocks. Realtime mocks are hand-written from the event map [DR-B: socket.io TS docs, Orval MSW guide].
- Confidence: high for the typed events and Orval → MSW, medium for the zod → Swagger bridge.

---

## 4. Realtime across several instances

### 4.1 Transport and fan-out
- **Adapter: `@socket.io/redis-streams-adapter` 0.3.1** (published 2026-03-12). It reads one Redis stream with XREAD, survives temporary Redis disconnections without losing packets, works with Valkey, and trims at `maxLen` (default 10,000) [DR-A], [RT §1].
  - The classic `@socket.io/redis-adapter` 8.3.0 was last published 2024-03-13 and drops cross-instance packets during a Redis blip.
  - Both adapters send unsigned, unencrypted packets, so Redis must stay on the internal network.
- **Sticky sessions are mandatory** while long-polling is enabled (the default). Without them you get HTTP 400s [DR-A].
  - Use a **Traefik sticky cookie** (`loadBalancer.sticky.cookie.name=io_srv`). It spreads load more evenly than `hash $remote_addr` behind carrier NAT and works with compose `deploy.replicas: 2` without listing upstreams.
  - Set the idle timeout above `pingInterval + pingTimeout` (45 s default) [RT §1].
  - Keep long-polling as a fallback (don't force `transports:['websocket']`). It costs nothing here and helps on restrictive networks.
- **NestJS wiring:** an `IoAdapter` subclass whose `createIOServer` attaches the adapter, then `app.useWebSocketAdapter(...)` [RT §1].
- **Rooms:** `user:{id}`, `channel:{id}` (DMs and group DMs are channels), `project:{id}` (board and task events), `workspace:{id}` (presence, directory changes).
  - Rooms are joined server-side in the connection handler from DB membership.
  - There is never a client-driven "join room X" [RT §1].

### 4.2 Emitting from workers
Workers need to emit too: AI progress, file `ready` and GitHub PR updates.
- `@socket.io/redis-emitter` 5.1.0 is documented for the classic adapter. Its compatibility with the Streams adapter is **not verified** [RT §1].
- **Recommended design:** `RealtimePublisher` has two implementations.
  - In `api` it calls `server.to(room).emit(...)`.
  - In `worker` it `PUBLISH`es `{room, event, payload}` to a Redis channel `rt:relay`.
  - Every api instance subscribes to `rt:relay` and re-emits with `server.local.to(room).emit(...)`, so each instance delivers to its own sockets only and nothing is duplicated.
- **Fallback, if the team prefers zero custom code:** the classic adapter + `redis-emitter`. Correctness doesn't depend on the adapter, because clients self-heal through seq gaps. Confidence: medium.

### 4.3 Ordering and idempotent send
- **Order:** `channels.last_seq` is incremented in the same transaction as the insert: `UPDATE channels SET last_seq = last_seq + 1 … RETURNING`. This gives a gap-free per-channel `seq`, so a client holding 41 that receives 43 knows to fetch.
  - Never order by client time or UUIDv7.
  - Thread replies get `thread_seq` and no channel `seq` [RT §2].
- **Idempotency:** the composer creates `clientMsgId = uuidv7()` once per message (not per retry).
  - `POST /channels/:id/messages {clientMsgId, body, attachmentIds}` → `INSERT … ON CONFLICT (author_id, client_msg_id) DO NOTHING RETURNING *`, falling back to `SELECT` (Prisma: catch `P2002`).
  - The response is the canonical message every time [RT §2].
- **Commit, then emit:** `message:new {message, clientMsgId}` goes to `channel:{id}` only after the transaction commits.
  - Durable side effects (mention notifications, search/AI indexing, task automations) are written as `outbox` rows in the same transaction and relayed to BullMQ with `jobId = outbox.id`.
  - Live fan-out needs no outbox: a lost broadcast is healed by the seq gap or the reconnect [RT §3].
- **Client:** an optimistic `{clientMsgId, status:'pending'}` in the last page. The ack or the broadcast replaces it, whichever arrives first, and the other is a no-op.
  - On timeout or 5xx → `failed` with Retry, using the same key.
  - On 4xx → `failed` with a reason and no auto-retry.
  - Unsent messages are persisted to IndexedDB so a reload re-offers them [RT §2].
- Confidence: high.

### 4.4 Reconnect catch-up
- **Connection State Recovery stays off.**
  - The docs call it best-effort: "the recovery will not always be successful".
  - It restores stored rooms and replays packets, which can leak a private channel's messages to a user removed while disconnected.
  - It also needs `skipMiddlewares:false` to keep auth on [DR-A], [RT §3, §6].
  - Revisit only with a test proving the removed-member case is safe.
- **Algorithm:**
  1. On `connect`, the server re-joins rooms from the DB.
  2. The client sets the connection state to `syncing` and, for each cached channel, calls `GET /channels/:id/messages?afterSeq=<max>&limit=100`. If `hasMore`, it drops the cache and loads the latest page with a "jump to latest" prompt.
  3. It invalidates the channel list (unread and mention counts), the open channel's pages (to pick up edits and deletes) and presence.
  4. It sets the state to `connected`.
  5. It dedupes incoming events by `id`/`clientMsgId` and ignores seqs it already has [RT §3].
- Confidence: high.

### 4.5 Unread, mentions, cross-tab, presence, typing
- **Unread** = `channels.last_seq − channel_members.last_read_seq`.
  - Mentions live in a `mentions` table counted above `last_read_seq`.
  - A sender's own message advances their own `last_read_seq` [RT §4].
- **Read ≠ delivered.** Read fires only when the channel is open, the tab is visible and focused, and the message has entered the viewport.
  - It is debounced to 1 s, then `POST /channels/:id/read {seq}`.
  - The server runs `GREATEST(last_read_seq,$seq)` (monotonic and idempotent) and emits `read:updated` to `user:{id}`.
  - That syncs every tab and device across instances. `BroadcastChannel` is optional polish, not correctness [RT §4].
- **Jump to first unread:** `first_unread_seq = last_read_seq+1`, fetched via `?aroundSeq=` with paging in both directions. The "New messages" divider is frozen at channel open.
- **Presence:**
  - A Redis ZSET `presence:user:{id}` of socketIds scored by expiry, refreshed by a ~25 s heartbeat.
  - The user is online if at least one live entry exists. Offline is emitted after a 10 s grace period, which stops reload flicker.
  - A 30 s sweeper clears the entries of crashed instances.
  - Closing one tab leaves the user online if another tab is open [RT §5].
- **Typing:** `volatile` emit to the channel room excluding the sender, throttled to 1 per 3 s, expired client-side after ~5 s, never stored [RT §5].
- Confidence: high (unread and read), medium (presence design, synthesized).

### 4.6 WS authorization and revocation
- **Handshake:** JWT verified in `server.use()` middleware, not in `handleConnection` guards (Nest doesn't document guards for it).
- **Per-event checks:** a gateway-scoped membership guard backed by the AccessService cache.
- **Removal from a channel** is a fixed sequence:
  1. Commit the change.
  2. Run `server.in('user:'+uid).socketsLeave('channel:'+cid)`, which works cluster-wide through the adapter.
  3. Emit `channel:removed` to `user:{uid}`.
  4. Invalidate the ACL cache.
- The same flow applies to workspace removal [RT §6].
- **Test:** two Nest apps on two ports sharing Redis. A on app 1 and B on app 2 receive each other's messages, and B stops receiving after removal while still connected [RT §1]. This is the spec's cross-instance check as a CI test.
- Confidence: high.

### 4.7 Rate limits
- **Per user, stored in Redis** so limits hold across instances.
  - `@nestjs/throttler` 6.7.1 supports Nest 12.
  - `@nest-lab/throttler-storage-redis` 1.2.0 declares Nest `^11` only [NPM]. Use `rate-limiter-flexible` 11.4.0 (`RateLimiterRedis`) in a small guard for both REST and WS, or write a Redis `ThrottlerStorage`.
- **Starting values:**
  - send: 5 per 5 s and 60 per minute;
  - edits: 10 per minute;
  - reactions: 20 per 10 s;
  - typing: 1 per 2 s, dropped silently;
  - mark-read: 10 per 10 s;
  - AI: 10 requests per 10 minutes plus a daily token budget.
- **Errors** carry `{code:'RATE_LIMITED', retryAfterMs}` so the UI shows a retryable failed state.
- Set `maxHttpBufferSize` explicitly to ~64 KB. Message body ≤ 4,000–10,000 characters, as a constant in `contracts` [RT §10].
- Confidence: medium.

### 4.8 Long channels and scroll
- **Library choice:**
  - Prefer **react-virtuoso 4.18.20** (`firstItemIndex`, `startReached`, `followOutput`).
  - Alternative: **@tanstack/react-virtual 3.14.26** with the chat mode `anchorTo:'end'`, which arrived in 3.14.0 in June 2026 [NPM]. Spike it on 5,000 messages first.
  - Don't buy the commercial `@virtuoso.dev/message-list` [RT §8].
- **Scroll rules:**
  - Auto-follow only when at the bottom or for one's own send; otherwise show a "↓ N new" pill.
  - Never scroll to the bottom on a refetch.
  - Reserve image dimensions from stored `width`/`height` so images loading late don't shift the list.
  - Bound the cache with `maxPages`.
- Confidence: medium.

### 4.9 Message formatting
- Store a Markdown subset: bold, italic, lists, links, inline code and code blocks.
- Render with `react-markdown` 10.1.0 + `remark-gfm` 4.0.1 + `rehype-sanitize` 6.0.0. Raw HTML is disabled and links get `rel="noopener noreferrer"`.
- Keep a plain-text projection (`body_text`) for search and AI.
- A Tiptap 3 rich composer is optional polish. Start with a textarea and a Markdown toolbar.
- Confidence: medium.

---

## 5. Data model (Prisma 7 sketch)

The schema is condensed to show keys, relations and constraints. Raw SQL migrations add `tsvector` columns, `vector` columns, partial unique indexes and HNSW indexes, all declared as `Unsupported(...)` in Prisma [SAFI §1–2].

```prisma
generator client { provider = "prisma-client"; output = "../src/generated/prisma" } // output is mandatory in v7
datasource db   { provider = "postgresql" }  // URL comes from prisma.config.ts; client built with @prisma/adapter-pg

model User { id String @id @db.Uuid @default(dbgenerated("uuidv7()")); email String @unique; name String
  passwordHash String; tz String @default("Europe/Moscow"); workHours Json?; dndUntil DateTime?
  tokenVersion Int @default(0); telegramChatId BigInt? @unique; githubLogin String?; createdAt DateTime @default(now()) }

model Workspace { id String @id @db.Uuid; name String; slug String @unique; ownerId String @db.Uuid; createdAt DateTime @default(now()) }
model WorkspaceMember { workspaceId String @db.Uuid; userId String @db.Uuid; role WsRole /*OWNER|ADMIN|MEMBER*/
  joinedAt DateTime @default(now()); @@id([workspaceId, userId]) }
model Invite { id String @id @db.Uuid; workspaceId String @db.Uuid; email String?; tokenHash String @unique
  role WsRole; invitedById String @db.Uuid; expiresAt DateTime; acceptedAt DateTime?; revokedAt DateTime? }

model Project { id String @id @db.Uuid; workspaceId String @db.Uuid; key String /*e.g. WEB*/; name String
  description String?; taskSeq Int @default(0); archivedAt DateTime?; @@unique([workspaceId, key]) }
model ProjectMember { projectId String @db.Uuid; userId String @db.Uuid; role ProjectRole /*ADMIN|MEMBER*/; @@id([projectId, userId]) }

model Channel { id String @id @db.Uuid; workspaceId String @db.Uuid; projectId String? @db.Uuid
  type ChannelType /*PUBLIC|PRIVATE|DM|GROUP*/; name String?; description String?
  lastSeq BigInt @default(0); archivedAt DateTime?; createdById String @db.Uuid; dmKey String? @unique /*sorted user ids for DMs*/ }
model ChannelMember { channelId String @db.Uuid; userId String @db.Uuid; role ChannelRole @default(MEMBER)
  lastReadSeq BigInt @default(0); lastReadAt DateTime?; notifyLevel NotifyLevel @default(DEFAULT); muted Boolean @default(false)
  @@id([channelId, userId]) }

model Message { id String @id @db.Uuid @default(dbgenerated("uuidv7()")); channelId String @db.Uuid; authorId String @db.Uuid
  clientMsgId String @db.Uuid; seq BigInt? /*top-level only*/; parentId String? @db.Uuid; threadSeq Int?
  body String; bodyText String; editedAt DateTime?; deletedAt DateTime?; version Int @default(1)
  replyCount Int @default(0); lastReplyAt DateTime?; replyUserIds String[] @db.Uuid
  kind MessageKind @default(USER) /*USER|SYSTEM|GITHUB|STANDUP|AI_SUMMARY*/; createdAt DateTime @default(now())
  // search_tsv tsvector GENERATED ... STORED  (raw SQL)  + GIN; pg_trgm GIN on body_text
  @@unique([authorId, clientMsgId]) @@index([channelId, seq(sort: Desc)]) @@index([parentId, threadSeq]) }
  // raw SQL: CREATE UNIQUE INDEX ON messages(channel_id, seq) WHERE seq IS NOT NULL;
model Mention { userId String @db.Uuid; messageId String @db.Uuid; channelId String @db.Uuid; seq BigInt?; kind MentionKind
  @@id([userId, messageId]) @@index([userId, channelId, seq]) }
model ThreadSubscription { userId String @db.Uuid; rootId String @db.Uuid; lastReadThreadSeq Int @default(0); @@id([userId, rootId]) }
model Reaction { messageId String @db.Uuid; userId String @db.Uuid; emoji String; createdAt DateTime @default(now()); @@id([messageId, userId, emoji]) }
model Pin { channelId String @db.Uuid; messageId String @db.Uuid; pinnedById String @db.Uuid; pinnedAt DateTime @default(now()); @@id([channelId, messageId]) }
model SavedMessage { userId String @db.Uuid; messageId String @db.Uuid; createdAt DateTime @default(now()); @@id([userId, messageId]) }

model File { id String @id @db.Uuid; workspaceId String @db.Uuid; uploaderId String @db.Uuid; storageKey String @unique
  originalName String; mime String; sizeBytes Int; width Int?; height Int?; status FileStatus /*PENDING|READY|REJECTED*/
  thumbKey String?; previewKey String?; createdAt DateTime @default(now()) }
model Attachment { fileId String @db.Uuid; messageId String? @db.Uuid; taskId String? @db.Uuid; @@id([fileId]) } // exactly one owner

model BoardColumn { id String @id @db.Uuid; projectId String @db.Uuid; name String; category ColumnCategory /*TODO|IN_PROGRESS|REVIEW|DONE*/
  position String /*fractional key*/; wipLimit Int?; @@index([projectId, position]) }
model Task { id String @id @db.Uuid; projectId String @db.Uuid; number Int /*key = project.key-number*/; title String; description String?
  authorId String @db.Uuid; assigneeId String? @db.Uuid; columnId String @db.Uuid; position String /*fractional key*/
  priority Priority; dueAt DateTime?; blockedReason String?; sourceMessageId String? @db.Uuid; threadRootId String? @db.Uuid
  version Int @default(1); createdAt DateTime @default(now()); updatedAt DateTime @updatedAt
  @@unique([projectId, number]) @@index([columnId, position]) @@index([assigneeId]) }
model ChecklistItem { id String @id @db.Uuid; taskId String @db.Uuid; text String; done Boolean @default(false); position String }
model TaskEvent { id BigInt @id @default(autoincrement()); taskId String @db.Uuid; actorType ActorType /*USER|GITHUB|SYSTEM*/
  actorId String? @db.Uuid; kind String /*STATUS|ASSIGNEE|DUE|DESCRIPTION|BLOCKED|PR_LINKED...*/; before Json?; after Json?
  deliveryId String?; createdAt DateTime @default(now()); @@index([taskId, id]) }
model TaskMessageLink { taskId String @db.Uuid; messageId String @db.Uuid; @@id([taskId, messageId]) }

model Decision { id String @id @db.Uuid; projectId String @db.Uuid; title String; body String; authorId String @db.Uuid
  sourceMessageId String? @db.Uuid; sourceThreadRootId String? @db.Uuid; status DecisionStatus /*ACTIVE|SUPERSEDED*/
  supersedesId String? @unique @db.Uuid; supersedeReason String?; createdAt DateTime @default(now()) }
model DecisionTask { decisionId String @db.Uuid; taskId String @db.Uuid; @@id([decisionId, taskId]) }

model StandupConfig { id String @id @db.Uuid; projectId String @db.Uuid; channelId String @db.Uuid; questions Json
  localTime String /*HH:mm*/; days Int[]; tz String; closeAfterMin Int @default(240); enabled Boolean @default(true) }
model StandupRun { id String @id @db.Uuid; configId String @db.Uuid; localDate String; threadRootId String? @db.Uuid
  summaryRequestId String? @db.Uuid; @@unique([configId, localDate]) }
model StandupAnswer { runId String @db.Uuid; userId String @db.Uuid; answers Json; messageId String @db.Uuid; @@id([runId, userId]) }

model Notification { id String @id @db.Uuid; userId String @db.Uuid; type String; entityType String; entityId String
  workspaceId String @db.Uuid; payload Json; dedupeKey String; groupKey String?; createdAt DateTime @default(now()); readAt DateTime?
  @@unique([userId, dedupeKey]) @@index([userId, readAt, createdAt]) }
model NotificationPref { userId String @db.Uuid; scopeType String /*WORKSPACE|PROJECT|CHANNEL*/; scopeId String @db.Uuid
  level NotifyLevel /*ALL|MENTIONS|NONE*/; telegram Boolean @default(true); @@id([userId, scopeType, scopeId]) }
model TelegramLinkToken { tokenHash String @id; userId String @db.Uuid; expiresAt DateTime; usedAt DateTime? }

model GithubInstallation { id BigInt @id /*installation_id*/; accountLogin String; suspendedAt DateTime? }
model ProjectRepo { id String @id @db.Uuid; projectId String @unique @db.Uuid /*v1: one repo per project*/; installationId BigInt
  repoId BigInt @unique; fullName String; isPrivate Boolean; notifyChannelId String @db.Uuid; visibility RepoVisibility /*PROJECT|CHANNEL|SELECTED*/
  rules Json /*{onOpen:'REVIEW', onMerge:'DONE'}*/ }
model PullRequest { id String @id @db.Uuid; repoId BigInt; number Int; title String; authorLogin String; url String
  state PrState /*OPEN|CLOSED|MERGED*/; draft Boolean; headRef String; headSha String; ciState String?; reviewState String?
  isRevert Boolean @default(false); messageId String? @db.Uuid /*the one channel message we edit*/; @@unique([repoId, number]) }
model TaskPullRequest { taskId String @db.Uuid; prId String @db.Uuid; source LinkSource /*TITLE|BRANCH|BODY_CLOSES|BODY|MANUAL*/
  drives Boolean; @@id([taskId, prId]) }
model GithubDelivery { deliveryId String @id; event String; action String?; receivedAt DateTime @default(now())
  status DeliveryStatus /*PENDING|DONE|FAILED|IGNORED*/; attempts Int @default(0); error String? }

model AiRequest { id String @id @db.Uuid; userId String @db.Uuid; kind AiKind /*CATCHUP|QA|TASKS|PROJECT_SUMMARY|WEEKLY|STANDUP|DECISION*/
  scope Json; status AiStatus /*QUEUED|RUNNING|DONE|ERROR*/; result Json?; error String?; tokensIn Int?; tokensOut Int?; createdAt DateTime @default(now()) }
model AiChunk { id String @id @db.Uuid; sourceType String; sourceId String; workspaceId String @db.Uuid; projectId String? @db.Uuid
  channelId String? @db.Uuid; repoId BigInt?; messageIds String[] @db.Uuid; content String; contentHash String; model String
  sourceUpdatedAt DateTime; /* embedding vector(N) via raw SQL + HNSW vector_cosine_ops */ @@index([channelId]) @@index([projectId]) }
model Outbox { id String @id @db.Uuid; type String; payload Json; createdAt DateTime @default(now()); processedAt DateTime? }
```

Design notes:
- **Kanban ordering.** `position` is a fractional-index string from `fractional-indexing` 4.0.0 (`generateKeyBetween`).
  - A move sends `{taskId, toColumnId, beforeId, afterId, version}`. The server computes the key between the neighbours' current keys, so client keys are never trusted. It then updates **one row** with `WHERE version = $v`, so cards can never be lost or duplicated by concurrent moves. A stale version returns 409 and the client refetches the column.
  - Store `position` with `COLLATE "C"` so byte order equals key order.
  - Board events (`task:moved`, `task:updated`) go to `project:{id}`.
- **Column categories** map the spec's base statuses to custom columns. GitHub rules target categories ("REVIEW", "DONE"), so renaming columns doesn't break automation.
- **Task keys** look like `WEB-123`: project key plus `project.taskSeq`, incremented in the create transaction. The tracker's `UL-n` + watermark is the same idea [TRK].
- **`TaskEvent`** is the spec's history ("who changed status, due date, description or assignee"). Automatic transitions write `actorType=GITHUB` and the `deliveryId`, which also makes re-runs detectable [SAFI §5].
- **Soft-deleting a message** redacts `body`/`bodyText`, removes its mentions, pins and AI chunks in the same transaction, and keeps the row so `seq` stays gap-free [RT §7].

Confidence: medium. This is a design sketch, so expect W1–W2 ADR changes.

---

## 6. Search

- **PostgreSQL FTS inside the main DB:**
  - a generated `search_tsv` built as `setweight(to_tsvector('russian', body_text),'A') || to_tsvector('english', body_text)`, with a GIN index;
  - `websearch_to_tsquery`, which never throws on user input;
  - `pg_trgm` as a fallback for typos and identifiers;
  - a regex shortcut for task keys [SAFI §1].
- **ACL first:** `WHERE m.channel_id = ANY($allowed) AND m.deleted_at IS NULL`, then the user filters (project, channel, author, date), then ranking.
  - `allowed` comes from `AccessService.listReadableChannelIds`. Client-supplied channel ids are intersected with it, never trusted.
  - Edits update the generated vector in the same transaction, so nothing goes stale.
- **`ts_headline` output is not HTML-safe.** Sanitize it or highlight client-side [SAFI §1].
- **Why not Meilisearch:** better typo tolerance and ranking (vendor claims), but it is a second store to keep in sync for edits, deletes and ACL snapshots. Meilisearch's own comparison page grants that Postgres fits small datasets and stays consistent with primary data [DR-A claim pool, meilisearch.com comparison; medium].
- Confidence: high.

---

## 7. AI with permission-aware retrieval and citations

### 7.1 Provider abstraction
- `AiProvider` wraps two `openai` 7.53.0 clients: `chat` (`OPENAI_BASE_URL`, `OPENAI_API_KEY`, `AI_CHAT_MODEL`) and `embed` (`EMBED_BASE_URL`, `EMBED_API_KEY`, `AI_EMBED_MODEL`, `EMBED_DIM`).
- Only workers hold these keys [SAFI §4], [RUS].
- **Who pays (lead's decision: "each for themselves").** Each developer brings their own provider and key for local development, set in their own `.env` (or points `OPENAI_BASE_URL` at a local Ollama). Nothing provider-specific is committed. Code must therefore never assume one provider: model names, `project`/folder headers and embedding dimension all come from env. The deployed app still needs one key in the `production` GitHub Environment, so someone has to own it.
- Use the **Chat Completions** surface with streaming plus JSON-schema structured output where the provider supports it. Always validate the output with zod on the server.
- Chat Completions is the most widely implemented OpenAI-compatible surface, so the same code runs against OpenAI or any compatible endpoint. Inference, medium.

### 7.2 Embeddings
- Fix one model and one dimension per environment, and store `model` on every chunk, because changing models means re-indexing [RUS].
- **Default on merit:** self-hosted **BGE-M3** (1024-dim, 8k-token input) served through an OpenAI-compatible `/v1/embeddings` (Ollama, TEI or vLLM) on the server. It tops ruMTEB retrieval for Russian, costs nothing per re-index and keeps chat content on the team's own server [SAFI §2], [RUS].
- **Alternative:** a hosted embeddings API through the same SDK.
- Confidence: medium (dataset-level evidence, not tested on this team's data). Run a 20–30 question eval before freezing.

### 7.3 Retrieval
- `ai_chunks` holds one chunk per thread and sliding windows of 10–20 messages, prefixed with `#channel · author · date`, plus tasks, decisions, standup answers and PRs [SAFI §2].
- Hybrid retrieval in one SQL query:
  - `SET LOCAL hnsw.iterative_scan = relaxed_order; SET LOCAL hnsw.ef_search = 100;`
  - `WHERE (channel_id = ANY($allowedChannels) OR (channel_id IS NULL AND project_id = ANY($allowedProjects)))`, plus a repo-visibility predicate for PR chunks;
  - `ORDER BY embedding <=> $q LIMIT 30`, UNION the FTS top 30, merged with reciprocal-rank fusion.
- **Never post-filter.** Post-filtering after ANN loses recall (≈4 of 10 rows survive at 10% selectivity with the default `ef_search` 40). Post-filtering after the LLM is a data leak [DR-A claim pool: pgvector docs, pgEdge, pykero].
- At student scale an exact scan after a B-tree prefilter is also fine. Start exact and add HNSW when row counts justify it [SAFI §2].
- `hnsw.max_scan_tuples` (20,000 default) can still cut very selective queries short. Treat a short result set as "insufficient context", not as full recall.
- Confidence: high.

### 7.4 Citations, "not enough info", generation state, no auto-acting
- **Sources and citations:**
  - The prompt numbers its sources and wraps them in `<source id=n>` delimiters, marked as untrusted data.
  - The model returns `{answer, citations:[n], sufficient}`.
  - The server checks every `n` exists and maps it to deep links: message, task, decision or standup answer.
- **Not enough info:** if `sufficient:false` or there are too few chunks above the threshold, the answer is "Not enough information in the data available to you".
- **ACL is re-checked at render time.** A stored answer never shows a citation the viewer can no longer open, and a deleted message renders as "message deleted" [SAFI §2].
- **Generation state:**
  - `POST /ai/requests` creates a `QUEUED` row and a BullMQ job with `jobId = requestId`.
  - The worker emits `ai:status` and `ai:delta` to `user:{id}` through the relay (§4.2).
  - The client polls `GET /ai/requests/:id` after a reconnect.
  - The terminal states are `DONE` and `ERROR`, with a user-safe message [SAFI §2].
- **The LLM has no write tools.** Task suggestions, decision drafts and the weekly report are JSON drafts that a user confirms.
- That design is also the main prompt-injection control (OWASP LLM01:2025): segregated external content, least privilege outside the model, human approval, and Markdown with HTML off and an allow-listed link policy [SAFI §2].
- **Deterministic inputs where possible:**
  - Standup summary = today's answers.
  - Catch-up = messages after the user's `last_read_seq` (capped, summarized hierarchically).
  - Weekly report = SQL numbers (tasks closed, PRs merged) with the LLM only phrasing them.
  - The tracker's Friday report is the deterministic, LLM-free version of this idea and works in production today [TRK §9], [SAFI §3].
- **Budgets:** a Redis token bucket per user, a daily token budget per user and workspace, capped context (6–8k tokens of sources) and capped `max_tokens`. Logs record token counts only, never prompts.
- Confidence: high (pattern), medium (exact limits).

---

## 8. GitHub App integration

- **Why an App:**
  - The installer grants specific repos.
  - Permissions are fine-grained and read-only: Pull requests, Checks, Actions, Metadata.
  - One webhook covers every installed repo.
  - Installation tokens last 1 hour and are minted server-side with `@octokit/app` 16.1.4.
  - It keeps working when the connecting user leaves [SAFI §5].
- **Connect flow:**
  - A project admin opens `github.com/apps/<app>/installations/new?state=<signed nonce>`.
  - On the callback, verify `state`, pick one repo and store ids only.
  - The private key and webhook secret live in env or GitHub Environments. Nothing token-like reaches the frontend, messages or logs [SAFI §5].
- **Webhook:**
  - Create the app with `NestFactory.create(AppModule, { rawBody: true })`.
  - Verify `X-Hub-Signature-256` over `req.rawBody` with `timingSafeEqual` or `@octokit/webhooks` 14.2.0 `verify()`. Unit-test it with GitHub's published test vector.
  - `INSERT github_deliveries … ON CONFLICT DO NOTHING`, enqueue `gh:<deliveryId>`, and return 2xx.
  - GitHub's current docs give **10 s** to respond, and `X-GitHub-Delivery` stays the same on redelivery [DR-A claim pool: GitHub webhook best practices], [SAFI §5].
  - Check `X-GitHub-Event` and `action` before work. Missed deliveries must be redelivered manually or swept: the tracker's `github_delivery_sweep` asks GitHub to redeliver failures every 30 min [TRK §12].
- **Events:**
  - `pull_request` (opened, reopened, edited, ready_for_review, converted_to_draft, synchronize, review_requested, closed), where `closed` with `merged:true` means merged.
  - `pull_request_review.submitted`.
  - `check_suite.completed`, with stale-SHA results ignored.
  - `installation` and `installation_repositories` for auto-disconnect [SAFI §5].
- **Linking:**
  - The task key `WEB-123` in the PR title or branch drives transitions.
  - In the body it drives only after a closing keyword (`closes WEB-123`); otherwise it only links.
  - Revert PRs, fork PRs and bot senders only link.
  - Keys from other projects are ignored.
  - This is exactly the tracker's tested rule set [TRK §6.4], ADR 0017.
- **Multiple PRs:**
  - Opening any driving, non-draft PR moves the task from TODO or IN_PROGRESS to REVIEW.
  - It moves to DONE only when every driving PR not closed unmerged is merged and at least one is merged.
  - Never move backwards, except REVIEW → IN_PROGRESS when the only driving PR closes unmerged.
  - Use a guarded `UPDATE … WHERE status IN (…)`.
  - Every automatic move writes a `TaskEvent` with `actorType=GITHUB` [SAFI §5], [TRK §6.5].
  - Rules are per project and can be switched off (`ProjectRepo.rules`).
- **Messages:**
  - Keep **one channel message per PR** (`PullRequest.messageId`) and edit it as CI or review results arrive. This removes duplicate-message risk.
  - Review requests become a thread reply plus a notification to the reviewer.
- **Private repos:**
  - PR data is visible only to users who can read the project and the notify channel and who satisfy `ProjectRepo.visibility`.
  - PR chunks in AI carry `repoId` and the same predicate.
  - Connecting a repo never broadcasts it workspace-wide [SPEC], [SAFI §5].
- **Local dev:** `gh webhook forward` or smee.io.
- Confidence: high.

---

## 9. Files

- **Upload:**
  - `POST /files/upload-url {channelId|taskId, name, size, mime}` checks write ACL, size (≤ 25 MB) and the allowed MIME.
  - It creates a `PENDING` row with the server key `ws/{ws}/ch/{ch}/{fileId}/{rand}` and returns a presigned PUT (~5 min) with `ContentLength`/`ContentType` signed.
  - A presigned POST with `content-length-range` is the stricter option.
  - `complete` → `HeadObject` checks the real size, then `file-type` 22.3.0 magic-byte sniffing, then the `files.process` job [SAFI §6].
- **Thumbnails:** sharp 0.35.5 produces `thumb_320.webp` and `preview_1280.webp`, applies `.rotate()`, strips metadata, applies `limitInputPixels`, and stores width and height. The file is marked `READY` and an event is emitted. `jobId = file:<id>` [SAFI §6].
- **Download:**
  - `GET /files/:id/download` re-checks ACL on every request (file → message → channel, or task → project), then 302-redirects to a presigned GET valid for 1–5 min.
  - Non-images are forced to `Content-Disposition: attachment`, and SVGs are never served inline.
  - Thumbnails are batch-signed (`POST /files/sign {ids}`) with a ~10 min TTL [SAFI §6].
  - Presigned URLs are bearer tokens and are not revocable before they expire, so keep TTLs short [AWS docs via SAFI §6].
- **Store:**
  - **Deviation:** run **SeaweedFS 4.52** (Apache-2.0, S3 gateway) or **Garage 2.5.0** in compose for dev and self-hosted prod. MinIO CE no longer ships images or binaries (Oct 2025) and is archived [RUS], [NPM/GitHub releases].
  - Any managed S3 works with the same SDK (`@aws-sdk/client-s3` 3.1164.0, `forcePathStyle`).
  - Use a separate `S3_PUBLIC_ENDPOINT` for the presigner so browser URLs match the signed host [SAFI §6].
- Confidence: high (flow), medium (SeaweedFS vs Garage; pick one in W2).

---

## 10. BullMQ jobs

BullMQ 6.7.2 + `@nestjs/bullmq` 12.0.1 (peer `@nestjs/core ^12`) [NPM].

v6 changes that matter, verified against the migration guide:
- the legacy `repeat` API is removed; use `upsertJobScheduler`, `getJobSchedulers` and `removeJobScheduler`;
- `repeat.utc` is gone; use `tz:'UTC'`;
- the `debounce` option is removed; use `deduplication` with id/ttl/extend/replace;
- `Queue.resume()` must now be awaited [DR-A claim pool: docs.bullmq.io v5→v6].

| Queue | Producer → work | Idempotency | Retries / limits |
|---|---|---|---|
| `outbox.relay` | scheduler every 2 s moves outbox rows → typed queues | `jobId = outbox.id`, `processed_at` | — |
| `github.webhook` | delivery → upsert PR, links, transitions, edit PR message | `jobId = gh:<deliveryId>` + the `github_deliveries` PK; guarded transitions | 5, exponential; poison → FAILED |
| `notify.deliver` | notification → in-app emit (+ Telegram if allowed now) | `UNIQUE(user_id, dedupe_key)`; `jobId = notif:<id>:<channel>` | 5; `UnrecoverableError` on Telegram 403 |
| `notify.digest` | batch replies, reactions and CI into one notice per `(user, group_key)` | `deduplication {id, ttl: 10 min, extend, replace}` | — |
| `standup.remind` | one scheduler per config: `upsertJobScheduler('standup:'+id, {pattern, tz})` → fan out per member | `remind:<cfg>:<localDate>:<user>`; `StandupRun @@unique` | scheduler jobs can't take custom ids, so dedupe in DB |
| `standup.summarize` | at close time or on "regenerate" | `deduplication {id:'sum:'+run}`; `keepLastIfActive` | 2 |
| `tasks.deadline` | hourly scheduler → "due soon" notices | `dedupe_key = due:<task>:<date>` | — |
| `files.process` | thumbnails, dimensions | `jobId = file:<id>` | 3 |
| `ai.index` | re-embed on create or edit (debounced), skipped if `contentHash` is unchanged | `deduplication {id:'chunk:'+key, ttl 30 s, extend, replace}` | 5 |
| `ai.generate` | catch-up, Q&A, suggestions, summaries | `jobId = requestId` | 2; timeout |
| `telegram.send` | outgoing bot messages | `jobId = tg:<notifId>` | worker `limiter`; honour `retry_after` |

- Deletes remove AI chunks **synchronously** in the soft-delete transaction, so a lagging queue can never surface deleted content [SAFI §2].
- Keep failed jobs for 14 days. Run Bull Board (or similar) behind admin auth, which is optional.
- Confidence: high.

---

## 11. Notifications and the Telegram bot

- **One `notifications` table** is the source of truth. `NotificationService.notify()` writes the row (deduped by `UNIQUE(user_id, dedupe_key)`) and enqueues deliveries.
- **Immediate:** direct mentions, DMs, assignments, review requests and standup reminders.
- **Batched:** thread replies, reactions, CI results and field changes, via a 5–15 min digest.
- **Never** notify actors about their own actions. Skip external channels if the user is focused on that channel [SAFI §7].
- **Cross-tab:** `PATCH /notifications/:id/read` (or read-all) → emit `notification:read` to `user:{id}`, which reaches every tab on every instance [SAFI §7].
- **DND and working hours:**
  - IANA `users.tz`, `workHours`, `dndUntil`, plus per-scope `NotificationPref`.
  - Outside hours the in-app row is still created silently, and Telegram is delayed to the next working-hours start or folded into a morning digest.
  - Compute with `Intl`/`date-fns` 4.4.0 and the tz, never fixed offsets.
- **Telegram (a normal channel):**
  - **grammY 1.46.0**: actively published. Telegraf 4.16.3's last publish was in March 2026 [SAFI §7].
  - **Webhook mode** on the server with the `X-Telegram-Bot-Api-Secret-Token` header checked.
  - **Linking:** a one-time token (≤ 64 chars, base64url) → `t.me/<bot>?start=<token>`. The bot marks it used and stores `telegramChatId`. `/stop` and the settings page unlink.
  - **Content:** private-channel content is not sent by default ("New mention in #private" plus a deep link).
  - **Sending:** through `telegram.send` with a global limiter and 429 `retry_after` handling [SAFI §7].
  - The tracker plans the same deep-link pattern for its Phase 6, and its notes on splitting long reports at 4,096 chars apply here too [TRK, Known gaps].
- Confidence: high (pattern), medium (grammY vs Telegraf preference).

---

## 12. Voice rooms (optional ★)

- **LiveKit OSS server v1.13.11 + `livekit-server-sdk` 2.19.2** [NPM], [SAFI §8].
- **Join token:** `POST /channels/:id/voice/token` checks channel ACL and returns a ~10 min JWT with `roomJoin` for `ch_<channelId>` only. Set explicit `canPublish`/`canSubscribe`, and `canPublishSources: [MICROPHONE, SCREEN_SHARE, SCREEN_SHARE_AUDIO]`.
- **Removal:** removing a member calls `RoomService.removeParticipant`.
- **Deploy needs:**
  - a public domain with a CA-signed cert;
  - TURN/TLS on 443 if there's no L4 load balancer (built in, so no coturn needed);
  - TCP 7881 and the UDP range 50000–60000;
  - Docker **host networking** (not behind the compose bridge);
  - Redis for prod;
  - Prometheus metrics on `:6789` [DR-A claim pool: LiveKit self-hosting docs].
- **Failure states:** mic `NotAllowedError`, screen share `ended`, and `Reconnecting` vs `Disconnected`.
- mediasoup is too low-level for this team. Jitsi is a separate app that is hard to wrap in the product's ACL.
- Build this only after W10 is green [DPP §1].
- Confidence: medium.

---

## 13. Observability

- **Logs:**
  - nestjs-pino 5.3.1 / pino 10.4.0 / pino-http 11.0.0 write JSON to stdout.
  - `serializers.req` keeps only method, the route URL with `token`/`X-Amz-*` query params stripped, `requestId`, `userId` and `instanceId`. No bodies.
  - `redact` covers auth and cookie headers, `x-hub-signature-256`, the Telegram secret header and `*.token|password|secret|apiKey|body|content|prompt|completion`.
  - Prisma query logging is off in prod.
  - A unit test logs fake secrets, message bodies and prompts, then asserts none appear in the output. That is the spec's "no tokens or private content in logs" as a test [SAFI §9].
- **Shipping:**
  - **Grafana Alloy v1.21.3** (`discovery.docker` + `loki.source.docker`) → **Loki v3.7.9**.
  - **Deviation:** Promtail reached EOL on 2026-03-02. Grafana's migration guide gives `alloy convert --source-format=promtail`.
  - The positions file path differs from Promtail's and the self-metrics are renamed, so update volumes and dashboards [DR-A claim pool: Grafana Alloy migration docs].
  - Labels: `service`, `instance`, `level`, `env` only. Never use `userId` as a Loki label.
- **Metrics:**
  - prom-client 15.1.3 on an internal `/metrics` port: default Node metrics, `http_request_duration_seconds{route,method,status}`, `ws_connections`, `ws_events_total{event}`, `message_send_latency_seconds`, `bullmq_queue_jobs{queue,state}` (collected by the worker only), `bullmq_jobs_failed_total`, `ai_tokens_total{kind}`, `github_webhooks_total{event,result}` and `notifications_sent_total{channel}` [SAFI §9].
  - **Prometheus v3.16.0** scrapes each replica (`docker_sd_configs`, so replicas show by `instance`), **node_exporter v1.12.1** and **cAdvisor v0.60.6**, plus LiveKit if used.
  - **Grafana v13.3.0** dashboards are provisioned from `infra/grafana/` in git: host, containers, and an app dashboard (RPS, p95, 5xx, WS connections per instance, queue depth, failed jobs, AI tokens per day) [NPM/GitHub releases].
- **Alerts** (optional): 5xx above 2%, queue backlog for more than 10 min, failed jobs rising, WS connections dropping to 0 on one instance.
- **Errors:**
  - `@sentry/nextjs` and `@sentry/nestjs` 11.11.0 (peer Nest ^12 OK) [NPM].
  - The backend is **self-hosted GlitchTip** (the spec's named alternative): Sentry-SDK compatible, open source, unlimited users, one container next to Postgres and Redis.
  - Sentry SaaS is equally valid if the team prefers zero ops. Only the DSN changes.
  - Use the SDK `tunnel` option so browser events go through the app origin, and propagate `requestId` so a frontend error maps to a Loki line [RUS §Sentry].
- Confidence: high (stack and versions), medium (GlitchTip vs SaaS preference).

---

## 14. CI/CD and release

- **Ruleset on `main`:**
  - PR required with 1 non-author approval, plus code owners on `packages/contracts/**`, `apps/api/src/core/**`, `apps/api/prisma/**`, `.github/**` and `infra/**`.
  - Stale approvals dismissed, conversations resolved.
  - Required checks: `lint`, `typecheck`, `test`, `build`, `steiger`.
  - Squash merge, linear history, no force-push.
  - A second ruleset on `release/*` blocks direct pushes [DPP §7].
- **CI (`ci.yml`, on PRs and pushes to main):**
  - pnpm store cache → `turbo run lint typecheck test build`.
  - Postgres (pgvector image) and Redis as service containers for API e2e.
  - Steiger, and a Storybook build (`@storybook/nextjs-vite` 10.6.6).
  - A two-instance socket integration test (§4.6).
  - A Playwright smoke test of the demo scenario from W8.
  - A PR-size label warning above about 600 changed lines.
- **AI first-pass review:** CodeRabbit (free on public repos) as a GitHub App, so it needs no Actions minutes [DPP §4].
- **Release ("branch + button"):**
  1. Cut `release/0.x` from main.
  2. In GitHub Releases, draft a release targeting that branch with tag `v0.x.0` and press **Publish**.
  3. `release.yml` runs `on: release: types: [published]`. It covers pre-releases too and doesn't fire for draft creation. `GITHUB_REF = refs/tags/<tag>` [DPP §7].
  4. The workflow builds the `web` and `api` images tagged with the release, pushes them to **GHCR**, and uses the `production` Environment (secrets, optional required reviewer).
  5. It SSHes to the VPS and runs `docker compose pull`, then a one-shot `migrate` service (`prisma migrate deploy`), then `docker compose up -d` (api `replicas: 2`), then a smoke `/health` check on each replica.
  6. **Rollback** = re-deploy the previous tag.
  7. Hotfix = PR to main, cherry-pick to the release branch, publish `v0.x.1`.
  - A release created by a workflow's `GITHUB_TOKEN` doesn't trigger other workflows, so the human button press is the trigger.
- **Migration step:** run it as a separate one-shot step before the new api starts. A failed migration leaves the previous release serving. The tracker's deploy already does this [TRK, Deploy topology, ADR 0016].
- Use expand/contract migrations so two api versions can briefly coexist during the rolling start.
- Confidence: high.

---

## 15. Pinned versions (checked 2026-11-08)

"✓" means read from the npm registry or GitHub releases today. "~" means pattern-level, so verify the exact tag when writing the Dockerfile or compose file.

| Area | Package / image | Pin | Notes |
|---|---|---|---|
| Runtime | Node.js | **26.13.x LTS** ✓ | 24.22 LTS is the conservative fallback. Nest CLI needs ≥ 24.15 [DR-A] |
| | pnpm | **12.18.0** ✓ | 12.0 released 2026-08-26 |
| | Turborepo `turbo` | **2.11.10** ✓ | |
| | TypeScript | **6.0.3** ✓ | Not 7.0.2: typescript-eslint peer `<6.1`, NestJS 12 peer TS 6 |
| Web | next | **16.4.5** ✓ | Floor after the 2026-11-03 security release (7 advisories) [DR-A] |
| | react / react-dom | **19.3.1** ✓ | |
| | @tanstack/react-query | **5.107.1** ✓ | |
| | zustand | **5.1.0** ✓ | |
| | tailwindcss | **4.3.5** ✓ | shadcn CLI **4.23.0** ✓ |
| | react-hook-form / @hookform/resolvers / zod | **7.91.0 / 7.0.3 / 4.6.7** ✓ | |
| | socket.io-client | **4.8.4** ✓ | |
| | DnD | **@atlaskit/pragmatic-drag-and-drop 4.0.0** ✓ | Active (2026-09). `@dnd-kit/core` 6.3.1 is unchanged since 2024-12, and `@dnd-kit/react` is 0.5.x pre-1.0. dnd-kit is the alternative if keyboard-sortable a11y out of the box matters more |
| | fractional-indexing | **4.0.0** ✓ | |
| | react-virtuoso / @tanstack/react-virtual | **4.18.20 / 3.14.26** ✓ | Spike both |
| | react-markdown / remark-gfm / rehype-sanitize | **10.1.0 / 4.0.1 / 6.0.0** ✓ | |
| | steiger / @feature-sliced/steiger-plugin | **0.9.0 / 0.8.2** ✓ | Beta, pin exactly |
| Tooling | eslint / typescript-eslint | **10.14.0 / 8.72.1** ✓ | Flat config |
| | prettier / husky / lint-staged | **3.9.10 / 9.1.7 / 17.6.0** ✓ | |
| | vitest / @testing-library/react / msw | **5.1.0 / 16.3.3 / 3.0.4** ✓ | Vitest on the backend too (Nest 12 ESM default) |
| | @playwright/test | **1.65.0** ✓ | |
| | storybook / @storybook/nextjs-vite | **10.6.6** ✓ | |
| | orval | **8.47.0** ✓ | OpenAPI → TanStack hooks + MSW |
| | testcontainers | **12.2.1** ✓ | Optional for API e2e |
| Errors | @sentry/nextjs, @sentry/nestjs | **11.11.0** ✓ | GlitchTip server **6.x** ~ |
| API | @nestjs/core, common, platform-express, platform-socket.io, websockets | **12.4.0** ✓ | ESM-only packages [DR-A] |
| | @nestjs/cli | **12.0.12** ✓ | |
| | @nestjs/config / jwt / terminus / swagger | **12.1.1 / 12.0.4 / 12.1.0 / 12.1.1** ✓ | |
| | @nestjs/throttler | **6.7.1** ✓ | Redis storage via rate-limiter-flexible **11.4.0** ✓ |
| | prisma / @prisma/client / @prisma/adapter-pg | **7.10.1** ✓ | `prisma@latest` = 8.0.0-rc.33, so pin explicitly |
| | pg | **8.23.1** ✓ | |
| | socket.io / @socket.io/redis-streams-adapter | **4.8.4 / 0.3.1** ✓ | `redis` **6.3.1** ✓ client for the adapter |
| | bullmq / @nestjs/bullmq / ioredis | **6.7.2 / 12.0.1 / 6.0.0** ✓ | |
| | openai | **7.53.0** ✓ | |
| | @aws-sdk/client-s3, s3-request-presigner, s3-presigned-post | **3.1164.0** ✓ | |
| | sharp / file-type | **0.35.5 / 22.3.0** ✓ | |
| | @octokit/app / @octokit/webhooks | **16.1.4 / 14.2.0** ✓ | |
| | grammy | **1.46.0** ✓ | |
| | argon2 | **0.45.2** ✓ | |
| | nestjs-pino / pino / pino-http / prom-client | **5.3.1 / 10.4.0 / 11.0.0 / 15.1.3** ✓ | |
| | livekit-server-sdk | **2.19.2** ✓ | ★ |
| Data | PostgreSQL | **18.x** ~ (18.6 per the docs header [SAFI]) | Native `uuidv7()` |
| | pgvector | **0.8.7** (README) ~ | Image `pgvector/pgvector:0.8.x-pg18`; verify the tag |
| | Redis | **8.10.3** ✓ | Valkey **9.1.3** ✓ is a drop-in (BSD) for adapter and BullMQ |
| | SeaweedFS / Garage | **4.52 / v2.5.0** ✓ | Pick one |
| Ops | Traefik | **v3.7.17** ✓ | |
| | Docker Compose | **v5.7.0** ✓ | |
| | Grafana Alloy / Loki / Prometheus / Grafana | **v1.21.3 / v3.7.9 / v3.16.0 / v13.3.0** ✓ | Use the `grafana/grafana-oss` image |
| | node_exporter / cAdvisor | **v1.12.1 / v0.60.6** ✓ | |
| | LiveKit server | **v1.13.11** ✓ | ★ |

**Compatibility traps found today:**
- `nestjs-zod` 5.5.0 supports Nest ≤ 11.
- `@nest-lab/throttler-storage-redis` 1.2.0 supports Nest ≤ 11.
- typescript-eslint supports TS < 6.1.
- `prisma@latest` is an RC.
- @dnd-kit/core is stale.

Renovate or Dependabot should bump patches weekly. Next.js now ships a scheduled monthly security release [DR-A].

---

## 16. Russia awareness (not a decision driver)

The stack above is chosen on the spec and technical merit. This table only records what a developer in Russia may hit, and the one-line fallback.

| Item | Status for users or devs in Russia (Nov 2026) | Fallback |
|---|---|---|
| OpenAI API | 403 `unsupported_country` from RU IPs; RU cards refused [RUS] | Same `openai` SDK, change `OPENAI_BASE_URL`: Yandex AI Studio (`ai.api.cloud.yandex.net/v1`, Responses API, folder-scoped models; embeddings one string per call, 256-dim) or GigaChat (`api.giga.chat/v1`, 30-min OAuth token, partial compatibility) [DR-A, medium] |
| OpenRouter, Groq, Together | 403 from Moscow; OpenRouter stopped RU-region billing in May 2026 [RUS] | As above, or Mistral or DeepSeek (reachable, foreign payment needed) |
| Sentry SaaS UI | Blocked for persons located in Russia since 10 Sep 2024 [RUS] | Self-hosted GlitchTip (already the choice) |
| Cloudflare proxy | Since 9 Jun 2025, responses through it are cut at about 16 KB on RU ISPs; DigitalOcean, Hetzner and OVH have also been throttled [RUS] | Don't orange-cloud the app. If RU users can't reach the VPS, use a small RU VPS as a reverse proxy |
| Vercel custom domains | Often blocked on RU ISPs in 2026 [RUS] | Self-host Next.js in Docker (already the plan) |
| GitHub / GHCR / Actions | Works; intermittent degradation (OONI 6% → 16% failures in May 2026) [DR-A pool, RUS] | Retry `git` and `pnpm`; optional mirror |
| Docker Hub | Works with intermittent failures; 100/200 pulls per 6 h [RUS] | `mirror.gcr.io` or `cr.yandex/mirror`; log in from CI |
| Claude Code Action / Copilot review | Not available to Russia residents [DPP §4] | CodeRabbit (public repo) |
| Telegram | Throttled since Feb 2026; the team reports it works for them | Treated as a normal channel; the in-app centre exists anyway |

---

## 17. Recommended build order (feeds the roadmap)

1. **W1–W2, the realtime prototype gate:**
   - Two NestJS instances + Redis Streams adapter + REST send with `clientMsgId` + seq + `afterSeq` catch-up, with a bare client.
   - Tests: A on api_1 and B on api_2 exchange messages. B goes offline, A sends 5, and B gets all 5 in order with no duplicates.
   - Output: the realtime ADR [SPEC "Initial stages"], [DPP §1].
2. **W1–W3, the walking skeleton:**
   - Monorepo, CI and ruleset.
   - Auth.
   - Workspace → invite → project → channel → message.
   - Traefik sticky with `api ×2`.
   - The release workflow to the VPS.
   - Basic logs and metrics.
3. **W3–W8, core vertical slices:**
   - Messaging quality (pagination, retry, scroll), threads, reactions, mentions, pins, saved.
   - Unread, presence, typing, files.
   - Tasks from messages and the kanban.
   - GitHub App and the full scenario E2E by Demo 2.
4. **W9–W12:** notifications and Telegram, search, standups, decisions, AI (catch-up, Q&A with citations, suggestions, summaries), hardening, docs. Voice ★ only if W10 is green.

---

## 18. Risks and open questions for the lead

| Risk / question | Impact | Mitigation / owner |
|---|---|---|
| **Promtail → Alloy deviation** not yet cleared with the organizer | Spec non-compliance on paper | Ask the organizer in W1; cite Grafana's EOL notice (lead) |
| **NestJS 12 ESM-only + Prisma 7 + Vitest** toolchain friction for juniors | W1–W2 slip | The lead and Denis make the skeleton build green before anyone else starts; Prisma's Node/TS floor claim was refuted in verification, so test TS 6 + Node 26 on day 1 [DR-A] |
| Zod → Swagger bridge without nestjs-zod | Duplicate DTOs | 1-day spike in W1; fallback to class-validator DTOs |
| Streams adapter + worker relay is custom code | Missed worker events | A relay test in CI; fallback to the classic adapter + emitter |
| Presence and typing silently break across instances (the Rocket.Chat lesson) | Demo failure | Two-instance CI test covers presence and typing [RT §5, §9] |
| Kanban concurrency | Lost or duplicated cards | Server-computed fractional keys + version check; a test that fires two concurrent moves |
| AI provider choice and cost; embedding model lock-in | Re-index work | Choose the embedding model in W8 with a small eval; store `model` per row |
| Private-repo visibility policy | Data leak via PR messages or AI | ADR in W6: `ProjectRepo.visibility` + the same predicate in AI and search |
| Single VPS capacity (api ×2, worker, Postgres, Redis, the Grafana stack, GlitchTip, optional LiveKit) | OOM at the demo | Size the VPS at ≥ 8 GB RAM if LiveKit is added; cAdvisor dashboards. Inference, low |

**Open questions:**
1. Will the organizer accept Alloy instead of Promtail, and GlitchTip instead of Sentry?
2. ~~Who pays for the LLM~~: each developer pays for their own key for local work (lead, 2026-11-08). Still open: whose key runs the deployed app, and which embeddings model is fixed for prod (the vector dimension is locked per environment).
3. Is the repo public under a GitHub org? CodeRabbit OSS and team review auto-assignment need that.
4. SeaweedFS or Garage?
5. react-virtuoso or TanStack Virtual chat mode, after the spike?

---

## 19. Sources

**Primary documentation:**
- Socket.IO: [Redis Streams adapter](https://socket.io/docs/v4/redis-streams-adapter), [Redis adapter](https://socket.io/docs/v4/redis-adapter/), [Using multiple nodes](https://socket.io/docs/v4/using-multiple-nodes), [Connection state recovery](https://socket.io/docs/v4/connection-state-recovery), [Delivery guarantees](https://socket.io/docs/v4/delivery-guarantees), [Server instance](https://socket.io/docs/v4/server-instance/), [TypeScript](https://socket.io/docs/v4/typescript/), [Postgres adapter](https://socket.io/docs/v4/postgres-adapter)
- NestJS: [Migration guide v12](https://docs.nestjs.com/migration-guide), [WebSocket adapters](https://docs.nestjs.com/websockets/adapter), [WS guards](https://docs.nestjs.com/websockets/guards), [Raw body](https://docs.nestjs.com/faq/raw-body), [Rate limiting](https://docs.nestjs.com/security/rate-limiting)
- Prisma: [Upgrading to Prisma 7](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-to-prisma-7)
- Next.js: [blog index](https://nextjs.org/blog/llms.txt), [November 2026 security release](https://nextjs.org/blog/november-2026-security-release)
- Node.js: [releases](https://nodejs.org/en/about/previous-releases)
- PostgreSQL: [Text search controls](https://www.postgresql.org/docs/current/textsearch-controls.html)
- pgvector: [README](https://github.com/pgvector/pgvector), [pgEdge: iterative index scans](https://docs.pgedge.com/pgvector/v0-8-5/iterative-index-scans/)
- GitHub: [Apps vs OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps), [Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), [Webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads), [Webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks), [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- BullMQ: [v5→v6 migration](https://docs.bullmq.io/guide/migrations/migrate-from-v5-to-v6), [Job Schedulers](https://docs.bullmq.io/guide/job-schedulers), [Deduplication](https://docs.bullmq.io/guide/jobs/deduplication)
- AWS S3: [presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- Grafana: [Loki: Promtail](https://grafana.com/docs/loki/latest/send-data/promtail/), [Alloy: migrate from Promtail](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- LiveKit: [self-hosting deployment](https://docs.livekit.io/transport/self-hosting/deployment/), [tokens & grants](https://docs.livekit.io/frontends/reference/tokens-grants/)
- Telegram: [Bot deep linking](https://core.telegram.org/bots/features#deep-linking)
- OWASP: [LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- Slack: [Security for Slack AI](https://slack.com/help/articles/28310650165907-Security-for-Slack-AI), [Slack Engineering: real-time messaging](https://slack.engineering/real-time-messaging/)
- Zulip: [events system](https://zulip.readthedocs.io/en/latest/subsystems/events-system.html), [sending messages](https://zulip.readthedocs.io/en/latest/subsystems/sending-messages.html)
- FSD: [Usage with Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs)
- Steiger: [repo](https://github.com/feature-sliced/steiger)
- Orval: [MSW guide](https://orval.dev/docs/guides/msw)

**AI providers (awareness section):**
- Yandex AI Studio: [OpenAI compatibility](https://yandex.cloud/en/docs/ai-studio/concepts/openai-compatibility), [quickstart](https://aistudio.yandex.ru/docs/en/ai-studio/quickstart/)
- Sber: [GigaChat OpenAI compatibility](https://developers.sber.ru/docs/ru/gigachat/guides/compatible-openai)

**Secondary sources:**
- [Meilisearch vs PostgreSQL](https://www.meilisearch.com/docs/resources/comparisons/postgresql) (vendor)
- [Supabase: RAG with permissions](https://supabase.com/docs/guides/ai/rag-with-permissions)
- [Crunchy Data: hybrid search](https://www.crunchydata.com/blog/hybrid-vector-search)
- [pykero: permission-aware RAG](https://dev.to/pykero/permission-aware-rag-what-it-really-costs-to-get-right-31c4)
- [ruMTEB, arXiv 2408.12503](https://arxiv.org/html/2408.12503v1)

**Local research and the registry snapshot:**
- `research_notes/Slack analog delivery plan/*.md`: four notes, each with its own source list
- `reports/Dev tools availability in Russia.md`
- `project-tracker/docs/ARCHITECTURE.md`
- npm registry and GitHub releases API, queried 2026-11-08 for every version marked ✓
