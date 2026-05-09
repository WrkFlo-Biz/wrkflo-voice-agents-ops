# Tagging And Migration Plan

Date: 2026-05-09

This plan separates safe inventory work from changes that need an approval window.

## Phase 1: Tag-Only Changes

Tagging is the first change to make because it improves ownership without moving compute or rotating secrets.

Required tags:

| Tag | Purpose | Example |
|---|---|---|
| `project` | Product/project boundary | `eden-voice` |
| `environment` | Runtime stage | `production`, `staging`, `dev`, `lab` |
| `owner` | Human or team owner | `moses` |
| `repo` | Source of truth | `WrkFlo-Biz/wrkflo-voice-agents-ops` |
| `managed_by` | Management path | `github-actions`, `manual-azure-cli`, `azure-managed` |
| `lifecycle` | Resource state | `active`, `review`, `quarantine`, `decommission-candidate` |

Initial resource-group tag map. Tags were applied on 2026-05-09 for the focused Eden, WrkFlo, OpenClaw/Global Sentinel, and Dev Workspace groups shown as `active` or `review` below; other groups still need owner review before tagging.

| Resource group | `project` | `environment` | `lifecycle` | Notes |
|---|---|---|---|---|
| `wrkflo-ai-rg` | `eden-voice` | `production` | `active` | Current Eden gateway boundary |
| `wrkflo` | `wrkflo-core` | `production` | `active` | Current orchestrator/Langflow prod |
| `wrkflo-dev` | `wrkflo-core` | `dev` | `active` | Current WrkFlo dev App Service |
| `wrkflo-rg` | `wrkflo-core` | `review` | `review` | Possible future/stale duplicate foundation |
| `openclaw-rg` / `OPENCLAW-RG` | `openclaw` | `production` | `active` | VM and Global Sentinel mix |
| `gs-dev-rg` | `global-sentinel` | `dev` | `review` | Storage/logs only |
| `ainime_ua` | `ainime` | `production` | `active` | Web/API/ML/DB |
| `rg-isaac` | `isaac-ai-lab` | `lab` | `review` | AI Services/Foundry |
| `rg-moses-8586` | `ai-lab` | `lab` | `review` | AI Services/Foundry |
| `Wrk.Flo`, `Wrk`, `wrk` | `ai-lab` | `lab` | `review` | Scattered Cognitive/AI resources |
| `dev-ws-westus2` / `DEV-WS-WESTUS2` | `dev-workspace` | `dev` | `active` | Dev VM |
| `comfyui`, `rg-comfy` | `unknown` | `unknown` | `decommission-candidate` | Empty RGs |

## Phase 2: Eden CI/CD Ownership

Goal: make Eden reproducible from GitHub before changing its Azure boundary.

Steps:
1. Use the selected source path: `WrkFlo-Biz/wrkflo-voice-agents-ops/services/eden-gateway`.
   - Confirm the local remote points at the enterprise repo before configuring OIDC.
2. Add GitHub environments: `staging`, `production`.
3. Add Azure OIDC federated credential for the chosen repo/environment using `docs/runbooks/eden-gateway-github-deploy.md`.
4. Grant least privilege:
   - Container App Contributor on `wrkflo-ai-rg`.
   - AcrPush on `cafe61646254acr`.
   - Reader where needed for smoke checks.
5. Build and deploy image from GitHub.
6. Confirm live health and ElevenLabs webhook tools.
7. Only after the workflow is stable, decide whether to keep `wrkflo-ai-rg` or migrate to `eden-voice-prod-rg`.

## Phase 3: Immediate Security Hardening

These should be done in controlled windows because they can affect runtime access.

1. Restrict public VM ingress:
   - Done 2026-05-09: `openclaw-gateway-vm` SSH, dashboard, and IBKR ports now allow `174.232.30.68/32` instead of `*`.
   - Done 2026-05-09: `dev-workspace-vm` SSH now allows `174.232.30.68/32` instead of `*`.
   - Remaining: replace temporary trusted-IP access with Tailscale, Bastion, VPN, or another stable trusted path.
