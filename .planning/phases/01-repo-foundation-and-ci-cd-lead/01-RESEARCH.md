# Phase 1: Repo foundation and CI/CD (lead) - Research

**Researched:** 2026-11-08
**Domain:** pnpm 12 + Turborepo 2 monorepo tooling, ESLint 10 / TS 6 / Vitest 5 config, GitHub Actions CI + GHCR release, GitHub repo rules on the Free plan
**Confidence:** HIGH for the toolchain (I ran a full prototype of the recommended setup in a scratch directory with the exact pinned versions: install, lint, typecheck, test, build, husky, Docker). MEDIUM for the GitHub-side behaviour (docs + read-only API; nothing was pushed).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Monorepo shape
- **D-01:** pnpm workspaces + Turborepo. Workspace globs `apps/*` and `packages/*`. Layout per STACK §3: `apps/web`, `apps/api`, `packages/contracts`, `packages/config`.
- **D-02:** `apps/web` and `apps/api` are **minimal placeholders only**: a `package.json` with no-op or trivial `lint`, `typecheck`, `test` and `build` scripts (plus whatever tiny source file is needed for typecheck/lint to be meaningful) so the pipeline runs end to end. **No Next.js or NestJS code or dependencies** — those skeletons are the team's Phase 1.1 tickets. Leave a short README/comment in each saying so.
- **D-03:** `packages/contracts` ships **one real zod schema with a test** (Vitest). Suggested: a `TicketKey` schema (`UL-<n>` format, the tracker key used in branch names and PR titles) or a small `HealthResponse` schema the api will later return — planner's choice, but it must be real, exported from the package entry, typed, and tested (valid + invalid cases).
- **D-04:** `packages/config` holds the shared **tsconfig base**, **ESLint flat config** and **Prettier config**; every other package consumes them (no per-package copies). Steiger/FSD presets are Phase 1.1.
- **D-05:** Neutral package scope `@app/*` (`@app/web`, `@app/api`, `@app/contracts`, `@app/config`). The **display name lives in one place** (e.g. `packages/config/src/brand.ts` or a root `brand.json`/`app.config` that docs and workflows read) so the product can be renamed later; GHCR image prefix derives from it or is defined once in the workflow env.

