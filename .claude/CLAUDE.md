<!-- GSD:project-start source:PROJECT.md -->

## Project

**planktonic**

planktonic is a Slack-like work messenger for development teams: workspaces and projects, channels and DMs, threads, tasks created straight from messages, a per-project kanban, GitHub PR integration, async standups, team decisions, notifications (in-app + Telegram) and an AI assistant with permission-aware citations. It is built from scratch in 3 months (maybe 4) by team ulbi-project-group-12 — 8 part-time developers in Ulbi TV stream 3 — and ships as an open GitHub project plus an app deployed on a server.

**Core Value:** The connected work scenario must work end to end and reliably: discuss → create a task from the message → take it → open a PR → review → get notified of the result — with no lost, duplicated or reordered messages and access checks on every path (HTTP, WS, search, files, AI).

### Constraints

- **Tech stack**: pnpm workspaces + Turborepo monorepo — `apps/web` (Next.js 16 App Router + FSD), `apps/api` (NestJS 12 ESM, Prisma 7.10.1), `packages/contracts` (zod), `packages/config` (eslint/tsconfig/prettier) — STACK §0/§3.
- **Runtime pins**: Node 26 LTS (26.13.0), pnpm 12.15.0 (12.18.0 failed the 14-day rule), TypeScript 6.0.3 (not 7.x: typescript-eslint peer `<6.1`, NestJS 12 peer TS 6), turbo 2.11.10 — STACK §15.
- **Supply chain**: exact pins (no `^`/`~`), committed lockfile, frozen-lockfile installs in CI, no release younger than ~14 days.
- **Package scope**: neutral `@app/*`; the display name lives in one place so the product can be renamed.
- **Git**: trunk-based, protected `main`, squash merge, branch names `feat/UL-n-…` / `fix/UL-n-…`, `UL-n` in PR titles.
- **Release**: cut `release/x.y` → publish a GitHub Release → `release.yml` builds images to GHCR (`ghcr.io/ulbi-project-group-12/planktonic-*`) → deploy (server arrives in roadmap Phase 4).
- **Org plan**: GitHub Free; repo private for now — rulesets/branch protection may be unavailable until it is public.
- **Language**: docs and code identifiers in English; team chat in Russian.
- **Timeline**: 3 months, maybe 4 (extension is reserve for ★ and 999.x only).

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

Full reference: `.planning/research/STACK.md` (architecture §0–§13, CI/CD §14, pinned versions §15). Key pins (Phase 1, 14-day rule applied): Node 26.13.0 LTS, pnpm 12.15.0, turbo 2.11.10, TypeScript 6.0.3 (not 7.x), eslint 10.13.0 + typescript-eslint 8.72.0, prettier 3.9.10, vitest 5.0.5 (+ vite 8.3.5 peer), zod 4.6.7 — the source of truth is the `catalog` in `pnpm-workspace.yaml`; later: next 16.4.5, react 19.3.1, @nestjs/* 12.4.0, prisma 7.10.1 (pin explicitly — `latest` is an RC).

Rules: exact versions only (no `^`/`~`), commit `pnpm-lock.yaml`, no release younger than ~14 days, packages use the `@app/*` scope.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow (optional for the team)

GSD is optional (team process doc §12, kept outside the repository by the lead). One hard rule: **only the lead changes `.planning/` on `main`** — CODEOWNERS enforces it. Phase owners edit only their own `.planning/phases/<N>-…` directory on their phase branch; anyone else works on a short `feat/UL-n-…` / `fix/UL-n-…` branch.

Useful entry points:
- `/gsd-quick` for one ticket on your own branch (atomic commits, does not touch the shared roadmap)
- `/gsd-debug` for investigation and bug fixing
- `/gsd-pr-branch` before opening a PR, to drop `.planning/` commits
- Phase owners: `/gsd-plan-phase`, `/gsd-execute-phase`, `/gsd-code-review`, `/gsd-verify-work` for their phase on its phase branch
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
