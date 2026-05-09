# Cross-Project Runtime Inventory

Date: 2026-05-09

Purpose: keep WrkFlo-Biz project folders, GitHub repos, Azure runtimes, and local paths aligned before provisioning new Container Apps or VMs.

This inventory is read-only evidence. Do not treat it as approval to move compute, delete resources, rotate secrets, or close public access without an explicit change window.

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

Branch protection status on `main` was `unprotected` for all six repos during this pass.

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
| Eden voice gateway | `wrkflo-ai-rg` | Container App `wrkflo-google-webhooks`, ACR, storage, Log Analytics | Keep on Container Apps; no VM needed |
| WrkFlo core/orchestrator | `wrkflo`, `wrkflo-dev`, review-only `wrkflo-rg` | Container Apps, App Service, Postgres, Redis, ACR, monitoring | Keep orchestrator on Container Apps; keep app on App Service unless container consolidation is planned |
| OpenClaw / Global Sentinel | `openclaw-rg`, `OPENCLAW-RG`, `gs-dev-rg` | VM, App Service, Container App job, ACR, storage, snapshots, monitoring | Keep VM only for OS-level/trading gateway needs; move dashboards/APIs/jobs to Container Apps where possible |
| AINIME / Isaac | `ainime_ua`, `rg-isaac` | App Services, Postgres, ACR, ML workspaces/endpoints, AI Services | Keep web/API on App Service short-term; consider Container Apps only after canonical repo is known |
| Dev workspace | `dev-ws-westus2`, `DEV-WS-WESTUS2` | VM and related network/disk/extensions | VM is appropriate for interactive development; harden SSH and document boot/reconnect |
| AI lab resources | `Wrk.Flo`, `Wrk`, `wrk`, `rg-moses-8586` | AI Services, Key Vault, projects, monitoring | Tag as lab/review; avoid production dependencies until owner and repo are explicit |
| Quarantine candidates | `comfyui`, `rg-comfy`, stale `wrkflo-rg` pieces | Empty/duplicate/failure resources | Tag and monitor before deletion |

## Current Security/Ownership Findings

### VMs

`openclaw-gateway-vm` is running with public IP `20.124.180.8`. Its NSG allows inbound traffic from `*` to:

- TCP `22`
- TCP `8501`
- TCP `5000`
- TCP `5001`

`dev-workspace-vm` is running with public IP `20.230.203.79`. Its NSG allows inbound TCP `22` from `*`.

These should be restricted to trusted IPs, VPN, Bastion, or removed during a controlled access window.

### Postgres

`ainime_ua/isaac-server` does not have public access enabled, so firewall rule operations are not available.

`ainime_ua/ainime-server2` has:

- `allow-all` from `0.0.0.0` to `255.255.255.255`
- one client IP rule
- an allow-Azure-services rule

`wrkflo/wrkflo-db` has an allow-Azure-services rule.

Remove broad database exposure only after confirming dependent app egress and migration path.

### ACR

The checked ACRs all have admin user enabled and public network access enabled:

- `wrkflo-ai-rg/cafe61646254acr`
- `wrkflo/wrkfloacr637a2eee`
- `wrkflo-rg/wrkfloacr`
- `openclaw-rg/wrkfloopenclawacr`
- `ainime_ua/ainimeuaacr`

Move workloads to managed identity pulls/pushes before disabling admin user.

### App Services

`wrkflo-app` and `wrkflo-app-dev` have HTTPS-only enabled.

`ainime-web`, `ainime-api`, and `openclaw-rg/Isaac` have HTTPS-only disabled. Enable HTTPS-only in a controlled window after checking custom domains and health.

### GitHub

All checked `main` branches were unprotected:

- `wrkflo-voice-agents-ops`
- `wrkflo-orchestrator`
- `global-sentinel`
- `global-sentinel-azure-quantum`
- `dev-workspace`
- `openclaw-prod`

Add branch protection and production environment reviewers before relying on GitHub Actions as the sole deploy gate.
