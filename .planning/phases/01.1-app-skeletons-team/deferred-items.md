# Phase 1.1 — Deferred items (out of scope for the plan that found them)

| Found in | Item | Why deferred | Owner |
|---|---|---|---|
| 01.1-08 Task 2 verify | `actionlint` (pinned image 1.7.12) reports `SC2034: attempt appears unused` in `.github/workflows/main-push-guard.yml:36` (the `for attempt in 1 2 3 4 5 6` retry loop). This is a shellcheck warning, and actionlint exits non-zero. | It predates this phase: the file last changed in `29ff469` (Phase 1 close) and is unrelated to the steiger job. `ci.yml` alone lints clean. A one-character fix (`for _ in …`) belongs in a lead-owned change to that workflow. | lead |
| 01.1-08 Task 1 | steiger-plugin 0.8.1 analyses only `import` statements, not `export … from` re-exports. So a slice's `index.ts` that re-exports another slice of the same layer (`export { x } from '../other-slice'`) is not reported by `fsd/forbidden-imports`. A cross-slice `import` anywhere in a segment is reported. | It is a tool limitation in the version that passes the 14-day gate. Re-check with steiger 0.9.0 / plugin 0.8.2 (eligible from 2026-11-15) using the plan's original probe. | lead / UL-6 owner |
