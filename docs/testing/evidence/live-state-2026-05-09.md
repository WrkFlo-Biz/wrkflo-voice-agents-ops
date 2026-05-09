# Live State Evidence

Observed: 2026-05-09 20:52 UTC; follow-up checks at 2026-05-09 21:35 UTC and 21:44 UTC

This file captures checks and focused follow-up changes used to align repo docs with live GitHub, Azure, and ElevenLabs state. No secret values are included.

## GitHub

- Remote: `https://github.com/WrkFlo-Biz/wrkflo-voice-agents-ops.git`
- Default branch: `main`
- PR branch: `codex/reconcile-voice-agent-docs`; merged to `main` at `5e670b2`
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
- Eden gateway workflow files are now on `main`:
  - `.github/workflows/eden-gateway-ci.yml`
  - `.github/workflows/eden-gateway-deploy.yml`

## Azure Container App

- Container App: `wrkflo-google-webhooks`
- Resource group: `wrkflo-ai-rg`
- Managed environment: `wrkflo-ai-env`
- Location: East US
- FQDN: `wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io`
- Latest revision: `wrkflo-google-webhooks--0000080`
- Running status: `Running`
- Traffic: `100%` to latest revision
- Image: `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-25612879618-17ebb7d`
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

- ACR `cafe61646254acr`: Basic SKU, admin user disabled, login server `cafe61646254acr.azurecr.io`.
- Container App registry pull uses system-assigned managed identity with `AcrPull`.
- Storage account `wrkflostate7091c86a`: StorageV2, Standard_LRS, East US, blob public access disabled.
- Log Analytics `workspace-wrkfloairgAAkP`: PerGB2018 SKU, 30-day retention.
- Azure OpenAI endpoint `https://wrkflobiz.cognitiveservices.azure.com/` is outside `wrkflo-ai-rg`; it belongs to AI Services account `wrkflobiz` in resource group `Wrk`.

Health response:

```json
{"ok":true,"service":"workspace-google-webhooks","date":"2026-05-09T20:52:22.127Z","sessionStore":"azure-table","sessionStoreOk":true,"handoffEnabled":true}
```

Post-deploy health response:

```json
{"ok":true,"service":"workspace-google-webhooks","date":"2026-05-09T21:44:13.640Z","sessionStore":"azure-table","sessionStoreOk":true,"handoffEnabled":true}
```

Post-managed-identity deploy health response:

```json
{"ok":true,"service":"workspace-google-webhooks","date":"2026-05-09T21:53:35.782Z","sessionStore":"azure-table","sessionStoreOk":true,"handoffEnabled":true}
```

Post-router deploy health response:

```json
{"ok":true,"service":"workspace-google-webhooks","date":"2026-05-09T21:55:59.872Z","sessionStore":"azure-table","sessionStoreOk":true,"azureOpenAIConfigured":true,"azureOpenAIDefaultDeployment":"gpt-5.4-mini","azureOpenAIModelRouterEnabled":true,"handoffEnabled":true}
```

Post-GitHub-router deploy health response:

