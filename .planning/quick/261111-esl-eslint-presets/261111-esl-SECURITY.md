---
phase: "quick-261111-esl"
slug: "eslint-presets"
status: secured
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
threats_total: 7
threats_closed: 7
accepted_risks: 1
non_blocking_residuals: 2
audited_base: 6c265aa
audited_head: fb5484b
created: "2026-11-11"
---

# Quick Task 261111-esl — Security

> Security contract for quick task 261111-esl (ESLint presets base/next/nest, ticket UL-5): threat register, accepted risks and audit trail.
> The register comes from the `<threat_model>` in 261111-esl-PLAN.md. gsd-security-auditor checked it on 2026-11-11 against `git diff origin/main...HEAD` (6c265aa..fb5484b), at ASVS L1 with block_on high. The task adds no runtime app surface. Its security scope is the supply chain of three new lint plugins, the lint gate, and the nest() layering guardrail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry → pnpm install → dev machines and CI | The new lint plugins and their transitive deps run in-process whenever ESLint runs: CI `lint`/`test` jobs, pre-commit, editors | Package tarballs (42 new lockfile entries), plugin code run with the developer's or the runner's privileges |
| HTTP/WS adapters → services → repositories → Prisma | The single ACL path (STACK §2.3) holds only if adapters cannot reach the database directly; nest() is the lint guardrail | Source structure (imports), not runtime data |
| Shared lint config → every package's CI gate | A weakened preset lowers the gate for every package at once | Rule severities, disable directives |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation (verified evidence) | Status |
|-----------|----------|-----------|----------|-------------|--------------------------------|--------|
| T-261111-01 | Elevation of Privilege | apps/api adapters querying Prisma directly | medium | mitigate | `packages/config/eslint/nest.js:15-18` path regexes (Prisma client / generated, `prisma.service`, `core/prisma`, `*.repository`); `:31-37` name selectors on `ImportSpecifier` and re-export `ExportSpecifier`; `:54-70` services block (Prisma paths + names + `$queryRaw`/`$executeRaw`, owners and tests excluded); `:71-89` adapters block (`*.controller.ts`, `*.gateway-handlers.ts`, `*.gateway.ts`: Prisma, core/prisma, repositories, raw SQL). `apps/api/eslint.config.js:2` uses `nest()`. `test/eslint-presets.test.js:42-74` passes. Documented limits are in `packages/config/README.md:62-63` | closed (residual R-1, non-blocking) |
| T-261111-02 | Tampering | Lint gate weakening (warnings, unused directives) | medium | mitigate | 6× `--max-warnings=0`: the `lint` scripts of packages/config, packages/contracts, apps/web and apps/api, plus root `lint:root` and lint-staged (`package.json:20,28`). `base.js:26` sets `reportUnusedDisableDirectives: 'error'` and `reportUnusedInlineConfigs: 'error'`. `base.js:67-88` applies `errorsOnly()` inside `finalize()`. `test:116-137` asserts no warn-level rule in base/nest/next. CI `lint` calls `pnpm lint:root` and `pnpm turbo run lint` (ci.yml unchanged) | closed |
| T-261111-03 | Repudiation | Preset tests passing on a typed-lint setup failure | medium | mitigate | `test/eslint-presets.test.js:31-32` asserts `!m.fatal` and `severity === 2` for every message. Bad files are checked against exact rule-id sets (`:64,66,69,82,85`) or required ids (`:97-104`). Clean files must `deepEqual []` (`:60,79,94`). 4/4 pass in a clean frozen install | closed |
| T-261111-04 | Tampering | Pre-commit `eslint --fix` rewriting the broken-on-purpose fixtures | low | mitigate | `packages/config/eslint.config.js:7` has `globalIgnores(['test/fixtures/**'])`. Re-run check: a root `eslint --no-warn-ignored --max-warnings=0` over three bad fixtures exits 0, so they are ignored through the nearest-config lookup | closed |
| T-261111-05 | Denial of Service | CI test job time from typed lint over fixtures | low | accept | AR-261111-01. Measured: 4 tests in about 1–2 s; turbo `test` task cached by package inputs; CI job `timeout-minutes: 10` | closed |
| T-261111-06 | Information Disclosure | Product name leaking into new docs and fixtures (D-33/D-35) | low | mitigate | `pnpm check:name` is part of `check:all` (`package.json:22`). `node scripts/check-product-name.mjs` on HEAD reports "82 tracked files clean". The CI `name-guard` job is unchanged | closed |
| T-261111-SC | Tampering | npm supply chain: @eslint-react/eslint-plugin 5.28.8, @next/eslint-plugin-next 16.4.3, eslint-plugin-jsx-a11y-x 0.2.0, plus 39 transitive packages | high | mitigate | See "Supply-chain verification" below: exact catalog pins, all 42 published ≤ 2026-10-23 (cutoff 2026-10-28), sha512 integrity matches the registry, no install scripts, none deprecated, provenance repos match, frozen install green with `--ignore-pnpmfile`, `minimumReleaseAge: 20160` unchanged, no new workspace key, CI unchanged. CODEOWNERS covers `/packages/config/`, `/pnpm-workspace.yaml` and `/pnpm-lock.yaml` (advisory until rulesets apply, Phase 1 AR-05) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Supply-chain verification (T-261111-SC)

