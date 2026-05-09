#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   PROJECT_ID=my-project ./scripts/bootstrap-secrets-from-google-credential.sh /path/to/credential.json
#
# Credential file must contain: client_id, client_secret, refresh_token

CRED_PATH="${1:-}"
if [[ -z "$CRED_PATH" || ! -f "$CRED_PATH" ]]; then
  echo "Usage: $0 /path/to/google-credential.json" >&2
  exit 1
fi

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is required (or set an active gcloud project)." >&2
  exit 1
fi

CLIENT_ID="$(jq -r '.client_id // empty' "$CRED_PATH")"
CLIENT_SECRET="$(jq -r '.client_secret // empty' "$CRED_PATH")"
REFRESH_TOKEN="$(jq -r '.refresh_token // empty' "$CRED_PATH")"

if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" || -z "$REFRESH_TOKEN" ]]; then
  echo "Credential file missing client_id/client_secret/refresh_token." >&2
  exit 1
fi

upsert_secret() {
  local name="$1"
  local value="$2"

  if gcloud secrets describe "$name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --project "$PROJECT_ID" --data-file=- >/dev/null
  else
    printf '%s' "$value" | gcloud secrets create "$name" --project "$PROJECT_ID" --replication-policy="automatic" --data-file=- >/dev/null
  fi
}

upsert_secret "GOOGLE_OAUTH_CLIENT_ID" "$CLIENT_ID"
upsert_secret "GOOGLE_OAUTH_CLIENT_SECRET" "$CLIENT_SECRET"
upsert_secret "GOOGLE_OAUTH_REFRESH_TOKEN" "$REFRESH_TOKEN"

if [[ -n "${WEBHOOK_TOKEN:-}" ]]; then
  upsert_secret "WEBHOOK_TOKEN" "$WEBHOOK_TOKEN"
fi

echo "Secrets updated in project: $PROJECT_ID"
echo "- GOOGLE_OAUTH_CLIENT_ID"
echo "- GOOGLE_OAUTH_CLIENT_SECRET"
echo "- GOOGLE_OAUTH_REFRESH_TOKEN"
if [[ -n "${WEBHOOK_TOKEN:-}" ]]; then
  echo "- WEBHOOK_TOKEN"
fi
