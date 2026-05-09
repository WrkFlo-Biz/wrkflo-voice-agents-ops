#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-workspace-google-webhooks}"
ALLOW_UNAUTH="${ALLOW_UNAUTH:-true}"
CORS_ORIGIN="${CORS_ORIGIN:-*}"
DEFAULT_CC_EMAIL="${DEFAULT_CC_EMAIL:-moses@wrkflo.biz}"
WORKSPACE_OWNER_EMAIL="${WORKSPACE_OWNER_EMAIL:-moses@wrkflo.biz}"
GMAIL_FROM_EMAIL="${GMAIL_FROM_EMAIL:-}"
FIRESTORE_COLLECTION="${FIRESTORE_COLLECTION:-liveDemoSessions}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is required (or set an active gcloud project)." >&2
  exit 1
fi

for secret in GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET GOOGLE_OAUTH_REFRESH_TOKEN WEBHOOK_TOKEN; do
  if ! gcloud secrets describe "$secret" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Missing required secret: $secret (project: $PROJECT_ID)" >&2
    exit 1
  fi
done

ENV_VARS="CORS_ORIGIN=${CORS_ORIGIN},DEFAULT_CC_EMAIL=${DEFAULT_CC_EMAIL},WORKSPACE_OWNER_EMAIL=${WORKSPACE_OWNER_EMAIL},FIRESTORE_COLLECTION=${FIRESTORE_COLLECTION},ENABLE_FIRESTORE=true"
if [[ -n "$GMAIL_FROM_EMAIL" ]]; then
  ENV_VARS="${ENV_VARS},GMAIL_FROM_EMAIL=${GMAIL_FROM_EMAIL}"
fi

ARGS=(
  run
  deploy
  "$SERVICE_NAME"
  --project "$PROJECT_ID"
  --region "$REGION"
  --platform managed
  --source .
  --set-env-vars "$ENV_VARS"
  --set-secrets "GOOGLE_OAUTH_CLIENT_ID=GOOGLE_OAUTH_CLIENT_ID:latest,GOOGLE_OAUTH_CLIENT_SECRET=GOOGLE_OAUTH_CLIENT_SECRET:latest,GOOGLE_OAUTH_REFRESH_TOKEN=GOOGLE_OAUTH_REFRESH_TOKEN:latest,WEBHOOK_TOKEN=WEBHOOK_TOKEN:latest"
)

if [[ "$ALLOW_UNAUTH" == "true" ]]; then
  ARGS+=(--allow-unauthenticated)
else
  ARGS+=(--no-allow-unauthenticated)
fi

echo "Deploying $SERVICE_NAME to project=$PROJECT_ID region=$REGION"
gcloud "${ARGS[@]}"

URL="$(gcloud run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
echo "Deployed URL: $URL"
echo "Health: $URL/health"
