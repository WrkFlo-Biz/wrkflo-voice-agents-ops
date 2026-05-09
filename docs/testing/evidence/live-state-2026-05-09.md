# Live State Evidence

Observed: 2026-05-09 20:52 UTC

This file captures read-only checks used to align repo docs with live GitHub, Azure, and ElevenLabs state. No secret values are included.

## GitHub

- Remote: `https://github.com/WrkFlo-Biz/wrkflo-voice-agents-ops.git`
- Default branch: `main`
- Working branch: `codex/reconcile-voice-agent-docs`
- GitHub environments present: `production`, `staging`
- Environment secrets present in both environments:
  - `AZURE_CLIENT_ID`
  - `AZURE_SUBSCRIPTION_ID`
  - `AZURE_TENANT_ID`
- Environment variables present in both environments:
  - `AZURE_ACR_LOGIN_SERVER=cafe61646254acr.azurecr.io`
  - `AZURE_ACR_NAME=cafe61646254acr`
  - `AZURE_CONTAINER_APP=wrkflo-google-webhooks`
  - `AZURE_RESOURCE_GROUP=wrkflo-ai-rg`
  - `HEALTH_URL=https://wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io/health`
  - `IMAGE_REPOSITORY=wrkflo-google-webhooks`
- Eden gateway workflow files are included in this branch:
  - `.github/workflows/eden-gateway-ci.yml`
  - `.github/workflows/eden-gateway-deploy.yml`

## Azure Container App

- Container App: `wrkflo-google-webhooks`
- Resource group: `wrkflo-ai-rg`
- Managed environment: `wrkflo-ai-env`
- Location: East US
- FQDN: `wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io`
- Latest revision: `wrkflo-google-webhooks--0000074`
- Running status: `Running`
- Traffic: `100%` to latest revision
- Image: `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-20260509194019`
- Registry server: `cafe61646254acr.azurecr.io`

## `wrkflo-ai-rg` Runtime Dependencies

Resources currently in `wrkflo-ai-rg`:

| Resource | Type | Purpose |
|---|---|---|
| `wrkflo-google-webhooks` | `Microsoft.App/containerApps` | Live Eden/Ellie webhook and tools gateway |
| `wrkflo-ai-env` | `Microsoft.App/managedEnvironments` | Container Apps managed environment for the gateway |
| `cafe61646254acr` | `Microsoft.ContainerRegistry/registries` | Container image registry for `wrkflo-google-webhooks` images |
| `wrkflostate7091c86a` | `Microsoft.Storage/storageAccounts` | Azure Table session state for live demo conversation/doc mapping |
| `workspace-wrkfloairgAAkP` | `Microsoft.OperationalInsights/workspaces` | Log Analytics workspace for Container Apps environment logs |

Dependency details:

- ACR `cafe61646254acr`: Basic SKU, admin user enabled, login server `cafe61646254acr.azurecr.io`.
- Container App registry pull still uses password secret `cafe61646254acrazurecrio-cafe61646254acr`.
- Storage account `wrkflostate7091c86a`: StorageV2, Standard_LRS, East US, blob public access disabled.
- Log Analytics `workspace-wrkfloairgAAkP`: PerGB2018 SKU, 30-day retention.
- Azure OpenAI endpoint `https://wrkflobiz.cognitiveservices.azure.com/` is outside `wrkflo-ai-rg`; it belongs to AI Services account `wrkflobiz` in resource group `Wrk`.

Health response:

```json
{"ok":true,"service":"workspace-google-webhooks","date":"2026-05-09T20:52:22.127Z","sessionStore":"azure-table","sessionStoreOk":true,"handoffEnabled":true}
```

## Azure Runtime Env Summary

Plain env values observed:

