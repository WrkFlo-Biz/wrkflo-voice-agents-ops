#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-plan}"
TARGET_REMOTE_URL="${TARGET_REMOTE_URL:-https://github.com/WrkFlo-Biz/wrkflo-voice-agents-ops.git}"
REMOTE_NAME="${REMOTE_NAME:-origin}"

usage() {
  cat <<'USAGE'
Usage: scripts/local/plan-github-remote-reconcile.sh [plan|--apply]

plan:
  Print the current origin URL and the target enterprise GitHub URL.

--apply:
  Run git remote set-url for the target enterprise GitHub URL.
USAGE
}

case "$MODE" in
  plan|--apply) ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

CURRENT_FETCH_URL="$(git remote get-url "$REMOTE_NAME" 2>/dev/null || true)"
CURRENT_PUSH_URL="$(git remote get-url --push "$REMOTE_NAME" 2>/dev/null || true)"

echo "Repository: $REPO_ROOT"
echo "Remote:     $REMOTE_NAME"
echo "Fetch URL:  ${CURRENT_FETCH_URL:-<missing>}"
echo "Push URL:   ${CURRENT_PUSH_URL:-<missing>}"
echo "Target:     $TARGET_REMOTE_URL"
echo

if [[ "$CURRENT_FETCH_URL" == "$TARGET_REMOTE_URL" && "$CURRENT_PUSH_URL" == "$TARGET_REMOTE_URL" ]]; then
  echo "Remote already points at the target enterprise GitHub repo."
  exit 0
fi

if [[ "$MODE" == "--apply" ]]; then
  git remote set-url "$REMOTE_NAME" "$TARGET_REMOTE_URL"
  git remote set-url --push "$REMOTE_NAME" "$TARGET_REMOTE_URL"
  echo "Updated $REMOTE_NAME to $TARGET_REMOTE_URL"
else
  echo "No files or git config changed."
  echo
  echo "Apply when ready:"
  printf '  TARGET_REMOTE_URL=%q %q --apply\n' "$TARGET_REMOTE_URL" "scripts/local/plan-github-remote-reconcile.sh"
fi
