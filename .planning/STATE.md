---
gsd_state_version: "1.0"
milestone: v0.1.0
current_phase: "1.1"
current_phase_name: App skeletons (team)
status: executing
stopped_at: Completed 01.1-02-PLAN.md
last_updated: "2026-11-12T21:01:55.778Z"
last_activity: 2026-11-12
last_activity_desc: Completed 01.1-02 (dev compose stack, UL-8)
state_head: f0bca0e9e525f03cea9eb4a224924e9f7d0d031f
progress:
  total_phases: 16
  completed_phases: 1
  total_plans: 20
  completed_plans: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-08)

**Core value:** The connected work scenario (discuss → task from message → PR → review → notified) works end to end, reliably, with access checks on every path.
**Current focus:** Phase 1.1 — App skeletons (team), executing

## Current Position

Phase: 1.1 — App skeletons (team)
Plan: 3 of 11
Status: Ready to execute
Last activity: 2026-11-12 - Completed 01.1-02 (dev compose stack, UL-8)

Progress: [█░░░░░░░░░] 6%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 9 | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 1 P01 | 5min | 2 tasks | 11 files |
| Phase 1 P02 | 3min | 3 tasks | 12 files |
| Phase 1 P03 | 5min | 2 tasks | 6 files |
| Phase 1 P05 | 2min | 2 tasks | 9 files |
| Phase 1 P06 | 2min | 2 tasks | 8 files |
| Phase 1 P09 | 6min | 3 tasks | 3 files |
| Phase 1.1 P01 | 1min | 2 tasks | 3 files |
| Phase 1.1 P02 | 13min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Phase 1 = lead's foundation + CI/CD; Phase 1.1 = team skeletons, left unplanned.
- [Init]: Only the lead changes `.planning/` on `main` (PROCESS §12); phase work happens on phase branches.
- [Phase 1]: 01-01: root manifest named @app/root (product-neutral, D-05/D-33); catalog block kept comment-free for the 01-02 pin guard
- [Phase 1]: 01-02: check-pins also covers peerDependencies and fails closed on a malformed/empty catalog; no root tsconfig needed (JS lint is not type-aware)
- [Phase 1]: 01-03: name guard fails closed (exit 2) on a bad product.ts, a git ls-files failure or bad args; its clean count is scanned (non-allowlisted) files; fixtures use the neutral name Acme Chat
- [Phase 1]: 01-04: TicketKey grammar /^UL-[1-9]\d*$/ (A11, reversible); RED lands on a permissive stub so it fails on an assertion and passes the typed-lint pre-commit hook
- [Phase 1]: 01-05: ARG PRODUCT_NAME has no default and fromEnv treats "" as unset, so a no-arg image prints "this project"; no name LABEL in the Dockerfile (labels from metadata-action, D-34)
- [Phase 1]: 01-06: apps/web mirrors apps/api except name and Next.js / ticket 1.4 wording (Dockerfiles diff empty after api/web→APP); no UI deps until Phase 1.1 (D-02)
- [Quick 261110-idz]: product renamed from the working name "ulbigram" to "planktonic" (repo `ulbi-project-group-12/planktonic`, images `planktonic-{web,api}`). Phase 1 artifacts under `.planning/phases/01-*` keep the old name on purpose, as historical record.
- [Phase 1]: 01-09: README lists repo-level SHA pinning as a pending lead action (01-08 ran with SKIP_SHA_PINNING=1); no requirement ticked by 01-09, GitHub-proven IDs left to the orchestrator/verifier
- [Phase 1 close, 2026-11-12]: repo republished as public `ulbi-project-group-12/planktonic` from one squashed commit; the private history lives in `planktonic-archive` (SHAs cited in Phase 1 SUMMARYs resolve there). `PROCESS.md` and `TZ-SPEC.md` are kept outside the repo; all repo text is English.
- [Phase 1 close, 2026-11-12]: rulesets applied (`apply-repo-rules.sh` exit 0), SHA pinning required, secret scanning + push protection on; a direct push to `main` is rejected (GH013). Review is horizontal: org team `devs` (8) has write, any teammate's approval counts; CODEOWNERS keeps the lead on CI, rules, tooling, root configs, lockfile. Team-owned CODEOWNERS lines dropped (UL-9 scope change).
- [Phase 1.1]: 01.1-01: allowBuilds (bare name -> true/false, block mapping only) is the only build-approval key check-pins accepts; onlyBuiltDependencies stays rejected (pnpm 12 ignores it)
- [Phase 1.1]: 01.1-02: compose images = newest tag >= 14 days old, digest-pinned; on 2026-11-12 that is pgvector 0.8.6-pg18, redis 8.10.2, seaweedfs 4.51 (all D-08 tags too young); ready signal is 'up -d' + 'wait s3-init'

### Pending Todos

None yet.

### Blockers/Concerns

- ~~Phase 1.1 note: check-pins needs `allowBuilds` on its allowlist~~ resolved by 01.1-01 (`allowBuilds` accepted; `onlyBuiltDependencies` stays rejected).
- 01-VALIDATION.md is still `draft` (Nyquist audit `/gsd-validate-phase 1` not run; optional).
- bump pgvector/pgvector to 0.8.7-pg18 (D-08) on/after 2026-11-14 (compose.yaml; re-check digest age)
- bump chrislusf/seaweedfs to 4.52 (D-08) on/after 2026-11-16 (compose.yaml seaweedfs + s3-init; re-check digest age)
- bump redis to 8.10.3 (D-08) on/after 2026-11-21 (compose.yaml; re-check digest age)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 261110-idz | Rename product ulbigram to planktonic | 2026-11-10 | 3d32df5 | [261110-idz-rename-product-ulbigram-to-planktonic](./quick/261110-idz-rename-product-ulbigram-to-planktonic/) |
| 261111-esl | ESLint presets base/next/nest in packages/config (UL-5) | 2026-11-11 | 5a1c8e3 | [261111-esl-eslint-presets](./quick/261111-esl-eslint-presets/) |

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-11-12T21:01:55.727Z
Stopped at: Completed 01.1-02-PLAN.md
Resume file: None
