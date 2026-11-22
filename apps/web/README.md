# @app/web

The web app of this project: Next.js 16 App Router, laid out with Feature-Sliced Design (FSD), with
a shadcn UI kit, Tailwind CSS 4, Vitest + Testing Library and Storybook. `next build` produces a
standalone server, which the multi-stage `Dockerfile` ships as a non-root image.

Run it from the repo root with `pnpm dev` (README "Quick start"); it serves http://localhost:3000.

## REST client and API mocks

Run `pnpm gen:api` from the repo root after changing an API contract. Orval reads the exported
OpenAPI document and writes the REST client, TanStack Query hooks, TypeScript models and MSW handlers
to `src/shared/api/generated/`. Include those files in the same PR. `pnpm check:api` compares them
with fresh output in a temporary directory, and compares `public/mockServiceWorker.js` with the
installed MSW. CI and `pnpm check:all` run the same check.

What to import from where:

| Need                                                        | Import from                                   |
| ----------------------------------------------------------- | --------------------------------------------- |
| Hooks, query keys (`get…QueryKey`), `ApiError`, model types | `@/shared/api`                                |
| Form and request validation (zod schemas)                   | `@app/contracts`                              |
| Mock handlers and response factories, `startApiMocks`       | `@/shared/api-mocks` (tests and stories only) |
| The Vitest MSW server                                       | `@/shared/api-mocks-node` (tests only)        |

Hooks work in client components only: the client accepts relative `/api/…` URLs, which a server
component cannot fetch. Hook errors are `unknown`; narrow them with `error instanceof ApiError`,
then read `status` and `body`. `setAccessTokenProvider` is the one place that supplies the bearer
token to every request.

### Mocks

`src/shared/api-mocks/handlers.ts` is the default mock of every operation. Vitest, Storybook and
the dev app all start from it. Each operation also has a generated handler and response factory per
documented status, for example `getAuthRegisterMockHandler409`.

- **Dev app.** Work on a screen without the backend:

  ```sh
  NEXT_PUBLIC_API_MOCKING=true pnpm dev --filter=@app/web
  ```

  Every REST request on every page is then served by MSW, `/prototype` included; requests without
  a handler go to the network. http://127.0.0.1:3000/api-demo shows status `ok` and instance
  `msw-demo`. Without the variable, and in production builds, nothing is mocked.

- **Vitest.** The server starts automatically and fails a test on an unhandled request. Replace a
  response for one test; the override is dropped after the test:

  ```ts
  import { getAuthRegisterMockHandler409 } from '@/shared/api-mocks';
  import { server } from '@/shared/api-mocks-node';

  server.use(getAuthRegisterMockHandler409());
  ```

- **Storybook.** A story that calls the API starts the worker in a loader and may pass its own
  handlers; see `src/_pages/api-demo/ui/api-demo-page.stories.tsx`.

Generated data comes from faker with a fixed seed, so it is the same on every run.

When updating MSW, refresh the checked-in browser worker with
`pnpm --filter @app/web exec msw init public --no-save` and refresh `public/msw-LICENSE.txt`
from the installed package's `LICENSE.md`. `pnpm check:api` fails until the worker matches.

## Layout

