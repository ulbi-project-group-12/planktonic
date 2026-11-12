# planktonic

## What This Is

planktonic is a Slack-like work messenger for development teams: workspaces and projects, channels and DMs, threads, tasks created straight from messages, a per-project kanban, GitHub PR integration, async standups, team decisions, notifications (in-app + Telegram) and an AI assistant with permission-aware citations. It is built from scratch in 3 months (maybe 4) by team ulbi-project-group-12 — 8 part-time developers in Ulbi TV stream 3 — and ships as an open GitHub project plus an app deployed on a server.

## Core Value

The connected work scenario must work end to end and reliably: discuss → create a task from the message → take it → open a PR → review → get notified of the result — with no lost, duplicated or reordered messages and access checks on every path (HTTP, WS, search, files, AI).

## Requirements

### Validated

- ✓ Repo foundation: pnpm 12 + Turborepo monorepo, exact pins with a 14-day release age, shared tsconfig/ESLint/Prettier, husky + lint-staged, `@app/contracts` zod schema (TZ-FE/BE-02, -10, -11, -12, -16, TZ-BE-15/16, TZ-PROCESS-06) — Phase 1
- ✓ CI on every PR and push to main (lint, typecheck, test, build, name-guard) and release-by-button building images to GHCR (TZ-FE-20, TZ-BE-19, TZ-CICD-02, TZ-CICD-03 build half, TZ-CICD-05, TZ-PROD-10) — Phase 1
- ◐ Protected main + mandatory review (TZ-FE-18, TZ-BE-17, TZ-CICD-04): rulesets, CODEOWNERS and PR template are built as code, but enforcement waits for the repo to go public (GitHub Free returns 403) — Phase 1

### Active

All 191 spec items in `.planning/REQUIREMENTS.md` (IDs `TZ-<SECTION>-<nn>`, VOICE optional ★). Headline groups:

- [ ] Workspaces, projects, roles, invites, landing (TZ-WS-*)
- [ ] Team chat: channels, DMs, threads, reactions, pins, unread, mentions, realtime with reconnect catch-up (TZ-CHAT-*)
- [ ] Tasks from discussions, kanban, My work (TZ-TASK-*, TZ-KANBAN-*)
- [ ] GitHub App integration with PR ↔ task auto-transitions (TZ-GH-*)
- [ ] Async standups, team decisions (TZ-STANDUP-*, TZ-DEC-*)
- [ ] AI assistant: summaries, cited answers, drafts only (TZ-AI-*)
- [ ] Notifications, DND, working hours, Telegram bot (TZ-NOTIF-*)
- [ ] Frontend/backend stack and code-quality rules (TZ-FE-*, TZ-BE-*)
- [ ] CI/CD, release by button, containers, observability (TZ-CICD-*, TZ-PROD-*)
- [ ] Product quality rules and team process (TZ-PRODUCT-*, TZ-PROCESS-*)
- [ ] ★ Voice rooms (TZ-VOICE-*, optional)

### Out of Scope

- Native mobile/desktop apps — web only per the spec; the 3-month budget is already over the DSDM 60% guideline.
- A second search datastore (Meilisearch/Typesense) — Postgres FTS + pg_trgm covers the spec; backlog 999.1.
- MinIO — CE stopped shipping images in Oct 2025; SeaweedFS or Garage instead.
- `packages/ui` and a separate `apps/worker` app — shadcn lives in `apps/web/src/shared/ui`; the worker is a second NestJS entry point.
- Everything in backlog 999.x of the research roadmap — deferred ideas and stars.

## Context