The checks were run on 2026-11-11 against the npm registry and a clean `git archive HEAD` copy. The working tree was not touched.

- **Catalog:** exactly 3 lines were added to `catalog:` in pnpm-workspace.yaml. Each is an exact version. The workspace still has 7 top-level keys (`minimumReleaseAge: 20160`, `engineStrict`, `savePrefix: ''`, `catalogMode: strict` unchanged). `pnpm check:pins` reports "17 catalog entries OK, 5 manifests OK". The new deps live only in `packages/config/package.json`. apps/web and apps/api gained no dependency (D-02).
- **Lockfile delta:** 42 packages were added. 0 were removed, and 0 existing entries changed version or integrity (`git diff` has no `-` lines in pnpm-lock.yaml). The `settings:` block is unchanged. No entry has a `tarball:`, git, `file:` or `link:` source outside the workspace. Every new entry has a sha512 `integrity` equal to the registry's `dist.integrity`. All typescript-eslint packages resolve to the already pinned 8.72.0, with no second patch copy.
- **Age:** the newest of the 42 is `eslint-plugin-react-web-api@5.28.8`, published 2026-10-23T16:05Z (19 days old). All are older than the 2026-10-28 cutoff. The frozen install prints "Lockfile passes supply-chain policies".
- **Install scripts:** none. No package has `hasInstallScript`, `preinstall`/`install`/`postinstall`, or `gypfile`. The install log shows no "Ignored build scripts".
- **Deprecation:** none of the 42 versions is deprecated.
- **Peers:** frozen install with `--ignore-pnpmfile` exits 0 with no peer warnings. Direct peers: @eslint-react `eslint: *` (optional) and `typescript: *`; @next/eslint-plugin-next none; jsx-a11y-x `eslint ^9.0.0 || ^10.0.0`. Transitive @eslint-community/eslint-utils 4.9.1 declares `eslint ^6 || ^7 || >=8`.
- **Provenance and publishers:** 19/42 carry SLSA provenance. For the three direct deps plus jsx-ast-utils-x, axe-core and fastq, the attested source repo matches the manifest `repository` (Rel1cx/eslint-react, vercel/next.js at tag v16.4.3, es-tooling/eslint-plugin-jsx-a11y-x, eslinter/jsx-ast-utils-x, dequelabs/axe-core, mcollina/fastq). The 23 without provenance are long-standing micromatch/nodelib/A11yance/feross-family releases (2018–2025), published by their listed maintainers. Two are 2026 releases without provenance, both published by a listed maintainer: picomatch 2.3.2 (danez, 2026-03-23) and ts-pattern 5.9.2 (sole author gabrielvergnaud, 2026-10-14).
- **Static scan of the installed code:** no `child_process`, `http`/`https`/`net`/`dgram`, `fetch(`, or `eval(` in any of the 42. There are two benign hits: axe-core's `new Function` compiles templates from its own bundled locale messages (upstream design), and eslint-plugin-react-x contains `"XMLHttpRequest"` as a string literal in a web-API name list.
- **Advisories (`pnpm audit`):** 1 moderate, GHSA-g3hv-75wg-m249 / CVE-2026-118764 (minimatch 7.0.0–<11.0.1, globparts amplification DoS, published 2026-10-30). It is **pre-existing**: `pnpm audit` on origin/main reports the same advisory for the same minimatch@10.2.6 through eslint. This task adds one more path to it, eslint-plugin-jsx-a11y-x → minimatch@10.2.6. No new advisory was introduced. See R-2.
- **CI and permissions:** `git diff --quiet origin/main...HEAD -- .github scripts turbo.json .husky eslint.config.js` exits 0. ci.yml, the setup composite action (`pnpm install --frozen-lockfile --ignore-pnpmfile`), release.yml and main-push-guard.yml are byte-identical. `permissions: contents: read` and the job names lint/typecheck/test/build/name-guard are unchanged. The new tests reach CI only through `pnpm turbo run test` in the read-only `test` job. release.yml runs no pnpm install, and the Docker context allow-list (`apps/*/package.json`, `apps/*/src/**`) excludes packages/config. The new plugins therefore never run in the `packages: write` job and never enter an image.

