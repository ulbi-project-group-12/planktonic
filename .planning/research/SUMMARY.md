# Project Research Summary

**Project:** planktonic (Slack-like work messenger, Ulbi TV stream 3, group 12)
**Domain:** realtime team messenger with tasks, kanban, GitHub, AI assistant
**Researched:** 2026-11-08 (deep-research runs A/B/C in the lead's research workspace; copied here verbatim)
**Confidence:** HIGH for stack and pins, MEDIUM for process adaptations

The project research was done before this repo existed and is the source of truth. `/gsd-new-project` did not re-run the four generic researchers; it imported the finished reports instead:

| File | What it is |
|------|------------|
| `STACK.md` | Reference architecture and pinned versions (EN) — §0 decisions, §3 monorepo layout, §14 CI/CD and release, §15 pins, §16 Russia awareness |
| `ROADMAP-RESEARCH.md` | 15 phases, 118 tickets, 191 spec items, backlog 999.x |
| `slack-analog-roadmap.json` | Same roadmap as data: `tz_requirements`, `phases[].tickets[].tz_refs`, `backlog` |

## Executive Summary

A pnpm + Turborepo monorepo with `apps/web` (Next.js 16 App Router + FSD), `apps/api` (NestJS 12 ESM with an HTTP+WS entry point and a worker entry point, Prisma 7.10.1), `packages/contracts` (zod DTOs, socket event maps, error codes, limits) and `packages/config` (eslint flat presets, tsconfig bases, prettier). Messages are sent over REST and pushed over Socket.IO with a per-channel `seq`, `clientMsgId` idempotency and `afterSeq` catch-up; one `AccessService` guards HTTP, WS, search, files, AI and GitHub data. Postgres 18 FTS + pgvector, BullMQ 6 workers, S3 API (SeaweedFS/Garage), GitHub App, Grafana stack + GlitchTip.

## Key Findings

### Recommended Stack (pins from STACK §15, checked 2026-11-08)

- Node **26.13.x LTS**, pnpm **12.18.0**, turbo **2.11.10**, TypeScript **6.0.3** (not 7.x: typescript-eslint 8.72 peer `<6.1`, NestJS 12 peer TS 6)
- eslint **10.14.0**, typescript-eslint **8.72.1**, prettier **3.9.10**, husky **9.1.7**, lint-staged **17.6.0**, vitest **5.1.0**, zod **4.6.7**
- next **16.4.5**, react **19.3.1**, @nestjs/* **12.4.0**, prisma **7.10.1** (`latest` is an 8.0 RC — pin explicitly)

### Compatibility traps

- `nestjs-zod` 5.5.0 and `@nest-lab/throttler-storage-redis` 1.2.0 support Nest ≤ 11 only.
- typescript-eslint supports TS < 6.1.
- `prisma@latest` is an RC; `@dnd-kit/core` is stale.

## Implications for Roadmap

- Phase 1 (lead): monorepo + root tooling + CI + ruleset + PR template + release image build (STACK §14). Placeholders only for web/api.
- Phase 1.1 (team): framework skeletons, docker-compose, Steiger, Storybook, CodeRabbit, README content.
- Walking skeleton = phases 1–5 (realtime prototype across two instances is mandatory before main development, per the spec).
- Release = cut `release/x.y` → publish a GitHub Release → `release.yml` on `release: published` → GHCR → migrate one-shot → rolling up (deploy in Phase 4).

## Sources

See `STACK.md` §19 and `ROADMAP-RESEARCH.md` §11. The spec text (`TZ-SPEC.md`) and the team process doc (`PROCESS.md`) are kept outside the repository by the lead.
