# @app/web

The web app of this project: Next.js 16 App Router, laid out with Feature-Sliced Design (FSD), with
a shadcn UI kit, Tailwind CSS 4, Vitest + Testing Library and Storybook. `next build` produces a
standalone server, which the multi-stage `Dockerfile` ships as a non-root image.

Run it from the repo root with `pnpm dev` (README "Quick start"); it serves http://localhost:3000.

## Layout

```
app/                 Next.js routing only: each file re-exports from src/ (layout.tsx, page.tsx)
src/_app/            app layer: root layout, metadata, global styles (styles/globals.css)
src/_pages/          pages layer: one slice per page, e.g. _pages/home
src/widgets/         widgets layer (empty for now)
src/features/        features layer (empty for now)
src/entities/        entities layer (empty for now)
src/shared/ui/       the UI kit (shadcn components) and their stories
src/shared/lib/      shared helpers, e.g. cn()
.storybook/          Storybook config (main.ts) and preview (loads globals.css)
```

- `app/` never holds code of its own. A route file is a one-line re-export of a page slice, so
  Next's routing folders and the FSD layers cannot clash. The layers are named `_app` and `_pages`
  for the same reason.
- Every slice and every `shared` segment exposes a public `index.ts`; import other slices only
  through it (`@/shared/ui`, `@/_pages/home`). A layer root has no `index.ts`.
- `@/*` maps to `src/*` (`tsconfig.json` paths).

## FSD lint (Steiger)

`pnpm --filter @app/web lint:fsd` runs `steiger ./src --fail-on-warnings` with the recommended
`@feature-sliced/steiger-plugin` rules: layer order, no cross-imports between slices of one layer,
public APIs. It is the required CI check `steiger`. `steiger.config.ts` has one exception:
`fsd/typo-in-layer-name` is off for `src/_app/**` and `src/_pages/**`, because of the underscore
names above. The config is lead-owned (CODEOWNERS).

## UI kit

- Components live in `src/shared/ui` and are exported from its `index.ts`: today `Button`, `Input`
  and the `Dialog` parts.
- `components.json` holds the shadcn CLI 4.23.0 config: style `radix-nova`, base colour neutral,
  Tailwind 4 with CSS variables, aliases pointing at `@/shared/ui` and `@/shared/lib`.
- To add a component, read it with `pnpm dlx shadcn@4.23.0 view <name>` and copy it into
  `src/shared/ui`. Point its `cn` import at `@/shared/lib` and its imports of other kit components
  at relative paths (`./button`). Add any new dependency to the catalog in `pnpm-workspace.yaml`
  (exact version, at least 14 days old), export the component from `index.ts`, and write its
  stories and tests.

## Styling

Tailwind CSS 4 utilities; no CSS modules or ad hoc CSS files. Use kit components and utilities.

## Design tokens

All design tokens live in `src/_app/styles/tokens/` — one file per group, imported from
`globals.css` (the single source of variables):

| File              | Contents                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `fonts.css`       | Onest 200/400/700 via local `@font-face` (`public/fonts`), `--font-sans`                         |
| `colors.css`      | raw palette (`:root` light, `.dark` dark) + the `--color-*` utility layer (`bg-…`, `text-…`)     |
| `text-sizes.css`  | role-based text tokens (`text-caption` … `text-h1–h6`) — the default Tailwind scale is untouched |
| `radii.css`       | `--radius-*` scale from the mockup cornerRadius                                                  |
| `breakpoints.css` | `--breakpoint-*` — mobile is below 1024 (`desktop-s`), desktop from 1024 up                      |
| `spacings.css`    | adaptive `--space-*` scale — mobile value below 1024, desktop from 1024; `-fix` = same on both   |
| `shadows.css`     | elevation scale `shadow-sm … shadow-3xl` from the mockup                                         |

To add a token:

1. Add the raw variable to its group file (a new `--color-*` goes to both `:root` and `.dark`
   when it is theme-dependent; shadows and radii are theme-independent).
2. Expose it as a utility in the `@theme inline` block of the same file, e.g.
   `--color-accent: var(--accent);` gives `bg-accent` / `text-accent` automatically.
3. Show it on the matching `shared/Design Tokens/*` Storybook page so the scale stays reviewable.

Spacing utilities (`p-s`, `gap-m`, `m-1xl`, …) resolve through the `--spacing-*` namespace, so
every Tailwind spacing utility accepts the token names. `auto` is not a token — Tailwind has
`ml-auto` / `mr-auto` / … natively.

The Storybook toolbar has a global **Theme** switch (light/dark): it toggles `.dark` on
`<html>`, so portals (modal, dropdown, select, tooltip) follow it too.

## Tests and stories

- Vitest 5 with jsdom and Testing Library (`vitest.config.ts`, `vitest.setup.ts`). Put a test next
  to the code as `*.test.tsx`, and import `describe`/`it`/`expect` from `vitest` (no globals).
- Stories (CSF 3) sit next to the component as `*.stories.tsx`, titled `shared/ui/<Name>`.
  `pnpm --filter @app/web storybook` serves them on http://localhost:6006, and the required CI
  check `storybook` runs `build-storybook`. Telemetry is off.

## Scripts

| Script            | What it does                                                      |
| ----------------- | ----------------------------------------------------------------- |
| `dev`             | `next dev` on port 3000                                           |
| `build`           | `next build` (standalone output)                                  |
| `start`           | `next start -H 127.0.0.1` for a local production build            |
| `typegen`         | `next typegen` (route types; Turbo runs it before lint/typecheck) |
| `typecheck`       | `tsc --noEmit`                                                    |
| `lint`            | ESLint with the `next()` preset, `--max-warnings=0`               |
| `lint:fsd`        | Steiger FSD lint, warnings fail                                   |
| `test`            | `vitest run`                                                      |
| `storybook`       | Storybook dev server on port 6006                                 |
| `build-storybook` | Static Storybook build into `storybook-static/` (git-ignored)     |

Run them as `pnpm --filter @app/web <script>`, or through Turbo from the root (`pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm build`).

## Image

`Dockerfile` builds from the repo root: a frozen pnpm install of `@app/web` and its workspace
dependencies, then `next build`. The runtime stage holds only the standalone server, `.next/static`
and `public`, runs as uid 1000, and keeps only `.next/cache` writable. The product name comes from
`@app/config/product`, and `next build` bakes it into the HTML and metadata; the `PRODUCT_NAME`
build-arg is exported as an env var for future runtime use and does not change the UI.