| Package | Published (UTC) | Publisher | Provenance | Source repo |
|---|---|---|---|---|
| @eslint-community/eslint-utils@4.9.1 | 2025-12-31 | GitHub Actions (OIDC) | SLSA | eslint-community/eslint-utils |
| @eslint-react/ast@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| @eslint-react/core@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| **@eslint-react/eslint-plugin@5.28.8** (direct) | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| @eslint-react/eslint@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| @eslint-react/jsx@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| @eslint-react/shared@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| @eslint-react/var@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| **@next/eslint-plugin-next@16.4.3** (direct) | 2026-10-23 | GitHub Actions (OIDC) | SLSA | vercel/next.js |
| @nodelib/fs.scandir@2.1.5 | 2021-06-04 | mrmlnc | — | nodelib/nodelib |
| @nodelib/fs.stat@2.0.5 | 2021-06-04 | mrmlnc | — | nodelib/nodelib |
| @nodelib/fs.walk@1.2.8 | 2021-07-08 | mrmlnc | — | nodelib/nodelib |
| aria-query@5.3.2 | 2024-09-20 | ljharb | — | A11yance/aria-query |
| axe-core@4.14.0 | 2026-10-05 | GitHub Actions (OIDC) | SLSA | dequelabs/axe-core |
| axobject-query@4.1.0 | 2024-07-15 | ljharb | — | A11yance/axobject-query |
| braces@3.0.3 | 2024-05-21 | jonschlinkert | — | micromatch/braces |
| compare-versions@6.1.1 | 2024-07-13 | omichelsen | — | omichelsen/compare-versions |
| damerau-levenshtein@1.0.8 | 2022-01-06 | lazurski | — | tad-lispy/node-damerau-levenshtein |
| **eslint-plugin-jsx-a11y-x@0.2.0** (direct) | 2026-05-10 | GitHub Actions (OIDC) | SLSA | es-tooling/eslint-plugin-jsx-a11y-x |
| eslint-plugin-react-dom@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| eslint-plugin-react-jsx@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| eslint-plugin-react-naming-convention@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| eslint-plugin-react-rsc@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| eslint-plugin-react-web-api@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| eslint-plugin-react-x@5.28.8 | 2026-10-23 | GitHub Actions (OIDC) | SLSA | Rel1cx/eslint-react |
| fast-glob@3.3.1 | 2023-07-22 | mrmlnc | — | mrmlnc/fast-glob |
| fastq@1.20.3 | 2026-08-29 | GitHub Actions (OIDC) | SLSA | mcollina/fastq |
| fill-range@7.1.1 | 2024-05-21 | jonschlinkert | — | jonschlinkert/fill-range |
| glob-parent@5.1.2 | 2021-03-06 | phated | — | gulpjs/glob-parent |
| is-number@7.0.0 | 2018-07-04 | jonschlinkert | — | jonschlinkert/is-number |
| jsx-ast-utils-x@0.1.0 | 2025-05-21 | jounqin | SLSA | eslinter/jsx-ast-utils-x |
| language-subtag-registry@0.3.23 | 2024-05-21 | mcg | — | mattcg/language-subtag-registry |
| language-tags@1.0.9 | 2023-08-16 | mcg | — | github.com/mattcg/language-tags |
| merge2@1.4.1 | 2020-06-03 | zensh | — | teambition/merge2 |
| micromatch@4.0.8 | 2024-08-23 | doowb | — | micromatch/micromatch |
| picomatch@2.3.2 | 2026-03-23 | danez | — | micromatch/picomatch |
| queue-microtask@1.2.3 | 2021-03-22 | feross | — | github.com/feross/queue-microtask |
| reusify@1.1.0 | 2025-02-25 | matteo.collina | — | mcollina/reusify |
| run-parallel@1.2.0 | 2021-02-10 | feross | — | github.com/feross/run-parallel |
| string-ts@2.3.1 | 2025-11-28 | guga.guichard | — | gustavoguichard/string-ts |
| to-regex-range@5.0.1 | 2019-04-07 | jonschlinkert | — | micromatch/to-regex-range |
| ts-pattern@5.9.2 | 2026-10-14 | gabrielvergnaud | — | gvergnaud/ts-pattern |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-261111-01 | T-261111-05 | About 20 tiny fixture files, one ESLint instance per preset. The run takes about 1–2 s and turbo caches it by package inputs, so the CI minute cost is negligible against the 10-minute job timeout | plan 261111-esl threat model (yolo mode) | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

