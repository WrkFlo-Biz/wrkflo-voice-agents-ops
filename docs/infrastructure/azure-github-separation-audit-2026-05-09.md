# Azure/GitHub Separation Audit

Date: 2026-05-09

Scope: Azure subscription `Azure subscription 1`, GitHub org `WrkFlo-Biz`, and relevant local repos. The original audit was read-only; follow-up work on 2026-05-09 configured Eden GitHub OIDC, updated the live Container App Azure OpenAI env, tagged focused resource groups, and restricted focused VM NSG ingress.

## Executive Summary

Eden does not need a dedicated VM. It already has an acceptable Azure Container Apps boundary in `wrkflo-ai-rg`: one Container App, one managed environment, one ACR, one storage account, and one Log Analytics workspace. The Eden gateway source has been copied into `services/eden-gateway` under the enterprise GitHub account `WrkFlo-Biz/wrkflo-voice-agents-ops`. GitHub OIDC identity, environments, secrets, and variables are configured; GitHub Actions deploys and live Eden tool smokes passed on 2026-05-09. The legacy local folder at `/Users/mosestut/workspace-google-webhooks` is now archive-eligible pending explicit operator approval.

The broader cloud estate should be separated by project, connected only through explicit APIs and project-owned credentials. The highest-risk work is not resource moving; it is tagging, credential rotation, public exposure reduction, and repo/workflow ownership.

## Project Boundaries

| Project | Current Azure groups | GitHub / local owner | Boundary status |
|---|---|---|---|
| Eden voice gateway | `wrkflo-ai-rg` | `WrkFlo-Biz/wrkflo-voice-agents-ops/services/eden-gateway`; legacy rollback copy at `/Users/mosestut/workspace-google-webhooks` | Runtime isolated, GitHub OIDC configured, GitHub deploys and live tool smokes succeeded on 2026-05-09 |
| WrkFlo core / orchestrator / Langflow | `wrkflo`, `wrkflo-rg`, `wrkflo-dev` | `WrkFlo-Biz/wrkflo-orchestrator` | Mixed; `wrkflo` active, `wrkflo-rg` looks duplicate/future |
| OpenClaw / Global Sentinel | `openclaw-rg`, `OPENCLAW-RG`, `gs-dev-rg` | `WrkFlo-Biz/openclaw-prod`, `global-sentinel`, `global-sentinel-azure-quantum` | Strong VM ownership, mixed research resources; focused RGs tagged |
| AINIME / Isaac | `ainime_ua`, `rg-isaac` | No canonical visible `WrkFlo-Biz` repo found | Needs owner/repo decision |
| Dev workspace | `dev-ws-westus2`, `DEV-WS-WESTUS2` | `WrkFlo-Biz/dev-workspace` | Isolated; public SSH restricted to trusted CIDR on 2026-05-09 |
| AI lab / shared experiments | `Wrk.Flo`, `Wrk`, `wrk`, `rg-moses-8586` | No canonical visible repo found | Needs tags, budget guardrails, owner review |
| Platform misc | `NetworkWatcherRG`, `VisualStudioOnline-*` | Azure-managed/misc | Mostly leave alone; review misplaced storage |

## Active Compute

| Surface | Resource group | Exposure |
|---|---|---|
| `wrkflo-google-webhooks` Container App | `wrkflo-ai-rg` | External HTTPS, min 1, max 10 |
| `wrkflo-orchestrator` Container App | `wrkflo` | External HTTPS, min 1, max 3 |
| `wrkflo-orchestrator-staging` Container App | `wrkflo` | External HTTPS, min 0, max 1 |
| `wrkflo-app` App Service | `wrkflo` | `app.wrkflo.biz`, HTTPS-only enabled |
| `wrkflo-app-dev` App Service | `wrkflo-dev` | Azure default hostname, HTTPS-only enabled |
| `ainime-web` App Service | `ainime_ua` | `ainime.io`, `www.ainime.io`, HTTPS-only enabled 2026-05-09 |
| `ainime-api` App Service | `ainime_ua` | Azure default hostname, HTTPS-only enabled 2026-05-09 |
| `Isaac` App Service | `openclaw-rg` | Azure default hostname, HTTPS-only enabled 2026-05-09 |
| `openclaw-gateway-vm` | `OPENCLAW-RG` / `openclaw-rg` | Public IP; NSG allows SSH, dashboard, and IBKR ports only from `174.232.30.68/32` |
| `dev-workspace-vm` | `dev-ws-westus2` / `DEV-WS-WESTUS2` | Public IP; NSG allows SSH only from `174.232.30.68/32` |
| `quantum-research-job` | `OPENCLAW-RG` | Manual Container Apps job |
| `seedance2` ML endpoint | `ainime_ua` | Key-auth inference endpoint |

## Critical Findings

1. Public VM ingress was too broad.
   - Mitigated 2026-05-09: `openclaw-gateway-vm` now allows inbound `22`, `8501`, `5000`, and `5001` only from `174.232.30.68/32`.
   - Mitigated 2026-05-09: `dev-workspace-vm` now allows inbound `22` only from `174.232.30.68/32`.
   - Remaining: replace temporary trusted-IP access with Tailscale, Bastion, VPN, or another stable access path.

