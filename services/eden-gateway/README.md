# Wrk.Flo Google Workspace Webhooks

Source-of-truth note: this service is owned from the enterprise GitHub account `WrkFlo-Biz/wrkflo-voice-agents-ops` under `services/eden-gateway`. The previous local-only folder `/Users/mosestut/workspace-google-webhooks` should be treated as a legacy working copy until the GitHub workflow is live.

Durable webhook backend for ElevenLabs agents, deployed on Azure Container Apps.

## Why this setup lasts
- Stable Azure-hosted HTTPS endpoint.
- Azure Table Storage keeps `conversationId -> docId` mapping for recovery across calls.
- Google OAuth secrets are injected as runtime secrets (no hardcoding in code).
- One script can redeploy everything consistently.

## Endpoints
- `GET /health`
- `POST /workspace-live-demo/start`
- `POST /workspace-live-demo/note`
- `POST /workspace-live-demo/finalize`
- `POST /widget-human-handoff`
- `GET /wrkflo-tools/catalog`
- `POST /wrkflo-tools/:toolName`
- `GET /mcp`
- `POST /mcp`

All `POST` endpoints accept header `x-webhook-token: <token>` when `WEBHOOK_TOKEN` is configured.
The gateway catalog and MCP endpoints use the same header when `WEBHOOK_TOKEN` is configured.

`/widget-human-handoff` behavior:
- normalizes caller phone to E.164
- triggers ElevenLabs outbound call via Twilio using `HANDOFF_AGENT_ID` + `HANDOFF_AGENT_PHONE_NUMBER_ID`
- returns queued call metadata (`handoffConversationId`, `handoffCallSid`)

`/wrkflo-tools` behavior:
- `wrkflo_search`: WrkFlo-owned search gateway. Uses `WRKFLO_SEARCH_ENDPOINT` when configured, otherwise falls back to DuckDuckGo Instant Answer and then a safe unavailable response.
- `wrkflo_orchestrate`: routes complex requests through Azure OpenAI when `AZURE_OPENAI_*` vars are configured, selecting a configured deployment profile by request shape, otherwise returns a safe rule-router response.
- `wrkflo_image_generate`: generates images through Azure OpenAI image generation when `AZURE_OPENAI_IMAGE_*` vars are configured. Returns metadata by default; callers must set `includeB64: true` to receive raw `b64_json`.
- `wrkflo_notes_finalize`: wraps the existing notes finalizer for REST/MCP callers.

`/mcp` implements a minimal JSON-RPC MCP tools surface for `initialize`, `tools/list`, and `tools/call`.

## One-time credential generation
1. Generate or refresh Google OAuth credentials (must include Docs/Drive/Calendar/Gmail scopes):
   - `node ./scripts/generate-google-refresh-token.mjs /Users/mosestut/.google_workspace_mcp/client_secret.json`
2. Sign in as `wrkflo.biz@gmail.com`.
3. Copy the `code` query value from redirected URL.
4. Run:
   - `OAUTH_CODE='PASTE_CODE' node ./scripts/generate-google-refresh-token.mjs /Users/mosestut/.google_workspace_mcp/client_secret.json`
5. Credential file is saved at `/tmp/wrkflo-google-credential.json`.

## Azure deployment

### GitHub Actions deployment
The GitHub-owned deployment path is `.github/workflows/eden-gateway-deploy.yml`.
It deploys `services/eden-gateway` to the existing Azure Container App without
rewriting runtime secrets or environment variables.

Required GitHub environment secrets for `production` and `staging`:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Optional GitHub environment variables, with current production defaults:
- `AZURE_RESOURCE_GROUP=wrkflo-ai-rg`
- `AZURE_CONTAINER_APP=wrkflo-google-webhooks`
- `AZURE_ACR_NAME=cafe61646254acr`
- `AZURE_ACR_LOGIN_SERVER=cafe61646254acr.azurecr.io`
- `IMAGE_REPOSITORY=wrkflo-google-webhooks`
- `HEALTH_URL=https://wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io/health`

Azure prerequisites:
- Create an Entra app registration or user-assigned identity for GitHub Actions.
- Add a federated credential for the repo environment subject, for example
  `repo:<owner>/<repo>:environment:production`.
- Grant the identity `Container Apps Contributor` on `wrkflo-ai-rg`.
- Grant the identity `AcrPush` on `cafe61646254acr`.

The workflow can be run manually with `workflow_dispatch`. Push-to-main deploys
only when files under `services/eden-gateway/` or the workflow itself change.

### Manual Azure CLI deployment
1. Authenticate:
   - `az login`
