#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-plan}"
if [[ "$MODE" != "plan" && "$MODE" != "--apply" ]]; then
  echo "Usage: $0 [plan|--apply]" >&2
  exit 2
fi

run() {
  if [[ "$MODE" == "--apply" ]]; then
    "$@"
  else
    printf '%q ' "$@"
    printf '\n'
  fi
}

tag_group() {
  local group="$1"
  shift
  run az group update --name "$group" --set "$@"
}

tag_group wrkflo-ai-rg \
  tags.project=eden-voice \
  tags.environment=production \
  tags.owner=moses \
  tags.repo=WrkFlo-Biz/wrkflo-voice-agents-ops \
  tags.managed_by=github-actions-target \
  tags.lifecycle=active

tag_group wrkflo \
  tags.project=wrkflo-core \
  tags.environment=production \
  tags.owner=moses \
  tags.repo=WrkFlo-Biz/wrkflo-orchestrator \
  tags.managed_by=github-actions-and-manual \
  tags.lifecycle=active

tag_group wrkflo-dev \
  tags.project=wrkflo-core \
  tags.environment=dev \
  tags.owner=moses \
  tags.repo=WrkFlo-Biz/wrkflo-orchestrator \
  tags.managed_by=manual-azure-cli \
  tags.lifecycle=active

tag_group wrkflo-rg \
  tags.project=wrkflo-core \
  tags.environment=review \
  tags.owner=moses \
  tags.repo=WrkFlo-Biz/wrkflo-orchestrator \
  tags.managed_by=review \
  tags.lifecycle=review

tag_group openclaw-rg \
  tags.project=openclaw \
  tags.environment=production \
  tags.owner=moses \
  tags.repo=WrkFlo-Biz/openclaw-prod \
  tags.managed_by=github-actions-and-manual \
  tags.lifecycle=active

tag_group gs-dev-rg \
  tags.project=global-sentinel \
  tags.environment=dev \
  tags.owner=moses \
  tags.repo=WrkFlo-Biz/global-sentinel \
  tags.managed_by=review \
  tags.lifecycle=review

tag_group ainime_ua \
  tags.project=ainime \
  tags.environment=production \
  tags.owner=isaac \
  tags.repo=unknown \
  tags.managed_by=review \
  tags.lifecycle=active

tag_group rg-isaac \
  tags.project=isaac-ai-lab \
  tags.environment=lab \
  tags.owner=isaac \
  tags.repo=unknown \
  tags.managed_by=review \
  tags.lifecycle=review

tag_group rg-moses-8586 \
  tags.project=ai-lab \
  tags.environment=lab \
  tags.owner=moses \
  tags.repo=unknown \
  tags.managed_by=review \
  tags.lifecycle=review

tag_group dev-ws-westus2 \
  tags.project=dev-workspace \
  tags.environment=dev \
  tags.owner=moses \
  tags.repo=WrkFlo-Biz/dev-workspace \
  tags.managed_by=manual-azure-cli \
  tags.lifecycle=active

tag_group comfyui \
  tags.project=unknown \
  tags.environment=unknown \
  tags.owner=unknown \
  tags.repo=unknown \
  tags.managed_by=review \
  tags.lifecycle=decommission-candidate

tag_group rg-comfy \
  tags.project=unknown \
  tags.environment=unknown \
  tags.owner=unknown \
  tags.repo=unknown \
  tags.managed_by=review \
  tags.lifecycle=decommission-candidate
