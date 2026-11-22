#!/usr/bin/env bash
# Metrics check for the production stack with compose.prod.observability.yml (UL-171). Needs bash
# and the docker CLI only. Prometheus has no published port, so the script asks its HTTP API from
# inside the Prometheus container (`docker exec`); run it on the machine that runs the stack.
#
#   scripts/check-metrics.sh [PROJECT]        default: $COMPOSE_PROJECT_NAME, else app-prod
#
# It exits 0 only when all of these hold:
#   1. Every scrape target is UP, and each job in EXPECTED_JOBS has at least one target.
#   2. Prometheus found EXPECTED_API_REPLICAS api containers by itself, through Docker service
#      discovery on the `metrics` network. Until the api serves /metrics (UL-173) the replicas
#      are discovered but not scraped; once they are targets, step 1 also requires them UP.
#   3. cAdvisor reports containers, not only the host: it has memory series for at least
#      EXPECTED_API_REPLICAS api containers. Its target is UP even when it cannot read the
#      container runtime, so step 1 does not cover this.
#   4. Prometheus and the exporters are not reachable from outside: no published port, no host
#      network, no Traefik router.
#
# Environment:
#   EXPECTED_JOBS          jobs that must have a target (default "prometheus node cadvisor traefik")
#   EXPECTED_API_REPLICAS  number of api replicas (default 2)
#   PRIVATE_SERVICES       services checked in step 4 (default "prometheus node-exporter cadvisor")
#   WAIT_SECONDS           how long to wait for steps 1 to 3 to hold (default 90; 0 = one look).
#                          A new container is discovered within 15 s and scraped 15 s later.
#
# Exit codes: 0 all checks passed, 1 a check failed, 2 bad usage or Prometheus is not running.
set -euo pipefail

PROJECT="${1:-${COMPOSE_PROJECT_NAME:-app-prod}}"
EXPECTED_JOBS="${EXPECTED_JOBS:-prometheus node cadvisor traefik}"
EXPECTED_API_REPLICAS="${EXPECTED_API_REPLICAS:-2}"
PRIVATE_SERVICES="${PRIVATE_SERVICES:-prometheus node-exporter cadvisor}"
WAIT_SECONDS="${WAIT_SECONDS:-90}"

if [[ ! "$PROJECT" =~ ^[a-z0-9][a-z0-9_-]*$ ]]; then
  echo "usage: $0 [PROJECT]   e.g. $0 app-prod" >&2
  exit 2
fi
for number in "$EXPECTED_API_REPLICAS" "$WAIT_SECONDS"; do
  case "$number" in
    '' | *[!0-9]* | 0[0-9]*)
      echo "EXPECTED_API_REPLICAS and WAIT_SECONDS must be non-negative integers" >&2
      exit 2
      ;;
  esac
