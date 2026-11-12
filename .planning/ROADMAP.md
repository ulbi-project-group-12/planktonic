# Roadmap: planktonic

## Overview

Fifteen phases from the research roadmap (`.planning/research/ROADMAP-RESEARCH.md`, data in `slack-analog-roadmap.json`), with Phase 1 rescoped to the lead's repo foundation and CI/CD and a new Phase 1.1 for the team's app skeletons. Phases 1–5 are the walking skeleton (Demo 1 at W4), 6–10 deepen it into the connected message → task → PR → done scenario (Demo 2 content by W7), 11–14 finish notifications, search, AI and hardening (Demo 3 at W12), and 15 ★ is optional. Ticket titles below are the research tickets; phase owners refine them at planning, and the lead imports them into the tracker as `UL-n`.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (1.1): Inserted work (1.1 = the team's share of the original research Phase 1)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Repo foundation and CI/CD (lead)** - pnpm + Turborepo monorepo, root tooling, CI, main ruleset, PR template, release images to GHCR (completed 2026-11-08)
- [ ] **Phase 1.1: App skeletons (team)** - kickoff, Next.js and NestJS skeletons, docker-compose, CodeRabbit, README, Storybook
- [ ] **Phase 2: Realtime prototype** - two clients, two instances, reconnect, protocol ADR
- [ ] **Phase 3: Access and workspaces** - sign-up and sign-in, workspaces, invites, roles, projects, landing
- [ ] **Phase 4: Prod and observability** - server, Traefik, two api instances, release by button, logs, metrics, errors
- [ ] **Phase 5: Channels and messages** - channels and DMs, send with status, history, scroll, edit and delete
- [ ] **Phase 6: Live chat** - unread and mentions, presence and typing, threads, reactions, pins, saved
- [ ] **Phase 7: Files** - upload, image previews, private download, limits, background worker
- [ ] **Phase 8: Tasks from discussions** - task from message, card, change history, checklist, task mentions
- [ ] **Phase 9: Kanban and My work** - project board, columns, order, realtime, blockers, filters, due dates
- [ ] **Phase 10: GitHub** - connect repo, webhook verification, PR ↔ task link, auto-transitions, PR messages
- [ ] **Phase 11: Notifications** - notification center, per-channel settings, DND, working hours, Telegram bot
- [ ] **Phase 12: Search, standups and decisions** - filtered search, async standups, team decisions
- [ ] **Phase 13: AI assistant** - summaries, cited answers, tasks from discussion, digests, report draft
- [ ] **Phase 14: Final** - long channels, access audit, limits, docs, final release
- [ ] **Phase 15: Voice rooms ★ (optional)** - channel room, microphone, participants and speaker, screen share

## Phase Details

### Phase 1: Repo foundation and CI/CD (lead)
**Goal**: Anyone clones the repo and `pnpm install --frozen-lockfile && pnpm turbo run lint typecheck test build` passes. Every PR and push to `main` runs the same checks in CI, `main` accepts changes only through a PR with green checks, and publishing a GitHub Release builds the images and pushes them to GHCR. `apps/web` and `apps/api` are placeholders; the framework skeletons are Phase 1.1.
**Mode:** mvp
**Depends on**: Nothing (can start immediately)
**Requirements**: TZ-FE-02, TZ-FE-10, TZ-FE-11, TZ-FE-12, TZ-FE-16, TZ-FE-18, TZ-FE-20, TZ-BE-02, TZ-BE-10, TZ-BE-11, TZ-BE-12, TZ-BE-15, TZ-BE-16, TZ-BE-17, TZ-BE-19, TZ-PROD-10, TZ-CICD-02, TZ-CICD-03, TZ-CICD-04, TZ-CICD-05, TZ-PROCESS-06
**Success Criteria** (what must be TRUE):
  1. From a clean clone with Node 26.13.0 and pnpm 12.15.0, `pnpm install --frozen-lockfile` and `pnpm turbo run lint typecheck test build` pass; every dependency is exact-pinned, at least ~14 days old, and the lockfile is committed
  2. `.github/workflows/ci.yml` runs on every PR and push to `main` (frozen install, then lint, typecheck, test and build through Turbo with caching) and is green on `main`
  3. `main` is protected by a ruleset (PR required, CI checks required, squash merge, no force-push, no deletion) or the exact plan-level gap is reported; CODEOWNERS puts @soadap on `.planning/`, `.github/` and the root configs
  4. A new PR is pre-filled with the template (`UL-n` key, "Done when…" checklist, test notes); branch naming `feat/UL-n-…` / `fix/UL-n-…` and the `UL-n` rules are documented in README and CONTRIBUTING
  5. Publishing a GitHub Release runs `release.yml`, which builds the web and api images and pushes them to `ghcr.io/ulbi-project-group-12/planktonic-{web,api}:<tag>`; the deploy job is a clearly marked stub and the release process (cut `release/x.y`, publish a Release) is documented
**Plans**: 9/9 plans complete

Plans:
**Wave 1**
- [x] 01-01-PLAN.md — pinned pnpm workspace (catalog, 14-day release age, engineStrict), Turbo, @app/config tsconfig + ESLint

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — shared Prettier, husky + lint-staged, check-pins guard, root ESLint, editorconfig, .env.example

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-03-PLAN.md — single product-name source (packages/config/product.ts) + name guard script and tests
- [x] 01-04-PLAN.md — @app/contracts TicketKey zod schema + Vitest

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01-05-PLAN.md — apps/api placeholder + non-root image

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 01-06-PLAN.md — apps/web placeholder + image; clean-clone pipeline proof

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 01-07-PLAN.md — ci.yml (lint/typecheck/test/build/name-guard + pr-hygiene) and release.yml to GHCR with deploy stub

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 01-08-PLAN.md — repo rules as code (rulesets, settings, apply script), CODEOWNERS, PR template

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 01-09-PLAN.md — README + CONTRIBUTING, full gate, secret scan, push phase branch

Research tickets:
- 1.2 Initialize the pnpm + Turborepo monorepo (apps/web, apps/api, packages/contracts, packages/config) (M, must)
- 1.3 Shared presets for ESLint (flat), Prettier, tsconfig + husky and lint-staged (S, must)
- 1.7 CI workflow (lint, typecheck, test, build, steiger) + ruleset main + CODEOWNERS (M, must)
- 1.8 Connect CodeRabbit and a PR template with the UL-n key and a DoD checklist (S, must)
- 4.2 (build half) release.yml: images to GHCR, separate migrate, rolling up, smoke check (M, must)

### Phase 1.1: App skeletons (team)
**Goal**: The team turns the placeholders into real skeletons: `docker compose up` brings up Postgres + pgvector, Redis and S3, and `pnpm dev` shows an empty Next.js web and a NestJS api with a health endpoint. Steiger, Storybook and the AI first-pass review join the PR checks. Unplanned by the lead on purpose — these are the team's learning tickets.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: TZ-FE-01, TZ-FE-05, TZ-FE-09, TZ-FE-14, TZ-FE-15, TZ-FE-17, TZ-FE-19, TZ-BE-01, TZ-BE-04, TZ-BE-05, TZ-BE-06, TZ-BE-13, TZ-BE-14, TZ-BE-18, TZ-PROD-11, TZ-CICD-01, TZ-CICD-07, TZ-CICD-08, TZ-PROCESS-01, TZ-PROCESS-02, TZ-PROCESS-03, TZ-PROCESS-04, TZ-PROCESS-05, TZ-PROCESS-07, TZ-PROCESS-08, TZ-PROCESS-09, TZ-PROCESS-12
**Success Criteria** (what must be TRUE):
  1. `apps/web` is a Next.js 16 FSD skeleton (`_app`/`_pages`, shadcn `shared/ui`) with a first Vitest + RTL test, and `steiger ./src` is a required CI check
  2. `apps/api` is a NestJS 12 ESM skeleton: `GET /api/health` returns 200 under docker-compose, Prisma 7.10.1 with adapter-pg runs its first migration, and a Vitest test passes
  3. `docker compose up` starts Postgres 18 + pgvector, Redis 8 and SeaweedFS with healthchecks, and an init script creates the bucket
  4. README «how to run» was followed by two members on different OSes in ≤ 30 min; CodeRabbit left a comment on a test PR; Storybook shows 3 UI-kit components and its build is green in CI
  5. Kickoff agreements (roles, call times, DoR/DoD, review and Friday-report rules) are recorded in Docs or `docs/adr/0000`
**Plans**: 11/11 plans executed (lead decision D-01: all tickets done in full by agents; UL-3 kickoff stays organisational, D-02)

Plans:
**Wave 1**
- [x] 01.1-01-PLAN.md — check-pins accepts pnpm 12 `allowBuilds` (D-06, prerequisite of UL-6/UL-7)
- [x] 01.1-02-PLAN.md — UL-8 dev `compose.yaml`: Postgres 18 + pgvector, Redis 8, SeaweedFS, `s3-init`
- [x] 01.1-03-PLAN.md — UL-10 `.coderabbit.yaml` + PR template review rule

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01.1-04-PLAN.md — UL-7 NestJS 12 ESM skeleton: zod config, `/api/health`, Vitest, multi-stage image

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01.1-05-PLAN.md — UL-7 Prisma 7 + adapter-pg, `init` migration, `/api/health/ready`, e2e without DB

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01.1-06-PLAN.md — UL-6 Next.js 16 FSD skeleton, Tailwind 4, next() lint, standalone image

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 01.1-07-PLAN.md — UL-6 shadcn UI kit (Button, Input, Dialog) + Vitest/RTL

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 01.1-08-PLAN.md — UL-6 Steiger + required `steiger` CI job

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 01.1-09-PLAN.md — UL-12 Storybook 10 stories + required `storybook` CI job

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 01.1-10-PLAN.md — UL-11 `pnpm dev` through Turbo, `services:*`/`db:*` scripts, `.env.example` documented

**Wave 9** *(blocked on Wave 8 completion)*
- [x] 01.1-11-PLAN.md — UL-11 README from zero, app READMEs, CONTRIBUTING, walkthrough check

Research tickets:
- 1.1 Kickoff and team agreements: roles, calls, rules, decomposition (S, must)
- 1.4 Next.js 16 skeleton following FSD (_app/_pages, shared/ui with shadcn) + Steiger in CI (M, must)
- 1.5 NestJS 12 (ESM) skeleton: config, health, Prisma 7 with adapter-pg, first migration, Vitest (M, must)
- 1.6 docker-compose for development: Postgres 18 + pgvector, Redis 8, SeaweedFS (S3) (S, must)
- 1.9 README: running, environment variables, .env.example (S, must)
- 1.10 Storybook 10 with the first UI-kit components (Button, Input, Dialog) (S, should)

### Phase 2: Realtime prototype
**Goal**: Two browsers connected to different backend instances exchange messages. A client that went offline gets every missed message in order and without duplicates after reconnecting, and a resend after a network error creates no duplicate. The protocol is fixed in an ADR before main development starts, as the spec requires.
**Mode:** mvp
**Depends on**: Nothing (can start immediately)
**Requirements**: TZ-CHAT-02, TZ-CHAT-15, TZ-CHAT-16, TZ-BE-03, TZ-BE-22, TZ-BE-23, TZ-PROD-07, TZ-PROD-13, TZ-PRODUCT-05, TZ-PROCESS-10
**Success Criteria** (what must be TRUE):
  1. Test: A on api_1, B on api_2, B offline, A sends 5 — B receives 5 in order, no duplicates
  2. Resending with the same clientMsgId returns the same message
  3. ADR-0001 (seq, clientMsgId, `afterSeq` catch-up, CSR off, sticky cookie) is merged
  4. A prototype video is attached to the W2 Friday report
**Plans**: TBD

Research tickets:
- 2.1 Mini NestJS gateway + Redis Streams adapter, two instances behind Traefik with a sticky cookie (M, must)
- 2.2 REST send with clientMsgId and per-channel seq in one transaction (M, must)
- 2.3 Backfill of missed messages via `?afterSeq=` and client-side dedup (M, must)
- 2.4 Bare prototype client: feed, connection status, retry of unsent messages (S, must)
- 2.5 Integration test: 2 apps, 2 clients, offline and 5 messages (M, must)
- 2.6 ADR-0001: realtime protocol (S, must)
- 2.7 Record a prototype video for the report and demo (S, should)

### Phase 3: Access and workspaces
**Goal**: A guest opens the landing, signs up with email and password and creates a workspace, invites a second person by link, gives them a role and creates a project with a description. An owner or admin can remove a member, change a role and revoke an invite. One user belongs to several workspaces and switches between them.
**Mode:** mvp
**Depends on**: Phase 1.1
**Requirements**: TZ-WS-01, TZ-WS-02, TZ-WS-03, TZ-WS-04, TZ-WS-05, TZ-WS-06, TZ-WS-07, TZ-WS-10, TZ-NOTIF-01, TZ-FE-03, TZ-FE-06, TZ-BE-08, TZ-BE-20, TZ-PRODUCT-08, TZ-PROCESS-11
**Success Criteria** (what must be TRUE):
  1. Sign-in, sign-out, session refresh and errors are covered by tests
  2. The permission matrix (ADR-0002) is enforced by guards, with tests for forbidden actions
  3. The landing is served at the domain root
  4. FE works on MSW mocks generated from OpenAPI while the BE is not ready
**Plans**: TBD

Research tickets:
- 3.1 ADR-0002: permission model — workspace and project roles, action matrix (S, must)
- 3.2 Prisma schema: users, workspaces, members, invites, projects, project_members (S, must)
- 3.3 Sign-up, sign-in, sign-out, refresh (JWT + httpOnly cookie, argon2) (M, must)
- 3.4 AccessService and guards for HTTP (workspace and project roles) (M, must)
- 3.5 OpenAPI generation in CI + Orval (TanStack Query hooks and MSW mocks) (M, should)
- 3.6 Sign-in and sign-up screens (react-hook-form + zod from contracts) (M, must)
- 3.7 Creating a workspace and projects, workspace switcher (M, must)
- 3.8 Invites by link, accept, revoke; managing members and roles (M, must)
- 3.9 Landing page (M, should)
- 3.10 Profile and settings: name, avatar, time zone (S, should)

### Phase 4: Prod and observability
**Goal**: The lead cuts `release/0.1` and presses Publish in GitHub Releases. Minutes later the server runs web, two api instances and the worker, with the migration applied as a separate step. Grafana shows logs and metrics per instance, and frontend and backend errors land in GlitchTip. Logs contain no tokens and no message bodies. (The image build half of research ticket 4.2 is already done in Phase 1; this phase adds the deploy half.)
**Mode:** mvp
**Depends on**: Phase 1.1
**Requirements**: TZ-FE-13, TZ-BE-27, TZ-PROD-01, TZ-PROD-02, TZ-PROD-03, TZ-PROD-04, TZ-PROD-05, TZ-PROD-06, TZ-PROD-08, TZ-PROD-09, TZ-PROD-12, TZ-CICD-06
**Success Criteria** (what must be TRUE):
  1. Release v0.1.0 rolled out by the button with no manual commands on the server
  2. Grafana has host, container and app dashboards broken down by instance
  3. A CI test proves logs contain no secrets and no message bodies
  4. The organizer answered about Alloy instead of Promtail (recorded in an ADR)
**Plans**: TBD

Research tickets:
- 4.1 Server + docker compose prod + Traefik (TLS, sticky cookie for api) (M, must)
- 4.2 (deploy half — the image build half is done in Phase 1) release.yml: images to GHCR, separate migrate, rolling up, smoke check (M, must)
- 4.3 Pino logs with redact + a "no secrets in logs" test (S, must)
- 4.4 Alloy → Loki, Prometheus + node_exporter + cAdvisor, provisioning Grafana (M, must)
- 4.5 API metrics: http histograms, ws_connections, send latency (S, must)
- 4.6 GlitchTip + Sentry SDK on web and api (tunnel, requestId) (S, must)
- 4.7 Check that prod is reachable for all members (page + WebSocket) (S, should)
- 4.8 Ask the organizer about Alloy instead of Promtail and GlitchTip (S, must)

### Phase 5: Channels and messages
**Goal**: A project member creates a public or private channel and writes in it, in DMs and in group DMs, sees the send status and can retry a failed message. Long history scrolls up without freezing, and a new message does not yank the reader down. Own messages can be edited (marked «edited») and deleted. Users on different instances see each other's messages at once. Demo 1 shows this on prod.
**Mode:** mvp
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: TZ-WS-08, TZ-WS-09, TZ-CHAT-01, TZ-CHAT-03, TZ-CHAT-04, TZ-CHAT-11, TZ-FE-04, TZ-FE-07, TZ-FE-21, TZ-FE-22, TZ-FE-23, TZ-FE-25, TZ-BE-21, TZ-PRODUCT-10
**Success Criteria** (what must be TRUE):
  1. The Demo 1 scenario passes on prod in two browsers on two instances
  2. A channel with 5,000 messages opens and scrolls without freezes
  3. A member removed from a private channel stops getting its messages on an open socket (test)
  4. Release v0.1 and the W4 Friday report with a video
**Plans**: TBD

Research tickets:
- 5.1 Channels: public and private, inviting to a private one, rename, archive (M, must)
- 5.2 DMs and group conversations as channels of type DM/GROUP (M, must)
- 5.3 Client socket layer: singleton, connection store, status banner (M, must)
- 5.4 Message feed: virtualization, upward pagination, scroll rules (L, must)
- 5.5 Composer with Markdown formatting, optimistic send and retry (M, must)
- 5.6 Editing and soft-deleting own messages (version, "edited" mark) (M, must)
- 5.7 Revoking access on an open socket when removed from a channel (S, must)
- 5.8 Demo 1 E2E on Playwright: 2 browsers on 2 instances (M, must)
- 5.9 Demo 1 rehearsal, v0.1 release, report (S, must)

### Phase 6: Live chat
**Goal**: A member sees unread and mention counters separately and jumps to the first unread. Reading on one device updates the counter in another tab at once. Presence (closing one tab doesn't make you offline) and typing are visible. Members reply in threads separate from the main feed, react, pin messages and save them to a personal list.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: TZ-CHAT-05, TZ-CHAT-06, TZ-CHAT-07, TZ-CHAT-08, TZ-CHAT-12, TZ-CHAT-13, TZ-CHAT-14, TZ-PRODUCT-06, TZ-PRODUCT-07
**Success Criteria** (what must be TRUE):
  1. Reading in tab A updates the counter in tab B on another instance (test)
  2. Closing one of two tabs keeps the status online
  3. An @user mention gives a separate counter and a notification event
  4. Presence and typing are covered by a two-instance test in CI
**Plans**: TBD

Research tickets:
- 6.1 last_read_seq, unread and mention counters, read:updated to the user room (M, must)
- 6.2 Sidebar with counters, a "New" divider and jump to the first unread (M, must)
- 6.3 @user/@here mentions: server-side parsing, mentions table, event (S, must)
- 6.4 Presence in Redis (heartbeat, 10 s grace) and typing indicator (M, must)
- 6.5 Threads: model, thread panel, reply counter (L, must)
- 6.6 Reactions: BE module + UI (idempotent add and remove) (S, should)
- 6.7 Pinned messages and personal favorites (M, should)
- 6.8 Two-instance test: presence, typing, cross-tab read (S, must)

### Phase 7: Files
**Goal**: A member attaches an image or a file up to 25 MB and sees the image preview in the feed without the feed jumping. A file link from a private channel does not open for a non-member. Heavy processing runs in a separate worker process.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: TZ-CHAT-09, TZ-BE-07, TZ-BE-25, TZ-BE-26
**Success Criteria** (what must be TRUE):
  1. Images show a preview with dimensions reserved in advance
  2. A non-member gets 403 downloading a private channel's file (test)
  3. A file over 25 MB is rejected with a clear error
  4. The worker runs as its own container and the queues are visible in metrics
**Plans**: TBD

Research tickets:
- 7.1 Worker process skeleton: BullMQ queues, outbox relay, graceful shutdown (M, must)
- 7.2 Upload: presigned PUT, complete, size and type check by magic bytes (M, must)
- 7.3 Preview worker: sharp (thumb 320, preview 1280), dimensions, ready event (M, must)
- 7.4 Download via ACL and a short presigned GET; batch signing of previews (S, must)
- 7.5 Upload UI: pick/drag-and-drop, progress, errors, preview, lightbox (M, must)
- 7.6 File access test: outsider, removed from the channel, expired link (S, must)

### Phase 8: Tasks from discussions
**Goal**: A member turns a message into a task, or creates one directly, with an ID, assignee, priority, due date and checklist. The message shows a task chip with the live status. The card links back to the source discussion, has its own thread (reachable from the channel), files and linked messages. History shows who changed status, due date, description or assignee.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: TZ-TASK-01, TZ-TASK-02, TZ-TASK-03, TZ-TASK-04, TZ-TASK-05, TZ-TASK-06, TZ-TASK-07, TZ-TASK-08, TZ-TASK-09, TZ-KANBAN-08
**Success Criteria** (what must be TRUE):
  1. «Bug in a channel → task from message → assignee set» takes ≤ 5 clicks
  2. The task chip in the message updates its status in realtime
  3. Every field change writes a TaskEvent with its author
  4. A mention such as WEB-123 in a message becomes a link with the status
**Plans**: TBD

Research tickets:
- 8.1 Task model: WEB-123 key, fields, checklist, TaskEvent (M, must)
- 8.2 "Create task from message" + a task badge in the message (M, must)
- 8.3 Task card: fields, checklist, attachments, linked messages (M, must)
- 8.4 Task change history (who, what, when) (S, must)
- 8.5 Task discussion in a thread, reachable from the card and from the channel (S, should)
- 8.6 Task mention in a message (WEB-123 → link with status) (S, should)
- 8.7 "Task assigned" event for notifications (S, must)

### Phase 9: Kanban and My work
**Goal**: Every project has a board with To do / In progress / In review / Done columns that can be renamed and extended; cards are dragged, the order persists, changes are visible to everyone at once and concurrent moves lose no cards. A task can be marked blocked with a reason, and the assignee is notified of assignment, blocking and an approaching due date. My work gathers my tasks from all projects, review requests and mentions.
**Mode:** mvp
**Depends on**: Phase 8
**Requirements**: TZ-KANBAN-01, TZ-KANBAN-02, TZ-KANBAN-03, TZ-KANBAN-04, TZ-KANBAN-05, TZ-KANBAN-06, TZ-KANBAN-07, TZ-KANBAN-09, TZ-FE-08, TZ-FE-24
**Success Criteria** (what must be TRUE):
  1. Two users moving cards at once lose or duplicate none (test)
  2. Column order survives a reload
  3. Filters by assignee, priority and due date combine
  4. My work shows tasks from ≥ 2 projects
**Plans**: TBD

Research tickets:
- 9.1 Columns with categories and fractional-index order; move API with version (M, must)
- 9.2 Board on pragmatic-drag-and-drop with optimistic update (L, must)
- 9.3 Board realtime (project room) + a concurrent-move test (M, must)
- 9.4 Filters by assignee, priority and due date (S, should)
- 9.5 Blocking a task with a reason + notification event (S, must)
- 9.6 Column settings: add, rename, reorder (S, could)
- 9.7 "Due soon" scheduler (Job Scheduler) (S, should)
- 9.8 "My Work" section: tasks from all projects, review requests, mentions (M, must)

### Phase 10: GitHub
**Goal**: A project admin connects a repository through the GitHub App and picks a notification channel. Opening a PR with the task key moves the task to In review, merging moves it to Done, and the transitions show in the task history. The channel gets one message per PR with author, title, link and check results. The task card shows linked PRs. Redelivered webhooks duplicate nothing, signatures are verified, and private-repo data is visible only to permitted members. The full spec scenario passes from message to Done.
**Mode:** mvp
**Depends on**: Phase 4, Phase 8, Phase 9
**Requirements**: TZ-GH-01, TZ-GH-02, TZ-GH-03, TZ-GH-04, TZ-GH-05, TZ-GH-06, TZ-GH-07, TZ-GH-08, TZ-GH-09, TZ-GH-10, TZ-GH-11, TZ-BE-24, TZ-PRODUCT-01, TZ-PRODUCT-02, TZ-PRODUCT-03, TZ-PRODUCT-04
**Success Criteria** (what must be TRUE):
  1. E2E: message → task → PR with key → In review → merge → Done → notification → back to the discussion
  2. Redelivering the same X-GitHub-Delivery is a no-op (test)
  3. A wrong signature → 401 and nothing stored
  4. Tokens and secrets never reach the frontend, messages or logs
**Plans**: TBD

Research tickets:
- 10.1 GitHub App and repository connection (state, repo selection, visibility policy) (M, must)
- 10.2 Webhook intake: HMAC on rawBody, dedup by X-GitHub-Delivery, queue, response ≤10 s (M, must)
- 10.3 PR, review and check_suite handler: PR snapshot, linking by key (M, must)
- 10.4 Auto-transition rules with multiple PRs and reverts + TaskEvent (M, must)
- 10.5 PR message in the channel: one per PR, updated on CI and merge (S, must)
- 10.6 Linked PRs in the task card + manual linking by URL (S, must)
- 10.7 Repository connection screen and simple rules (S, must)
- 10.8 E2E of the full spec scenario on Playwright (M, must)
- 10.9 v0.2 release and Demo 2 rehearsal before the holidays (S, must)

### Phase 11: Notifications
**Goal**: A member sees mentions, assigned tasks, thread replies and review requests in one center and jumps to the exact message, task or PR. Reading in one tab clears the notification in the others. Notification levels are set per channel and project, with Do not disturb and working hours in the user's time zone. After linking Telegram, standup reminders, assignments, mentions and review requests arrive there without duplicates.
**Mode:** mvp
**Depends on**: Phase 6, Phase 9, Phase 10
**Requirements**: TZ-NOTIF-02, TZ-NOTIF-03, TZ-NOTIF-04, TZ-NOTIF-05, TZ-NOTIF-06, TZ-NOTIF-07, TZ-NOTIF-08
**Success Criteria** (what must be TRUE):
  1. A retried webhook or reminder creates no second notification (UNIQUE dedupe_key)
  2. Outside working hours Telegram waits until morning while the in-app notification exists
  3. Telegram linking by deep link works and can be undone in settings
  4. Thread replies and reactions arrive as a digest, not one by one
**Plans**: TBD

Research tickets:
- 11.1 NotificationService: table, dedupe_key, immediate and digest (M, must)
- 11.2 Notification center + cross-tab read (M, must)
- 11.3 Settings per channel and project, "Do not disturb", working hours with time zone (M, should)
- 11.4 Telegram bot on grammY: deep-link binding, webhook with secret_token (M, should)
- 11.5 Delivery to Telegram: DND, limits, 403 "bot blocked" (S, should)
- 11.6 Notification idempotency test (webhook redelivery, reminders, job retry) (S, should)

### Phase 12: Search, standups and decisions
**Goal**: A member searches the messages of channels they can access, filtered by project, channel, author and date, and jumps to the hit. A project admin configures a standup (schedule, time zone, questions); members get a reminder and answer in the day's shared thread with links to tasks and PRs, everyone sees who answered, and the history is available to project members. A message or thread can be saved as a decision with title, description, author, date and a link to the discussion, superseded with an explanation and linked to tasks.
**Mode:** mvp
**Depends on**: Phase 6, Phase 11
**Requirements**: TZ-CHAT-10, TZ-STANDUP-01, TZ-STANDUP-02, TZ-STANDUP-03, TZ-STANDUP-04, TZ-STANDUP-05, TZ-STANDUP-06, TZ-STANDUP-07, TZ-DEC-01, TZ-DEC-02, TZ-DEC-03, TZ-DEC-04, TZ-DEC-05, TZ-PRODUCT-09
**Success Criteria** (what must be TRUE):
  1. A private channel's message is not found by a non-member (ACL test)
  2. Edited and deleted messages are reflected in search at once
  3. The standup reminder arrives at the configured local time exactly once
  4. The Decisions tab shows the supersede chain with history
**Plans**: TBD

Research tickets:
- 12.1 Search: tsvector ru+en, GIN, pg_trgm, ACL in SQL, filters (M, must)
- 12.2 Search UI: filters, highlighting, jump to the message (M, must)
- 12.3 Standups: config, Job Scheduler with tz, thread of the day, reminders (M, must)
- 12.4 Standup UI: setup, reply with links to tasks and PRs, who replied, history (M, must)
- 12.5 Decisions: model, "Save as decision", project tab (M, must)
- 12.6 Replacing a decision with a new one with an explanation, linking a decision to tasks (S, should)
- 12.7 Search and standup ACL test (S, should)

### Phase 13: AI assistant
**Goal**: A member asks for a summary of what they missed in a channel and asks project questions («why did we pick this library?», «what blocks the release?»). Answers use only messages, tasks and decisions the user can access, cite their sources, and say so honestly when data is thin. Generation status is visible: running, done or failed. Suggested tasks, decision drafts, the project summary and the weekly report draft are saved only after the user confirms. The standup summary links to the members' answers.
**Mode:** mvp
**Depends on**: Phase 7, Phase 10, Phase 12
**Requirements**: TZ-STANDUP-08, TZ-DEC-06, TZ-AI-01, TZ-AI-02, TZ-AI-03, TZ-AI-04, TZ-AI-05, TZ-AI-06, TZ-AI-07, TZ-AI-08, TZ-AI-09, TZ-AI-10, TZ-AI-11, TZ-BE-09
**Success Criteria** (what must be TRUE):
  1. Asking about a private channel the user is not in reveals nothing (test)
  2. Every citation leads to a real, accessible source
  3. A deleted message no longer appears in answers
  4. No AI action changes data without confirmation
**Plans**: TBD

Research tickets:
- 13.1 AiProvider on the openai SDK (baseURL and models from env), token limits and budgets (M, must)
- 13.2 Chunking and embeddings (ai.index, dedup, deletion together with the message) (M, must)
- 13.3 Hybrid search with ACL: pgvector (iterative_scan) + FTS (M, must)
- 13.4 Question answering with citations and "not enough information" (M, must)
- 13.5 AI panel: generation states, citation links, retry on error (M, must)
- 13.6 Summary of what was missed in a channel (S, should)
- 13.7 Standup summary with links to replies (S, should)
- 13.8 Task suggestions from a discussion with confirmation (M, should)
- 13.9 Project summary and a weekly report draft (numbers from SQL) (M, could)
- 13.10 Decision draft from a thread (S, could)
- 13.11 Prompt injection and private-channel leak test (S, must)

### Phase 14: Final
**Goal**: The team shows the full product on prod. A channel with thousands of messages stays fast, access checks are proven by tests at every point (HTTP, WebSocket, search, files, AI), and limits on messages, files and AI work. The docs let a newcomer bring the project up. The final release is published by the GitHub button.
**Mode:** mvp
**Depends on**: Phase 13
**Requirements**: 
**Success Criteria** (what must be TRUE):
  1. Load test: a 10k-message channel with 50 clients on 2 instances, no errors
  2. The spec ACL checklist is closed by tests
  3. README, env variables and ADRs are current
  4. Final GitHub Release and Demo 3
**Plans**: TBD

Research tickets:
- 14.1 Load test of a long channel and two instances (M, must)
- 14.2 Access-check audit: WS, search, files, AI, GitHub (M, must)
- 14.3 Rate limits: messages, uploads, AI (Redis, shared across instances) (S, must)
- 14.4 Grafana dashboards and alerts (5xx, queue, WS per instance) (S, should)
- 14.5 Documentation: running, variables, architecture, ADRs, demo scenario (M, must)
- 14.6 Team-wide bug bash (M, should)
- 14.7 Final release and Demo 3 (S, must)

### Phase 15: Voice rooms ★ (optional)
**Goal**: A channel member joins the channel's voice room, mutes the microphone and leaves, sees who is in the room and who is speaking, and can share the screen. Non-members never get into a private channel's room. A dropped connection, a denied microphone and an ended screen share are handled clearly. During a call the linked task can be opened and agreements written to the discussion.
**Mode:** mvp
**Depends on**: Phase 6, Phase 14
**Requirements**: TZ-VOICE-01, TZ-VOICE-02, TZ-VOICE-03, TZ-VOICE-04, TZ-VOICE-05, TZ-VOICE-06, TZ-VOICE-07, TZ-VOICE-08
**Success Criteria** (what must be TRUE):
  1. A non-member gets no room token for a private channel
  2. Removal from the channel kicks the user out of the room
  3. Three errors (microphone, screen, network) show clear states
**Plans**: TBD
**Optional**: yes ★ — only if W10 is green

Research tickets:
- 15.1 LiveKit on the server: host network, TURN/TLS 443, separate domain (M, could)
- 15.2 Room token with channel ACL check + removing a participant (S, could)
- 15.3 Room UI: join, leave, mute, participants, active speaker (M, could)
- 15.4 Screen sharing and error handling (microphone, screen, network) (M, could)
- 15.5 Task during a call and recording agreements into a discussion (S, could)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.1 → 2 → 3 → … → 15 (2 can run in parallel with 1/1.1; 3 and 4 in parallel with 2; 6, 7, 8 in parallel).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Repo foundation and CI/CD (lead) | 9/9 | Complete    | 2026-11-08 |
| 1.1. App skeletons (team) | 11/11 | In Progress | - |
| 2. Realtime prototype | 0/TBD | Not started | - |
| 3. Access and workspaces | 0/TBD | Not started | - |
| 4. Prod and observability | 0/TBD | Not started | - |
| 5. Channels and messages | 0/TBD | Not started | - |
| 6. Live chat | 0/TBD | Not started | - |
| 7. Files | 0/TBD | Not started | - |
| 8. Tasks from discussions | 0/TBD | Not started | - |
| 9. Kanban and My work | 0/TBD | Not started | - |
| 10. GitHub | 0/TBD | Not started | - |
| 11. Notifications | 0/TBD | Not started | - |
| 12. Search, standups and decisions | 0/TBD | Not started | - |
| 13. AI assistant | 0/TBD | Not started | - |
| 14. Final | 0/TBD | Not started | - |
| 15. Voice rooms ★ (optional) | 0/TBD | Not started | - |
