# Azure Audit Summary

Updated: 2026-05-09

## Current live state

- Container App: `wrkflo-google-webhooks`
- Resource Group: `wrkflo-ai-rg`
- Runtime dependencies in `wrkflo-ai-rg`: `wrkflo-ai-env`, `cafe61646254acr`, `wrkflostate7091c86a`, `workspace-wrkfloairgAAkP`
- Latest revision: `wrkflo-google-webhooks--0000075`
- Image: `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-25612536914-5e670b2`
- Traffic: `100%` to latest revision
- Secret refs in use: `google-oauth-client-id`, `google-oauth-client-secret`, `google-oauth-refresh-token`, `webhook-token`, `azure-storage-connection-string`, `elevenlabs-api-key`, `azure-openai-api-key`
- `HANDOFF_AGENT_ID`: `agent_9601kjenmpbwewntb483he79nfvr`
- Health endpoint observed healthy after the GitHub deploy on 2026-05-09 at 21:44 UTC.
- Canonical GitHub repo: `WrkFlo-Biz/wrkflo-voice-agents-ops`
- Gateway source path: `services/eden-gateway`
- Resource group tags applied on 2026-05-09: `project=eden-voice`, `environment=production`, `owner=moses`, `repo=WrkFlo-Biz/wrkflo-voice-agents-ops`, `managed_by=github-actions-target`, `lifecycle=active`.

## Notable runtime settings
- `LIVE_DEMO_START_TIMEOUT_MS=15000`
- `LIVE_DEMO_DOC_OP_TIMEOUT_MS=12000`
- Async start enabled
- `/wrkflo-tools/*` and `/mcp` are deployed on the same Container App.
- Azure OpenAI orchestration is configured with the `wrkflobiz` AI Services account and `gpt-4o` deployment.
- `WRKFLO_SEARCH_ENDPOINT` is still not configured, so true web search still depends on the gateway's limited DuckDuckGo Instant Answer fallback or a future dedicated search provider.
- Azure OpenAI endpoint is outside `wrkflo-ai-rg`: AI Services account `wrkflobiz` in resource group `Wrk`.
- No plaintext secret values were returned by the live env check; credential-bearing settings are secret refs.

## GitHub deploy setup
- GitHub environments `production` and `staging` exist for `WrkFlo-Biz/wrkflo-voice-agents-ops`.
- Environment secrets configured in both environments: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
- Environment variables configured in both environments: `AZURE_RESOURCE_GROUP`, `AZURE_CONTAINER_APP`, `AZURE_ACR_NAME`, `AZURE_ACR_LOGIN_SERVER`, `IMAGE_REPOSITORY`, `HEALTH_URL`.
- Azure app registration: `wrkflo-eden-gateway-github-actions`.
- Federated subjects:
  - `repo:WrkFlo-Biz/wrkflo-voice-agents-ops:environment:production`
  - `repo:WrkFlo-Biz/wrkflo-voice-agents-ops:environment:staging`
- Azure roles:
  - `Container Apps Contributor` on `wrkflo-ai-rg`
  - `AcrPush` on `cafe61646254acr`
- PR #1 merged to `main` at merge commit `5e670b2`.
- Main-branch Eden Gateway CI run `25612536913` succeeded.
- Main-branch Deploy Eden Gateway run `25612536914` succeeded and updated the Container App to image `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-25612536914-5e670b2`.

## Remaining infra follow-ups
- Add production environment reviewers before routine production deploys.
- Keep `/Users/mosestut/workspace-google-webhooks` as rollback/reference until live Eden/Eden v2 tool smoke tests pass after the GitHub-owned deployment.
- Convert Eden ACR pull from password secret to managed identity `AcrPull`, then disable ACR admin user.
- Keep Eden on Azure Container Apps unless a concrete OS-level VM requirement appears.
- See `azure-github-separation-audit-2026-05-09.md` for the full cross-project audit.
