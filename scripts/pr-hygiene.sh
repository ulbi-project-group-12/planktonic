#!/usr/bin/env bash
# Non-blocking PR hygiene for the ci.yml job `pr-hygiene` (D-14, D-24, team review rules).
#
# Inputs come only from env vars, set by the workflow step env (never interpolated into
# the shell, so a PR title cannot inject commands):
#   TITLE      the PR title
#   ADDITIONS  added lines
#   DELETIONS  deleted lines
#
# Prints GitHub warning annotations and always exits 0. It is not a required check.
set -u

title="${TITLE:-}"
additions="${ADDITIONS:-0}"
deletions="${DELETIONS:-0}"

# Missing or non-numeric counts count as 0.
[[ "$additions" =~ ^[0-9]+$ ]] || additions=0
[[ "$deletions" =~ ^[0-9]+$ ]] || deletions=0

ticket_re='UL-[0-9]+'
if ! [[ "$title" =~ $ticket_re ]] && [[ "$title" != *"[no-ticket]"* ]]; then
  echo "::warning title=PR title::No UL-n ticket key in the PR title. Add it (e.g. UL-12) so the tracker moves the ticket, or add [no-ticket] for work without a ticket"
fi

changed=$((10#$additions + 10#$deletions))
if [ "$changed" -gt 600 ]; then
  echo "::warning title=PR size::This PR changes ${changed} lines (more than 600). Consider splitting it; aim for about 400 (see CONTRIBUTING.md)"
fi

exit 0
