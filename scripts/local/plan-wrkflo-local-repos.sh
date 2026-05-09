#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/Users/mosestut}"

repos=(
  "wrkflo-voice-agents-ops|WrkFlo-Biz/wrkflo-voice-agents-ops"
  "dev-workspace|WrkFlo-Biz/dev-workspace"
  "global-sentinel|WrkFlo-Biz/global-sentinel"
  "openclaw-prod|WrkFlo-Biz/openclaw-prod"
)

for item in "${repos[@]}"; do
  local_name="${item%%|*}"
  target_repo="${item#*|}"
  path="$ROOT/$local_name"
  target_url="https://github.com/${target_repo}.git"

  echo "== $path"
  echo "Target: $target_url"

  if [[ ! -d "$path/.git" ]]; then
    echo "Status: missing local git repo"
    echo
    continue
  fi

  git -C "$path" status --short --branch
  git -C "$path" remote -v

  origin_url="$(git -C "$path" remote get-url origin 2>/dev/null || true)"
  if [[ "$origin_url" == "$target_url" ]]; then
    echo "Origin: aligned"
  elif [[ -n "$origin_url" ]]; then
    echo "Origin: needs review before changing to target"
  else
    echo "Origin: missing"
  fi
  echo
done
