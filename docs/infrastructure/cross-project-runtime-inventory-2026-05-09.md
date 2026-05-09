# Cross-Project Runtime Inventory

Date: 2026-05-09

Purpose: keep WrkFlo-Biz project folders, GitHub repos, Azure runtimes, and local paths aligned before provisioning new Container Apps or VMs.

This inventory started as read-only evidence. Follow-up on 2026-05-09 applied metadata tags and restricted VM NSG ingress for the focused Eden, WrkFlo, Dev Workspace, OpenClaw, and Global Sentinel scope. Do not treat it as approval to move compute, delete resources, or rotate secrets without an explicit change window.

## GitHub Enterprise Repos

Observed `WrkFlo-Biz` repos:

| Repo | Visibility | Default branch | Runtime ownership notes |
|---|---|---|---|
| `WrkFlo-Biz/wrkflo-voice-agents-ops` | Public | `main` | Eden voice-agent ops and `services/eden-gateway` source |
| `WrkFlo-Biz/wrkflo-orchestrator` | Private | `main` | WrkFlo orchestrator and Langflow-facing API runtime |
| `WrkFlo-Biz/global-sentinel` | Public | `main` | Global Sentinel app/workflow code |
| `WrkFlo-Biz/global-sentinel-azure-quantum` | Public | `main` | Global Sentinel quantum/research pipeline |
| `WrkFlo-Biz/dev-workspace` | Public | `main` | Dev workspace VM tooling |
| `WrkFlo-Biz/openclaw-prod` | Public | `main` | OpenClaw production VM/deploy automation |

Branch protection was applied to `main` for all six repos on 2026-05-09: one approving PR review is required for non-admin paths, stale reviews are dismissed, force-pushes and branch deletion are disabled, and conversation resolution is required.

## Local Repo Paths

| Local path | Current remote state | Cleanup action |
|---|---|---|
| `/Users/mosestut/wrkflo-voice-agents-ops` | `origin=https://github.com/WrkFlo-Biz/wrkflo-voice-agents-ops.git` | Canonical and aligned |
| `/Users/mosestut/dev-workspace` | `origin=https://github.com/Wrk-Flo/dev-workspace.git`; local branch behind and dirty | Reconcile to `WrkFlo-Biz/dev-workspace` after reviewing local changes |
| `/Users/mosestut/global-sentinel` | Multiple remotes still point at `Wrk-Flo`; dirty worktree | Split or relabel remotes before pushing; do not rewrite without owner review |
| `/Users/mosestut/openclaw-prod` | `origin=https://github.com/Wrk-Flo/openclaw-prod.git`; deleted VM files in worktree | Reconcile to `WrkFlo-Biz/openclaw-prod` after reviewing deletions |
| `/Users/mosestut/workspace-google-webhooks` | Not a git repo | Legacy Eden rollback/reference only; keep until GitHub deploy succeeds |
| `/Users/mosestut/USCIS-Game` | Personal repo `MosesTut/USCIS-Game`; dirty worktree | Outside WrkFlo-Biz cleanup scope |
| `/Users/mosestut/sanduk` | Local git repo with no visible remote in this pass; dirty worktree | Outside WrkFlo-Biz cleanup scope until owner is defined |

## Azure Project Boundaries

| Project | Azure groups | Current runtime surfaces | Best-fit direction |
|---|---|---|---|
| Eden voice gateway | `wrkflo-ai-rg` | Container App `wrkflo-google-webhooks`, ACR, storage, Log Analytics | Keep on Container Apps; no VM needed; RG tagged `project=eden-voice` |
| WrkFlo core/orchestrator | `wrkflo`, `wrkflo-dev`, review-only `wrkflo-rg` | Container Apps, App Service, Postgres, Redis, ACR, monitoring | Keep orchestrator on Container Apps; keep app on App Service unless container consolidation is planned; active RGs tagged `project=wrkflo-core` |
| OpenClaw / Global Sentinel | `openclaw-rg`, `OPENCLAW-RG`, `gs-dev-rg` | VM, App Service, Container App job, ACR, storage, snapshots, monitoring | Keep VM only for OS-level/trading gateway needs; move dashboards/APIs/jobs to Container Apps where possible; focused RGs tagged |
| AINIME / Isaac | `ainime_ua`, `rg-isaac` | App Services, Postgres, ACR, ML workspaces/endpoints, AI Services | Keep web/API on App Service short-term; consider Container Apps only after canonical repo is known |
| Dev workspace | `dev-ws-westus2`, `DEV-WS-WESTUS2` | VM and related network/disk/extensions | VM is appropriate for interactive development; SSH restricted to trusted CIDR and RG tagged |
| AI lab resources | `Wrk.Flo`, `Wrk`, `wrk`, `rg-moses-8586` | AI Services, Key Vault, projects, monitoring | Tag as lab/review; avoid production dependencies until owner and repo are explicit |
| Quarantine candidates | `comfyui`, `rg-comfy`, stale `wrkflo-rg` pieces | Empty/duplicate/failure resources | Tag and monitor before deletion |

## Current Security/Ownership Findings

### VMs

`openclaw-gateway-vm` is running with public IP `20.124.180.8`. On 2026-05-09 its NSG inbound rules were changed from `*` to `174.232.30.68/32` for:

- TCP `22`
- TCP `8501`
- TCP `5000`
- TCP `5001`

`dev-workspace-vm` is running with public IP `20.230.203.79`. On 2026-05-09 its NSG inbound TCP `22` rule was changed from `*` to `174.232.30.68/32`.

Next hardening step: move these access paths behind Tailscale, Bastion, or another stable trusted network path so they do not depend on a changing operator egress IP.

### Postgres

`ainime_ua/isaac-server` does not have public access enabled, so firewall rule operations are not available.

`ainime_ua/ainime-server2` has:

- `allow-all` from `0.0.0.0` to `255.255.255.255`
- one client IP rule
- an allow-Azure-services rule

`wrkflo/wrkflo-db` has an allow-Azure-services rule.

Remove broad database exposure only after confirming dependent app egress and migration path.

### ACR

The checked ACRs have public network access enabled. Admin user status after 2026-05-09 hardening:

- `wrkflo-ai-rg/cafe61646254acr`: admin user disabled; Eden pulls with system-assigned managed identity and `AcrPull`.
- `wrkflo/wrkfloacr637a2eee`: admin user still enabled.
- `wrkflo-rg/wrkfloacr`: admin user still enabled; no live Azure consumer found beyond the registry itself, but it contains old `wrkflo-orchestrator` images from 2026-04-30.
- `openclaw-rg/wrkfloopenclawacr`: admin user still enabled.
- `ainime_ua/ainimeuaacr`: admin user still enabled.

Move the remaining workloads to managed identity pulls/pushes before disabling their ACR admin users.

### App Services

`wrkflo-app` and `wrkflo-app-dev` have HTTPS-only enabled.

`ainime-web`, `ainime-api`, and `openclaw-rg/Isaac` had HTTPS-only enabled on 2026-05-09 after one-at-a-time probes. See `docs/testing/evidence/https-only-hardening-2026-05-09.md`.

### GitHub

All checked `main` branches are protected as of 2026-05-09:

- `wrkflo-voice-agents-ops`
- `wrkflo-orchestrator`
- `global-sentinel`
- `global-sentinel-azure-quantum`
- `dev-workspace`
- `openclaw-prod`

Remaining GitHub hardening: add production environment reviewers where routine production deployment should require human approval. `wrkflo-voice-agents-ops` and `wrkflo-orchestrator` production environments are branch-gated to `main`; reviewer protection remains blocked until a distinct reviewer account or team exists.
