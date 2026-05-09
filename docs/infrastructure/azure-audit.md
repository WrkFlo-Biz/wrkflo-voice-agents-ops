# Azure Audit Summary

Updated: 2026-05-09

## Current live state

- Container App: `wrkflo-google-webhooks`
- Resource Group: `wrkflo-ai-rg`
- Runtime dependencies in `wrkflo-ai-rg`: `wrkflo-ai-env`, `cafe61646254acr`, `wrkflostate7091c86a`, `workspace-wrkfloairgAAkP`
- Latest revision: `wrkflo-google-webhooks--0000080`
- Image: `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-25612879618-17ebb7d`
- Traffic: `100%` to latest revision
- Secret refs in use: `google-oauth-client-id`, `google-oauth-client-secret`, `google-oauth-refresh-token`, `webhook-token`, `azure-storage-connection-string`, `elevenlabs-api-key`, `azure-openai-api-key`, `azure-openai-image-api-key`
- `HANDOFF_AGENT_ID`: `agent_9601kjenmpbwewntb483he79nfvr`
- Health endpoint observed healthy after the ACR password secret cleanup revision on 2026-05-09 at 22:19 UTC.
- Canonical GitHub repo: `WrkFlo-Biz/wrkflo-voice-agents-ops`
- Gateway source path: `services/eden-gateway`
- Resource group tags applied on 2026-05-09: `project=eden-voice`, `environment=production`, `owner=moses`, `repo=WrkFlo-Biz/wrkflo-voice-agents-ops`, `managed_by=github-actions-target`, `lifecycle=active`.
- Container App registry authentication now uses system-assigned managed identity with `AcrPull`; ACR admin user is disabled for `cafe61646254acr`.
- Old unused Container App ACR password secret `cafe61646254acrazurecrio-cafe61646254acr` was removed on 2026-05-09 after confirming registry auth no longer references it.

## Notable runtime settings
- `LIVE_DEMO_START_TIMEOUT_MS=15000`
- `LIVE_DEMO_DOC_OP_TIMEOUT_MS=12000`
- Async start enabled
- `/wrkflo-tools/*` and `/mcp` are deployed on the same Container App.
- Azure OpenAI orchestration is configured with the `wrkflobiz` AI Services account, default deployment `gpt-5.4-mini`, and model-router profile env vars.
- Azure image generation is configured with `wrkflobiz-images-poland` in `Wrk/polandcentral`, deployment `gpt-image-2`, and Container App env vars `AZURE_OPENAI_IMAGE_ENDPOINT`, `AZURE_OPENAI_IMAGE_DEPLOYMENT`, `AZURE_OPENAI_IMAGE_API_VERSION`, and secret ref `azure-openai-image-api-key`.
- Local Codex has profile `wrkflo-image` using provider `azure-wrkflo-image`, endpoint `https://wrkflobiz-images-poland.cognitiveservices.azure.com/openai`, API version `2025-04-01-preview`, and env key `AZURE_OPENAI_WRKFLO_IMAGE_API_KEY`.
- `openclaw-gateway-vm` and `dev-workspace-vm` have managed identities with `Cognitive Services OpenAI User` on `Wrk/wrkflobiz` and `Wrk/wrkflobiz-images-poland`; non-secret WrkFlo Azure OpenAI defaults are written in `/etc/profile.d/wrkflo-azure-openai.sh`.
- `WRKFLO_SEARCH_ENDPOINT` is still not configured, so true web search still depends on the gateway's limited DuckDuckGo Instant Answer fallback or a future dedicated search provider.
- Azure OpenAI endpoint is outside `wrkflo-ai-rg`: AI Services account `wrkflobiz` in resource group `Wrk`.
- Azure OpenAI image endpoint is also outside `wrkflo-ai-rg`: AI Services account `wrkflobiz-images-poland` in resource group `Wrk`.
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
- Manual Deploy Eden Gateway run `25612717893` succeeded after switching registry auth to managed identity and updated the Container App to image `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-25612717893-2eee8d0`.
- A follow-up router deployment updated the live image to `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-20260509215150-router`; this branch aligns that router source back into GitHub.
- PR #2 merged to `main` at merge commit `17ebb7d`; Deploy Eden Gateway run `25612879618` succeeded and updated the Container App to image `cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-25612879618-17ebb7d`.

## Remaining infra follow-ups
- Add production environment reviewers before routine production deploys, after a distinct reviewer account or team exists.
- Request additional Poland Central `gpt-image-2` quota before production creative workloads; current `OpenAI.GlobalStandard.gpt-image-2` quota is fully allocated at 12 of 12 RPM.
- Keep `/Users/mosestut/workspace-google-webhooks` as rollback/reference until live Eden/Eden v2 tool smoke tests pass after the GitHub-owned deployment.
- Keep Eden on Azure Container Apps unless a concrete OS-level VM requirement appears.
- See `cloud-exposure-review-2026-05-09-worker4.md` for remaining non-Eden ACR, HTTPS-only, and Postgres controlled-window work.
- See `vm-access-hardening-state-2026-05-09.md` for the deferred VM public NSG removal checklist.
- See `azure-github-separation-audit-2026-05-09.md` for the full cross-project audit.
