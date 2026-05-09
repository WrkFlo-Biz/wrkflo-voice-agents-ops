#!/usr/bin/env bash
set -euo pipefail

# Azure-first deployment for workspace-google-webhooks.
# Required:
#   CRED_PATH=/path/to/google-credential.json
# Optional overrides:
#   RESOURCE_GROUP, LOCATION, ENVIRONMENT_NAME, APP_NAME,
#   STORAGE_ACCOUNT_NAME, SESSION_TABLE_NAME, WEBHOOK_TOKEN,
#   CORS_ORIGIN, DEFAULT_CC_EMAIL, WORKSPACE_OWNER_EMAIL, GMAIL_FROM_EMAIL,
#   ELEVENLABS_API_KEY, HANDOFF_AGENT_ID, HANDOFF_AGENT_PHONE_NUMBER_ID,
#   HANDOFF_CALL_RECORDING_ENABLED, HANDOFF_DIAL_MODE, HANDOFF_HUMAN_NUMBER,
#   HANDOFF_SINGLE_LEG_TEST_MODE, WRKFLO_SEARCH_ENDPOINT, WRKFLO_SEARCH_API_KEY,
#   AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT,
#   AZURE_OPENAI_DEFAULT_DEPLOYMENT, AZURE_OPENAI_PREMIUM_DEPLOYMENT,
#   AZURE_OPENAI_FAST_DEPLOYMENT, AZURE_OPENAI_REASONING_DEPLOYMENT,
#   AZURE_OPENAI_DEEP_REASONING_DEPLOYMENT, AZURE_OPENAI_CODEX_DEPLOYMENT,
#   AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT, AZURE_OPENAI_MODEL_ROUTER_ENABLED,
#   AZURE_OPENAI_API_VERSION, AZURE_OPENAI_MAX_OUTPUT_TOKENS,
#   AZURE_OPENAI_IMAGE_ENDPOINT, AZURE_OPENAI_IMAGE_API_KEY,
#   AZURE_OPENAI_IMAGE_DEPLOYMENT, AZURE_OPENAI_IMAGE_API_VERSION,
#   AZURE_OPENAI_IMAGE_TIMEOUT_MS

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CRED_PATH="${CRED_PATH:-}"
if [[ -z "$CRED_PATH" || ! -f "$CRED_PATH" ]]; then
  echo "CRED_PATH is required and must point to a credential JSON with client_id/client_secret/refresh_token." >&2
  exit 1
fi

RESOURCE_GROUP="${RESOURCE_GROUP:-wrkflo-ai-rg}"
LOCATION="${LOCATION:-eastus}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-wrkflo-ai-env}"
APP_NAME="${APP_NAME:-wrkflo-google-webhooks}"
SESSION_TABLE_NAME="${SESSION_TABLE_NAME:-liveDemoSessions}"
CORS_ORIGIN="${CORS_ORIGIN:-*}"
DEFAULT_CC_EMAIL="${DEFAULT_CC_EMAIL:-moses@wrkflo.biz}"
WORKSPACE_OWNER_EMAIL="${WORKSPACE_OWNER_EMAIL:-wrkflo.biz@gmail.com}"
GMAIL_FROM_EMAIL="${GMAIL_FROM_EMAIL:-wrkflo.biz@gmail.com}"
ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-}"
if [[ -z "$ELEVENLABS_API_KEY" && -f "${HOME}/.elevenlabs/api_key" ]]; then
  ELEVENLABS_API_KEY="$(tr -d '\r\n' < "${HOME}/.elevenlabs/api_key")"
fi

