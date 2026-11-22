#!/usr/bin/env bash
# Sticky-session check for the api replicas behind Traefik (UL-162). Needs bash and curl only,
# so it runs on a laptop and on the server alike.
#
#   scripts/check-sticky.sh [BASE_URL]        default: http://localhost:58180
#
# It proves three things and exits 0 only when all of them hold:
#   1. Without a cookie, requests reach every replica (EXPECTED_INSTANCES distinct `instanceId`
#      values from GET /api/health), and each response sets the sticky cookie.
#   2. With one cookie value, every request lands on the same `instanceId`, and different cookie
#      values pin different replicas.
#   3. A Socket.IO long-polling session survives only on its own replica: the session id is
#      accepted with the cookie it was opened with and refused (HTTP 400) with another replica's
#      cookie. This is why realtime needs the sticky cookie.
#
# Environment:
#   REQUESTS            requests per step (default 20)
#   EXPECTED_INSTANCES  number of api replicas (default 2)
#   COOKIE_NAME         sticky cookie name (default io_srv)
#   WAIT_SECONDS        how long to wait for every replica to answer before checking (default
#                       60; 0 = no waiting). Replicas need a few seconds after `up -d`.
#
# Exit codes: 0 all checks passed, 1 a check failed, 2 bad usage or the stack is unreachable.
set -euo pipefail

BASE_URL="${1:-http://localhost:58180}"
BASE_URL="${BASE_URL%/}"
REQUESTS="${REQUESTS:-20}"
EXPECTED_INSTANCES="${EXPECTED_INSTANCES:-2}"
COOKIE_NAME="${COOKIE_NAME:-io_srv}"
WAIT_SECONDS="${WAIT_SECONDS:-60}"

case "$BASE_URL" in
  http://* | https://*) ;;
  *)
    echo "usage: $0 [BASE_URL]   e.g. $0 http://localhost:58180" >&2
    exit 2
    ;;
esac
for number in "$REQUESTS" "$EXPECTED_INSTANCES"; do
  case "$number" in
    '' | *[!0-9]* | 0)
      echo "REQUESTS and EXPECTED_INSTANCES must be positive integers" >&2
      exit 2
      ;;
  esac
done
case "$WAIT_SECONDS" in
  '' | *[!0-9]*)
    echo "WAIT_SECONDS must be a non-negative integer" >&2
    exit 2
    ;;
