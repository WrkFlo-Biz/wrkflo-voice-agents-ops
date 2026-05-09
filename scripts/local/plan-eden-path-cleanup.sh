#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CANONICAL_PATH="${CANONICAL_PATH:-$REPO_ROOT/services/eden-gateway}"
LEGACY_PATH="${LEGACY_PATH:-/Users/mosestut/workspace-google-webhooks}"

usage() {
  cat <<'USAGE'
Usage: scripts/local/plan-eden-path-cleanup.sh [plan|--apply-ds-store-cleanup]

plan:
  Print current canonical/legacy paths, compare source files, and show cleanup candidates.

--apply-ds-store-cleanup:
  Remove .DS_Store files from the canonical and legacy paths only.

This script does not remove node_modules, env files, credentials, or the legacy
gateway folder. Keep the legacy folder until GitHub deployment is proven healthy.
USAGE
}

MODE="${1:-plan}"
case "$MODE" in
  plan|--apply-ds-store-cleanup) ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

echo "Canonical Eden gateway path: $CANONICAL_PATH"
echo "Legacy Eden gateway path:    $LEGACY_PATH"
echo

if [[ ! -d "$CANONICAL_PATH" ]]; then
  echo "Missing canonical path: $CANONICAL_PATH" >&2
  exit 1
fi

if [[ ! -d "$LEGACY_PATH" ]]; then
  echo "Legacy path not found. Nothing to compare: $LEGACY_PATH"
  exit 0
fi

echo "Tracked source comparison, excluding generated/runtime-only files:"
diff -qr \
  --exclude .git \
  --exclude .DS_Store \
  --exclude node_modules \
  --exclude .env \
  --exclude '.env.*' \
  "$LEGACY_PATH" \
  "$CANONICAL_PATH" || true
echo

echo "Generated/local clutter candidates:"
find "$CANONICAL_PATH" "$LEGACY_PATH" \
  \( -name node_modules -type d -print -prune \) -o \
  \( -name .DS_Store -o -name npm-debug.log \) -print | sort || true
echo

echo "Runtime secret-like local files to keep out of git:"
find "$CANONICAL_PATH" "$LEGACY_PATH" -maxdepth 3 -type f \
  \( -name '.env' -o -name '.env.*' -o -name '*credential*.json' -o -name '*secret*.json' \) \
  -print | sort || true
echo

if [[ "$MODE" == "--apply-ds-store-cleanup" ]]; then
  echo "Removing .DS_Store files only."
  find "$CANONICAL_PATH" "$LEGACY_PATH" -name .DS_Store -type f -delete
else
  cat <<EOF
No files changed.

Safe optional cleanup:
  scripts/local/plan-eden-path-cleanup.sh --apply-ds-store-cleanup

Do not remove $LEGACY_PATH until the GitHub deployment has succeeded and live
ElevenLabs smoke tests are captured.
EOF
fi