HANDOFF_AGENT_ID="${HANDOFF_AGENT_ID:-agent_9601kjenmpbwewntb483he79nfvr}"
HANDOFF_AGENT_PHONE_NUMBER_ID="${HANDOFF_AGENT_PHONE_NUMBER_ID:-phnum_4601kja8mj5ve8ea4pn9n9fx2znq}"
HANDOFF_CALL_RECORDING_ENABLED="${HANDOFF_CALL_RECORDING_ENABLED:-true}"
HANDOFF_DIAL_MODE="${HANDOFF_DIAL_MODE:-caller}"
HANDOFF_HUMAN_NUMBER="${HANDOFF_HUMAN_NUMBER:-+17632224106}"
HANDOFF_SINGLE_LEG_TEST_MODE="${HANDOFF_SINGLE_LEG_TEST_MODE:-false}"
WRKFLO_SEARCH_ENDPOINT="${WRKFLO_SEARCH_ENDPOINT:-}"
WRKFLO_SEARCH_API_KEY="${WRKFLO_SEARCH_API_KEY:-}"
AZURE_OPENAI_ENDPOINT="${AZURE_OPENAI_ENDPOINT:-}"
AZURE_OPENAI_API_KEY="${AZURE_OPENAI_API_KEY:-}"
AZURE_OPENAI_DEPLOYMENT="${AZURE_OPENAI_DEPLOYMENT:-}"
AZURE_OPENAI_DEFAULT_DEPLOYMENT="${AZURE_OPENAI_DEFAULT_DEPLOYMENT:-}"
AZURE_OPENAI_PREMIUM_DEPLOYMENT="${AZURE_OPENAI_PREMIUM_DEPLOYMENT:-}"
AZURE_OPENAI_FAST_DEPLOYMENT="${AZURE_OPENAI_FAST_DEPLOYMENT:-}"
AZURE_OPENAI_REASONING_DEPLOYMENT="${AZURE_OPENAI_REASONING_DEPLOYMENT:-}"
AZURE_OPENAI_DEEP_REASONING_DEPLOYMENT="${AZURE_OPENAI_DEEP_REASONING_DEPLOYMENT:-}"
AZURE_OPENAI_CODEX_DEPLOYMENT="${AZURE_OPENAI_CODEX_DEPLOYMENT:-}"
AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT="${AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT:-}"
AZURE_OPENAI_MODEL_ROUTER_ENABLED="${AZURE_OPENAI_MODEL_ROUTER_ENABLED:-true}"
AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2025-04-01-preview}"
AZURE_OPENAI_MAX_OUTPUT_TOKENS="${AZURE_OPENAI_MAX_OUTPUT_TOKENS:-300}"
AZURE_OPENAI_IMAGE_ENDPOINT="${AZURE_OPENAI_IMAGE_ENDPOINT:-}"
AZURE_OPENAI_IMAGE_API_KEY="${AZURE_OPENAI_IMAGE_API_KEY:-}"
AZURE_OPENAI_IMAGE_DEPLOYMENT="${AZURE_OPENAI_IMAGE_DEPLOYMENT:-}"
AZURE_OPENAI_IMAGE_API_VERSION="${AZURE_OPENAI_IMAGE_API_VERSION:-2025-04-01-preview}"
AZURE_OPENAI_IMAGE_TIMEOUT_MS="${AZURE_OPENAI_IMAGE_TIMEOUT_MS:-60000}"

if [[ "$HANDOFF_DIAL_MODE" != "caller" && "$HANDOFF_DIAL_MODE" != "human" ]]; then
  echo "HANDOFF_DIAL_MODE must be 'caller' or 'human'." >&2
  exit 1
fi

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
if [[ -z "$SUBSCRIPTION_ID" ]]; then
  echo "Azure CLI is not authenticated. Run: az login" >&2
  exit 1
fi

CLIENT_ID="$(jq -r '.client_id // empty' "$CRED_PATH")"
CLIENT_SECRET="$(jq -r '.client_secret // empty' "$CRED_PATH")"
REFRESH_TOKEN="$(jq -r '.refresh_token // empty' "$CRED_PATH")"
if [[ -z "$CLIENT_ID" || -z "$CLIENT_SECRET" || -z "$REFRESH_TOKEN" ]]; then
  echo "Credential file missing client_id/client_secret/refresh_token." >&2
  exit 1
fi

if [[ -z "${WEBHOOK_TOKEN:-}" ]]; then
  WEBHOOK_TOKEN="$(openssl rand -hex 24)"
fi

if [[ -z "${STORAGE_ACCOUNT_NAME:-}" ]]; then
  SUFFIX="$(echo "$SUBSCRIPTION_ID" | tr -d '-' | cut -c1-8)"
  STORAGE_ACCOUNT_NAME="wrkflostate${SUFFIX}"
fi

if ! [[ "$STORAGE_ACCOUNT_NAME" =~ ^[a-z0-9]{3,24}$ ]]; then
  echo "STORAGE_ACCOUNT_NAME must be 3-24 chars, lowercase letters/numbers only." >&2
  exit 1
fi

echo "[1/6] Ensuring resource group: $RESOURCE_GROUP ($LOCATION)"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null

echo "[2/6] Ensuring storage account: $STORAGE_ACCOUNT_NAME"
if ! az storage account show --name "$STORAGE_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az storage account create \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --allow-blob-public-access false >/dev/null
fi

AZURE_STORAGE_CONNECTION_STRING="$(az storage account show-connection-string --name "$STORAGE_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP" -o tsv)"
az storage table create --name "$SESSION_TABLE_NAME" --connection-string "$AZURE_STORAGE_CONNECTION_STRING" >/dev/null

echo "[3/6] Ensuring Azure Container Apps environment: $ENVIRONMENT_NAME"
if ! az containerapp env show --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" >/dev/null 2>&1; then
  az containerapp env create --name "$ENVIRONMENT_NAME" --resource-group "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null