done
for name in $EXPECTED_JOBS $PRIVATE_SERVICES; do
  if [[ ! "$name" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo "EXPECTED_JOBS and PRIVATE_SERVICES must be space-separated names" >&2
    exit 2
  fi
done
command -v docker > /dev/null || {
  echo "docker is required" >&2
  exit 2
}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

failures=0
pass() { echo "  ok    $1"; }
fail() {
  echo "  FAIL  $1"
  failures=$((failures + 1))
}

# Container ids of one compose service of the project.
containers() {
  docker ps -q --filter "label=com.docker.compose.project=${PROJECT}" \
    --filter "label=com.docker.compose.service=$1"
}

prometheus=$(containers prometheus | head -n 1)
if [[ -z "$prometheus" ]]; then
  echo "No running prometheus container in project ${PROJECT}. Start the stack with" >&2
  echo "compose.prod.observability.yml, or pass the project name." >&2
  exit 2
fi

# Runs inside the Prometheus container, so the tools are the image's busybox on every host. One
# line per target of the Prometheus targets API:
#   T <health> <job> <instance> <last error>   an active target
#   A <container name>                         an api container on the project's metrics
#                                              network ($1 is the project) that discovery
#                                              found and relabeling dropped
#   N <count>                                  active targets in the response; the caller
#                                              compares it with the number of T lines
#   C <count>                                  api containers of the project that cAdvisor
#                                              has memory series for (absent when none)
# The API returns compact JSON with sorted label names, which the patterns rely on.
# shellcheck disable=SC2016
remote='
set -eu
json=$(wget -q -T 10 -O - "http://127.0.0.1:9090/api/v1/targets")
split() { printf "%s\n" "$1" | sed "s/{\"discoveredLabels\"/\n&/g"; }
active=${json%%\"droppedTargets\"*}
dropped=${json#*\"droppedTargets\"}
echo "N $(split "$active" | grep -c "^{\"discoveredLabels\"" || true)"
split "$active" | sed -n "s/.*\"labels\":{[^}]*\"instance\":\"\([^\"]*\)\"[^}]*\"job\":\"\([^\"]*\)\"[^}]*}.*\"lastError\":\"\(.*\)\",\"lastScrape\".*\"health\":\"\([a-z]*\)\".*/T \4 \2 \1 \3/p"
split "$dropped" |
  grep "\"__meta_docker_container_label_com_docker_compose_service\":\"api\"" |
  grep "\"__meta_docker_network_name\":\"$1_metrics\"" |
  sed -n "s/.*\"__meta_docker_container_name\":\"\/\([^\"]*\)\".*/A \1/p" | sort -u
promtool query instant http://127.0.0.1:9090 \
  "count(container_memory_working_set_bytes{job=\"cadvisor\",compose_project=\"$1\",compose_service=\"api\"})" |
  sed -n "s/^{} => \([0-9][0-9]*\) .*/C \1/p"
'

# Reads the targets into $work: `targets` ("<health> <job> <instance> <last error>"), `count`
# and `discovered` (api container names). Returns 1 when Prometheus did not answer.
snapshot() {
  docker exec "$prometheus" sh -c "$remote" sh "$PROJECT" > "$work/raw" 2> "$work/error" || return 1
  # Only printable characters reach the terminal.
  LC_ALL=C tr -cd '[:print:]\n' < "$work/raw" > "$work/clean"
  sed -n 's/^T //p' "$work/clean" > "$work/targets"
  sed -n 's/^N \([0-9][0-9]*\)$/\1/p' "$work/clean" > "$work/count"
  sed -n 's/^A //p' "$work/clean" > "$work/discovered"
  sed -n 's/^C \([0-9][0-9]*\)$/\1/p' "$work/clean" > "$work/containers"
}

# api containers cAdvisor has series for; 0 when it has none.
cadvisor_containers() {
  local count
  count=$(head -n 1 "$work/containers")
  echo "${count:-0}"
}

# api replicas Prometheus knows about: scraped targets of the job `api` plus discovered ones.
api_replicas() {
  { awk '$2 == "api" { print $3 }' "$work/targets"; cat "$work/discovered"; } | sort -u
}

# True when steps 1 to 3 hold for the current snapshot.
settled() {
  [[ "$(cat "$work/count")" -eq "$(grep -c . "$work/targets" || true)" ]] || return 1
  [[ -z "$(awk '$1 != "up"' "$work/targets")" ]] || return 1
  local job
  for job in $EXPECTED_JOBS; do
    awk -v job="$job" '$2 == job { found = 1 } END { exit !found }' "$work/targets" || return 1
  done
  [[ "$(api_replicas | grep -c . || true)" -eq "$EXPECTED_API_REPLICAS" ]] || return 1
  [[ "$(cadvisor_containers)" -ge "$EXPECTED_API_REPLICAS" ]]
}

echo "Metrics check for project ${PROJECT} (${EXPECTED_API_REPLICAS} api replicas expected)"

deadline=$((SECONDS + WAIT_SECONDS))
while :; do
  if snapshot && settled; then
    break
  fi
  if [[ "$SECONDS" -ge "$deadline" ]]; then
    break
  fi
  sleep 3
done
if [[ ! -s "$work/count" ]]; then
  echo "Prometheus did not answer on its HTTP API: $(LC_ALL=C tr -cd '[:print:]' < "$work/error")" >&2
  exit 2
fi

# --- 1. every target is UP, every expected job has one ---
echo "1. Scrape targets"
parsed=$(grep -c . "$work/targets" || true)
if [[ "$(cat "$work/count")" -ne "$parsed" ]]; then
  fail "read ${parsed} of $(cat "$work/count") targets from the API response"
fi
while read -r health job instance error; do
  if [[ "$health" == up ]]; then
    pass "${job}: ${instance} is up"
  else
    fail "${job}: ${instance} is ${health}${error:+ (${error})}"
  fi
done < "$work/targets"
for job in $EXPECTED_JOBS; do
  if ! awk -v job="$job" '$2 == job { found = 1 } END { exit !found }' "$work/targets"; then
    fail "no target for the job ${job}"
  fi
done

# --- 2. both api replicas found by service discovery ---
echo "2. api replicas found by service discovery"
api_replicas > "$work/replicas"
while read -r name; do
  if awk -v name="$name" '$2 == "api" && $3 == name { found = 1 } END { exit !found }' "$work/targets"; then
    echo "        ${name}: scraped"
  else
    echo "        ${name}: discovered, not scraped (no metrics port yet, UL-173)"
  fi
done < "$work/replicas"
replicas=$(grep -c . "$work/replicas" || true)
if [[ "$replicas" -eq "$EXPECTED_API_REPLICAS" ]]; then
  pass "Prometheus sees ${replicas} api replicas"
else
  fail "Prometheus sees ${replicas} api replicas, expected ${EXPECTED_API_REPLICAS}"
fi

# --- 3. cAdvisor reports containers ---
# "At least": a replaced container stays in query results for five more minutes.
echo "3. Container metrics"
reported=$(cadvisor_containers)
if [[ "$reported" -ge "$EXPECTED_API_REPLICAS" ]]; then
  pass "cAdvisor reports ${reported} api containers"
else
  fail "cAdvisor reports ${reported} api containers, expected at least ${EXPECTED_API_REPLICAS}"
fi

# --- 4. nothing reachable from outside ---
echo "4. Not published"
for service in $PRIVATE_SERVICES; do
  ids=$(containers "$service")
  if [[ -z "$ids" ]]; then
    fail "${service}: no running container"
    continue
  fi
  for id in $ids; do
    # "<published ports>|<network mode>|<traefik.enable label>"
    facts=$(docker inspect --format \
      '{{range $port, $bindings := .NetworkSettings.Ports}}{{if $bindings}}{{$port}} {{end}}{{end}}|{{.HostConfig.NetworkMode}}|{{index .Config.Labels "traefik.enable"}}' "$id")
    IFS='|' read -r ports mode router <<< "$facts"
    if [[ -n "$ports" ]]; then
      fail "${service}: publishes ${ports}"
    elif [[ "$mode" == host ]]; then
      fail "${service}: runs on the host network"
    elif [[ -n "$router" && ! "$router" =~ ^([Ff]alse|FALSE|[Ff]|0)$ ]]; then
      fail "${service}: has traefik.enable=${router}"
    else
      pass "${service}: no published port, no host network, no Traefik router"
    fi
  done
done

if [[ "$failures" -eq 0 ]]; then
  echo "PASS: metrics are collected"
else
  echo "FAIL: ${failures} check(s) failed"
  exit 1
fi