2. Deploy:
   - `cd /Users/mosestut/wrkflo-voice-agents-ops/services/eden-gateway`
   - `CRED_PATH=/tmp/wrkflo-google-credential.json ./scripts/deploy-azure-containerapp.sh`

Defaults used by deploy script:
- `WORKSPACE_OWNER_EMAIL=wrkflo.biz@gmail.com`
- `GMAIL_FROM_EMAIL=wrkflo.biz@gmail.com`
- `DEFAULT_CC_EMAIL=moses@wrkflo.biz`

Script output includes:
- Container App URL
- Health URL
- webhook token (save it for ElevenLabs)

## ElevenLabs tool mapping
Configure three webhook tools in ElevenLabs:

1. `workspace_live_demo_start`
- URL: `https://<azure-app-fqdn>/workspace-live-demo/start`
- Method: `POST`
- Headers: `x-webhook-token: <WEBHOOK_TOKEN>`
- Body:
```json
{
  "conversationId": "{{conversation_id}}",
  "callerName": "{{full_name}}",
  "callerEmail": "{{email}}",
  "phone": "{{phone_number}}",
  "company": "{{company}}",
  "timezone": "{{timezone}}"
}
```

2. `workspace_live_demo_note`
- URL: `https://<azure-app-fqdn>/workspace-live-demo/note`
- Method: `POST`
- Headers: `x-webhook-token: <WEBHOOK_TOKEN>`
- Body:
```json
{
  "conversationId": "{{conversation_id}}",
  "speaker": "caller",
  "note": "{{captured_note}}",
  "timestamp": "{{timestamp}}"
}
```

3. `workspace_live_demo_finalize`
- URL: `https://<azure-app-fqdn>/workspace-live-demo/finalize`
- Method: `POST`
- Headers: `x-webhook-token: <WEBHOOK_TOKEN>`
- Body:
```json
{
  "conversationId": "{{conversation_id}}",
  "callerEmail": "{{email}}",
  "callerName": "{{full_name}}",
  "summary": "Thanks for the demo. Here are your notes."
}
```

## Local run
- `npm install`
- `npm start`

Local env vars:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`
- `WEBHOOK_TOKEN`
- `AZURE_STORAGE_CONNECTION_STRING` (optional; otherwise memory session storage)
- `ELEVENLABS_API_KEY`
- `HANDOFF_AGENT_ID` (default: `agent_9601kjenmpbwewntb483he79nfvr`)
- `HANDOFF_AGENT_PHONE_NUMBER_ID` (default: `phnum_4601kja8mj5ve8ea4pn9n9fx2znq`)
- `HANDOFF_CALL_RECORDING_ENABLED` (default: `true`)
- `WRKFLO_SEARCH_ENDPOINT` (optional)
- `WRKFLO_SEARCH_API_KEY` (optional)
- `AZURE_OPENAI_ENDPOINT` (optional)
- `AZURE_OPENAI_API_KEY` (optional)
- `AZURE_OPENAI_DEPLOYMENT` (legacy/default fallback, optional)
- `AZURE_OPENAI_DEFAULT_DEPLOYMENT` (default route, optional)
- `AZURE_OPENAI_PREMIUM_DEPLOYMENT` (strategy/architecture route, optional)
- `AZURE_OPENAI_FAST_DEPLOYMENT` (classification/extraction/short-work route, optional)
- `AZURE_OPENAI_REASONING_DEPLOYMENT` (debug/math/multi-step route, optional)
- `AZURE_OPENAI_DEEP_REASONING_DEPLOYMENT` (deep research/root-cause route, optional)
- `AZURE_OPENAI_CODEX_DEPLOYMENT` (coding/repo/CI route, optional)
- `AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT` (reserved for retrieval/search expansion, optional)
- `AZURE_OPENAI_MODEL_ROUTER_ENABLED` (default: `true`)
- `AZURE_OPENAI_API_VERSION` (default: `2025-04-01-preview`)
- `AZURE_OPENAI_MAX_OUTPUT_TOKENS` (default: `300`)
- `AZURE_OPENAI_IMAGE_ENDPOINT` (optional; image-generation Azure OpenAI endpoint)
- `AZURE_OPENAI_IMAGE_API_KEY` (optional)
- `AZURE_OPENAI_IMAGE_DEPLOYMENT` (optional; for example `gpt-image-2`)
- `AZURE_OPENAI_IMAGE_API_VERSION` (default: `2025-04-01-preview`)
- `AZURE_OPENAI_IMAGE_TIMEOUT_MS` (default: `60000`)

Image tool example:
```json
{
  "prompt": "A polished WrkFlo product dashboard mockup for a local HVAC company",
  "size": "1024x1024",
  "quality": "medium",
  "n": 1,
  "includeB64": false
}
```