2. Some production credentials appear as plain app/container env settings.
   - `wrkflo-orchestrator` and staging have credential-looking env names that should be secret refs or Key Vault references.
   - A local Langflow deployment script appears to contain a raw credential-looking value. Rotate before publishing or moving source.

3. Public database exposure exists.
   - `ainime-server2` has public network access enabled and an all-source firewall rule.
   - `wrkflo-db` has public network access enabled and an allow-Azure-services style rule.

4. GitHub deploy protections still need environment-level reviewers.
   - Mitigated 2026-05-09: checked repos now have protected `main`.
   - `wrkflo-orchestrator` has `production` and `staging` environments without protection rules.
   - `wrkflo-voice-agents-ops` production deploys are limited to the `main` branch, but required reviewers are not yet configured.

5. Secret ownership is over-concentrated.
   - Public `openclaw-prod` has many repo secrets across Azure, AI providers, Gmail/Google, ElevenLabs, Slack, Telegram, and OpenClaw.
   - Cross-project secret names appear in WrkFlo App Service, AINIME apps, and OpenClaw repo settings.

6. Most checked ACR admin users are enabled.
   - Mitigated 2026-05-09: `cafe61646254acr` admin user is disabled and Eden now pulls with system-assigned managed identity plus `AcrPull`.
   - Remaining enabled ACR admin users: `ainimeuaacr`, `wrkfloopenclawacr`, `wrkfloacr637a2eee`, and `wrkfloacr`.

7. App Service HTTP exposure was reduced.
   - Mitigated 2026-05-09: `ainime-web`, `ainime-api`, and `openclaw-rg/Isaac` now have HTTPS-only enabled and redirect HTTP to HTTPS.

8. Key Vault and storage network posture needs tightening.
   - Key Vault public network access is enabled.
   - Some storage accounts allow broad public network access; `isaactutstorage` is misplaced in `NetworkWatcherRG` and allows blob public access.

## Duplicate Or Misplaced Resources

| Resource / group | Issue | Action |
|---|---|---|
| `wrkflo` vs `wrkflo-rg` | Duplicate WrkFlo foundations; active compute is in `wrkflo`, cleaner network/KV foundation appears in `wrkflo-rg` | Decide canonical target before migration or deletion |
| `wrkflo/debug-langflow` | Failed Container Instance | Quarantine/delete review |
| `wrkflo-rg/wrkflo-env` | Container Apps environment with no active apps/jobs found | Tag as review candidate |
| `openclaw-rg` / `OPENCLAW-RG` | Case noise and split resource ownership | Standardize naming in docs and future RGs |
| `dev-ws-westus2` / `DEV-WS-WESTUS2` | Case noise | Standardize naming in docs and future RGs |
| `openclaw-rg/Isaac` | Isaac App Service appears outside AINIME/Isaac boundary | Confirm owner, migrate or tag |
| `NetworkWatcherRG/isaactutstorage` | Non-network-watcher storage account in Azure-managed-style RG | Move or retire after owner check |
| `comfyui`, `rg-comfy` | Empty resource groups | Tag as decommission candidates |
| `rg-isaac`, `rg-moses-8586`, `Wrk.Flo`, `Wrk`, `wrk` | Scattered AI/Cognitive resources | Assign owner/project/budget tags |

## Target Architecture

| Target boundary | Recommended resource group | Notes |
|---|---|---|
| Eden voice gateway | Keep `wrkflo-ai-rg` short term; optionally migrate to `eden-voice-prod-rg` | Container Apps, not VM. GitHub-owned deploy required. |
| WrkFlo core prod | `wrkflo-core-prod-rg` or current `wrkflo` until migration | Orchestrator, Langflow, Postgres, Redis, ACR, logs, alerts |
| WrkFlo core dev | `wrkflo-core-dev-rg` or current `wrkflo-dev` | Keep separate from prod |
| OpenClaw prod | `openclaw-prod-rg` | VM, ACR, data disk, snapshots, monitoring |
| Global Sentinel research | `global-sentinel-rg` | Separate from OpenClaw if product/research lane is independent |
| AINIME / Isaac prod | `ainime-prod-rg` | Web, API, ML, DB, storage, certs |
| Isaac AI lab | `isaac-ai-lab-rg` | Experimental AI/Foundry resources |
| Dev workspace | `dev-workspace-rg` | Dev VM only |
| Shared AI lab | `ai-lab-rg` | Experimental AI Services with budget caps |

## Connection Policy

Default rule: projects do not share compute, databases, storage accounts, ACR credentials, or broad vendor API keys.

Allowed connections:
- Eden -> ElevenLabs through ElevenLabs workspace auth.
- Eden -> Google/Gmail/OAuth only for live notes and internal delivery.
- Eden -> its own Azure Table Storage state.
- Eden -> WrkFlo core only through a signed, project-specific API key if needed.
- WrkFlo core -> its own Postgres, Redis, Key Vault, ACR, Langflow, Composio, OpenAI/Azure OpenAI.
- OpenClaw -> its VM, ACR, Key Vault, and project-specific vendor credentials only.
- AINIME -> its own web/API/ML/db/storage boundary.