**Residual already accepted in the plan (T-261111-01):** nest() is a guardrail, not a sandbox. Dynamic `import()`, injection by string token and misnamed files get past it, and code review still applies. This is documented in `packages/config/README.md:62-63`.

**Non-blocking residuals (below block_on high; not counted in threats_open):**

| ID | Ref | Severity | Finding | Suggested fix |
|----|-----|----------|---------|---------------|
| R-1 | T-261111-01 | medium | nest() name matching covers only named import and re-export specifiers. A probe in a scratch copy showed three bypasses. (a) A barrel `src/messages/index.ts` that re-exports `MessagesRepository` lints clean, and a controller using `import * as m from './index.js'` with `m.MessagesRepository` lints **clean**. (b) A service using `import * as core from '../core/prisma/index.js'` with `core.PrismaService` gets no layering error, because the services block has no `core/prisma` path pattern. (c) Any file under `src/**/{test,tests,__tests__}/` is Prisma-exempt through `TEST_FILES`, and a controller importing a helper from there is flagged only when it calls `$queryRaw`. (a) and (b) are not in the README "Limits" list. Namespace imports of a barrel at a controller are the gap. A namespace import of `core/prisma` at a controller *is* caught by path | In the adapters block, add `no-restricted-syntax` selectors on `MemberExpression[property.name=/^Prisma(Service\|Client)$\|Repository$/]` and `TSQualifiedName[right.name=/…/]`. In the services block, forbid `ExportSpecifier[local.name=/Repository$/]` outside `*.repository.ts`, so barrels cannot re-export repositories. Add `CORE_PRISMA` to the services-block path patterns, or document that services may import `src/core/prisma`. Add fixtures for (a) and (b), and add the remaining cases to the README "Limits" |
| R-2 | T-261111-SC | medium (GHSA "moderate") | Pre-existing minimatch@10.2.6 advisory GHSA-g3hv-75wg-m249. The fix (11.0.1, 2026-10-27) is a major version outside eslint 10.13.0's range, and an `overrides` key is forbidden by the check-pins allowlist. Exposure is low: dev and CI tooling only, with glob patterns from committed config, not untrusted input | Track it. Bump eslint (and jsx-a11y-x) once a release that depends on minimatch ≥ 11.0.1 is at least 14 days old. Do not add `overrides` without a reviewed change to check-pins |

---

## Unregistered Flags

None. The SUMMARY `## Threat Flags` section says "None". The auditor found no new attack surface outside the register: R-2 maps to T-261111-SC, and R-1 maps to T-261111-01.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 7 | 7 | 0 (2 non-blocking residuals) | gsd-security-auditor (ASVS L1, block_on high, verified at fb5484b against origin/main 6c265aa) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [ ] Lead decision on R-1 (fix in UL-5 or carry to UL-7) and R-2 (track)

**Approval:** secured 2026-11-11 (L1). R-1 and R-2 are non-blocking.