2. Database exposure:
   - Remove all-source firewall from `ainime-server2`.
   - Replace public/allow-Azure access for `wrkflo-db` with app-specific access or private networking.
3. Secrets:
   - Rotate credential-looking values found in plain runtime env settings.
   - Move them to Container App secrets, App Service Key Vault references, or project Key Vaults.
4. GitHub:
   - Done 2026-05-09: protect `main` for checked production repos.
   - Done 2026-05-09: require one approving PR review for non-admin paths, dismiss stale reviews, block force-pushes/deletions, and require conversation resolution.
   - Done 2026-05-09: limit `WrkFlo-Biz/wrkflo-voice-agents-ops` and `WrkFlo-Biz/wrkflo-orchestrator` production environment deployments to branch `main`.
   - Remaining: add production environment reviewers.
5. ACR:
   - Move workloads to managed identity pulls.
   - Disable admin user after validation.
6. App Service HTTPS:
   - Done 2026-05-09: enabled HTTPS-only on `ainime-web`, `ainime-api`, and `openclaw-rg/Isaac`.

## Phase 4: Consolidation Decisions

Do not start resource moves until these decisions are made:

1. Is `wrkflo-rg` the future WrkFlo foundation or stale duplicate infra?
2. Should Global Sentinel stay under OpenClaw or become its own project boundary?
3. What is the canonical repo for AINIME/Isaac?
4. Which AI Studio/Cognitive Services resources are live product dependencies versus lab resources?
5. Is the dev workspace VM needed 24/7?

## Runtime Placement Decision

Use `project-runtime-placement-plan-2026-05-09.md` as the current placement guide.

Short version:

- Eden stays on Container Apps; no VM needed.
- WrkFlo orchestrator stays on Container Apps.
- WrkFlo web app can stay on App Service until container consolidation is intentional.
- Dev workspace stays a VM; SSH was restricted to the trusted operator CIDR on 2026-05-09.
- OpenClaw keeps a VM only for OS-level gateway/trading dependencies; its public ingress was restricted on 2026-05-09 and dashboards/APIs should move toward Container Apps.
- AINIME/Isaac should not get new Container Apps until canonical repo ownership is known.

## Quarantine Candidates

Tag first, wait 7-14 days, then delete only with owner approval.

| Candidate | Reason |
|---|---|
| `comfyui`, `rg-comfy` | Empty RGs |
| `wrkflo/debug-langflow` | Failed Container Instance |
| `wrkflo-rg/wrkflo-env` | No active apps/jobs found |
| `wrkflo-rg/wrkfloacr` | Duplicate/legacy ACR not used by active Azure workflow; contains old `wrkflo-orchestrator` images from 2026-04-30 |
| `NetworkWatcherRG/isaactutstorage` | Misplaced storage with public blob access |
| Excess OpenClaw snapshots | Verify retention; workflow appears intended to prune |

## Commands To Prepare, Not Run Blindly

Example tag command shape:

```bash
az group update \
  --name wrkflo-ai-rg \
  --set tags.project=eden-voice tags.environment=production tags.owner=moses tags.managed_by=github-actions-target tags.lifecycle=active
```

Example VM NSG hardening shape:

```bash
az network nsg rule update \
  --resource-group openclaw-rg \
  --nsg-name openclaw-gateway-vmNSG \
  --name default-allow-ssh \
  --source-address-prefixes <trusted-ip-cidr>
```

Example ACR managed identity transition shape:

```bash
az containerapp identity assign \
  --resource-group wrkflo-ai-rg \
  --name wrkflo-google-webhooks \
  --system-assigned

az role assignment create \
  --assignee <container-app-principal-id> \
  --role AcrPull \
  --scope <cafe61646254acr-resource-id>
```