## Execution Plan

### Phase 0: Freeze Risky Moves

- Do not delete or move resources until tagging is complete.
- Do not change production secrets without a rotation window.
- Do not disable remaining ACR admin users until their pulls use managed identity or scoped credentials.

### Phase 1: Tag And Document

Apply tags to every non-Azure-managed resource:
- `project`
- `environment`
- `owner`
- `repo`
- `managed_by`
- `lifecycle`
- `decommission_candidate`

Suggested Eden tags:
- `project=eden-voice`
- `environment=production`
- `owner=moses`
- `repo=WrkFlo-Biz/wrkflo-voice-agents-ops`
- `managed_by=github-actions-target`
- `lifecycle=active`

Applied 2026-05-09 to focused groups:

| Resource group | Applied tags |
|---|---|
| `wrkflo-ai-rg` | `project=eden-voice`, `environment=production`, `owner=moses`, `repo=WrkFlo-Biz/wrkflo-voice-agents-ops`, `managed_by=github-actions-target`, `lifecycle=active` |
| `wrkflo` | `project=wrkflo-core`, `environment=production`, `owner=moses`, `repo=WrkFlo-Biz/wrkflo-orchestrator`, `managed_by=mixed-github-actions-and-azure`, `lifecycle=active` |
| `wrkflo-dev` | `project=wrkflo-core`, `environment=dev`, `owner=moses`, `repo=WrkFlo-Biz/wrkflo-orchestrator`, `managed_by=mixed-github-actions-and-azure`, `lifecycle=active` |
| `openclaw-rg` | `project=openclaw`, `environment=production`, `owner=moses`, `repo=WrkFlo-Biz/openclaw-prod`, `managed_by=manual-azure-cli`, `lifecycle=active` |
| `gs-dev-rg` | `project=global-sentinel`, `environment=dev`, `owner=moses`, `repo=WrkFlo-Biz/global-sentinel`, `managed_by=manual-azure-cli`, `lifecycle=review` |
| `dev-ws-westus2` | `project=dev-workspace`, `environment=dev`, `owner=moses`, `repo=WrkFlo-Biz/dev-workspace`, `managed_by=manual-azure-cli`, `lifecycle=active` |

### Phase 2: Put Eden Under GitHub Ownership

- Use `WrkFlo-Biz/wrkflo-voice-agents-ops/services/eden-gateway` as the GitHub-owned source.
- Confirm the enterprise remote remains `WrkFlo-Biz/wrkflo-voice-agents-ops`.
- Confirm `staging` and `production` GitHub environments remain configured.
- Confirm Azure OIDC federated credentials and least-privilege role assignments remain configured.
- Deploy to `wrkflo-ai-rg` first; rename/migrate only after CI is stable. The first main-branch deploy succeeded on 2026-05-09.
- Archive `/Users/mosestut/workspace-google-webhooks` after explicit operator approval; GitHub deployment and live Eden tool smokes passed on 2026-05-09.

### Phase 3: Hardening

- Replace temporary trusted-IP VM ingress with Tailscale, Bastion, VPN, or another stable access path.
- Remove all-source Postgres firewall rules.
- Move plain credential env settings to secret refs or Key Vault refs.
- Add production environment reviewers where production deploys should require human approval.
- Switch remaining ACR pulls to managed identity and disable remaining ACR admin users.
- Restrict Key Vault and storage public network access where feasible.

### Phase 4: Consolidation

- Resolve `wrkflo` vs `wrkflo-rg`.
- Resolve AINIME/Isaac repo ownership.
- Decide whether Global Sentinel is OpenClaw-owned or independent.
- Quarantine and then delete high-confidence stale resources after owner approval.

## High-Confidence Review Candidates

| Candidate | Confidence | Next action |
|---|---:|---|
| Empty `comfyui` and `rg-comfy` RGs | High | Tag as decommission candidates |
| `wrkflo/debug-langflow` failed Container Instance | High | Quarantine/delete review |
| `wrkflo-rg/wrkflo-env` with no attached apps/jobs | High | Tag as review candidate |
| `ainime_ua/ainime-ua-ml/seedance2/blue` with mock mode noted by audit | High | Confirm need and cost |
| OpenClaw full snapshots | Medium | Confirm retention and switch to incremental if suitable |
| `dev-workspace-vm` | Medium | Confirm 24/7 need; restrict SSH |

## Evidence Sources

- `az account show`
- `az group list`
- `az resource list`
- `az vm list -d`
- `az containerapp list/show`
- `az webapp list/config`
- `az acr list/repository`
- `az keyvault list/secret list`
- `az network nsg/vnet/public-ip`
- `az role assignment list`
- `gh repo list`
- `gh api repos/*/actions/*`
- Local repo inspection for deploy workflows and scripts
