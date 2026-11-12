---
phase: "1"
slug: "repo-foundation-and-ci-cd-lead"
status: secured
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
threats_total: 35
threats_closed: 35
accepted_risks: 7
audited_head: 548864e
created: "2026-11-08"
---

# Phase 1 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> The register was built from the `<threat_model>` blocks in 01-01..01-09-PLAN.md. It was verified against the code at `548864e`, which includes both code-review fix rounds, by gsd-security-auditor on 2026-11-08. Phase 1 has no runtime app surface, so its security scope is the supply chain and CI/CD.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry → workspace | Third-party packages resolved by pnpm | Package tarballs, install scripts |
| PR author → CI runner | Untrusted PR code and PR metadata (title, body) run in `pull_request` jobs | Source, PR title (env only), read-only `GITHUB_TOKEN` |
| Release publisher → GHCR | `release: published` builds and pushes images | `GITHUB_TOKEN` with `packages: write` (images job only), tag name (validated) |
| Third-party GitHub Actions → workflows | Actions run with the job token | Job token, checkout contents |
| Docker build context → image | Files copied into placeholder images | Allow-listed `apps/*/package.json`, `apps/*/src/**` only |
| Developer machine → remote | Pushes of branches and commits | Source, `.env*` (gitignored) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Tampering | dependency resolution (catalog) | high | mitigate | `minimumReleaseAge: 20160`, exact catalog pins, `check-pins.mjs` age and pin checks, frozen + `--ignore-pnpmfile` install, sha512 integrity in the lockfile | closed |
| T-01-02 | Tampering | dependency install scripts | medium | mitigate | No build-approval keys; the check-pins key allowlist rejects them; pnpm 12 `strictDepBuilds` default; no `.npmrc`/`.pnpmfile.*` | closed |
| T-01-03 | Spoofing | `@app/*` scope (dependency confusion) | medium | mitigate | All manifests `private: true`, `workspace:*` only, `@app/*` unpublished on npm (E404) | closed |
| T-01-04 | Tampering | runtime/toolchain drift | low | mitigate | `packageManager: pnpm@12.15.0`, `engines`, `engineStrict: true`, `.nvmrc` 26.13.0 used by CI | closed |
| T-01-05 | Tampering | Node 26.13.0 < 14 days old | low | accept | D-29 exception documented in README | closed |
| T-01-06 | Tampering | manifests | medium | mitigate | `check-pins` allows only `catalog:`/`workspace:*`; it runs in required `lint` with 30 negative tests | closed |
| T-01-07 | Information Disclosure | `.env` files / secrets | high | mitigate | `.env*` gitignored, names-only `.env.example`, no env file ever committed | closed |
| T-01-08 | Repudiation | pre-commit bypass (`--no-verify`) | low | accept | CI `lint` re-runs format, pins and root lint | closed |
| T-01-09 | Tampering | `TicketKey` parsing | low | mitigate | Anchored `/^UL-[1-9]\d*$/` with an invalid-case matrix | closed |
| T-01-10 | Denial of Service | regex evaluation | low | accept | Linear pattern, no nested quantifiers | closed |
| T-01-11 | Elevation of Privilege | api container user | medium | mitigate | `USER node`, code copied root-owned (WR-08 fix) | closed |
| T-01-12 | Tampering | base image tag mutation | medium | mitigate | `node:26.13.0-alpine3.24@sha256:8996bb58…` digest pin (matches live) | closed |
| T-01-13 | Information Disclosure | build context | high | mitigate | Root `.dockerignore` allow-list (`**`, re-include only `apps/*/package.json`, `apps/*/src/**`) | closed |
| T-01-14 | Tampering | product-name drift | low | mitigate | Name guard over paths and contents (UTF-8/UTF-16/latin1 views), required `name-guard` check, 21 tests | closed |
| T-01-15 | Elevation of Privilege | guard executes `product.ts` from a PR | low | mitigate | `pull_request` only, `contents: read`, no secrets, `persist-credentials: false` | closed |
| T-01-16 | Elevation of Privilege | web container user | medium | mitigate | Same as T-01-11 | closed |
| T-01-17 | Tampering | third-party actions (retag) | high | mitigate | All 16 external `uses:` pinned to verified 40-hex SHAs. The repo-level `sha_pinning_required` setting is not applied yet (lead action, see AR-06) | closed |
| T-01-18 | Elevation of Privilege | PR title → shell | high | mitigate | Title only through step `env:`; `pr-hygiene.sh` does a regex/glob test, no eval, always exits 0 | closed |
| T-01-19 | Elevation of Privilege | `GITHUB_TOKEN` scope | high | mitigate | CI `contents: read`; release top-level `{}`, `packages: write` only in `images`, deploy `{}` | closed |
| T-01-20 | Information Disclosure | checkout credential persistence | medium | mitigate | `persist-credentials: false` on all 8 checkouts | closed |
| T-01-21 | Tampering | cache poisoning | medium | mitigate | Turbo cache keyed per OS/job/sha; images job checks out `github.sha` fresh (gha BuildKit cache residual: R1 IN-02) | closed |
| T-01-22 | Denial of Service | Actions minutes | medium | mitigate | PR concurrency cancel, per-job timeouts, light jobs skip pnpm setup, quota documented | closed |
| T-01-23 | Spoofing | GHCR namespace squatting | medium | mitigate | No laptop pushes (README); login via `GITHUB_TOKEN`; no packages exist yet | closed |
| T-01-24 | Elevation of Privilege | who can trigger a release | low | accept | Only the lead has write access (live check) | closed |
| T-01-25 | Tampering | `vars.PRODUCT_SLUG` override | low | mitigate | Env-only, slug/owner regex, single-line name check, CI compares with `product.ts` | closed |
| T-01-26 | Tampering | direct push to `main` | medium | mitigate | `main.json` ruleset as code + `apply-repo-rules.sh`; enforcement blocked by plan (403), documented (AR-05) | closed |
| T-01-27 | Elevation of Privilege | ruleset bypass actors | medium | mitigate | One OrganizationAdmin bypass in `pull_request` mode on `main`/`release/*`; `always` only for tag updates and `release/*` creation (documented) | closed |
| T-01-28 | Tampering | `.planning/`/CI config by non-owners | medium | mitigate | CODEOWNERS (0 parser errors) + `require_code_owner_review`; enforcement blocked by plan, documented (AR-05) | closed |
| T-01-29 | Information Disclosure | apply script leaking the gh token | low | mitigate | No xtrace/env dumps, `set -euo pipefail`, `--jq` subsets, stderr captured | closed |
| T-01-30 | Repudiation | settings drift | low | mitigate | `repo-settings.json` matches live on 7/7 keys; idempotent upsert | closed |
| T-01-31 | Information Disclosure | secrets pushed to the remote | high | mitigate | Token/PEM scan over tracked files and all commits: 0 hits | closed |
| T-01-32 | Tampering | README install instructions | medium | mitigate | Pinned `npm i -g pnpm@12.15.0`, no `curl \| sh` | closed |
| T-01-33 | Repudiation | docs overstating protection | medium | mitigate | README quotes the exact 403 text, says `main` is not protected, qualifies release guarantees | closed |
| T-01-34 | Tampering | executor push/force-push to `main` | medium | mitigate | Remote `main` untouched since init; phase pushes are fast-forward only | closed |
| T-01-SC | Tampering | package / action supply chain (per plan) | high | mitigate | Catalog of 14 audited packages, age gate, node-builtin-only scripts, SHA-pinned actions all ≥ 14 days old | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-05 | Node 26.13.0 is the only Node 26 LTS, it is the official nodejs.org build, and the 14-day rule targets registry packages (D-29) | lead (YOLO brief) | 2026-11-08 |
| AR-02 | T-01-08 | The pre-commit hook is a local convenience; CI `lint` is the real gate | lead (YOLO brief) | 2026-11-08 |
| AR-03 | T-01-10 | The TicketKey regex is linear, so there is no ReDoS | lead (YOLO brief) | 2026-11-08 |
| AR-04 | T-01-24 | Only the lead can publish releases today; re-evaluate when teammates get write access | lead (YOLO brief) | 2026-11-08 |
| AR-05 | T-01-26, T-01-27, T-01-28 | GitHub Free + private returns 403 for rulesets and branch protection. Today `main` is unprotected, CODEOWNERS is advisory, required checks don't block, any writer can create `release/X.Y`, and `v*` tags can move. The gap closes when the lead makes the repo public (D-30), runs `scripts/apply-repo-rules.sh` (exit 0), and confirms a direct push to `main` is rejected | lead (D-20, D-30) | 2026-11-08 |
| AR-06 | T-01-17 | The repo-level `sha_pinning_required` is `false`; that Actions-permissions PUT was not in the brief. All pins are verified. Lead action: run `scripts/apply-repo-rules.sh` without `SKIP_SHA_PINNING` | lead action pending | 2026-11-08 |
| AR-07 | T-01-31 | Secret scanning and push protection are unavailable on Free + private; `.gitignore` plus the one-time pre-push scan are the controls until the repo goes public | lead (D-30) | 2026-11-08 |

*Accepted risks do not resurface in future audit runs.*

**Non-blocking residuals (not counted):** gha BuildKit cache in the publishing job (R1 IN-02); `apps/*/Dockerfile` without a code owner (R1 IN-07); check-pins allowlists `engineStrict` without requiring `true`; a committed `.npmrc` is not rejected (none is tracked); the release workflow doesn't re-compare the slug with `product.ts` (R2 IN-03; CI `name-guard` does).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-08 | 35 | 35 | 0 | gsd-security-auditor (State B, verified at 548864e) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