#### Versions and supply chain
- **D-06:** Node **26 LTS** and pnpm **12.x** pinned: `.nvmrc` (or `.node-version`) + root `engines` + `packageManager` field (`pnpm@<exact>`). TypeScript **6.0.3** exactly (not 7.x).
- **D-07:** Versions come from STACK §15, **but the supply-chain rule wins: no release younger than ~14 days (cutoff 2026-10-25 for today's date 2026-11-08)**. STACK §15 was read the same day it was published, so several pins are too new — e.g. pnpm 12.18.0 (2026-11-05), eslint 10.14.0 (2026-10-30), vitest 5.1.0 (2026-11-02), typescript-eslint 8.72.1 (2026-10-26). For each such package use the **newest release published on or before the cutoff within the same major**, and record the chosen version + publish date. Exact pins only (no `^`/`~`), committed `pnpm-lock.yaml`, CI installs with `--frozen-lockfile`. Consider pnpm's `minimumReleaseAge` setting (pnpm ≥ 10.16) in `pnpm-workspace.yaml` to enforce the rule for future installs, if it works with exact pins.
- **D-08:** Respect the compatibility traps in STACK §15: typescript-eslint supports TS `<6.1`, so TS 6.0.3 is the pin.

#### Root tooling
- **D-09:** husky + lint-staged pre-commit (format + lint only staged files). `.editorconfig`, `.gitignore` (node_modules, .turbo, dist, coverage, .env*, except `.env.example`), `.env.example` with **variable names only** (no values), `.nvmrc`/`engines`.
- **D-10:** Root scripts: `lint`, `typecheck`, `test`, `build`, `format`, `format:check` running through Turbo where applicable.

#### CI
- **D-11:** `.github/workflows/ci.yml` on `pull_request` and `push` to `main`: checkout → pnpm setup (version from `packageManager`) → Node from `.nvmrc` with pnpm store cache → `pnpm install --frozen-lockfile` → `pnpm turbo run lint typecheck test build` with Turbo local cache persisted via `actions/cache` (no remote cache / no Vercel token). Also a `format:check`.
- **D-12:** Required status checks must have **stable job names** (e.g. `lint`, `typecheck`, `test`, `build`, or one aggregate `ci` job) so the ruleset can reference them. Planner decides one-job-many-steps vs. separate jobs; prefer separate stable check names matching STACK §14 (`lint`, `typecheck`, `test`, `build`; `steiger` is added by the team in 1.1).
- **D-13:** Pin third-party actions to a **full commit SHA** (with the version in a comment), minimal `permissions:` (`contents: read` in CI), `concurrency` that cancels superseded PR runs, and a timeout per job.
- **D-14:** PR-size warning above ~600 changed lines (STACK §14) — nice-to-have, non-blocking (planner's discretion; skip if it adds complexity).

#### CD skeleton
- **D-15:** `.github/workflows/release.yml` triggers on `release: types: [published]`. It builds the web and api Docker images from **placeholder Dockerfiles** and pushes them to **GHCR**: `ghcr.io/ulbi-project-group-12/ulbigram-web` and `…/ulbigram-api`, tagged with the release tag (and `sha-<short>`), using `GITHUB_TOKEN` with `packages: write` only in that job. Use docker/metadata-action + build-push-action pinned by SHA.
- **D-16:** The **deploy job is a clearly marked stub** (echo + `# TODO(Phase 4)` with the planned steps: compose pull → one-shot migrate → up -d api×2 → /health smoke), gated on the `production` environment name only if that doesn't require settings we can't create; otherwise no environment.
- **D-17:** Placeholder Dockerfiles must actually build and run something trivial (e.g. a tiny Node script printing the app name/version) on `node:26-alpine` (pinned by digest or exact tag), non-root user, `.dockerignore`.
- **D-18:** Document the release process in README: cut `release/x.y` from `main`, then draft a GitHub Release targeting that branch with tag `vx.y.0` and press Publish; hotfix = PR to main + cherry-pick to the release branch + `vx.y.1`; rollback = redeploy the previous tag (Phase 4).

#### Repo rules
- **D-19:** Ruleset on `main`: PR required (1 approval when the team arrives — set `required_approving_review_count` to 1 but note that the sole current member cannot approve own PRs; see D-21), required status checks = the CI jobs, squash merge only, no force-push, no deletion, linear history. Keep the ruleset **as code** in the repo (`.github/rulesets/main.json`) plus a small script/doc command (`gh api … --input`) to apply it.
- **D-20:** **Known platform gap (verified 2026-11-08):** the org is on GitHub Free and the repo is private, so `GET /repos/…/rulesets` and branch protection both return 403 "Upgrade to GitHub Pro or make this repository public", and org rulesets need GitHub Team. So in this phase: commit the ruleset JSON + apply script, set what IS available via the repo settings API (allow squash merge only, disable merge commits and rebase merge, `delete_branch_on_merge`, squash commit title = PR title), and report the gap. Applying the ruleset happens when the lead makes the repo public.
- **D-21:** With one org member, a ruleset that requires 1 approval would block the lead's own Phase-1 PR. When applying later, either start with 0 required approvals until teammates join, or rely on the admin bypass — document the choice in the apply script.
- **D-22:** CODEOWNERS: `@soadap` on `/.planning/`, `/.github/`, and the root configs (`/package.json`, `/pnpm-workspace.yaml`, `/pnpm-lock.yaml`? — planner decides whether the lockfile needs an owner; `/turbo.json`, `/.nvmrc`, `/packages/config/`, `/.editorconfig`, `/.husky/`, CODEOWNERS itself). Leave commented placeholders for the critical paths the team will own (`packages/contracts/**`, `apps/api/src/core/**`, `apps/api/prisma/**`, `infra/**`) per PROCESS §7.
- **D-23:** PR template `.github/pull_request_template.md`: `UL-n` ticket key line, "Done when…" checklist (keep this exact heading — it is the ticket DoD wording from the tracker), test notes, and a short reminder of the review rules (PR ≤ ~400 lines, one ticket = one PR, author answers AI comments first).
- **D-24:** Branch naming `feat/UL-n-short-slug` / `fix/UL-n-short-slug` (also `chore/`, `docs/` allowed), `UL-n` in the PR title (the tracker webhook moves tickets on it: PR opened → IN_REVIEW, merged → DONE). Documented in README + CONTRIBUTING. A lightweight CI check that the PR title contains `UL-\d+` is planner's discretion — if added it must be **non-blocking or allow an escape** (e.g. `[no-ticket]`) because the lead's GSD phase PRs carry no UL key.

#### Docs
- **D-25:** README (English, short): what it is, prerequisites (Node 26, pnpm via corepack is NOT available in Node 26 → install pnpm with `npm i -g pnpm@<pin>` or the standalone script), setup, the scripts, branch/PR/`UL-n` rules, release process, link to `.planning/` and to CONTRIBUTING. CONTRIBUTING.md (English, short): workflow (ticket → branch → PR → review → squash), commit style, review SLA from PROCESS §7, GSD-is-optional note and the one-driver rule for `.planning/` (PROCESS §12).

#### Process
- **D-26:** Work happens on the phase branch `gsd/phase-01-repo-foundation-and-ci-cd-lead` and merges into `main` through a PR (squash), so the PR flow itself is exercised. CI must be green on that PR and then on `main`.
- **D-27:** Do not enable CodeRabbit or any GitHub App, do not add collaborators, do not touch webhooks (the org tracker webhook already covers all repos), never print or commit secrets.

### Claude's Discretion
- Exact zod schema chosen for `@app/contracts` (D-03), file names inside `packages/config`, whether CI uses one matrix job or separate jobs (as long as check names are stable), whether to add the PR-title check and PR-size warning, test runner config details.

### Deferred Ideas (OUT OF SCOPE)
- Steiger as a required check, Storybook build, Postgres/Redis service containers, two-instance socket test, Playwright smoke (STACK §14) — added by later phases.
- Renovate/Dependabot weekly patch bumps (STACK §15) — later; would need to respect the 14-day rule.
- Turbo remote cache.

**Specific ideas (from CONTEXT `<specifics>`):** image names `ghcr.io/ulbi-project-group-12/ulbigram-web` and `ghcr.io/ulbi-project-group-12/ulbigram-api`; the human Publish press is the release trigger (a release created by a workflow's `GITHUB_TOKEN` does not trigger other workflows); try a test pre-release such as `v0.0.1-rc.1` from `release/0.0` at the end of the phase, or explain why it can't be done.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TZ-FE-02 / TZ-BE-02 | typescript | TS 6.0.3 pinned via the catalog; shared `tsconfig` base with the TS 6 default changes handled (§Pattern 3, Pitfall 3). Prototype: `tsc` passes in all 4 packages |
| TZ-FE-10 / TZ-BE-10 | Eslint | ESLint 10.13.0 flat config + typescript-eslint 8.72.0 `strictTypeChecked` exported from `@app/config/eslint` (§Pattern 4). Prototype: `eslint .` passes, typed rules fire |
| TZ-FE-11 / TZ-BE-11 | prettier | Prettier 3.9.10 shared config `@app/config/prettier`, root `format` / `format:check`, `.prettierignore` (§Pattern 5) |
| TZ-FE-12 / TZ-BE-12 | husky | husky 9.1.7 `prepare` + `.husky/pre-commit` → `pnpm exec lint-staged` 17.6.0. Prototype: a staged `any` blocks the commit (§Pattern 6) |
| TZ-FE-16 / TZ-BE-15 | pnpm | pnpm 12.15.0 via `packageManager`; `pnpm-workspace.yaml` with catalog, `minimumReleaseAge`, `engineStrict` (§Pattern 1) |
| TZ-BE-16 | Mandatory linting | `lint` is a required CI check and runs in pre-commit |
| TZ-FE-18 / TZ-BE-17 | Mandatory code review for every task | Ruleset JSON (1 approval, code owners, conversation resolution) as code + CODEOWNERS + PR template. **Not enforceable while the repo is private on Free** (403, verified). Gap must be reported (§Ruleset) |
| TZ-FE-20 / TZ-BE-19 / TZ-CICD-02 | CI on every PR: linters, tests, build, typecheck | `ci.yml` with `lint`, `typecheck`, `test`, `build` jobs on `pull_request` + `push: main`; Turbo cache via actions/cache (§Pattern 7) |
| TZ-CICD-03 | Release = cut a branch + press Release in GitHub | `release.yml` on `release: published` → GHCR; README procedure (§Pattern 8) |
| TZ-CICD-04 | No direct push to main, only PR with review | Ruleset `pull_request` + `non_fast_forward` + `deletion`; **blocked by plan until public** (§Ruleset). Repo merge settings are settable now |
| TZ-CICD-05 | Trunk-based git | Short `feat/UL-n-…` branches, squash-only, linear history, `delete_branch_on_merge`, documented in CONTRIBUTING |
| TZ-PROD-10 | .env locally, GitHub secrets for CI/CD, never commit secrets | `.gitignore` `.env*` + `!.env.example`, names-only `.env.example`, `GITHUB_TOKEN` only (no stored secrets this phase). Secret scanning / push protection are not available while private (verified: `security_and_analysis` is null) |
| TZ-PROCESS-06 | Project init and base configuration | The whole phase: monorepo, shared config, scripts, docs |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

From `/Users/soadap/Developer/ulbigram/.claude/CLAUDE.md` and the user's global CLAUDE.md:

- **Stack:** pnpm workspaces + Turborepo; `apps/web`, `apps/api`, `packages/contracts` (zod), `packages/config` (eslint/tsconfig/prettier).
- **Runtime pins:** Node 26 LTS (26.13.x), pnpm 12.x, TypeScript 6.0.3 (not 7.x), turbo 2.11.10. *CLAUDE.md lists pnpm 12.18.0 / eslint 10.14.0 / typescript-eslint 8.72.1 / vitest 5.1.0. Those are younger than 14 days, and D-07 overrides them (see the version table).*
- **Supply chain:** exact pins (no `^`/`~`), committed lockfile, frozen-lockfile installs in CI, no release younger than ~14 days.
- **Package scope** `@app/*`; the display name lives in one place.
- **Git:** trunk-based, protected `main`, squash merge, branch names `feat/UL-n-…` / `fix/UL-n-…`, `UL-n` in PR titles.
- **Release:** cut `release/x.y` → publish a GitHub Release → `release.yml` builds images to GHCR `ghcr.io/ulbi-project-group-12/ulbigram-*`.
- **Language:** docs and code identifiers in English (the PR template's "Done when…" heading mirrors the tracker's DoD wording, D-23).
- **GSD rule:** only the lead changes `.planning/` on `main`, enforced by CODEOWNERS on `.planning/`.
- **Docs lookups:** prefer Context7 (followed during this research).

## Summary

The recommended toolchain was **built and run end to end in a scratch prototype** with the exact versions below. The prototype had the planned layout (root + `packages/config` + `packages/contracts` with a zod `TicketKey` schema and 11 Vitest cases + two placeholder apps). Results:
- `pnpm install` (pnpm 12.15.0, `minimumReleaseAge: 20160`) resolved 140 packages. All **169 lockfile entries** are older than the 2026-10-25 cutoff, transitive ones included.
- `pnpm turbo run lint typecheck test build` ran 14/14 tasks green on the first try, and a re-run was a full cache hit ("FULL TURBO", 19 ms).
- A husky pre-commit ran lint-staged from the root and blocked a staged `any` through the package's typed ESLint config.
- A placeholder Dockerfile on `node:26.13.0-alpine3.24@sha256:8996…` built from the repo-root context and ran as `uid=1000(node)`.

Two version decisions need the lead's eye:
1. **pnpm.** The ROADMAP success criterion and CLAUDE.md say pnpm **12.18.0**, which is 3 days old. The newest pnpm 12 published before the cutoff is **12.15.0** (2026-10-21). D-07 says the 14-day rule wins, so pin 12.15.0 and update the ROADMAP and CLAUDE.md wording.
2. **Node.** The only Node 26 **LTS** release is **26.13.0** (2026-10-28, 11 days old). The older 26.12.1 is not LTS. Locked D-06 ("Node 26 LTS", CLAUDE.md "26.13.x") and the locally installed v26.13.0 both point to 26.13.0. I recommend 26.13.0 with a documented exception: the 14-day rule is a package-registry rule, and the runtime comes from nodejs.org.

The GitHub side is constrained by the **Free plan + private repo**. These are confirmed by read-only API calls today:
- Rulesets: 403 "Upgrade to GitHub Pro or make this repository public".
- Environments: Free can configure them only on public repos.
- Secret scanning: not exposed.
- Actions: billed against a $12/month allowance.

Four org members have only `read` on the repo, so their approvals would not count. In practice @soadap is still the only reviewer, which makes D-21 still correct. Merge-method settings **are** settable now via `PATCH /repos`. So the plan should:
- commit the ruleset JSON plus an idempotent apply script,
- apply the repo merge settings,
- report the enforcement gap explicitly.

Making the repo public would unlock rulesets, environments, secret scanning, CodeRabbit and free Actions minutes in one step. That is the single highest-leverage open question for the lead.

**Primary recommendation:**
- **Versions:** pnpm 12.15.0 + Node 26.13.0 + a pnpm **catalog** of exact pins with `minimumReleaseAge: 20160` and `engineStrict: true`.
- **Packages:** `@app/config` exports the ESLint factory, the Prettier config and the tsconfig base. `@app/contracts` is a compiled package (types → `src`, runtime → `dist`).
- **Turbo:** transit-node ordering for lint, typecheck and test.
- **CI:** four required jobs `lint`/`typecheck`/`test`/`build` sharing a local composite setup action, with third-party actions SHA-pinned.
- **Release:** `release.yml` uses metadata-action semver tags plus `sha-` tags.
- **Ruleset:** kept as code and applied after the repo goes public.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dependency resolution, version policy (exact pins, 14-day age) | Repo tooling (pnpm-workspace.yaml catalog + lockfile) | CI (frozen install re-verifies policy) | pnpm enforces `minimumReleaseAge` at resolution, and a frozen install re-checks "Lockfile passes supply-chain policies" (prototype) |
| Task orchestration + caching | Repo tooling (turbo.json) | CI (actions/cache of `.turbo/cache`) | No remote cache (deferred). The local cache is persisted per job |
| Shared lint/format/type rules | `packages/config` (workspace package) | Each package's thin `eslint.config.js` / `tsconfig.json` | D-04: no per-package copies, just a 2-line consumer file |
| Shared contracts (zod) | `packages/contracts` | Consumed by apps (types from `src`, runtime from `dist`) | STACK §3.4: FE never waits for BE |
| Local quality gate | Developer machine (husky + lint-staged) | — | Fast feedback on staged files only. CI is the real gate |
| Merge gate (checks + review) | GitHub (ruleset, CODEOWNERS) | CI job names = check contexts | Ruleset blocked on Free/private. Repo merge settings are available now |
| Image build + publish | GitHub Actions (`release.yml`) | GHCR (registry) | Triggered by the human Publish press (TZ-CICD-03) |
| Deploy | Stub only (Phase 4) | — | D-16 |

## Standard Stack

All dates are npm `time` entries read today with `npm view <pkg> time --json`. Rule: the highest semver in the major whose publish date is ≤ 2026-10-25. [VERIFIED: npm registry]

### Core
| Library | Pin | Published | Newest rejected (too young) | Purpose |
|---------|-----|-----------|------------------------------|---------|
| pnpm | **12.15.0** | 2026-10-21 | 12.16.0 (10-26), 12.16.1 (10-27), 12.17.0 (10-30), 12.18.0 (11-05) | Package manager (`packageManager: "pnpm@12.15.0"`) |
| turbo | **2.11.10** | 2026-10-20 | — (latest) | Task runner |
| typescript | **6.0.3** | 2026-04-16 | — (7.0.2 excluded by D-08) | Compiler |
| eslint | **10.13.0** | 2026-10-16 | 10.14.0 (10-30) | Linter |
| @eslint/js | **10.0.1** | 2026-02-06 | — | `js.configs.recommended` |
| typescript-eslint | **8.72.0** | 2026-10-19 | 8.72.1 (10-26, one day past the cutoff) | TS parser + rules (meta package) |
| prettier | **3.9.10** | 2026-10-10 | — | Formatter |
| zod | **4.6.7** | 2026-10-12 | — | Contracts |
| vitest | **5.0.5** | 2026-10-15 | 5.1.0 (11-02) | Test runner |
| vite | **8.3.5** | 2026-10-21 | 8.3.6 (11-05) | **Required peer of vitest 5** (`"vite": { "optional": false }`) |

### Supporting
| Library | Pin | Published | Newest rejected | Purpose |
|---------|-----|-----------|-----------------|---------|
| eslint-config-prettier | **10.1.8** | 2025-07-18 | — | Turns off rules that conflict with Prettier (`eslint-config-prettier/flat`) |
| globals | **17.13.0** | 2026-10-01 | 17.14.0 (11-01) | `globals.node` for flat config |
| husky | **9.1.7** | 2024-11-18 | — | Git hooks |
| lint-staged | **17.6.0** | 2026-09-26 | — | Staged-file runner |
| @types/node | **26.6.5** | 2026-10-09 | 26.6.6 (10-28) | Node 26 types (TS 6 needs explicit `types: ["node"]`) |

Not needed this phase: `@vitest/coverage-v8` (5.0.5 is available if wanted), `jiti` (only needed for `eslint.config.ts`; use `.js` configs).

### Peer / engine compatibility (all read from the registry) [VERIFIED: npm registry]
- `typescript-eslint@8.72.0` peers: `"eslint": "^8.57.0 || ^9.0.0 || ^10.0.0"`, `"typescript": ">=4.8.4 <6.1.0"`. **TS 6.0.3 and ESLint 10.13.0 are both in range.**
- `@eslint/js@10.0.1` peer `"eslint": "^10.0.0"` (optional). `eslint-config-prettier@10.1.8` peer `"eslint": ">=7.0.0"`.
- `eslint@10.13.0` engines `"node": "^20.19.0 || ^22.13.0 || >=24"`. The optional peer `jiti` is only needed for TS config files.
- `vitest@5.0.5` engines `"node": "^22.12.0 || ^24.0.0 || >=26.0.0"`. Peers `"vite": "^6.4.0 || ^7.0.0 || ^8.0.0"` (required) and `"@types/node": "^22.0.0 || >=24.0.0"` (optional). **Node 26 is supported.**
- `vite@8.3.5` engines `"node": "^20.19.0 || >=22.12.0"`. Its deps are `rolldown ~1.2.14` and `lightningcss`, which ship native binaries via optionalDependencies. **No esbuild, no postinstall.**
- `lint-staged@17.6.0` engines `"node": ">=22.22.1"`. `husky@9.1.7` and `pnpm@12.15.0` need `"node": ">=18"`.
- Prototype confirmation: with `engineStrict: true` and Node 26.13.0, the install succeeds, so no dependency rejects Node 26.

### GitHub Actions (same 14-day rule applied to action releases) [VERIFIED: gh api releases + git refs]
| Action | Pin (tag) | Released | Full commit SHA | Rejected |
|--------|-----------|----------|-----------------|----------|
| actions/checkout | v7.0.1 | 2026-07-20 | `3d3c42e5aac5ba805825da76410c181273ba90b1` | — |
| actions/setup-node | v7.1.0 | 2026-10-08 | `949feb2413d6458794dcd2491c4babbbce0c15c1` | — |
| actions/cache | v6.1.0 | 2026-06-26 | `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` | — (note: "latest" points at v5.1.0, but v6.1.0 is the highest) |
| pnpm/action-setup | **v6.1.0** | 2026-09-05 | `ea17c68df8912ef543352723c149a84f56e3d413` (annotated tag dereferenced) | v6.1.1 (2026-11-03, 5 days) |
| docker/setup-buildx-action | v4.4.1 | 2026-09-16 | `f87e5991a6d7451dcb8d9637bfbc97413f497069` | — |
| docker/login-action | **v4.7.0** | 2026-10-23 | `81c6f93d4bc991e510b342a00b419b3bb4efc5c6` | v4.8.0 (2026-11-05) |
| docker/metadata-action | v6.2.0 | 2026-07-02 | `dc802804100637a589fabce1cb79ff13a1411302` | — |
| docker/build-push-action | v7.4.0 | 2026-09-15 | `c3c9e263c25d99ce0380d002d59b67737d91b0dc` | — |

- `pnpm/action-setup` v6.1.0's release note is "feat: support pnpm v12". v6.1.1 only refreshes the native bootstrap (12.3.4 → 12.17.0) and fixes shared-store reuse when pnpm is installed twice into the same `dest`. A single install per job doesn't hit that. [CITED: github.com/pnpm/action-setup/pull/293]
- The README now also points to `pnpm/setup` (installs pnpm + Node in one step). Do not switch: it is a different action whose latest v3.1.2 is from 2026-10-25, right at the cutoff. The `action-setup` + `setup-node` pair is documented as still supported for pnpm 12. [CITED: pnpm/action-setup README]

### Runtime and images
| Item | Pin | Evidence |
|------|-----|----------|
| Node | **26.13.0** (`.nvmrc`), `engines.node: ">=26.13.0 <27"` | nodejs.org index: `v26.13.0 2026-10-28 lts=Lithium`; `v26.12.1 2026-10-21 lts=false security=true` [VERIFIED: nodejs.org/dist/index.json]. Locally installed: v26.13.0 |
| Docker base | `node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216` | Docker Hub tag API. This is the multi-arch index digest (amd64 `sha256:b2646ba6…`, arm64 `sha256:20c29f6a…`), pushed 2026-11-05 [VERIFIED: hub.docker.com API]. Built and run locally today |
| corepack | **not available** | `command -v corepack` → nothing on Node 26.13.0 [VERIFIED: local probe] |

**Installation (local, once per machine):**
```bash
npm i -g pnpm@12.15.0      # verified: npm 11.20 skips pnpm's install scripts but the native exe still works
# or: curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=12.15.0 sh -
pnpm install                # any pnpm 11/12 on PATH auto-switches to packageManager's version (pmOnFail: download)
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vitest 5.0.5 | vitest 4.1.12 (2026-10-15) | 4.x bundles vite. 5.x is the STACK choice, supports Node 26 and worked in the prototype. Use 5.0.5 |
| Separate CI jobs | One `ci` job with steps | One job uses about 4× fewer billed minutes on private Free (see Pitfall 9), but D-12 prefers separate names. Keep separate jobs and revisit if minutes run out |
| `pnpm/action-setup` + `setup-node` | `pnpm/setup` | Fewer steps, but newer and different. Not worth the change now |
| Catalog (`catalog:`) | Exact versions repeated in every package.json | The catalog gives one source of truth for every pin, and CODEOWNERS on `pnpm-workspace.yaml` makes every version change a lead review |

## Package Legitimacy Audit

Seam: `gsd-tools query package-legitimacy check --ecosystem npm <names>` (bare names; the seam does not accept `name@version` and reports such input as "does-not-exist").

| Package | Registry | Age (seam's view = latest dist-tag) | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-------------------------------------|--------------|-------------|---------|-------------|
| typescript | npm | latest 2026-07-08 | 418M | github.com/microsoft/TypeScript | OK | Approved |
| @eslint/js | npm | 2026-02-06 | 179M | github.com/eslint/eslint | OK | Approved |
| eslint-config-prettier | npm | 2025-07-18 | 65M | github.com/prettier/eslint-config-prettier | OK | Approved |
| husky | npm | 2024-11-18 | 49M | github.com/typicode/husky | OK | Approved |
| lint-staged | npm | 2026-09-26 | 40M | github.com/lint-staged/lint-staged | OK | Approved |
| pnpm | npm | latest 2026-11-05 | 326M | github.com/pnpm/pnpm | SUS (too-new) | Flagged. Pin 12.15.0 is 18 days old |
| turbo | npm | 2026-10-20 | 44M | github.com/vercel/turborepo | SUS (too-new) | Flagged. Pin is 19 days old |
| eslint | npm | latest 2026-10-30 | 206M | github.com/eslint/eslint | SUS (too-new) | Flagged. Pin 10.13.0 is 23 days old |
| typescript-eslint | npm | latest 2026-10-26 | 115M | github.com/typescript-eslint/typescript-eslint | SUS (too-new) | Flagged. Pin 8.72.0 is 20 days old |
| globals | npm | latest 2026-11-01 | 320M | github.com/sindresorhus/globals | SUS (too-new) | Flagged. Pin 17.13.0 is 38 days old |
| prettier | npm | 2026-10-10 | 183M | github.com/prettier/prettier | SUS (too-new) | Flagged. Pin is 29 days old |
| vitest | npm | latest 2026-11-02 | 180M | github.com/vitest-dev/vitest | SUS (too-new) | Flagged. Pin 5.0.5 is 24 days old |
| vite | npm | latest 2026-11-05 | 262M | github.com/vitejs/vite | SUS (too-new) | Flagged. Pin 8.3.5 is 18 days old |
| zod | npm | 2026-10-12 | 456M | github.com/colinhacks/zod | SUS (too-new) | Flagged. Pin is 27 days old |
| @types/node | npm | latest 2026-10-28 | 632M | github.com/DefinitelyTyped/DefinitelyTyped | SUS (too-new) | Flagged. Pin 26.6.5 is 30 days old |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** pnpm, turbo, eslint, typescript-eslint, globals, prettier, vitest, vite, zod, @types/node. Every flag is the seam's `too-new` signal, computed from the **latest** release with an apparent ~30-day threshold. None reports a missing repo, low downloads or a postinstall issue. The project rule is 14 days, and every pin above satisfies it (verified per version). **Planner: add one `checkpoint:human-verify` task before the first `pnpm install`, where the lead confirms this version table.** One checkpoint covers all ten, since they are installed together.
**Postinstall scan:** `pnpm@12.15.0` has `preinstall`/`postinstall: node install.js`, the official installer that links the native exe. The prototype showed it works even when npm skips the scripts. `husky` and `turbo` have none (turbo uses `@turbo/<platform>` optionalDependencies), and neither does `vite`. pnpm's `strictDepBuilds` (default `true`) found **no** unapproved build scripts in the full tree, and the install passed. So `allowBuilds` can stay empty this phase. [VERIFIED: npm view scripts + prototype install]
**Internal scope:** `@app/contracts`, `@app/config`, `@app/web` and `@app/api` all return E404 on npm today. Always reference them with `workspace:*` and mark them `"private": true`, so a squatted public `@app/*` can never be fetched. [VERIFIED: npm view]

## Architecture Patterns

### System Architecture Diagram

```
 developer laptop                                    GitHub (org ulbi-project-group-12, Free, private repo)
 ───────────────                                     ───────────────────────────────────────────────────────
 git commit ──► .husky/pre-commit ──► lint-staged
                  (prettier --write, eslint --fix on staged files;
                   eslint finds the nearest package eslint.config.js)
     │ fail ⇒ commit blocked
     ▼
 git push feat/UL-n-slug ─────────────────────────► pull_request event ──► ci.yml
                                                                          │ jobs (parallel, each: checkout → pnpm/action-setup
                                                                          │   (packageManager) → setup-node(.nvmrc, cache pnpm)
                                                                          │   → pnpm install --frozen-lockfile
                                                                          │     [re-checks lockfile vs minimumReleaseAge]
                                                                          │   → restore .turbo/cache)
                                                                          ├─► lint      : format:check + turbo run lint
                                                                          ├─► typecheck : turbo run typecheck
                                                                          ├─► test      : turbo run test   (vitest in contracts)
                                                                          ├─► build     : turbo run build  (^build: contracts → dist)
                                                                          └─► pr-hygiene (non-required): UL-n title / size warnings
                                                                                   │
                                     ruleset (as code; enforced only once public) ◄┘ required contexts lint/typecheck/test/build
                                     + CODEOWNERS review + squash-only merge
                                                                          │ squash merge
                                                                          ▼
                                                                   push: main ──► ci.yml (same jobs, cache warm-up for PRs)
 lead: git switch -c release/0.x origin/main; git push                    │
 lead: GitHub UI → Draft release (target release/0.x, tag v0.x.0) → Publish
                                                                          ▼
                                                                   release: published ──► release.yml
                                                                          ├─► images (matrix web, api; packages: write)
                                                                          │     metadata-action (v0.x.0, 0.x.0, sha-xxxxxxx, latest if not prerelease)
                                                                          │     build-push-action context=. file=apps/<app>/Dockerfile
                                                                          │        └──► ghcr.io/ulbi-project-group-12/ulbigram-<app>
                                                                          └─► deploy (needs images) : echo stub  # TODO(Phase 4)
```

### Recommended Project Structure
```
/
├── .github/
│   ├── actions/setup/action.yml      # local composite: pnpm + node + install + turbo cache (no SHA pin needed for ./ actions)
│   ├── workflows/ci.yml              # lint / typecheck / test / build (+ pr-hygiene)
│   ├── workflows/release.yml         # release: published → GHCR, deploy stub
│   ├── rulesets/main.json            # ruleset as code (apply when public)
│   ├── rulesets/release.json         # optional: block direct pushes to release/* (STACK §14)
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── .husky/pre-commit                 # `pnpm exec lint-staged`
├── scripts/apply-ruleset.sh          # idempotent POST/PUT via gh api
├── scripts/check-pins.mjs            # optional guard: every dep is catalog:/workspace:*, catalog exact
├── apps/web/  apps/api/              # placeholders: package.json, src/main.ts, tsconfig*.json, eslint.config.js, Dockerfile, README.md
├── packages/config/                  # eslint/index.js, prettier/index.js, tsconfig/{base,node}.json, brand.json
├── packages/contracts/               # src/{index,ticket-key}.ts, src/ticket-key.test.ts, vitest.config.ts, tsconfig{,.build}.json
├── .dockerignore .editorconfig .gitattributes .gitignore .prettierignore .env.example .nvmrc
├── package.json  pnpm-workspace.yaml  pnpm-lock.yaml  turbo.json
├── README.md  CONTRIBUTING.md
```

### Pattern 1: pnpm-workspace.yaml with catalog + supply-chain policy
**What:** One file holds the workspace globs, every exact pin (catalog), the age rule and the engine rule. Packages reference pins with `"catalog:"`.
**Verified:** prototype install and frozen install with pnpm 12.15.0. A young pin (eslint 10.14.0) fails with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`. A catalog edit without a lockfile update fails the frozen install with "The current "catalogs" configuration doesn't match the value found in the lockfile". `engineStrict: true` gives `ERR_PNPM_UNSUPPORTED_ENGINE` on a wrong Node, for both `install` and `run`. **Without `engineStrict`, root `engines` is not enforced** (an install with `engines.node: ">=27"` succeeded on Node 26).
```yaml
# Source: pnpm v12.15.0 docs (settings/dependency-resolution.md, catalogs.md, settings/build.md) + prototype
packages:
  - apps/*
  - packages/*

minimumReleaseAge: 20160   # 14 days, in minutes; applies to transitive deps too
# minimumReleaseAgeExclude:  # emergency escape for a security fix: - some-pkg@1.2.3
engineStrict: true          # makes root "engines" (node, pnpm) a hard error
savePrefix: ''              # `pnpm add` writes exact versions
catalogMode: strict         # `pnpm add` must use the catalog
updateNotifier: false

catalog:
  '@eslint/js': 10.0.1
  '@types/node': 26.6.5
  eslint: 10.13.0
  eslint-config-prettier: 10.1.8
  globals: 17.13.0
  husky: 9.1.7
  lint-staged: 17.6.0
  prettier: 3.9.10
  turbo: 2.11.10
  typescript: 6.0.3
  typescript-eslint: 8.72.0
  vite: 8.3.5
  vitest: 5.0.5
  zod: 4.6.7
```
Root `package.json` (verified shape):
```json
{
  "name": "ulbigram",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.15.0",
  "engines": { "node": ">=26.13.0 <27", "pnpm": "12.15.0" },
  "scripts": {
    "build": "turbo run build", "lint": "turbo run lint", "typecheck": "turbo run typecheck",
    "test": "turbo run test", "format": "prettier --write .", "format:check": "prettier --check .",
    "prepare": "husky"
  },
  "prettier": "@app/config/prettier",
  "lint-staged": {
    "*.{ts,tsx,js,mjs,cjs}": ["prettier --write", "eslint --fix --no-warn-ignored"],
    "*.{json,md,yml,yaml}": "prettier --write"
  },
  "devDependencies": {
    "@app/config": "workspace:*", "eslint": "catalog:", "husky": "catalog:", "lint-staged": "catalog:",
    "prettier": "catalog:", "turbo": "catalog:", "typescript": "catalog:"
  }
}
```
Notes:
- With `packageManager` set, pnpm 12 writes a leading **boot document** to `pnpm-lock.yaml` (`packageManagerDependencies: pnpm 12.15.0`). That is expected; commit it. [CITED: pnpm v12.15.0 package_json.md] [VERIFIED: prototype lockfile]
- `pmOnFail` (default `download`) replaced `managePackageManagerVersions`. A developer with any pnpm 12 gets auto-switched to 12.15.0. [CITED: pnpm v12.15.0 settings/cli.md]
- `minimumReleaseAge` default is 1440 since v11. Setting 20160 tightens it. [CITED: pnpm v12.15.0 dependency-resolution.md]

### Pattern 2: turbo.json with transit nodes
**What:** `build` respects package order. `lint`, `typecheck` and `test` run in parallel but still invalidate when a dependency's source changes.
```json
// Source: turborepo v2.11.10 docs (configuring-tasks.mdx "Transit Nodes"); verified in prototype
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "transit": { "dependsOn": ["^transit"] },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["transit"] },
    "lint": { "dependsOn": ["transit"] },
    "test": { "dependsOn": ["transit"] }
  }
}
```
- The cache dir defaults to `.turbo/cache` at the repo root. Per-package `.turbo/` dirs hold only logs. Both are gitignored. [CITED: turborepo v2.11.10 reference/configuration.mdx] [VERIFIED: prototype]
- `envMode` is `strict` by default. No env vars are needed this phase. Add `env`/`globalEnv` when apps start reading env.
- Set `TURBO_TELEMETRY_DISABLED=1` in CI. The first run prints a telemetry notice (seen in the prototype).

### Pattern 3: tsconfig base for TS 6
TS 6.0 changed defaults [CITED: TypeScript 6.0 release notes via Context7 /microsoft/typescript-website]:
- `strict` is now `true` by default.
- `module` defaults to `esnext`, and `target` floats (`es2025`).
- **`types` defaults to `[]`**. Each package must list `"types": ["node"]` or globals like `process` disappear.
- **`rootDir` defaults to the tsconfig directory**. Set `"rootDir": "./src"` in build configs, or output lands in `dist/src/…`.
- `noUncheckedSideEffectImports` is `true`.

Deprecated in 6.0 (removed in 7): `moduleResolution: node`/`node10`/`classic`, `baseUrl`, `target: es5`, `downlevelIteration`, `module: amd|umd|system`, `outFile`, `esModuleInterop: false`. **Use none of these.**
```jsonc
// packages/config/tsconfig/base.json  (verified in prototype with module nodenext)
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "es2024", "lib": ["es2024"],
    "module": "nodenext", "moduleResolution": "nodenext",
    "strict": true, "noUncheckedIndexedAccess": true, "noImplicitOverride": true,
    "verbatimModuleSyntax": true, "isolatedModules": true,
    "skipLibCheck": true, "forceConsistentCasingInFileNames": true, "resolveJsonModule": true,
    "types": []
  }
}
```
- Placeholder apps and contracts additionally set `"erasableSyntaxOnly": true` and `"types": ["node"]`. **Keep `erasableSyntaxOnly` out of the shared base.** NestJS (Phase 1.1) relies on constructor parameter properties and enums, which that flag forbids. Phase 1.1 will add `next.json` (`module: esnext`, `moduleResolution: bundler`, `jsx`) and `nest.json` (decorators) next to the base. The split is a recommendation and was not verified [ASSUMED].
- Consumers use `"extends": "@app/config/tsconfig/base.json"`, which resolves through the package `exports` map (verified).

### Pattern 4: ESLint 10 flat config shared as a factory
**What:** `@app/config/eslint` exports `base({ tsconfigRootDir })`. Each package has a 2-line `eslint.config.js`.
- ESLint 10 looks up `eslint.config.*` **from each linted file's directory upward**. This is now the default, and the flag was removed. So running `eslint` from the root (lint-staged) automatically uses each package's own config. [CITED: eslint v10.5.0 migrate-to-10.0.0.md] [VERIFIED: prototype lint-staged run]
- Also removed in ESLint 10: `.eslintrc*` support.
- The ESLint plugins/configs are `dependencies` of `@app/config`, so they resolve from the config package's location. `eslint` itself is a devDependency of each package (for the bin).
```js
// packages/config/eslint/index.js — verified (eslint 10.13.0, typescript-eslint 8.72.0, TS 6.0.3)
// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @param {{ tsconfigRootDir: string }} opts */
export function base({ tsconfigRootDir }) {
  return defineConfig(
    globalIgnores(['dist/**', 'coverage/**', '.turbo/**']),
    {
      files: ['**/*.{ts,tsx,js,mjs,cjs}'],
      extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: { projectService: true, tsconfigRootDir },
      },
    },
    { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
    prettier,
  );
}
```
```js
// <package>/eslint.config.js
import { base } from '@app/config/eslint';
export default base({ tsconfigRootDir: import.meta.dirname });
```
- `tsconfigRootDir` defaults to the directory of the ESLint config file, detected from the call stack. Passing it explicitly avoids the documented edge cases when the config is built inside a shared package. [CITED: typescript-eslint v8.70 Parser.mdx]
- Use ESLint's `defineConfig` (`eslint/config`). The older `tseslint.config()` helper is superseded. [CITED: typescript-eslint Shared_Configurations.mdx]
- Use `.js` config files, not `.ts` (`.ts` would need the `jiti` peer).
- Each package's `tsconfig.json` must `include` `*.ts` config files such as `vitest.config.ts`, or the project service can't type them. `.js` files are handled by `disableTypeChecked`.

### Pattern 5: Prettier shared config
- `packages/config/prettier/index.js` exports a default config object. The root `package.json` has `"prettier": "@app/config/prettier"`. Verified: prettier resolved it.
- Prettier 3 reads `.gitignore` too [ASSUMED]. Add a `.prettierignore` with at least `pnpm-lock.yaml` (the prototype's `format:check` flagged the lockfile), `.planning/` and `.claude/`, so GSD-managed markdown isn't reformatted. The `.planning/` and `.claude/` entries are a recommendation.

### Pattern 6: husky 9 + lint-staged 17
- `"prepare": "husky"` runs on `pnpm install`. It sets `core.hooksPath=.husky/_` (verified).
- `.husky/pre-commit` contains just `pnpm exec lint-staged`. Husky 9 hooks are plain shell, with no `husky.sh` sourcing line.
- In CI, set `HUSKY=0` (prints "HUSKY=0 skip install", exit 0). Without `.git`, `husky` prints ".git can't be found" and still exits 0, so Docker or tarball installs don't break. [VERIFIED: prototype]
- Keep typecheck and tests out of pre-commit. They are CI's job, and typed lint on staged files already takes a few seconds.

### Pattern 7: CI workflow (separate stable jobs, shared composite setup)
```yaml
# .github/actions/setup/action.yml — local composite (referenced as ./.github/actions/setup; no SHA pin needed)
name: setup
description: pnpm + Node + frozen install + Turbo cache
runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0 — version read from packageManager
    - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
      with:
        node-version-file: .nvmrc
        cache: pnpm                      # pnpm must already be on PATH (hence action-setup first)
    - run: pnpm install --frozen-lockfile
      shell: bash
    - uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0
      with:
        path: .turbo/cache
        key: turbo-${{ runner.os }}-${{ github.job }}-${{ github.sha }}
        restore-keys: |
          turbo-${{ runner.os }}-${{ github.job }}-
```
```yaml
# .github/workflows/ci.yml
name: ci
on:
  pull_request:            # NO paths/paths-ignore: a skipped workflow leaves required checks "Pending" forever
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
env:
  HUSKY: '0'
  TURBO_TELEMETRY_DISABLED: '1'
jobs:
  lint:
    name: lint                # check context = job name; keep stable, no matrix on required jobs
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - uses: ./.github/actions/setup
      - run: pnpm format:check
      - run: pnpm turbo run lint
  typecheck:   { name: typecheck, …same steps…, run: pnpm turbo run typecheck }
  test:        { name: test,      …same steps…, run: pnpm turbo run test }
  build:       { name: build,     …same steps…, run: pnpm turbo run build }
  pr-hygiene:                    # optional, NOT a required check
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - env:                     # never interpolate ${{ github.event.pull_request.title }} inside run:
          TITLE: ${{ github.event.pull_request.title }}
          CHANGED: ${{ github.event.pull_request.additions }}+${{ github.event.pull_request.deletions }}
        run: |
          if ! grep -Eq 'UL-[0-9]+|\[no-ticket\]' <<<"$TITLE"; then echo "::warning::PR title has no UL-n key (add it, or [no-ticket])"; fi
          total=$(( ${CHANGED/+/ + } ))
          if [ "$total" -gt 600 ]; then echo "::warning::PR changes $total lines (> 600). Consider splitting."; fi
```
(The `…same steps…` shorthand is for readability. The planner writes out checkout + `./.github/actions/setup` in each job.)
- The local composite runs after `actions/checkout`, since it lives in the repo.
- Check-name mapping: the check run's name is the job's `name:` (or its id when unset). The ruleset `context` must match exactly, e.g. `lint`. A matrix job reports as `name (value)`, so required jobs must not be matrices. Restrict contexts with `integration_id: 15368` (the GitHub Actions app, verified with `gh api apps/github-actions`) so a same-named status from another source can't satisfy them.
- A job **skipped by `if:` reports Success**. A workflow **skipped by path/branch filters leaves the check Pending and blocks merge**. [CITED: docs.github.com troubleshooting-required-status-checks]

### Pattern 8: release.yml (GHCR) + deploy stub
```yaml
name: release
on:
  release:
    types: [published]       # fires for stable AND pre-releases published from drafts; drafts never fire
permissions: {}
concurrency:
  group: release-${{ github.event.release.tag_name }}
  cancel-in-progress: false
jobs:
  images:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    permissions:
      contents: read
      packages: write
    strategy:
      fail-fast: true
      matrix:
        app: [web, api]
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with: { persist-credentials: false }
      - id: brand              # single source of the product slug (D-05)
        run: echo "prefix=ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/$(jq -r .slug packages/config/brand.json)" >> "$GITHUB_OUTPUT"
      - uses: docker/setup-buildx-action@f87e5991a6d7451dcb8d9637bfbc97413f497069 # v4.4.1
      - uses: docker/login-action@81c6f93d4bc991e510b342a00b419b3bb4efc5c6 # v4.7.0
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@dc802804100637a589fabce1cb79ff13a1411302 # v6.2.0
        with:
          images: ${{ steps.brand.outputs.prefix }}-${{ matrix.app }}
          tags: |
            type=semver,pattern={{raw}}
            type=semver,pattern={{version}}
            type=sha
          # flavor latest=auto (default): `latest` only for non-prerelease semver
      - uses: docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc # v7.4.0
        with:
          context: .                                  # default is a Git URL context; use the checkout
          file: apps/${{ matrix.app }}/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          build-args: APP_VERSION=${{ github.event.release.tag_name }}
          cache-from: type=gha,scope=${{ matrix.app }}
          cache-to: type=gha,mode=max,scope=${{ matrix.app }}
  deploy:
    needs: images
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    permissions: {}
    # environment: production   # TODO(Phase 4): Free plan cannot configure environments on private repos
    steps:
      - run: |
          echo "Deploy is a stub until Phase 4 (server). Planned steps:"
          echo "  1. ssh to VPS: docker compose pull"
          echo "  2. one-shot migrate service (prisma migrate deploy)"
          echo "  3. docker compose up -d (api replicas: 2)"
          echo "  4. smoke GET /health on each replica"
```
Tag outputs:
- For tag `v0.1.0`: `v0.1.0`, `0.1.0`, `sha-<7>`, `latest`.
- For `v0.0.1-rc.1`: `v0.0.1-rc.1`, `0.0.1-rc.1`, `sha-<7>`, no `latest`. Pre-releases only extend `{{version}}`/`{{raw}}`, and `latest=auto` is emitted only for non-prerelease semver.
[CITED: docker/metadata-action README + autodocs via Context7] The behaviour of `type=semver` on a `release` event is [ASSUMED]. `GITHUB_REF` is `refs/tags/<tag>` there [CITED: docs.github.com events-that-trigger-workflows], so the semver processor sees a tag ref. Verify in the test release.

The `type=gha` BuildKit cache is optional and can be dropped if it misbehaves. It counts against the 10 GB per-repo Actions cache. [CITED: docs.github.com billing/github-actions]

### Pattern 9: Placeholder app + Dockerfile (verified build + run, non-root)
```ts
// apps/api/src/main.ts (web identical with its own name) — runs via `tsc` build AND directly via Node 26 type stripping
const name = '@app/api';
const version = process.env['APP_VERSION'] ?? 'dev';
console.log(`${name} ${version}: placeholder — the NestJS skeleton arrives in Phase 1.1`);
```
```dockerfile
# apps/api/Dockerfile — placeholder; Phase 1.1/4 replace it with a multi-stage pnpm build (pnpm deploy --filter)
FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216
ARG APP_VERSION=dev
ENV NODE_ENV=production APP_VERSION=$APP_VERSION
WORKDIR /app
COPY --chown=node:node apps/api/package.json ./package.json
COPY --chown=node:node apps/api/src/main.ts ./src/main.ts
USER node
CMD ["node", "src/main.ts"]
```
```
# .dockerignore (repo root; allow-list) — verified
**
!apps/*/package.json
!apps/*/src/**
```
- Build from the root context with a per-app `-f` (`docker build -f apps/api/Dockerfile .`). The real multi-stage builds will need `packages/*` and the lockfile in the context, so the context is already the root.
- In the prototype, `node src/main.ts` runs on Node 26.13.0 with no flag (type stripping) and no warning was printed. The image runs as `uid=1000(node)`.
- Placeholder `package.json` scripts: `build: tsc -p tsconfig.build.json`, `typecheck: tsc --noEmit`, `lint: eslint .`, `test: echo "@app/api: no tests yet (Phase 1.1)"`. These were the prototype's scripts.

### Pattern 10: @app/contracts as a compiled package
```json
// packages/contracts/package.json (verified)
{
  "name": "@app/contracts", "version": "0.0.0", "private": true, "type": "module",
  "exports": { ".": { "types": "./src/index.ts", "default": "./dist/index.js" } },
  "scripts": { "build": "tsc -p tsconfig.build.json", "typecheck": "tsc --noEmit", "lint": "eslint .", "test": "vitest run" },
  "dependencies": { "zod": "catalog:" },
  "devDependencies": { "@app/config": "workspace:*", "@types/node": "catalog:", "eslint": "catalog:",
                       "typescript": "catalog:", "vite": "catalog:", "vitest": "catalog:" }
}
```
- Types point to `src`, so consumers typecheck **without** building first (transit nodes suffice). Runtime points to `dist`, so plain Node / NestJS can import it.
- Verified: an app importing `@app/contracts` got a correct TS2322 error on a wrong use. `import { TicketKey } from '@app/contracts'` at runtime resolved `dist`.
- `tsconfig.build.json`: `rootDir: ./src`, `outDir: ./dist`, `declaration`, `declarationMap`, `exclude: ["src/**/*.test.ts"]`.
- Source imports use `.js` extensions (`./ticket-key.js`), as nodenext requires.
- Vitest config: `import { defineConfig } from 'vitest/config'; export default defineConfig({ test: { include: ['src/**/*.test.ts'], environment: 'node' } })`. List `vite` explicitly as a devDependency. pnpm would auto-install the peer, but it would bypass the catalog pin. [CITED: vitest v5.0.3 migration guide]

### Anti-Patterns to Avoid
- **`paths`/`paths-ignore` on ci.yml:** required checks stay Pending on docs-only PRs.
- **Matrix for required jobs:** the check name becomes `test (x)` and breaks the ruleset contexts.
- **`${{ github.event.pull_request.title }}` inside `run:`:** script injection. Pass it via `env:`.
- **`pull_request_target`:** not needed, and it is the classic "pwn request" vector.
- **Per-package copies of eslint/tsconfig/prettier:** violates D-04. Packages only call `base()` / `extends`.
- **`^`/`~` anywhere, or internal deps by version instead of `workspace:*`:** violates the pin rule and opens dependency confusion.
- **Pushing a GHCR image from a laptop before the workflow does:** see Pitfall 6.
- **`environment: production` in a private Free repo:** it can't be configured, so leave it commented (D-16).

## Ruleset as code (D-19/D-20/D-21)

Schema from `POST /repos/{owner}/{repo}/rulesets`. The `pull_request` rule requires `dismiss_stale_reviews_on_push`, `require_code_owner_review`, `require_last_push_approval`, `required_approving_review_count` and `required_review_thread_resolution`. The `required_status_checks` rule requires `required_status_checks[]` and `strict_required_status_checks_policy`. Bypass `actor_type` ∈ `Integration|OrganizationAdmin|RepositoryRole|Team|DeployKey|User`, and `bypass_mode` ∈ `always|pull_request|exempt`. [CITED: docs.github.com/rest/repos/rules#create-a-repository-ruleset]

```json
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [
    { "actor_type": "OrganizationAdmin", "actor_id": 1, "bypass_mode": "pull_request" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "lint", "integration_id": 15368 },
          { "context": "typecheck", "integration_id": 15368 },
          { "context": "test", "integration_id": 15368 },
          { "context": "build", "integration_id": 15368 }
        ]
      }
    }
  ]
}
```
- **D-21 choice:** `OrganizationAdmin` with `bypass_mode: "pull_request"` lets the lead merge his own PR without an approval, still only through a PR. Direct pushes stay blocked. `actor_id` is "Ignored for OrganizationAdmin" per the docs, so the value `1` is a placeholder [CITED]. Alternative: set `required_approving_review_count: 0` until teammates get write access. Currently 4 members have only `read`, and read-only approvals don't count.
- `strict_required_status_checks_policy: false`: a squash-merged linear history doesn't need "branch up to date", and `true` would multiply CI runs, which matters on the minutes budget.
- Apply (idempotent):
```bash
#!/usr/bin/env bash
# scripts/apply-ruleset.sh — returns 403 while the repo is private on GitHub Free (verified 2026-11-08)
set -euo pipefail
REPO="${REPO:-ulbi-project-group-12/ulbigram}"
FILE="${1:-.github/rulesets/main.json}"
NAME="$(jq -r .name "$FILE")"
ID="$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name==\"$NAME\") | .id")"
if [ -n "$ID" ]; then gh api -X PUT "repos/$REPO/rulesets/$ID" --input "$FILE"
else gh api -X POST "repos/$REPO/rulesets" --input "$FILE"; fi
```
- Settable **now** on Free/private (executor task, D-20). Values come from `PATCH /repos/{owner}/{repo}`: `squash_merge_commit_title` ∈ `PR_TITLE|COMMIT_OR_PR_TITLE`, `squash_merge_commit_message` ∈ `PR_BODY|COMMIT_MESSAGES|BLANK`. [CITED: docs.github.com/rest/repos/repos#update-a-repository]
```bash
gh api -X PATCH repos/ulbi-project-group-12/ulbigram \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true -F allow_update_branch=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY
```
  Current values (read today): `allow_merge_commit: true`, `allow_rebase_merge: true`, `delete_branch_on_merge: false`, `squash_merge_commit_title: "COMMIT_OR_PR_TITLE"`, `squash_merge_commit_message: "COMMIT_MESSAGES"`. [VERIFIED: gh api repos/ulbi-project-group-12/ulbigram]
- Optional, also available now: `PUT repos/{o}/{r}/actions/permissions` with `"sha_pinning_required": true`. The current response is `{"enabled":true,"allowed_actions":"all","sha_pinning_required":false}`. It makes GitHub reject any unpinned action. Planner's discretion; it fits D-13. [VERIFIED: gh api, field present] Whether setting it to `true` is allowed on the Free plan is [ASSUMED].

### CODEOWNERS (`.github/CODEOWNERS`)
```
/.planning/            @soadap
/.github/              @soadap
/.husky/               @soadap
/packages/config/      @soadap
/package.json          @soadap
/pnpm-workspace.yaml   @soadap
/turbo.json            @soadap
/.nvmrc                @soadap
/.editorconfig         @soadap
/.prettierignore       @soadap
/scripts/              @soadap
# Critical paths for the team (PROCESS §7) — uncomment when GitHub teams exist and members have write access:
# /packages/contracts/    @ulbi-project-group-12/<team>
# /apps/api/src/core/     @ulbi-project-group-12/<team>
# /apps/api/prisma/       @ulbi-project-group-12/<team>
# /infra/                 @ulbi-project-group-12/<team>
```
- Recommendation: **do not own `pnpm-lock.yaml`**. Every version or new-dependency change already touches `pnpm-workspace.yaml` (the catalog), which is owned. Owning the lockfile would make @soadap a required reviewer on every package-local change.
- Validate after push with `gh api repos/ulbi-project-group-12/ulbigram/codeowners/errors`. Today it returns 404 because there is no file yet.
- Owners need write access (@soadap is admin). The org has **no teams yet** (`gh api orgs/…/teams` returned empty), so team placeholders must stay commented.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 14-day release-age policy | A script that queries npm `time` | `minimumReleaseAge: 20160` | It covers transitive deps, re-verifies on frozen installs and fails with a clear error (prototype) |
| Single place for pins | Version constants or a sync script | pnpm `catalog:` | Native, lockfile-tracked, `catalogMode: strict` for `pnpm add` |
| Node version enforcement | A preinstall check script | `engines` + `engineStrict: true` + `.nvmrc` | Verified hard error. CI reads `.nvmrc` |
| Image tags/labels | Shell string-building of tags | docker/metadata-action | Semver/prerelease/latest rules and OCI labels |
| Task caching | A hash-your-own-files cache | turbo + actions/cache on `.turbo/cache` | Correct invalidation through the package graph |
| Git hooks install | A custom `core.hooksPath` script | husky 9 `prepare` | Handles no-`.git` and `HUSKY=0` cleanly |
| Typed-lint project wiring | `tsconfig.eslint.json` per package | `projectService: true` | The officially recommended replacement |

**Key insight:** pnpm 12 already has every supply-chain control this phase needs (age gate, catalog, engine gate, build-script gate on by default). The plan is mostly configuration plus thin glue.

## Common Pitfalls

### Pitfall 1: Pins in ROADMAP / CLAUDE.md are younger than 14 days
**What goes wrong:** Installing pnpm 12.18.0, eslint 10.14.0, typescript-eslint 8.72.1 or vitest 5.1.0 violates D-07. With `minimumReleaseAge` on, the install fails with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`.
**How to avoid:** Use the version table above. Update the wording of ROADMAP SC1 ("pnpm 12.18.0") and CLAUDE.md's stack line in the phase's docs task.
**Warning signs:** the error code above. A `pnpm` "Update available! 12.15.0 → 12.18.0" banner is harmless (disable it with `updateNotifier: false`).

### Pitfall 2: Root `engines` silently not enforced
**What goes wrong:** pnpm 12 ignores the root `engines.node` mismatch unless `engineStrict: true` (verified).
**How to avoid:** Set `engineStrict: true` in `pnpm-workspace.yaml`.

### Pitfall 3: TS 6 defaults break the build quietly
**What goes wrong:** `process`/`node:*` types are missing (`types` defaults to `[]`), or output lands in `dist/src/` (`rootDir` default change).
**How to avoid:** Set `"types": ["node"]` per package and `"rootDir": "./src"` in build configs. Never use `baseUrl` or `moduleResolution: node`.

### Pitfall 4: Vitest 5 without explicit `vite`
**What goes wrong:** `vite` is a required peer. pnpm auto-installs it, outside the catalog. A newer vite later could slip in, or the install fails the age gate.
**How to avoid:** Pin `vite: 8.3.5` in the catalog and list it in contracts' devDependencies.

### Pitfall 5: Required checks never report
**What goes wrong:** Path filters, a renamed job, or a matrix job → "Waiting for status to be reported" → the PR can't merge.
**How to avoid:** Use stable `name:` values, no path filters, no matrices on required jobs. Update `.github/rulesets/main.json` in the same PR as any job rename.

### Pitfall 6: GHCR namespace poisoned by a manual push
**What goes wrong:** If someone pushes `ghcr.io/ulbi-project-group-12/ulbigram-api` from a laptop first, the package isn't linked to the repo, and "`GITHUB_TOKEN` won't have push permission". [CITED: docs.github.com working-with-the-container-registry]
**How to avoid:** The first push must come from `release.yml`. Workflow pushes are auto-linked to the repo and inherit its access. New packages are private by default. Today the org has no container packages (verified, empty list).

### Pitfall 7: release.yml must exist at the released commit
**What goes wrong:** For `release` events the workflow runs from the tagged commit (`GITHUB_SHA` = "Last commit in the tagged release"). A test release cut before Phase 1 merges has no `release.yml` and nothing runs.
**How to avoid:** Merge the phase PR first. Then cut `release/0.0` from `main` and publish `v0.0.1-rc.1` (tick "Set as a pre-release"). Tags must be full semver `vX.Y.Z[-pre]`, or metadata-action emits only the `sha-` tag. [CITED: docs.github.com events-that-trigger-workflows]

### Pitfall 8: A release created by automation doesn't trigger
**What goes wrong:** A release created with `GITHUB_TOKEN` (e.g. a release-please workflow) doesn't start `release.yml`. Releases created by a human in the UI, or with `gh release create` using the lead's own token, do. [CITED: docs.github.com — "other GITHUB_TOKEN-triggered events do not create workflow runs"]

### Pitfall 9: Actions minutes on private Free
**What goes wrong:** The Free org's private-repo allowance is a $12/month credit, about 2,000 Linux minutes at $0.006/min (my arithmetic). [CITED: docs.github.com billing/github-actions] Four parallel jobs bill four jobs per run. If per-job round-up applies [ASSUMED], a ~40 s job bills a full minute. At 8 developers and ~20 pushes/day, that's ~80–100 min/day, so the allowance would be gone in ~3–4 weeks.
**How to avoid:** Make the repo public before the team starts (free minutes, plus rulesets, CodeRabbit, secret scanning). Alternatively, collapse to fewer jobs. Watch usage: `gh api /organizations/ulbi-project-group-12/settings/billing/usage` (endpoint [ASSUMED]) or the Billing page.

### Pitfall 10: Read-only org members can't satisfy reviews
**What goes wrong:** The 4 other org members (b0006, OlyaJ, tatianaTravkina, weare66) have the org-default `read` role on the repo. Their approvals don't count toward required reviews. [VERIFIED: gh api collaborators] Whether read-role approvals count is [ASSUMED], but it is standard GitHub behaviour.
**How to avoid:** Give teammates write access (preferably via a GitHub team) when the team phase starts. Until then the bypass or a 0-approval count is required (D-21). Adding collaborators is out of scope (D-27); just document it.

### Pitfall 11: Root-level JS/TS files without a root ESLint config
**What goes wrong:** ESLint 10's file-based lookup finds no config for a root `*.js` (e.g. `scripts/check-pins.mjs`), so lint-staged's `eslint` errors with "could not find config file".
**How to avoid:** Either add a root `eslint.config.js` (`base({ tsconfigRootDir: import.meta.dirname })` plus a root `tsconfig.json` that includes `scripts/`), or exclude root scripts from the lint-staged eslint glob. Recommend the root config: it keeps `scripts/` linted. The failure itself is [ASSUMED] from the documented lookup behaviour; the prototype had no root JS.

## Code Examples

### Contracts schema + test (verified: 11 tests pass under vitest 5.0.5 / zod 4.6.7)
```ts
// packages/contracts/src/ticket-key.ts
import { z } from 'zod';

export const TICKET_KEY_PATTERN = /^UL-[1-9]\d*$/;
export const TicketKey = z
  .string()
  .regex(TICKET_KEY_PATTERN, { error: 'Expected a ticket key like UL-12' })
  .brand<'TicketKey'>();
export type TicketKey = z.infer<typeof TicketKey>;
```
```ts
// packages/contracts/src/ticket-key.test.ts
import { describe, expect, it } from 'vitest';
import { TicketKey } from './index.js';

describe('TicketKey', () => {
  it.each(['UL-1', 'UL-42', 'UL-1000'])('accepts %s', (v) => {
    expect(TicketKey.safeParse(v).success).toBe(true);
  });
  it.each(['UL-0', 'ul-1', 'UL-', 'UL-01', 'PR-1', ' UL-1', 'UL-1a', ''])('rejects %j', (v) => {
    expect(TicketKey.safeParse(v).success).toBe(false);
  });
});
```
The tracker's exact key grammar (e.g. whether `UL-0` or leading zeros exist) was not checked [ASSUMED]. The regex above is a reasonable reading of "`UL-<n>`".

### Exact-pin guard (optional, verified: passes clean, fails on `zod: ^4.6.7`)
```js
// scripts/check-pins.mjs — run in the lint job: `node scripts/check-pins.mjs`
import { globSync, readFileSync } from 'node:fs';

const errors = [];
const EXACT = /^\d+\.\d+\.\d+$/;
const manifests = ['package.json', ...globSync('{apps,packages}/*/package.json')];
for (const file of manifests) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (spec !== 'catalog:' && spec !== 'workspace:*') errors.push(`${file}: ${field}.${name} = "${spec}"`);
    }
  }
}
const catalog = readFileSync('pnpm-workspace.yaml', 'utf8').split(/^catalog:\s*$/m)[1]?.split(/^\S/m)[0] ?? '';
for (const line of catalog.split('\n')) {
  const m = line.match(/^\s+'?([^':]+)'?:\s*(\S+)\s*$/);
  if (m && !EXACT.test(m[2])) errors.push(`pnpm-workspace.yaml: catalog ${m[1]} = "${m[2]}"`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`check-pins: ${manifests.length} manifests OK`);
```

### Misc files
- `.gitignore`: `node_modules`, `.turbo`, `dist`, `coverage`, `.env*`, `!.env.example`, `*.tsbuildinfo`.
- `.gitattributes`: `* text=auto eol=lf` (mixed OS team; Prettier's default `endOfLine` is `lf`).
- `.editorconfig`: `root = true`, `[*] charset=utf-8, end_of_line=lf, indent_style=space, indent_size=2, insert_final_newline=true, trim_trailing_whitespace=true`, and `[*.md] trim_trailing_whitespace=false`.
- `.env.example`: names only, e.g. `NODE_ENV=`. A comment that Phase 1.1+ adds `DATABASE_URL=`, `REDIS_URL=`. No values (TZ-PROD-10).
- `packages/config/brand.json`: `{ "displayName": "ulbigram", "slug": "ulbigram" }`. Docs say "ulbigram (working name)". `release.yml` reads `slug`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| corepack `enable` for pnpm | Not bundled with Node 26; `packageManager` + pnpm self-switch (`pmOnFail`) | Node 25+ / pnpm 11 | README must say `npm i -g pnpm@12.15.0` |
| `managePackageManagerVersions`, `packageManagerStrict*` | `pmOnFail: download\|error\|warn\|ignore` | pnpm 11.0 | Old settings are removed |
| `onlyBuiltDependencies` | `allowBuilds` map + `strictDepBuilds: true` default | pnpm 10.26 / 11 | Unapproved postinstall = install error |
| `.eslintrc*`, cwd-based config lookup | Flat config only, lookup from each file's directory | ESLint 10.0 | Per-package `eslint.config.js` works from the root |
| `parserOptions.project` + `tsconfig.eslint.json` | `projectService: true` | typescript-eslint 8 | No extra tsconfigs |
| TS `types` auto-includes all `@types` | `types: []` default | TS 6.0 | Must list `node` |
| vitest bundles vite | vite is a required peer | Vitest 5.0 | Pin vite explicitly |

**Deprecated/outdated:** `moduleResolution: node10`, `baseUrl`, `esModuleInterop: false` (TS 6). `tseslint.config()` in favour of `defineConfig`. Husky's `. "$(dirname "$0")/_/husky.sh"` hook preamble (v9).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Pinning Node **26.13.0** (11 days old, the only 26.x LTS) is acceptable because the 14-day rule targets registry packages | Standard Stack / Summary | If the lead wants the rule applied to runtimes too, use 26.12.1 (non-LTS, security release 2026-10-21) in `.nvmrc`, engines and the Docker tag `26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797` (pushed 2026-10-22) |
| A2 | Applying the 14-day rule to GitHub Actions releases (rejecting action-setup v6.1.1, login-action v4.8.0) is desired | Standard Stack | Low: the newer patches only refresh bootstraps / minor fixes |
| A3 | metadata-action `type=semver` produces tags on a `release: published` event | Pattern 8 | No version tags (only `sha-`). The fallback is `type=raw,value=${{ github.event.release.tag_name }}`. Verify in the test release |
| A4 | metadata-action labels include `org.opencontainers.image.source`; linking also happens automatically for workflow pushes | Pattern 8 / Pitfall 6 | Low: GitHub docs confirm auto-linking for workflow pushes |
| A5 | Actions minutes are rounded up per job on private repos | Pitfall 9 | Only affects the budget estimate |
| A6 | Read-role approvals don't count toward required reviews | Pitfall 10 / Ruleset | If wrong, D-21's bypass is merely unnecessary |
| A7 | `OrganizationAdmin` bypass with `actor_id: 1` is accepted (docs: actor_id ignored) | Ruleset | The POST may need `actor_id` omitted or set to null. Adjust when applying (only possible after going public) |
| A8 | `sha_pinning_required: true` can be set on Free/private | Ruleset | It's optional; skip it if refused |
| A9 | ESLint errors on root-level JS without a root config | Pitfall 11 | Low: adding a root config is harmless either way |
| A10 | `ubuntu-24.04` runner label is available | Patterns 7/8 | Use `ubuntu-latest` instead |
| A11 | Tracker key grammar is `UL-[1-9]\d*` | Code Examples | Adjust the regex and tests |
| A12 | Prettier 3 also honours `.gitignore` by default | Pattern 5 | `dist`/`.turbo` may need to be listed in `.prettierignore` |
| A13 | Splitting tsconfig into base + node (+ next/nest in 1.1) is the right shape | Pattern 3 | Low: only affects file layout |
| A14 | The `type=gha` BuildKit cache works without extra permissions | Pattern 8 | Drop `cache-from`/`cache-to` |

## Open Questions (RESOLVED)

1. **Make the repo public now or later?** RESOLVED (D-30): stays private. Phase 1 reports the gap and ships `scripts/apply-repo-rules.sh` (plan 01-08), which applies settings now and rulesets once the lead makes the repo public.
   - What we know: Free + private blocks rulesets (403), environment config and secret scanning (`security_and_analysis: null`), and bills Actions minutes. Public unlocks all of these, and CodeRabbit, for free.
   - What's unclear: the lead's timing (Phase 1 only reports the gap, D-20).
   - Recommendation: the plan ends with a "gap report" section. Applying the ruleset is a 1-command follow-up (`scripts/apply-ruleset.sh`) once public.
2. **ROADMAP SC1 says "pnpm 12.18.0".** RESOLVED (D-28): pnpm 12.15.0. ROADMAP SC1 and CLAUDE.md already read 12.15.0.
   - Recommendation: pin 12.15.0 per D-07. The docs task updates the ROADMAP SC1 and CLAUDE.md wording (the lead owns `.planning/`).
3. **Test release cleanup.** RESOLVED (D-32, planner): after the images are verified, delete the test release, its tag and the `release/0.0` branch. Keep the rc images in GHCR. README states this (plan 01-09); the orchestrator runs it after merge.
   - What we know: deleting the release and tag is easy: `gh release delete v0.0.1-rc.1 --cleanup-tag --yes`. Deleting GHCR versions needs the `delete:packages` scope. The local token has `read:packages` but not `delete:packages` (verified), so it needs `gh auth refresh -s delete:packages` or the UI.
   - Recommendation: keep the rc images (storage is free for GHCR, per docs "currently free") and delete only the release and tag, or keep all of it as evidence.
4. **Should release.yml re-run lint/test before building?** RESOLVED (planner): no, not in Phase 1 (recommendation below).
   - Recommendation: not in Phase 1. The release branch is cut from a green `main`, and Phase 4 adds verification and deploy.
5. **Commit / PR title convention.** RESOLVED (planner): `type(scope): summary (UL-n)`, with `[no-ticket]` for work without a ticket (CONTRIBUTING, plan 01-09; pr-hygiene warning, plan 01-07). Squash uses the PR title (`PR_TITLE`). Suggested: `feat(scope): summary (UL-12)`. The tracker only needs `UL-\d+` somewhere. Planner/lead discretion for CONTRIBUTING.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | ✓ | v26.13.0 | — |
| npm | installing pnpm | ✓ | 11.20.0 | standalone script |
| pnpm | workspace | ✗ (not on PATH) | — | `npm i -g pnpm@12.15.0` (verified working) |
| corepack | — | ✗ | — | not needed |
| git | repo | ✓ | 2.50.1 | — |
| gh CLI | repo settings, ruleset, release test | ✓ | 2.103.3, scopes `admin:org, repo, workflow, read:packages, …` | — |
| Docker (daemon) | local Dockerfile validation | ✓ | 29.9.2 | CI only |
| actionlint | workflow lint (validation) | ✗ | — | `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667` (tag 1.7.12, 2026-03-30) |
| GitHub rulesets | TZ-CICD-04 enforcement | ✗ (403 on Free/private) | — | Ruleset as code + apply script; report the gap |
| GitHub environments | `production` env | ✗ (Free: public repos only) | — | No `environment:` in the stub |
| GHCR | release images | ✓ (container registry "currently free") | — | — |

**Missing dependencies with no fallback:** rulesets/branch protection while private. This is a reported gap, not a blocker for the phase.
**Missing dependencies with fallback:** pnpm (install via npm), actionlint (Docker).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.5 (in `packages/contracts` only) + shell assertions with `gh` / `docker` / `jq` for repo-level criteria |
| Config file | `packages/contracts/vitest.config.ts` (created in Wave 0 / the contracts task) |
| Quick run command | `pnpm --filter @app/contracts test` |
| Full suite command | `pnpm install --frozen-lockfile && pnpm format:check && pnpm turbo run lint typecheck test build` |

### Phase Requirements → Test Map
| Req ID / SC | Behavior | Test Type | Automated Command | File Exists? |
|-------------|----------|-----------|-------------------|-------------|
| SC1, TZ-PROCESS-06, TZ-FE/BE-02/10/11, TZ-FE-16/TZ-BE-15 | Clean clone installs and the pipeline passes | smoke | `D=$(mktemp -d) && git clone -q --branch gsd/phase-01-repo-foundation-and-ci-cd-lead . "$D" && cd "$D" && pnpm install --frozen-lockfile && pnpm turbo run lint typecheck test build` | ❌ Wave 0 |
| SC1 | Exact pins only | static | `node scripts/check-pins.mjs` (or `! grep -REn '"[~^][0-9]' --include=package.json . --exclude-dir=node_modules`) | ❌ Wave 0 |
| SC1 | ≥14 days old, incl. transitive | static | `pnpm install --frozen-lockfile` prints "Lockfile passes supply-chain policies" with `minimumReleaseAge: 20160` present: `grep -q '^minimumReleaseAge: 20160' pnpm-workspace.yaml` | ❌ Wave 0 |
| SC1 | Lockfile committed | static | `git ls-files --error-unmatch pnpm-lock.yaml` | ❌ Wave 0 |
| SC1 | Engines enforced | static | `grep -q '^engineStrict: true' pnpm-workspace.yaml && grep -q '"packageManager": "pnpm@12.15.0"' package.json && test "$(cat .nvmrc)" = 26.13.0` | ❌ Wave 0 |
| D-03 | Contracts schema valid/invalid cases | unit | `pnpm --filter @app/contracts test` | ❌ Wave 0 |
| TZ-FE/BE-12 | Pre-commit blocks bad staged code | integration | `git config core.hooksPath` = `.husky/_`; `grep -q 'lint-staged' .husky/pre-commit`; manual: stage a file with `any` → commit fails | ❌ Wave 0 |
| SC2, TZ-CICD-02, TZ-FE-20, TZ-BE-19 | ci.yml valid, pinned, triggers right | static | `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint@sha256:b1934ee5…9315667` ; `! grep -En 'uses: [^.][^@]*@v[0-9]' .github/workflows/*.yml .github/actions/*/action.yml` (no tag-only pins) | ❌ Wave 0 |
| SC2 | Green on the PR and on main | e2e (post-push) | `gh pr checks <PR#> --required` ; `gh run list --workflow ci.yml --branch main --limit 1 --json conclusion --jq '.[0].conclusion'` → `success` | n/a (GitHub) |
| SC2 | Turbo cache is used in CI | e2e | Second run log shows `cache hit` / `>>> FULL TURBO` for unchanged packages: `gh run view <id> --log \| grep -c 'cache hit'` | n/a |
| SC3, TZ-CICD-04, TZ-FE-18, TZ-BE-17 | Ruleset as code is valid JSON with the required rules | static | `jq -e '.rules \| map(.type) \| (index("pull_request") and index("required_status_checks") and index("non_fast_forward") and index("deletion"))' .github/rulesets/main.json` ; contexts match job names: `jq -r '.rules[] \| select(.type=="required_status_checks") \| .parameters.required_status_checks[].context' .github/rulesets/main.json` vs `grep -E '^\s+name: (lint\|typecheck\|test\|build)$' .github/workflows/ci.yml` | ❌ Wave 0 |
| SC3 | Plan gap documented/proven | e2e | `gh api repos/ulbi-project-group-12/ulbigram/rulesets 2>&1 \| grep -q 'Upgrade to GitHub Pro'` (gap still present → the report must exist in SUMMARY/README) | n/a |
| SC3, TZ-CICD-05 | Merge settings applied | e2e | `gh api repos/ulbi-project-group-12/ulbigram --jq '[.allow_squash_merge,.allow_merge_commit,.allow_rebase_merge,.delete_branch_on_merge,.squash_merge_commit_title]'` → `[true,false,false,true,"PR_TITLE"]` | n/a |
| SC3 | CODEOWNERS valid + covers paths | static + e2e | `grep -E '^/\.planning/\s+@soadap' .github/CODEOWNERS && grep -E '^/\.github/\s+@soadap' .github/CODEOWNERS`; after push: `gh api repos/ulbi-project-group-12/ulbigram/codeowners/errors --jq '.errors \| length'` → `0` | ❌ Wave 0 |
| SC4 | PR template content | static | `grep -q 'UL-' .github/pull_request_template.md && grep -q 'Done when' .github/pull_request_template.md` ; manual: open a PR in the web UI and see it pre-filled | ❌ Wave 0 |
| SC4, D-24/25 | Branch / UL-n rules documented | static | `grep -q 'feat/UL-' README.md && grep -q 'fix/UL-' CONTRIBUTING.md && grep -q 'UL-' CONTRIBUTING.md` | ❌ Wave 0 |
| SC5, TZ-CICD-03 | release.yml valid, trigger + perms | static | actionlint (above) ; `grep -A2 '^on:' .github/workflows/release.yml \| grep -q published` ; `grep -q 'packages: write' .github/workflows/release.yml` ; `grep -q 'TODO(Phase 4)' .github/workflows/release.yml` | ❌ Wave 0 |
| SC5, D-17 | Placeholder images build + run non-root | integration | `for a in web api; do docker build -q -f apps/$a/Dockerfile -t ulbigram-$a:ci . && docker run --rm ulbigram-$a:ci && test "$(docker run --rm ulbigram-$a:ci id -u)" = 1000; done` | ❌ Wave 0 |
| SC5 | Test release lands in GHCR | e2e (manual trigger, after merge) | Publish `v0.0.1-rc.1` from `release/0.0`, then `gh run list --workflow release.yml --limit 1 --json conclusion` → success; `gh api orgs/ulbi-project-group-12/packages/container/ulbigram-api/versions --jq '.[0].metadata.container.tags'` contains `v0.0.1-rc.1` (token has `read:packages`) | n/a |
| TZ-PROD-10 | No secrets, names-only env example | static | `git ls-files \| grep -E '(^\|/)\.env($\|\.)' \| grep -v '\.env\.example$'` → empty ; `! grep -E '=.+' .env.example` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm turbo run lint typecheck test build` (cached, a few seconds) + the static greps for files touched.
- **Per wave merge:** full suite + actionlint + the Docker build loop.
- **Phase gate:** full suite green locally from a clean clone, CI green on the PR and on `main`, the merge-settings `gh api` check, and the test release (or a documented reason it was skipped) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `packages/contracts/vitest.config.ts` + `src/ticket-key.test.ts`: covers D-03.
- [ ] `scripts/check-pins.mjs` (optional): covers the SC1 exact-pin check. Otherwise use the grep fallback.
- [ ] pnpm install on the dev machine: `npm i -g pnpm@12.15.0`.
- [ ] actionlint via the pinned Docker image (no install).

## Security Domain

`security_enforcement: true`, ASVS level 1. This phase has no runtime app surface. Its security scope is the **supply chain and CI/CD**.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no app auth yet). CI uses `GITHUB_TOKEN` only |
| V3 Session Management | no | — |
| V4 Access Control | yes (repo/CI) | Least-privilege `permissions:` (`contents: read`; `packages: write` only in the images job; `{}` elsewhere). CODEOWNERS. Ruleset (pending public) |
| V5 Input Validation | partial | zod in `@app/contracts` (foundation). PR title passed via `env:`, never interpolated into a shell |
| V6 Cryptography | no | — |
| V8 Data Protection / V14.3 secrets | yes | `.env*` gitignored, names-only `.env.example`, no stored secrets this phase, `persist-credentials: false` on checkout |
| V10 Malicious Code / V14.2 Dependencies | yes | Exact pins + catalog, `minimumReleaseAge: 20160`, `strictDepBuilds` (default), frozen lockfile, SHA-pinned actions, `workspace:*` for internal scope, digest-pinned base image |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Compromised or typosquatted npm release (fresh malicious version) | Tampering | `minimumReleaseAge` 14 days; exact pins; lockfile integrity hashes; `strictDepBuilds` blocks unreviewed postinstall |
| Dependency confusion on `@app/*` | Spoofing | `workspace:*` + `"private": true` (scope is unclaimed on npm today) |
| Compromised third-party action tag (retagging) | Tampering | Full-SHA pins with version comments; optional `sha_pinning_required` |
| Script injection via PR title/branch name | Elevation | Use `env:` indirection. No `pull_request_target` |
| Over-privileged `GITHUB_TOKEN` | Elevation | Workflow-level `permissions: contents: read` / `{}`, job-level `packages: write`. Repo default is already `read` (verified) |
| Cache poisoning (actions/cache, gha BuildKit cache) | Tampering | Caches keyed by job + sha. PR-scoped caches can't overwrite `main`'s. Release builds from a fresh checkout |
| Secret committed to git | Info disclosure | `.gitignore` `.env*`. Push protection is unavailable while private; enable it when public |
| Credential persistence in checkout | Info disclosure | `persist-credentials: false` |
| Container runs as root | Elevation | `USER node` (uid 1000, verified) |

## Sources

### Primary (HIGH: tool-verified this session)
- npm registry (`npm view <pkg> time|engines|peerDependencies|scripts --json`): all versions, dates, peers, engines in the Standard Stack.
- Scratch prototype: pnpm 12.15.0 install/frozen install/age gate/engineStrict; turbo 2.11.10 run + cache; eslint 10.13.0 + typescript-eslint 8.72.0 typed lint on TS 6.0.3; vitest 5.0.5 + zod 4.6.7 tests; husky 9.1.7 + lint-staged 17.6.0 hook; Docker build/run of the placeholder image.
- `gh api`: action releases and tag → commit SHAs; `apps/github-actions` id 15368; repo settings, collaborators, Actions permissions, environments, rulesets 403, org packages.
- nodejs.org/dist/index.json (Node 26 release dates/LTS); Docker Hub tag API (node and actionlint digests).

### Secondary (MEDIUM: Context7 / official docs)
- Context7 `/pnpm/pnpm/v12.15.0`: minimumReleaseAge(+Exclude), allowBuilds/strictDepBuilds, pmOnFail, frozen-lockfile, devEngines/boot document, catalogs/catalogMode.
- Context7 `/pnpm/action-setup`: inputs, version precedence, pnpm 12 support.
- Context7 `/vercel/turborepo/v2.11.10`: transit nodes, cacheDir, GitHub Actions guide, compiled packages.
- Context7 `/eslint/eslint/v10.5.0`: v10 migration (config lookup, eslintrc removal).
- Context7 `/typescript-eslint/typescript-eslint/v8.70.0`: projectService, tsconfigRootDir default, disableTypeChecked, defineConfig.
- Context7 `/microsoft/typescript-website` (TS 6.0 release notes): changed defaults and deprecations.
- Context7 `/vitest-dev/vitest/v5.0.3`: vite as required peer, `vitest/config`.
- Context7 `/docker/metadata-action`, `/docker/build-push-action`, `/actions/setup-node`: tags/latest semantics, inputs, attestation defaults, pnpm cache order.
- docs.github.com: REST rulesets (create), REST repos (update), events-that-trigger-workflows (release), troubleshooting required status checks, manage environments (Free = public only), working with the Container registry, billing for GitHub Packages and Actions.
- github.com/pnpm/action-setup releases v6.0.10–v6.1.1 and PR #293.

### Tertiary (LOW)
- WebSearch secondary coverage of TS 6.0 (VS Magazine, LogRocket, dev.to). Used only to locate the official notes, which were then read via Context7.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Every version was read from the registry and installed and run together in the prototype.
- Architecture: HIGH for the monorepo, lint, typecheck, test and Docker (prototype). MEDIUM for the CI/release YAML (written from docs, not executed on GitHub; actionlint not yet run).
- GitHub platform constraints: HIGH where read via API (403, roles, settings). MEDIUM where from docs (environments, GHCR billing, check naming).
- Pitfalls: HIGH for the ones reproduced (engines, age gate, frozen catalog mismatch, husky no-git). MEDIUM for the rest.

**Research date:** 2026-11-08
**Valid until:** 2026-11-22 (fast-moving: pnpm ships weekly; the 14-day cutoff moves daily, so re-run the version script if planning slips more than a week)
