# Eden Gateway GitHub Deploy Runbook

Date: 2026-05-09

Purpose: make `services/eden-gateway` deployable from GitHub Actions to the existing Azure Container App without using long-lived Azure credentials.

Status on 2026-05-09: Azure OIDC identity, GitHub environments, environment secrets, and environment variables are configured. The first GitHub Actions deployment from the repo is still pending.

## Current Deployment Target

```text
Target repo: WrkFlo-Biz/wrkflo-voice-agents-ops
Current local remote observed: WrkFlo-Biz/wrkflo-voice-agents-ops
Workflow: .github/workflows/eden-gateway-deploy.yml
Service path: services/eden-gateway
Azure resource group: wrkflo-ai-rg
Azure Container App: wrkflo-google-webhooks
ACR: cafe61646254acr
Image repository: wrkflo-google-webhooks
Health URL: https://wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io/health
Live revision: wrkflo-google-webhooks--0000074
Live image: cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-20260509194019
```

## Required GitHub Environments

Configured environments in GitHub:

```text
staging
production
```

Configured environment secrets in both environments:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

Recommended production protection:

- Required reviewers enabled.
- Deployment branch limited to `main`.
- No automatic production deploy from feature branches.

Configured environment variables:

```text
AZURE_RESOURCE_GROUP=wrkflo-ai-rg
AZURE_CONTAINER_APP=wrkflo-google-webhooks
AZURE_ACR_NAME=cafe61646254acr
AZURE_ACR_LOGIN_SERVER=cafe61646254acr.azurecr.io
IMAGE_REPOSITORY=wrkflo-google-webhooks
HEALTH_URL=https://wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io/health
```

## Azure OIDC Setup Shape

Configured Entra application for GitHub Actions:

```text
Display name: wrkflo-eden-gateway-github-actions
Client ID: 05605d80-1198-40f5-8767-aa6be2eaddb8
Tenant ID: ab8198db-741f-4a4e-a83d-2a56a80d2c73
Subscription ID: 7091c86a-9dec-49e9-9e11-f26f96c9db66
```

Configured federated credentials:

```text
repo:WrkFlo-Biz/wrkflo-voice-agents-ops:environment:staging
repo:WrkFlo-Biz/wrkflo-voice-agents-ops:environment:production
```

The issuer is:

```text
https://token.actions.githubusercontent.com
```

The audience is:

```text
api://AzureADTokenExchange
```

## Least-Privilege Azure Roles

Configured deploy identity roles:

```text
Container Apps Contributor on /subscriptions/7091c86a-9dec-49e9-9e11-f26f96c9db66/resourceGroups/wrkflo-ai-rg
AcrPush on /subscriptions/7091c86a-9dec-49e9-9e11-f26f96c9db66/resourceGroups/wrkflo-ai-rg/providers/Microsoft.ContainerRegistry/registries/cafe61646254acr
```

Command shape for repair/recreation:

```bash
az role assignment create \
  --assignee <github-deploy-client-id-or-principal-id> \
  --role "Container Apps Contributor" \
  --scope "$(az group show --name wrkflo-ai-rg --query id -o tsv)"

az role assignment create \
  --assignee <github-deploy-client-id-or-principal-id> \
  --role "AcrPush" \
  --scope "$(az acr show --name cafe61646254acr --query id -o tsv)"
```

Use `Reader` only if a smoke check or diagnostics step later requires a read not covered by the deploy role.

## First Deployment Procedure

1. Confirm the local git remote points to the enterprise repo before configuring OIDC:

```bash
scripts/local/plan-github-remote-reconcile.sh
```

Expected target:

```text
WrkFlo-Biz/wrkflo-voice-agents-ops
```

2. Confirm the current live target:

```bash
az containerapp show \
  --resource-group wrkflo-ai-rg \
  --name wrkflo-google-webhooks \
  --query "{image:properties.template.containers[0].image,latestRevision:properties.latestRevisionName,runningStatus:properties.runningStatus}" \
  -o json
```

3. Run local checks:

```bash
cd /Users/mosestut/wrkflo-voice-agents-ops
npm --prefix services/eden-gateway ci --ignore-scripts
npm --prefix services/eden-gateway run check
ruby -e 'require "yaml"; ARGV.each { |f| YAML.load_file(f); puts "ok #{f}" }' .github/workflows/*.yml
```

4. Trigger `.github/workflows/eden-gateway-deploy.yml` manually with `environment=staging` first.

5. If staging targets the same Container App, treat staging as a workflow validation pass, not an isolated runtime test.

6. Trigger production only after the workflow has built, pushed, updated the app, and passed `/health`.

7. Capture the deployed image and revision in `docs/infrastructure/azure-audit.md`.

8. Capture live ElevenLabs smoke evidence under `docs/testing/evidence/`.

## Rollback

The legacy local deployment source remains:

```text
/Users/mosestut/workspace-google-webhooks
```

Do not delete it until GitHub deploy has succeeded and live Eden/Eden v2 tool tests pass.

To roll back the Container App image, use the previous known-good image from `docs/infrastructure/azure-audit.md`:

```bash
az containerapp update \
  --resource-group wrkflo-ai-rg \
  --name wrkflo-google-webhooks \
  --image <previous-known-good-image>
```

Then smoke check:

```bash
curl -fsS https://wrkflo-google-webhooks.jollymeadow-ec18f10e.eastus.azurecontainerapps.io/health
```

## Follow-Up Hardening

After GitHub deployment works:

1. Assign managed identity to the Container App.
2. Grant that identity `AcrPull` on `cafe61646254acr`.
3. Move the Container App registry pull from admin credentials to managed identity.
4. Disable ACR admin user only after image pulls are verified.