esac
if [[ ! "$COOKIE_NAME" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "COOKIE_NAME must be letters, digits, '-' or '_'" >&2
  exit 2
fi
command -v curl > /dev/null || {
  echo "curl is required" >&2
  exit 2
}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

failures=0
max_time=10 # seconds per request
pass() { echo "  ok    $1"; }
fail() {
  echo "  FAIL  $1"
  failures=$((failures + 1))
}

# request <cookie value or ''> <path> [curl args...]: body in $work/body, headers in
# $work/headers, prints the HTTP status (000 when the request itself failed).
request() {
  local cookie="$1" path="$2"
  shift 2
  local args=(--silent --show-error --max-time "$max_time" --output "$work/body" --dump-header "$work/headers"
    --write-out '%{http_code}')
  if [[ -n "$cookie" ]]; then
    args+=(--cookie "${COOKIE_NAME}=${cookie}")
  fi
  curl "${args[@]}" "$@" "${BASE_URL}${path}" 2> "$work/error" || true
}

# Values that come from the server are printed, so only a plain token passes: anything else
# (terminal escape sequences included) counts as missing.
plain() { grep -E '^[A-Za-z0-9._-]+$' || true; }

instance_id() { sed -n 's/.*"instanceId":"\([^"]*\)".*/\1/p' "$work/body" | head -n 1 | plain; }

# The cookie value from the Set-Cookie header, empty when the response did not set it.
set_cookie_value() {
  tr -d '\r' < "$work/headers" |
    sed -n "s/^[Ss][Ee][Tt]-[Cc][Oo][Oo][Kk][Ii][Ee]: *${COOKIE_NAME}=\([^;]*\).*/\1/p" | head -n 1 | plain
}

echo "Sticky check against ${BASE_URL} (${REQUESTS} requests per step, ${EXPECTED_INSTANCES} replicas expected)"

# Wait until the api answers and every replica has been seen, or WAIT_SECONDS pass; with
# WAIT_SECONDS=0 this is a single request. The deadline is checked before every request and also
# caps that request's timeout. A stack that never answers 200 is unreachable (exit 2); a missing
# replica is left for step 1 to report.
deadline=$((SECONDS + WAIT_SECONDS))
: > "$work/seen"
while :; do
  remaining=$((deadline - SECONDS))
  if [[ "$WAIT_SECONDS" -gt 0 && "$remaining" -lt "$max_time" ]]; then
    max_time=$((remaining > 1 ? remaining : 1))
  fi
  status=$(request '' /api/health)
  if [[ "$status" == 200 ]]; then
    instance_id >> "$work/seen"
  fi
  seen=$(sort -u "$work/seen" | grep -c . || true)
  if [[ "$seen" -ge "$EXPECTED_INSTANCES" || "$SECONDS" -ge "$deadline" ]]; then
    break
  fi
  sleep 1
done
max_time=10
if [[ "$seen" -eq 0 ]]; then
  echo "GET ${BASE_URL}/api/health answered ${status}, expected 200: $(cat "$work/error")" >&2
  exit 2
fi

# --- 1. no cookie: every replica answers, every response sets the cookie ---
echo "1. Without the cookie"
: > "$work/pairs" # lines of "<cookie value> <instanceId>"
missing_cookie=0
for ((i = 0; i < REQUESTS; i++)); do
  status=$(request '' /api/health)
  id=$(instance_id)
  cookie=$(set_cookie_value)
  if [[ "$status" != 200 || -z "$id" ]]; then
    fail "request $((i + 1)) answered ${status} without an instanceId"
    continue
  fi
  if [[ -z "$cookie" ]]; then
    missing_cookie=$((missing_cookie + 1))
    continue
  fi
  echo "$cookie $id" >> "$work/pairs"
done
sort -u "$work/pairs" > "$work/unique"
instances=$(cut -d ' ' -f 2 "$work/unique" | sort -u | wc -l | tr -d ' ')
cut -d ' ' -f 2 "$work/pairs" | sort | uniq -c | while read -r count id; do
  echo "        ${id}: ${count} of ${REQUESTS}"
done
if [[ "$missing_cookie" -eq 0 ]]; then
  pass "every response set ${COOKIE_NAME}"
else
  fail "${missing_cookie} of ${REQUESTS} responses did not set ${COOKIE_NAME}"
fi
if [[ "$instances" -eq "$EXPECTED_INSTANCES" ]]; then
  pass "requests reached ${instances} replicas"
else
  fail "requests reached ${instances} replicas, expected ${EXPECTED_INSTANCES}"
fi
# One cookie value must always name one replica.
cookies=$(cut -d ' ' -f 1 "$work/unique" | sort -u | wc -l | tr -d ' ')
if [[ "$cookies" -eq "$instances" ]]; then
  pass "${cookies} cookie values for ${instances} replicas"
else
  fail "${cookies} cookie values for ${instances} replicas"
fi

# --- 2. one cookie: always the same replica ---
echo "2. With the cookie"
while read -r cookie expected; do
  strays=0
  for ((i = 0; i < REQUESTS; i++)); do
    status=$(request "$cookie" /api/health)
    id=$(instance_id)
    if [[ "$status" != 200 || "$id" != "$expected" ]]; then
      strays=$((strays + 1))
    fi
  done
  if [[ "$strays" -eq 0 ]]; then
    pass "${COOKIE_NAME}=${cookie}: ${REQUESTS} of ${REQUESTS} on ${expected}"
  else
    fail "${COOKIE_NAME}=${cookie}: ${strays} of ${REQUESTS} left ${expected}"
  fi
done < "$work/unique"

# --- 3. a Socket.IO long-polling session lives on one replica only ---
echo "3. Socket.IO long-polling session"
own=$(sed -n 1p "$work/unique" | cut -d ' ' -f 1)
other=$(sed -n 2p "$work/unique" | cut -d ' ' -f 1)
if [[ "$EXPECTED_INSTANCES" -eq 1 ]]; then
  echo "  skip  one replica expected: there is no other replica to refuse the session"
elif [[ -z "$own" || -z "$other" ]]; then
  fail "needs two replicas with a cookie each"
else
  status=$(request "$own" '/socket.io/?EIO=4&transport=polling')
  sid=$(sed -n 's/.*"sid":"\([^"]*\)".*/\1/p' "$work/body" | head -n 1)
  if [[ "$status" != 200 || ! "$sid" =~ ^[A-Za-z0-9_-]+$ ]]; then
    fail "handshake answered ${status} without a session id"
  else
    pass "handshake opened a session on the replica of ${COOKIE_NAME}=${own}"
    poll="/socket.io/?EIO=4&transport=polling&sid=${sid}"
    # Engine.IO packet "1" closes the session, so the check leaves nothing behind.
    status=$(request "$other" "$poll" --data-binary 1 --header 'Content-Type: text/plain;charset=UTF-8')
    if [[ "$status" == 400 ]]; then
      pass "the other replica refuses the session (400)"
    else
      fail "the other replica answered ${status} for a foreign session, expected 400"
    fi
    status=$(request "$own" "$poll" --data-binary 1 --header 'Content-Type: text/plain;charset=UTF-8')
    if [[ "$status" == 200 ]]; then
      pass "its own replica accepts the session (200)"
    else
      fail "its own replica answered ${status}, expected 200"
    fi
  fi
fi

if [[ "$failures" -eq 0 ]]; then
  echo "PASS: sticky sessions work"
else
  echo "FAIL: ${failures} check(s) failed"
  exit 1
fi