```json
{"ok":true,"service":"workspace-google-webhooks","date":"2026-05-09T22:02:00.970Z","sessionStore":"azure-table","sessionStoreOk":true,"azureOpenAIConfigured":true,"azureOpenAIDefaultDeployment":"gpt-5.4-mini","azureOpenAIModelRouterEnabled":true,"handoffEnabled":true}
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
- `AZURE_OPENAI_DEPLOYMENT=gpt-5.4-mini`
- `AZURE_OPENAI_API_VERSION=2025-04-01-preview`
- `AZURE_OPENAI_DEFAULT_DEPLOYMENT=gpt-5.4-mini`
- `AZURE_OPENAI_PREMIUM_DEPLOYMENT=wrkflo-premium-gpt-5.4`
- `AZURE_OPENAI_FAST_DEPLOYMENT=gpt-5.4-nano`
- `AZURE_OPENAI_REASONING_DEPLOYMENT=o4-mini`
- `AZURE_OPENAI_DEEP_REASONING_DEPLOYMENT=o3`
- `AZURE_OPENAI_CODEX_DEPLOYMENT=gpt-5.3-codex`
- `AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT=text-embedding-3-large`
- `AZURE_OPENAI_MODEL_ROUTER_ENABLED=true`
- `AZURE_OPENAI_MAX_OUTPUT_TOKENS=300`

Secret refs observed:

- `google-oauth-client-id`
- `google-oauth-client-secret`
- `google-oauth-refresh-token`
- `webhook-token`
- `azure-storage-connection-string`
- `elevenlabs-api-key`
- `azure-openai-api-key`
- `azure-openai-image-api-key`

`WRKFLO_SEARCH_ENDPOINT` is not configured.

ACR password secret cleanup on 2026-05-09 at 22:14 UTC:

- Removed old Container App ACR password secret `cafe61646254acrazurecrio-cafe61646254acr`.
- Post-cleanup secret list contains only runtime app secrets: `google-oauth-client-id`, `google-oauth-client-secret`, `google-oauth-refresh-token`, `webhook-token`, `azure-storage-connection-string`, `elevenlabs-api-key`, and `azure-openai-api-key`.
- Registry auth still uses `identity=system` with empty `passwordSecretRef`.
- Container App provisioning returned to `Succeeded`; `wrkflo-google-webhooks--0000080` is latest/ready and receives `100%` traffic.
- ACR `cafe61646254acr` admin user remains disabled.
- `/health` returned healthy after cleanup.

## Focused Infrastructure Follow-up

Applied on 2026-05-09:

- `wrkflo-ai-rg` tagged for Eden ownership: `project=eden-voice`, `environment=production`, `owner=moses`, `repo=WrkFlo-Biz/wrkflo-voice-agents-ops`, `managed_by=github-actions-target`, `lifecycle=active`.
- `wrkflo` and `wrkflo-dev` tagged for WrkFlo core ownership with `repo=WrkFlo-Biz/wrkflo-orchestrator`.
- `openclaw-rg` tagged for OpenClaw production ownership with `repo=WrkFlo-Biz/openclaw-prod`.
- `gs-dev-rg` tagged for Global Sentinel dev/review ownership with `repo=WrkFlo-Biz/global-sentinel`.
- `dev-ws-westus2` tagged for Dev Workspace ownership with `repo=WrkFlo-Biz/dev-workspace`.

Verified VM NSG hardening:

| VM | Public IP | Rule change |
|---|---|---|
| `openclaw-gateway-vm` | `20.124.180.8` | TCP `22`, `8501`, `5000`, and `5001` now allow source `174.232.30.68/32` instead of `*` |
| `dev-workspace-vm` | `20.230.203.79` | TCP `22` now allows source `174.232.30.68/32` instead of `*` |

Verified VM access posture:

- `dev-workspace-vm` and `openclaw-gateway-vm` are both online in Tailscale.
- `dev-workspace-vm` has Tailscale Serve routes for `/`, `/api`, and `/orch`.
- `openclaw-gateway-vm` has Tailscale Serve routes for the OpenClaw gateway on `443` and `18789`.
- No public NSG rules were removed because the current `174.232.30.68/32` rules remain the verified break-glass path until Tailscale SSH plus Azure Run Command or Serial Console are verified.
- Detailed evidence: `docs/infrastructure/vm-access-hardening-state-2026-05-09.md`.

Verified WrkFlo placement:

- `wrkflo-orchestrator` remains a single-revision Azure Container App using image `wrkfloacr637a2eee.azurecr.io/wrkflo-orchestrator:c377b3a`.
- `wrkflo-orchestrator-staging` remains a single-revision Azure Container App using image `wrkfloacr637a2eee.azurecr.io/wrkflo-orchestrator:62de71c8`.
- `wrkflo-app` remains a running Linux container App Service with hostnames `app.wrkflo.biz` and `wrkflo-app.azurewebsites.net`; HTTPS-only is enabled.

Verified Eden GitHub deploy:

- PR #1 merged to `main` at merge commit `5e670b2`.
- Eden Gateway CI run `25612536913` succeeded on `main`.
- Deploy Eden Gateway run `25612536914` succeeded on `main`.
- The deployment built and pushed image `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-25612536914-5e670b2`.
- Manual Deploy Eden Gateway run `25612717893` succeeded after switching registry auth to managed identity.
- The identity-backed deployment built and pushed image `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-25612717893-2eee8d0`.
- A follow-up router deployment produced image `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-20260509215150-router`.
- PR #2 merged to `main` at merge commit `17ebb7d`.
- Deploy Eden Gateway run `25612879618` succeeded on `main`.
- The GitHub-built router deployment produced image `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-25612879618-17ebb7d`.
- Azure revision `wrkflo-google-webhooks--0000080` is running and receiving `100%` traffic after the ACR password secret cleanup revision.
- Production environment deployment branch policy now allows only the `main` branch.
- `cafe61646254acr` admin user is disabled.

Verified GitHub branch protection:

- `main` is protected for `WrkFlo-Biz/wrkflo-voice-agents-ops`.
- For `WrkFlo-Biz/wrkflo-voice-agents-ops`, `main` requires 1 approving PR review, dismisses stale reviews, requires conversation resolution, does not require code owner review, does not require last-push approval, does not enforce protection for admins, and has no required status checks configured.
- `main` is protected for `WrkFlo-Biz/wrkflo-orchestrator`.
- `main` is protected for `WrkFlo-Biz/global-sentinel`.
- `main` is protected for `WrkFlo-Biz/global-sentinel-azure-quantum`.
- `main` is protected for `WrkFlo-Biz/dev-workspace`.
- `main` is protected for `WrkFlo-Biz/openclaw-prod`.

Verified GitHub environment protection for `WrkFlo-Biz/wrkflo-voice-agents-ops`:

- `production` exists and has `can_admins_bypass=true`.
- `production` has one protection rule: deployment branch policy.
- `production` deployment branch policy uses custom branch policies and allows only branch `main`.
- `production` has no required reviewer protection rule configured.
- `staging` exists and has `can_admins_bypass=true`.
- `staging` has no protection rules and no deployment branch policy configured.
- Branches present: `main`, `codex/eden-model-router`, `codex/reconcile-voice-agent-docs`.
- Repository collaborators with access: `Wrk-Flo` only, with `admin` role.
- Organization admins returned by API: `Wrk-Flo` only.
- Repository teams with access: none.
- Organization teams returned by API: none.
- Required reviewers were not configured because there is no separate reviewer team or second human/admin collaborator. Setting `Wrk-Flo` as the only reviewer would be low-value and could couple deployment approval to the same admin account that operates the repo.

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
gh api repos/WrkFlo-Biz/wrkflo-voice-agents-ops/environments/production
gh api repos/WrkFlo-Biz/wrkflo-voice-agents-ops/environments/staging
gh api repos/WrkFlo-Biz/wrkflo-voice-agents-ops/environments/production/deployment-branch-policies
gh api --method GET repos/WrkFlo-Biz/wrkflo-voice-agents-ops/branches -f per_page=100
gh api repos/WrkFlo-Biz/wrkflo-voice-agents-ops/branches/main/protection
gh api --method GET repos/WrkFlo-Biz/wrkflo-voice-agents-ops/collaborators -f affiliation=all -f per_page=100
gh api --method GET repos/WrkFlo-Biz/wrkflo-voice-agents-ops/teams -f per_page=100
gh api --method GET orgs/WrkFlo-Biz/teams -f per_page=100
gh api --method GET orgs/WrkFlo-Biz/members -f role=admin -f per_page=100
gh api repos/WrkFlo-Biz/wrkflo-voice-agents-ops/actions/workflows
az containerapp show --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks
az containerapp revision list --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks
az containerapp revision list --all --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks
az containerapp secret list --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks
az resource list --resource-group wrkflo-ai-rg
az acr show --resource-group wrkflo-ai-rg --name cafe61646254acr
az role assignment list --assignee f35c512d-9201-4741-a02f-9e024743f98e --scope <cafe61646254acr-resource-id>
az storage account show --resource-group wrkflo-ai-rg --name wrkflostate7091c86a
az monitor log-analytics workspace show --resource-group wrkflo-ai-rg --workspace-name workspace-wrkfloairgAAkP
az cognitiveservices account list --query "[?contains(endpoint || '', 'wrkflobiz') || name=='wrkflobiz']"
az ad app federated-credential list --id 05605d80-1198-40f5-8767-aa6be2eaddb8
curl -fsS https://wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io/health
gh pr merge 1 --repo WrkFlo-Biz/wrkflo-voice-agents-ops --merge
gh run watch 25612536914 --repo WrkFlo-Biz/wrkflo-voice-agents-ops --exit-status
gh api -X PUT repos/WrkFlo-Biz/wrkflo-voice-agents-ops/environments/production
gh api -X POST repos/WrkFlo-Biz/wrkflo-voice-agents-ops/environments/production/deployment-branch-policies
gh api -X PUT repos/WrkFlo-Biz/<repo>/branches/main/protection
gh api repos/WrkFlo-Biz/<repo>/branches/main
az containerapp identity assign --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks --system-assigned
az role assignment create --assignee f35c512d-9201-4741-a02f-9e024743f98e --role AcrPull --scope <cafe61646254acr-resource-id>
az containerapp registry set --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks --server cafe61646254acr.azurecr.io --identity system
gh workflow run "Deploy Eden Gateway" --repo WrkFlo-Biz/wrkflo-voice-agents-ops --ref main -f environment=production
gh run watch 25612717893 --repo WrkFlo-Biz/wrkflo-voice-agents-ops --exit-status
az acr update --resource-group wrkflo-ai-rg --name cafe61646254acr --admin-enabled false
az containerapp secret remove --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks --secret-names cafe61646254acrazurecrio-cafe61646254acr -o none
az containerapp show --resource-group wrkflo-ai-rg --name wrkflo-google-webhooks --query "{provisioningState:properties.provisioningState,runningStatus:properties.runningStatus,latestRevision:properties.latestRevisionName,latestReadyRevisionName:properties.latestReadyRevisionName,registries:properties.configuration.registries,image:properties.template.containers[0].image,traffic:properties.configuration.ingress.traffic}" -o json
curl -fsS https://wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io/health
az group update --name wrkflo-ai-rg --set tags.project=eden-voice tags.environment=production tags.owner=moses tags.repo=WrkFlo-Biz/wrkflo-voice-agents-ops tags.managed_by=github-actions-target tags.lifecycle=active
az group update --name wrkflo --set tags.project=wrkflo-core tags.environment=production tags.owner=moses tags.repo=WrkFlo-Biz/wrkflo-orchestrator tags.managed_by=mixed-github-actions-and-azure tags.lifecycle=active
az group update --name wrkflo-dev --set tags.project=wrkflo-core tags.environment=dev tags.owner=moses tags.repo=WrkFlo-Biz/wrkflo-orchestrator tags.managed_by=mixed-github-actions-and-azure tags.lifecycle=active
az group update --name openclaw-rg --set tags.project=openclaw tags.environment=production tags.owner=moses tags.repo=WrkFlo-Biz/openclaw-prod tags.managed_by=manual-azure-cli tags.lifecycle=active
az group update --name gs-dev-rg --set tags.project=global-sentinel tags.environment=dev tags.owner=moses tags.repo=WrkFlo-Biz/global-sentinel tags.managed_by=manual-azure-cli tags.lifecycle=review
az group update --name dev-ws-westus2 --set tags.project=dev-workspace tags.environment=dev tags.owner=moses tags.repo=WrkFlo-Biz/dev-workspace tags.managed_by=manual-azure-cli tags.lifecycle=active
az network nsg rule update --resource-group openclaw-rg --nsg-name openclaw-gateway-vmNSG --name default-allow-ssh --source-address-prefixes 174.232.30.68/32
az network nsg rule update --resource-group openclaw-rg --nsg-name openclaw-gateway-vmNSG --name allow-dashboard --source-address-prefixes 174.232.30.68/32
az network nsg rule update --resource-group openclaw-rg --nsg-name openclaw-gateway-vmNSG --name AllowIBKR --source-address-prefixes 174.232.30.68/32
az network nsg rule update --resource-group openclaw-rg --nsg-name openclaw-gateway-vmNSG --name AllowIBKR2 --source-address-prefixes 174.232.30.68/32
az network nsg rule update --resource-group dev-ws-westus2 --nsg-name dev-workspace-vmNSG --name default-allow-ssh --source-address-prefixes 174.232.30.68/32
az containerapp show --resource-group wrkflo --name wrkflo-orchestrator
az containerapp show --resource-group wrkflo --name wrkflo-orchestrator-staging
az webapp show --resource-group wrkflo --name wrkflo-app
```
