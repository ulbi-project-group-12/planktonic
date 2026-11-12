# @app/config

Shared tooling config for this project: ESLint flat presets, the TypeScript base config, the
Prettier config and `product.ts`. Every workspace package consumes its ESLint preset from
`@app/config/eslint`, so a rule change lands everywhere in one reviewed diff.

## Presets

| Preset   | For                               | On top of `base()`                                       |
| -------- | --------------------------------- | -------------------------------------------------------- |
| `base()` | Node packages, scripts, contracts | `typescript-eslint` strict + stylistic (typed), Prettier |
| `next()` | `apps/web` (Next.js App Router)   | Next core-web-vitals, `@eslint-react`, six a11y rules    |
| `nest()` | `apps/api` (NestJS, ESM)          | STACK §3.1 layering: adapters → services → repositories  |

Each preset is `fn({ tsconfigRootDir })` and returns a flat config array. A package's
`eslint.config.js` is two lines:

```js
import { nest } from '@app/config/eslint';
export default nest({ tsconfigRootDir: import.meta.dirname });
```

## What every preset enforces

- **Warnings fail.** Every lint script, `lint:root` and lint-staged pass `--max-warnings=0`, and the
  presets raise warn-level plugin rules to error, so the editor shows what CI fails on. Keep the
  flag when you rewrite a lint script.
- **Unused `eslint-disable` directives are errors.** Locally the pre-commit `eslint --fix` deletes
  them; CI fails on them. Give every directive a reason after `--`.
- **Every module extension is linted:** `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`,
  `.cjs`, in lint scripts and in lint-staged. JS files get the rules without type info.
- **Typed lint needs a tsconfig.** Every linted `.ts`/`.tsx`/`.mts`/`.cts` file, tests and config
  files such as `vitest.config.mts` included, must be in the package's tsconfig.
- **Test files** (`*.test.*`, `*.spec.*`, `*.e2e-spec.ts`, `test/`, `tests/`, `__tests__/`) allow
  non-null assertions, empty functions and unbound methods. `describe/it/test/suite.only` is
  rejected.

## nest()

nest() keys on file names, so follow them. `.ts` stands for any module extension here.

| File                                                       | Role                                   | May import                   |
| ---------------------------------------------------------- | -------------------------------------- | ---------------------------- |
| `*.controller.ts`, `*.gateway-handlers.ts`, `*.gateway.ts` | HTTP / WS adapter                      | services, contracts          |
| `*.service.ts` (and all other code, `scripts/` too)        | business rules                         | repositories, other services |
| `*.repository.ts`                                          | the only Prisma access and raw SQL     | Prisma, `src/core/prisma`    |
| `src/core/prisma/prisma.service.ts`                        | `PrismaService` (extends PrismaClient) | the generated client         |

What is rejected:

- In adapters: any import of `@prisma/*`, `.prisma/*`, a `generated/prisma` path, `prisma.service`,
  `src/core/prisma` or a `*.repository` module, any imported name `PrismaService` or
  `PrismaClient` (barrels and aliases included), and a value import of a `*Repository` name from
  a local module (a barrel). Types such as `GitHubRepository` from `@app/contracts` or a local
  `*.types.ts` stay legal: injection needs a value import. Adapters take named imports from
  local modules: `import * as` and `import()` of a relative or `#`, `@/`, `~/`, `src/` path are
  rejected, because a namespace hides which names they use.
- Everywhere else in the package, `scripts/` included (outside `src/**/*.repository.ts`,
  `src/core/prisma/**`, `prisma/**`, `prisma.config.ts` and test files): any value import of
  Prisma, the names `PrismaService` / `PrismaClient` as values (also as `ns.PrismaService`),
  dynamic `import()`, `import * as` or `export *` of `src/core/prisma`, and `$queryRaw…` /
  `$executeRaw…` calls. Type-only imports are allowed (`import type { Message } from
'../generated/prisma/client.js'`, `import('…')` types): they never reach the database. Named
  imports from `src/core/prisma` (a module, a health indicator) stay legal.
- In `src/core/prisma` and repositories: re-exporting `PrismaService` / `PrismaClient` under
  another name.
- In every non-test file of the package: an import of a test file or of `test/`, `tests/`,
  `__tests__/` helpers.
- Test files may use Prisma for setup, and so may `prisma/**` (seeds) and `prisma.config.ts`.

Prisma 7: the `prisma-client` generator needs an `output` that contains `generated/prisma` (for
example `../src/generated/prisma`). Gitignore it; nest() never lints it. A DB health ping goes
controller → service → an indicator in `src/core/prisma`.

Do not set `no-restricted-imports` or `no-restricted-syntax` in `apps/api/eslint.config.js`.
ESLint replaces a rule's options wholesale, so one extra ban there silently removes the layering.
Pass extra import bans to the preset, which merges them into every block:

```js
export default nest({
  tsconfigRootDir: import.meta.dirname,
  restrictedImports: [{ group: ['lodash'], message: 'Use the standard library.' }],
});
```

A test checks that `apps/api/eslint.config.js` keeps every layering entry, and app ESLint configs
are lead-owned (CODEOWNERS). A new syntax ban goes into nest() itself.

Limits: nest() is a guardrail, not a sandbox. It matches import paths and names, not types. These
get past it, so code review still applies: `import()` with a computed path, injection by string
token, a Prisma handle renamed in code (`const Db = PrismaService`) and misnamed files.

## next()

Included: Next's `core-web-vitals` rules, `@eslint-react` `recommended-type-checked` (it carries
the rules of hooks, exhaustive deps and the compiler-style rules), the six a11y rules Next's own
preset enables (`jsx-a11y-x/alt-text`, `aria-props`, `aria-proptypes`, `aria-unsupported-elements`,
`role-has-required-aria-props`, `role-supports-aria-props`), browser globals, async JSX event
handlers, and the Next ignores (`.next/`, `out/`, `build/`, `next-env.d.ts`) plus the Storybook
build output (`storybook-static/`).

Not included, on purpose:

- FSD layers, slice public APIs and import boundaries. Steiger owns them (UL-6); next() has no
  import or boundary rule, so the two never disagree.
- `eslint-config-next`, `eslint-plugin-react`, `eslint-plugin-jsx-a11y` and `eslint-plugin-import`.
  Their declared peers stop at ESLint 9. Do not add them to `apps/web`.

next() needs an `app/` (or `pages/`) directory; without one, `@next/next/no-html-link-for-pages`
prints "Pages directory cannot be found" on every run.

## Phase 1.1 checklist

- **UL-6 (web):** in the PR that creates `app/`, switch `apps/web/eslint.config.js` to
  `import { next } from '@app/config/eslint';` and
  `export default next({ tsconfigRootDir: import.meta.dirname });`. Keep the
  `eslint . --max-warnings=0` lint script (Next 16 has no `next lint`). Put `next.config.ts` and
  the test files in the tsconfig.
- **UL-7 (api):** `apps/api` already uses nest(). Follow the file names above, put `PrismaService`
  in `src/core/prisma/prisma.service.ts`, and set the Prisma `output` under `generated/prisma`.

## Changing the presets

Run `pnpm --filter @app/config test`; it also runs in CI's `test` job and in `pnpm check:all`. A new
plugin needs a catalog pin at least 14 days old, declared peers that accept the pinned ESLint, and
lead review (CODEOWNERS).
