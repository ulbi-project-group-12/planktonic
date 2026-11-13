# Contributing

How we work on this project. Setup and the release process are in the [README](README.md).

## Workflow

1. Take a ticket in the tracker.
2. Branch from `main`: `feat/UL-n-short-slug` or `fix/UL-n-short-slug` (`chore/` and `docs/` are
   also allowed), e.g. `feat/UL-12-health-endpoint`.
3. Make small commits.
4. Open a PR, get it reviewed, and squash-merge it.

This is trunk-based development: a branch lives at most 2 days, 5 at the hard limit, and waiting
for review counts toward that. Put unfinished work behind an env flag instead of keeping a long
branch.

## Commits and PR titles

The squash commit on `main` is the PR title, so write the title as a commit subject:
`type(scope): summary (UL-n)`, e.g. `feat(api): health endpoint (UL-12)`. Types: `feat`, `fix`,
`chore`, `docs`, `refactor`, `test`.

The `UL-n` key lets the tracker move the ticket (PR opened → IN_REVIEW, merged → DONE). For work
without a ticket, add `[no-ticket]` to the title. CI warns when the title has neither.

Commits inside your branch can be as small and informal as you like; they disappear in the squash.

## Pull requests

- Use the template ([.github/pull_request_template.md](.github/pull_request_template.md)). Fill in
  "Done when…" from the ticket's definition of done.
- Keep a PR at about 400 changed lines or fewer, excluding the lockfile and generated code. CI warns
  above 600. Ask for big PRs to be split.
- One ticket = one PR.
- CodeRabbit reviews every non-draft PR in Russian as the AI first pass. Answer or resolve each of
  its comments before asking a teammate to review. To ask it something, mention the bot in a PR
  comment. Its review never replaces the required human approval.
- CI must be green. The required checks are `lint`, `typecheck`, `test`, `build`, `name-guard`,
  `steiger` and `storybook`.

## Review

- First response within 24 h; approve or request changes within 48 h.
- Everyone reviews everyone, juniors included.
- Label comments with [Conventional Comments](https://conventionalcomments.org/): `praise:`,
  `nitpick:`, `suggestion:`, `issue:`, `question:`.
- Any teammate's approval merges product code. Paths listed in [.github/CODEOWNERS](.github/CODEOWNERS)
  (CI, repository rules, tooling, root configs, each app's check configs and `package.json`, the
  lockfile) also need their owner's review, and GitHub enforces it.

## Protecting `main`

GitHub protects `main` with the `main` ruleset: a pull request with green required checks and one
approval is the only way in, and a direct push is rejected for everyone. Two local guards stay as a
second line of defence:

- **The pre-push hook** (`.husky/pre-push`) refuses `git push` to `main` from your machine before
  GitHub does. Push your branch and open a PR instead.
- **The `main-push-guard` workflow** checks every push to `main`. A push that did not come from a
  merged PR, or a forced push, turns the job red and opens an issue for the lead.

## Local checks

The pre-commit hook (husky + lint-staged) formats and lints your staged files only. Before pushing,
run every check the required CI jobs run:

```sh
pnpm check:all
```

It runs, in order: `pnpm format:check`, `pnpm check:pins`, `pnpm lint:root`,
`pnpm turbo run lint typecheck test build`, `pnpm check:name`, `pnpm test:root`,
`pnpm --filter @app/web lint:fsd` and `pnpm --filter @app/web build-storybook`.

## Dependencies

Add versions only to the `catalog:` in `pnpm-workspace.yaml`, as exact versions (no `^` or `~`) at
least 14 days old, and refer to them with `catalog:` in the package. Commit the updated
`pnpm-lock.yaml`. The catalog and the lockfile are both owned by the lead, so any dependency change
needs the lead's review.

## Product name

Never write the product name in code, configs or docs. Import it from `@app/config/product`, or read
`PRODUCT_NAME` / `PRODUCT_SLUG` from the environment. In prose, say "this project". The `name-guard`
check fails otherwise.

## GSD

GSD is optional for everyone. The team process (tickets, `UL-n` branches, PRs, review) works the same
with or without it.

One hard rule, the one-driver rule: only the lead changes `.planning/` on `main`. Phase owners edit
only their own `.planning/phases/<N>-…` directory, on their phase branch.

- `/gsd-quick` for one ticket on your own branch.
- `/gsd-debug` for investigating a bug.
- `/gsd-pr-branch` before opening a PR, to drop `.planning/` commits so reviewers see only code.

## Language

Code, identifiers, commits and docs in English. Team chat in Russian.