fi

echo "[4/6] Building and deploying container app: $APP_NAME"
cd "$ROOT_DIR"

ENV_VARS_BASE=(
  "CORS_ORIGIN=$CORS_ORIGIN"
  "DEFAULT_CC_EMAIL=$DEFAULT_CC_EMAIL"
  "WORKSPACE_OWNER_EMAIL=$WORKSPACE_OWNER_EMAIL"
  "SESSION_TABLE_NAME=$SESSION_TABLE_NAME"
)
if [[ -n "$GMAIL_FROM_EMAIL" ]]; then
  ENV_VARS_BASE+=("GMAIL_FROM_EMAIL=$GMAIL_FROM_EMAIL")
fi

az containerapp up \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --environment "$ENVIRONMENT_NAME" \
  --source "$ROOT_DIR" \
  --ingress external \
  --target-port 8080 \
  --env-vars "${ENV_VARS_BASE[@]}" >/dev/null

ELEVENLABS_SECRET_EXISTS="$(az containerapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "contains(properties.configuration.secrets[].name, 'elevenlabs-api-key')" \
  -o tsv 2>/dev/null || echo "false")"

SECRET_ARGS=(
  "google-oauth-client-id=$CLIENT_ID"
  "google-oauth-client-secret=$CLIENT_SECRET"
  "google-oauth-refresh-token=$REFRESH_TOKEN"
  "webhook-token=$WEBHOOK_TOKEN"
  "azure-storage-connection-string=$AZURE_STORAGE_CONNECTION_STRING"
)
if [[ -n "$ELEVENLABS_API_KEY" ]]; then
  SECRET_ARGS+=("elevenlabs-api-key=$ELEVENLABS_API_KEY")
fi
if [[ -n "$WRKFLO_SEARCH_API_KEY" ]]; then
  SECRET_ARGS+=("wrkflo-search-api-key=$WRKFLO_SEARCH_API_KEY")
fi
if [[ -n "$AZURE_OPENAI_API_KEY" ]]; then
  SECRET_ARGS+=("azure-openai-api-key=$AZURE_OPENAI_API_KEY")
fi
if [[ -n "$AZURE_OPENAI_IMAGE_API_KEY" ]]; then
  SECRET_ARGS+=("azure-openai-image-api-key=$AZURE_OPENAI_IMAGE_API_KEY")
fi

az containerapp secret set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --secrets "${SECRET_ARGS[@]}" >/dev/null

ENV_VARS_WITH_SECRETS=(
  "CORS_ORIGIN=$CORS_ORIGIN"
  "DEFAULT_CC_EMAIL=$DEFAULT_CC_EMAIL"
  "WORKSPACE_OWNER_EMAIL=$WORKSPACE_OWNER_EMAIL"
  "SESSION_TABLE_NAME=$SESSION_TABLE_NAME"
  "GOOGLE_OAUTH_CLIENT_ID=secretref:google-oauth-client-id"
  "GOOGLE_OAUTH_CLIENT_SECRET=secretref:google-oauth-client-secret"
  "GOOGLE_OAUTH_REFRESH_TOKEN=secretref:google-oauth-refresh-token"
  "WEBHOOK_TOKEN=secretref:webhook-token"
  "AZURE_STORAGE_CONNECTION_STRING=secretref:azure-storage-connection-string"
)
if [[ -n "$ELEVENLABS_API_KEY" || "$ELEVENLABS_SECRET_EXISTS" == "true" ]]; then
  ENV_VARS_WITH_SECRETS+=(
    "ELEVENLABS_API_KEY=secretref:elevenlabs-api-key"
    "HANDOFF_AGENT_ID=$HANDOFF_AGENT_ID"
    "HANDOFF_AGENT_PHONE_NUMBER_ID=$HANDOFF_AGENT_PHONE_NUMBER_ID"
    "HANDOFF_CALL_RECORDING_ENABLED=$HANDOFF_CALL_RECORDING_ENABLED"
    "HANDOFF_DIAL_MODE=$HANDOFF_DIAL_MODE"
    "HANDOFF_HUMAN_NUMBER=$HANDOFF_HUMAN_NUMBER"
    "HANDOFF_SINGLE_LEG_TEST_MODE=$HANDOFF_SINGLE_LEG_TEST_MODE"
  )
else
  echo "WARNING: ElevenLabs key not found; handoff env vars were not configured." >&2
fi
if [[ -n "$GMAIL_FROM_EMAIL" ]]; then
  ENV_VARS_WITH_SECRETS+=("GMAIL_FROM_EMAIL=$GMAIL_FROM_EMAIL")
