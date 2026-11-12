#!/usr/bin/env bash
# Applies the repository rules kept as code (D-19, D-20, D-30, D-31):
#   1. merge settings from .github/repo-settings.json (squash only, auto-delete branches,
#      squash commit title = PR title, squash commit message = PR body);
#   2. Actions permissions with sha_pinning_required=true, so GitHub rejects any action
#      that is not pinned to a full commit SHA (backs D-13). The current allowed_actions
#      policy is kept. May be refused on Free: warns;
#   3. every ruleset in .github/rulesets/*.json, upserted by name among this repository's
#      own rulesets (PUT if it exists, POST if not; org rulesets are never touched).
#
# Needs gh and jq. Both, and every JSON file, are checked before anything is changed.
#
# Plan gap: while the repository is private on GitHub Free, the rulesets API answers
# HTTP 403 "Upgrade to GitHub Pro or make this repository public to enable this feature"
# (verified 2026-11-08). Settings are still applied; the script then reports the gap and
# exits 3. Re-run it after the repository is made public (D-30) to enforce the rulesets.
#
# Bypass: the only bypass actor is OrganizationAdmin in pull_request mode (D-31), so the
# lead may merge his own PR without an approval, but still only through a PR. The other
# developers get write access through the org team `devs` (read-only approvals would not
# count toward required reviews, RESEARCH Pitfall 10). Nobody can push directly to main.
# Two rulesets are the exception, because what they guard never goes through a PR, so
# their OrganizationAdmin bypass is `always`:
#   - tags.json: v* tags cannot be moved or deleted (the lead can delete a test tag);
#   - release-create.json: only an org admin can create a release/* branch, so release.yml
#     builds images only from branches the lead cut. The release ruleset still governs
#     every push to the branch after that.
#
# Exit codes: 0 all applied, 3 plan gap (rulesets unavailable), anything else is an error.
# Env: REPO=owner/name overrides the repository derived from the current checkout.
#      SKIP_SHA_PINNING=1 leaves the Actions permissions untouched (step 2).
# Auth goes through gh only. Never enable shell xtrace here, and never print env or tokens.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SETTINGS=".github/repo-settings.json"
RULESETS_DIR=".github/rulesets"

# Preflight: everything that could abort the run is checked before step 1 changes the
# repository, so a missing tool or a broken ruleset file never leaves it half-applied.
for tool in gh jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: $tool is required" >&2
    exit 1
  fi
done

shopt -s nullglob
files=("$RULESETS_DIR"/*.json)
if [ "${#files[@]}" -eq 0 ]; then
  echo "ERROR: no ruleset files found in $RULESETS_DIR" >&2
  exit 1
fi
for file in "$SETTINGS" "${files[@]}"; do
  if ! jq -e 'type == "object"' "$file" >/dev/null 2>&1; then
    echo "ERROR: $file is not a JSON object" >&2
    exit 1
  fi
done
for file in "${files[@]}"; do
  if ! jq -e '.name | type == "string" and length > 0' "$file" >/dev/null; then
    echo "ERROR: $file has no ruleset name" >&2
    exit 1
  fi
done

errf="$(mktemp)"
trap 'rm -f "$errf"' EXIT

REPO="${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
if [ -z "$REPO" ]; then
  echo "ERROR: could not determine the repository; set REPO=owner/name" >&2
  exit 1
fi

echo "Repository: $REPO"

# Step 1: merge settings.
echo "Step 1: applying merge settings from $SETTINGS"
gh api -X PATCH "repos/$REPO" --input "$SETTINGS" \
  --jq '{allow_squash_merge, allow_merge_commit, allow_rebase_merge, delete_branch_on_merge, squash_merge_commit_title}'

# Step 2: Actions SHA pinning. A refusal is a warning, not a failure. The current
# allowed_actions policy is read and sent back unchanged, so a stricter `selected` or
# `local_only` policy is never reset to `all`; only sha_pinning_required changes.
echo "Step 2: requiring SHA-pinned actions"
if [ "${SKIP_SHA_PINNING:-0}" = "1" ]; then
  echo "SKIP: SKIP_SHA_PINNING=1, Actions permissions left unchanged" >&2
elif ! allowed_actions="$(gh api "repos/$REPO/actions/permissions" \
  --jq '.allowed_actions // "all"' 2>"$errf")"; then
  echo "WARN: could not read the Actions permissions, left unchanged: $(<"$errf")" >&2
elif pin_err="$(gh api -X PUT "repos/$REPO/actions/permissions" \
  -F enabled=true -f allowed_actions="$allowed_actions" -F sha_pinning_required=true 2>&1 >/dev/null)"; then
  gh api "repos/$REPO/actions/permissions" --jq '{enabled, allowed_actions, sha_pinning_required}'
else
  echo "WARN: could not set sha_pinning_required=true: ${pin_err}" >&2
fi

# Step 3: rulesets. Only this repository's own rulesets are listed (includes_parents=false),
# so an org ruleset with the same name is never PUT to the repository URL. stderr goes to a
# file, never into the JSON that jq parses.
echo "Step 3: applying rulesets from $RULESETS_DIR"
if ! existing="$(gh api --paginate "repos/$REPO/rulesets?includes_parents=false" 2>"$errf")"; then
  list_err="$(<"$errf")"
  if [[ "$list_err" == *"Upgrade to GitHub Pro"* ]]; then
    echo "GAP: rulesets are unavailable for this private repository on the GitHub Free plan (HTTP 403: Upgrade to GitHub Pro or make this repository public). Settings were applied; re-run this script after the repository is made public." >&2
    exit 3
  fi
  echo "ERROR: listing rulesets failed: ${list_err}" >&2
  exit 1
fi

# Resolve every ruleset id before writing any, so a duplicate name aborts step 3 cleanly.
ids=()
for file in "${files[@]}"; do
  name="$(jq -r '.name' "$file")"
  # --paginate prints one JSON array per page; -s gathers them.
  found="$(jq -rs --arg name "$name" \
    '[.[][] | select(.name == $name and .source_type == "Repository") | .id] | .[]' <<<"$existing")"
  if [ "$(grep -c . <<<"$found")" -gt 1 ]; then
    echo "ERROR: more than one repository ruleset is named '$name' (ids: ${found//$'\n'/, }); remove the duplicate first" >&2
    exit 1
  fi
  ids+=("$found")
done

for i in "${!files[@]}"; do
  file="${files[$i]}"
  id="${ids[$i]}"
  name="$(jq -r '.name' "$file")"
  if [ -n "$id" ]; then
    echo "Updating ruleset '$name' (id $id) from $file"
    gh api -X PUT "repos/$REPO/rulesets/$id" --input "$file" --jq '{id, name, enforcement}'
  else
    echo "Creating ruleset '$name' from $file"
    gh api -X POST "repos/$REPO/rulesets" --input "$file" --jq '{id, name, enforcement}'
  fi
done

echo "Done: settings and rulesets applied."