- `CORS_ORIGIN=*`
- `DEFAULT_CC_EMAIL=moses@wrkflo.biz`
- `WORKSPACE_OWNER_EMAIL=wrkflo.biz@gmail.com`
- `SESSION_TABLE_NAME=liveDemoSessions`
- `GMAIL_FROM_EMAIL=wrkflo.biz@gmail.com`
- `HANDOFF_AGENT_ID=agent_9601kjenmpbwewntb483he79nfvr`
- `HANDOFF_AGENT_PHONE_NUMBER_ID=phnum_4601kja8mj5ve8ea4pn9n9fx2znq`
- `HANDOFF_CALL_RECORDING_ENABLED=true`
- `HANDOFF_DIAL_MODE=caller`
- `HANDOFF_HUMAN_NUMBER=+17632224106`
- `HANDOFF_SINGLE_LEG_TEST_MODE=false`
- `LIVE_DEMO_REQUIRE_EXPLICIT_START=false`
- `LIVE_DEMO_START_ASYNC=true`
- `LIVE_DEMO_START_TIMEOUT_MS=15000`
- `LIVE_DEMO_DOC_OP_TIMEOUT_MS=12000`
- `INTERNAL_NOTES_EMAIL=wrkflo.biz@gmail.com`
- `AZURE_OPENAI_ENDPOINT=https://wrkflobiz.cognitiveservices.azure.com/`
- `AZURE_OPENAI_DEPLOYMENT=gpt-4o`
- `AZURE_OPENAI_API_VERSION=2024-10-21`

Secret refs observed:

- `google-oauth-client-id`
- `google-oauth-client-secret`
- `google-oauth-refresh-token`
- `webhook-token`
- `azure-storage-connection-string`
- `elevenlabs-api-key`
- `azure-openai-api-key`
- ACR registry password secret: `cafe61646254acrazurecrio-cafe61646254acr`

`WRKFLO_SEARCH_ENDPOINT` is not configured.

## Azure GitHub OIDC

- App registration: `wrkflo-eden-gateway-github-actions`
- App ID: `05605d80-1198-40f5-8767-aa6be2eaddb8`
- Service principal object ID: `29616bea-7ec3-4518-b6b3-c703ed386355`
- Federated subjects:
  - `repo:WrkFlo-Biz/wrkflo-voice-agents-ops:environment:staging`
  - `repo:WrkFlo-Biz/wrkflo-voice-agents-ops:environment:production`
- RBAC assignments:
  - `Container Apps Contributor` on `wrkflo-ai-rg`
  - `AcrPush` on `cafe61646254acr`

## ElevenLabs

Read-only agent API scan:

| Agent | Agent ID | Live name | Version | Search state | Exa prompt mention |
|---|---|---|---|---|---|
| Eden | `agent_0601kja359hpeae8qfz7q40j7fhg` | `Eden - Widget` | `agtvrsn_5801kr74exgvemcr912watwtt7bb` | `wrkflo_search` webhook referenced | No |
| Eden v2 | `agent_7301km4n7mm9egssp5aayg19ywk8` | `Eden - Widget v2` | `agtvrsn_2501kr74ezvsfx4rm2st55qhasqq` | `wrkflo_search` webhook referenced | No |
| Ellie | `agent_9601kjenmpbwewntb483he79nfvr` | `Ellie - Phone` | `agtvrsn_3501kr74f21hf8vb3813p4fsqq4r` | No search tool refs found | No |

## Commands Used

```bash
git fetch --prune origin
git ls-remote --heads origin main codex/reconcile-voice-agent-docs
gh api repos/WrkFlo-Biz/wrkflo-voice-agents-ops/environments
gh api repos/WrkFlo-Biz/wrkflo-voice-agents-ops/actions/workflows
az containerapp show --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks
az containerapp revision list --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks
az containerapp secret list --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks
az resource list --resource-group wrkflo-ai-rg
az acr show --resource-group wrkflo-ai-rg --name cafe61646254acr
az storage account show --resource-group wrkflo-ai-rg --name wrkflostate7091c86a
az monitor log-analytics workspace show --resource-group wrkflo-ai-rg --workspace-name workspace-wrkfloairgAAkP
az cognitiveservices account list --query "[?contains(endpoint || '', 'wrkflobiz') || name=='wrkflobiz']"
az ad app federated-credential list --id 05605d80-1198-40f5-8767-aa6be2eaddb8
curl -fsS https://wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io/health
```