fi
if [[ -n "$WRKFLO_SEARCH_ENDPOINT" ]]; then
  ENV_VARS_WITH_SECRETS+=("WRKFLO_SEARCH_ENDPOINT=$WRKFLO_SEARCH_ENDPOINT")
fi
if [[ -n "$WRKFLO_SEARCH_API_KEY" ]]; then
  ENV_VARS_WITH_SECRETS+=("WRKFLO_SEARCH_API_KEY=secretref:wrkflo-search-api-key")
fi
if [[ -n "$AZURE_OPENAI_ENDPOINT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT")
fi
if [[ -n "$AZURE_OPENAI_DEPLOYMENT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_DEPLOYMENT=$AZURE_OPENAI_DEPLOYMENT")
fi
if [[ -n "$AZURE_OPENAI_DEFAULT_DEPLOYMENT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_DEFAULT_DEPLOYMENT=$AZURE_OPENAI_DEFAULT_DEPLOYMENT")
fi
if [[ -n "$AZURE_OPENAI_PREMIUM_DEPLOYMENT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_PREMIUM_DEPLOYMENT=$AZURE_OPENAI_PREMIUM_DEPLOYMENT")
fi
if [[ -n "$AZURE_OPENAI_FAST_DEPLOYMENT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_FAST_DEPLOYMENT=$AZURE_OPENAI_FAST_DEPLOYMENT")
fi
if [[ -n "$AZURE_OPENAI_REASONING_DEPLOYMENT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_REASONING_DEPLOYMENT=$AZURE_OPENAI_REASONING_DEPLOYMENT")
fi
if [[ -n "$AZURE_OPENAI_DEEP_REASONING_DEPLOYMENT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_DEEP_REASONING_DEPLOYMENT=$AZURE_OPENAI_DEEP_REASONING_DEPLOYMENT")
fi
if [[ -n "$AZURE_OPENAI_CODEX_DEPLOYMENT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_CODEX_DEPLOYMENT=$AZURE_OPENAI_CODEX_DEPLOYMENT")
fi
if [[ -n "$AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT=$AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT")
fi
ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_MODEL_ROUTER_ENABLED=$AZURE_OPENAI_MODEL_ROUTER_ENABLED")
if [[ -n "$AZURE_OPENAI_API_VERSION" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_API_VERSION=$AZURE_OPENAI_API_VERSION")
fi
if [[ -n "$AZURE_OPENAI_MAX_OUTPUT_TOKENS" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_MAX_OUTPUT_TOKENS=$AZURE_OPENAI_MAX_OUTPUT_TOKENS")
fi
if [[ -n "$AZURE_OPENAI_API_KEY" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key")
fi
if [[ -n "$AZURE_OPENAI_IMAGE_ENDPOINT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_IMAGE_ENDPOINT=$AZURE_OPENAI_IMAGE_ENDPOINT")
fi
if [[ -n "$AZURE_OPENAI_IMAGE_DEPLOYMENT" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_IMAGE_DEPLOYMENT=$AZURE_OPENAI_IMAGE_DEPLOYMENT")
fi
if [[ -n "$AZURE_OPENAI_IMAGE_API_VERSION" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_IMAGE_API_VERSION=$AZURE_OPENAI_IMAGE_API_VERSION")
fi
if [[ -n "$AZURE_OPENAI_IMAGE_TIMEOUT_MS" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_IMAGE_TIMEOUT_MS=$AZURE_OPENAI_IMAGE_TIMEOUT_MS")
fi
if [[ -n "$AZURE_OPENAI_IMAGE_API_KEY" ]]; then
  ENV_VARS_WITH_SECRETS+=("AZURE_OPENAI_IMAGE_API_KEY=secretref:azure-openai-image-api-key")
fi

az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars "${ENV_VARS_WITH_SECRETS[@]}" >/dev/null

az containerapp revision set-mode \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --mode single >/dev/null

ACTIVE_REVISION="$(az containerapp revision list \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?properties.active==\`true\`].name | [-1]" \
  -o tsv)"
if [[ -n "$ACTIVE_REVISION" ]]; then
  az containerapp revision restart \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --revision "$ACTIVE_REVISION" >/dev/null || true
fi

echo "[5/6] Fetching app URL"
APP_URL="$(az containerapp show --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)"
if [[ -z "$APP_URL" ]]; then
  echo "Failed to resolve Container App URL." >&2
  exit 1
fi

echo "[6/6] Health check"
HEALTH_JSON="$(curl -fsSL "https://$APP_URL/health" || true)"

echo "Deployment complete."
echo "Container App URL: https://$APP_URL"
echo "Health endpoint: https://$APP_URL/health"
echo "Webhook token (store safely): $WEBHOOK_TOKEN"
echo "Health response: ${HEALTH_JSON:-unavailable}"