- **Organizer and spec:** Ulbi TV stream 3 project groups. Spec: the organizer's spec (Russian), kept outside the repository by the lead; its 191 items are quoted with IDs in `REQUIREMENTS.md`. The spec asks for an open GitHub project, so the repo is public.
- **Research (source of truth for decisions):** `.planning/research/STACK.md` (architecture + pinned versions, 2026-11-08), the team process doc (RU, kept outside the repository by the lead), `ROADMAP-RESEARCH.md` + `slack-analog-roadmap.json` (15 phases, 118 tickets, 191 spec items with IDs).
- **Team tracker:** a separate product at https://ulbi.soadap.com (repo `ulbitv/project-tracker`). It is connected to this repo only through the org webhook — a `UL-n` key in a branch name or PR title moves the tracker ticket (PR opened → IN_REVIEW, merged → DONE) — and through a later import of the roadmap tickets. Real tracker tickets start at UL-3.
- **GSD in the team (PROCESS §12):** GSD is optional for everyone. One driver on `.planning/`: only the lead changes `.planning/` on `main` (CODEOWNERS). Phase owners work on phase branches (`git.branching_strategy: phase`) and merge via PR; anyone can use `/gsd-quick` on their own `feat/UL-n-…` branch.
- **Review (PROCESS §7):** AI first pass (CodeRabbit, free on public repos — not enabled yet), then one non-author human approval; CODEOWNERS only on critical paths; SLA 24 h first response / 48 h decision; PRs ≤ ~400 lines, branches live ≤ 2 days.
- **Calendar:** start 2026-W46 (09.11.2026). Demos at W4, W8, W12; W8–W9 (31.12–10.01) are RU holidays.
- **Russia:** most of the team is in Russia; this is awareness only (STACK §16), not a decision driver.

## Constraints

- **Tech stack**: pnpm workspaces + Turborepo monorepo — `apps/web` (Next.js 16 App Router + FSD), `apps/api` (NestJS 12 ESM, Prisma 7.10.1), `packages/contracts` (zod), `packages/config` (eslint/tsconfig/prettier) — STACK §0/§3.
- **Runtime pins**: Node 26 LTS (26.13.0), pnpm 12.15.0 (12.18.0 failed the 14-day rule), TypeScript 6.0.3 (not 7.x: typescript-eslint peer `<6.1`, NestJS 12 peer TS 6), turbo 2.11.10 — STACK §15.
- **Supply chain**: exact pins (no `^`/`~`), committed lockfile, frozen-lockfile installs in CI, no release younger than ~14 days.
- **Package scope**: neutral `@app/*`; the display name lives in one place so the product can be renamed.
- **Git**: trunk-based, protected `main`, squash merge, branch names `feat/UL-n-…` / `fix/UL-n-…`, `UL-n` in PR titles.
- **Release**: cut `release/x.y` → publish a GitHub Release → `release.yml` builds images to GHCR (`ghcr.io/ulbi-project-group-12/planktonic-*`) → deploy (server arrives in roadmap Phase 4).
- **Org plan**: GitHub Free; repo private for now — rulesets/branch protection may be unavailable until it is public.
- **Language**: docs and code identifiers in English; team chat in Russian.
- **Timeline**: 3 months, maybe 4 (extension is reserve for ★ and 999.x only).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| pnpm 12.15.0 (not 12.18.0) and Node 26.13.0 as a runtime exception to the 14-day rule | 12.18.0 was 3 days old; Node 26.13.0 is the only 26 LTS | ✓ Good |
| Product name in one source (`packages/config/product.ts`) + CI name guard | The working name had to be replaceable in one place; rename via `/gsd-quick` (README checklist) | ✓ Good — renamed to planktonic on 2026-11-10 (quick task 261110-idz) |
| Phase 1 rescoped to "Repo foundation and CI/CD (lead)"; app skeletons moved to Phase 1.1 (team) | Skeletons are learning tickets for the team; the lead delivers the pipeline they plug into | ✓ Good — Phase 1 shipped the pipeline in 9 plans |
| `apps/web` / `apps/api` start as placeholders with trivial scripts | The pipeline must run end to end before any framework code exists | — Pending |
| Requirement IDs = the spec item IDs from the research JSON | One ID space shared by tracker tickets (`tz_refs`), roadmap and GSD | — Pending |
| Each spec item maps to one primary phase (first phase that delivers it) | GSD traceability needs exactly one owner phase; later phases may extend it | — Pending |
| Repo private until the lead decides | the spec wants it open, CodeRabbit is free only on public; visibility is the lead's call | ⚠️ Revisit — private + Free blocks rulesets, environments, secret scanning; Actions minutes capped |
| GHCR image names derived from the repo name (`<repo>-web` / `<repo>-api`) | Renaming the repo renames the images; no literal in workflows | ✓ Good — test release v0.0.1-rc.1 pushed both |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-10 after quick task 261110-idz (product renamed to planktonic)*