```
app/                 Next.js routing only: each file re-exports from src/ (layout.tsx, page.tsx)
src/_app/            app layer: root layout, metadata, global styles (styles/globals.css)
src/_pages/          pages layer: one slice per page, e.g. _pages/home, _pages/prototype
src/widgets/         widgets layer (empty for now)
src/features/        features layer (empty for now)
src/entities/        entities layer (empty for now)
src/shared/ui/       the UI kit (shadcn components) and their stories
src/shared/api/      shared transport: the per-tab Socket.IO singleton (getSocket)
src/shared/lib/      shared helpers, e.g. cn(), uuidv7()
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

| File                 | Contents                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `fonts.css`          | Onest 200/400/700 via local `@font-face` (`public/fonts`), `--font-sans`                          |
| `colors.css`         | raw palette (`:root` light, `.dark` dark) + the `--color-*` utility layer (`bg-…`, `text-…`)      |
| `shadcn-aliases.css` | shadcn theme names (`--primary`, `--muted-foreground`, `--ring`, …) pointing at the mockup tokens |
| `text-sizes.css`     | role-based text tokens (`text-caption` … `text-h1–h6`) — the default Tailwind scale is untouched  |
| `radii.css`          | `--radius-*` scale from the mockup cornerRadius                                                   |
| `breakpoints.css`    | `--breakpoint-*` — mobile is below 1024 (`desktop-s`), desktop from 1024 up                       |
| `spacings.css`       | adaptive `--space-*` scale — mobile value below 1024, desktop from 1024; `-fix` = same on both    |
| `shadows.css`        | elevation scale `shadow-elevation-1 … 6` from the mockup; Tailwind's `shadow-*` stays default     |

To add a token:

1. Add the raw variable to its group file (a new `--color-*` goes to both `:root` and `.dark`
   when it is theme-dependent; shadows and radii are theme-independent).
2. Expose it as a utility in the `@theme inline` block of the same file, e.g.
   `--color-brand-hover: var(--brand-hover);` gives `bg-brand-hover` / `text-brand-hover`.
3. Show it on the matching `shared/Design Tokens/*` Storybook page so the scale stays reviewable.

Components from `shadcn add` use the shadcn theme names (`bg-primary`, `text-muted-foreground`,
`border-input`, `ring-ring`, …). `shadcn-aliases.css` maps each of them to a mockup token, so
those components get the product look and the dark theme without edits. Our own atoms keep the
mockup names. A new mockup color that has a shadcn meaning gets an alias there too.

Spacing utilities carry an `sp-` prefix (`p-sp-s`, `gap-sp-m`, `m-sp-1xl`, …) and resolve
through the `--spacing-sp-*` namespace. The prefix keeps bare Tailwind names intact —
`max-w-2xl` / `max-w-xl` keep resolving to the default container scale. `auto` is not a
token — Tailwind has `ml-auto` / `mr-auto` / … natively.

The Storybook toolbar has a global **Theme** switch (light/dark): it toggles `.dark` on
`<html>`, so portals (modal, dropdown, select, tooltip) follow it too.
The `States` stories (and the color and type scales) render light and dark side by side
themselves, so they set `globals: { theme: 'light' }` and the switch is locked there.

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

## Prototype page (UL-128)

`/prototype` is the client half of the Phase 2 realtime prototype. It shows:

- `Instance: <instanceId>` from `GET /api/health`: the api replica this window is bound to;
- `Connection: connecting | connected | syncing | offline` (UL-129, UL-130): the tab's
  `useConnectionStore` state, written only by the socket lifecycle listeners that `getSocket()`
  binds once (the event → state table is in `src/shared/api/connection.ts`). `syncing` shows from
  a connect until the feed's catch-up settles;
- the seeded channel's feed (`00000000-0000-7000-8000-000000000001`) as `#seq body` rows;
- a message input and a Send button.

How it works:

1. One Socket.IO client per tab comes from `getSocket()` (`@/shared/api`). The page connects it
   only after the health response, so the handshake carries the `io_srv` sticky cookie Traefik set
   on that response and lands on the same replica.
2. On every socket connect, the first and each reconnect, the feed catches up (UL-130, STACK
   §4.4). Connection State Recovery is off, so what the socket missed comes over REST:
   - the first time it loads the newest page (one request per connect, not a history load plus
     a catch-up);
   - after that it asks `GET …/messages?afterSeq=<seq>&limit=100`, where `<seq>` is the end of
     the feed's gapless run, not its greatest seq, and merges the page;
   - if the answer says `hasMore`, the client missed more than a page: the feed resets to the
     newest page (keeping anything newer that arrived meanwhile) instead of paging on;
   - a message that lands above a hole runs the same catch-up from below the hole. That covers a
     live `message:new` that skips a seq (41, then 43) and the user's own `POST` 201 (45 while
     42–44 never came). 43 shows at once, and 42 fills in when the page arrives. While a pass
     runs, holes wait for its end. Then up to five follow-up passes run, each only while the last
     one moved the gapless run forward or a new hole appeared during it. After a failed pass,
     holes wait for Retry or the next reconnect.

   The catch-up logic (`catchUp`, `mergeMessages`, `resetFeed`) is in `@app/contracts`, so the
   api's integration tests run the same code. Its runner (`model/feed-sync.ts`) runs one pass at a
   time. It registers with `registerCatchUp` from `@/shared/api`, and the transport, not the page,
   switches `syncing` on and off. Everything merges by `id` and sorts by `BigInt(seq)`: a message
   that arrives twice (live, in a page, as the `POST` 201) shows once. The `seq` math reads
   confirmed messages only, never unsent rows.

3. Each Send gets a UUIDv7 `clientMsgId`, clears the draft and adds a local row at the end of the
   feed with the status `Sending…` (UL-131). The `POST` 201 or `message:new`, whichever comes
   first, replaces that row by `clientMsgId`, so it shows once in any arrival order. Every request
   times out after 10 s.
   - No network, a timeout, 5xx, 408 or 429: the row stays as `Not sent: <reason>` with a Retry
     button. Retry sends the same `clientMsgId` and body, so the server's idempotency (UL-126)
     keeps one message even when the first request did arrive.
   - Any other 4xx (400, 404, 409, 413…): the row says why and `Retrying will not help.`, with no
     Retry button.
   - Unsent rows live in memory only and are lost on reload (durable storage is UL-193); nothing
     retries them automatically.
4. Every wire payload is checked with the `@app/contracts` schemas. An invalid `message:new` is
   dropped with a `console.warn`, and events for other channels are ignored. A failed or invalid
   history load (or a page with a message of another channel) shows an error with a Retry button.

The page uses relative `/api` and `/socket.io` URLs, so it works only through Traefik on one
origin. Under plain `pnpm dev` (web on `:3000`, api on `:3001`) its requests reach Next.js and
fail.

### Two-window check

1. Start the stack from the repo root (a second checkout or worktree sets its own
   `COMPOSE_PROJECT_NAME`, as the root README says):

   ```bash
   docker compose --profile realtime up -d --build
   ```

2. Apply the migrations and the seed from the host. Copy the root `.env` from `.env.example`
   first: its `DATABASE_URL` points at the compose Postgres on `127.0.0.1:55432`. Compose applies
   no migrations.

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

3. Open http://127.0.0.1:58080/prototype in a normal window and in a private window (`58080` is
   the default `TRAEFIK_PORT`).
4. Check that the two `Instance` values differ. If they match, delete the `io_srv` cookie for
   `127.0.0.1` in one window and reload until they differ.
5. Send from each window: the message appears in the other one without a reload, in `seq` order,
   and once in the sender's own feed.
6. Connection indicator: DevTools → Network → Offline turns it `offline` (within the ping
   timeout if the socket was idle); back online it goes `connecting` → `connected`. Stopping the
   replica a window is bound to (`docker stop <project>-api-2`) turns it `offline`, then it
   reconnects to the live replica and the `Instance` value changes.
7. Catch-up: put window B offline (DevTools → Network → Offline), send five messages from A,
   bring B back online. B shows `syncing` briefly, then all five in order, once each. DevTools
   shows one `GET …/messages?afterSeq=…` for the reconnect.

After a change to the web app, rebuild only its container:

```bash
docker compose --profile realtime up -d --build web
```

## Image

`Dockerfile` builds from the repo root: a frozen pnpm install of `@app/web` and its workspace
dependencies, then `next build`. The runtime stage holds only the standalone server, `.next/static`
and `public`, runs as uid 1000, and keeps only `.next/cache` writable. The product name comes from
`@app/config/product`, and `next build` bakes it into the HTML and metadata; the `PRODUCT_NAME`
build-arg is exported as an env var for future runtime use and does not change the UI.
