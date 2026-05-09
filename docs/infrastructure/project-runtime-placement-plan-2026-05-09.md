# Project Runtime Placement Plan

Date: 2026-05-09

This plan answers where each project should run: Container Apps, App Service, VM, or lab/review. It is intentionally conservative: do not create new VMs unless the workload needs OS-level control, persistent desktop state, attached disks, specialized drivers, or interactive development.

## Placement Rules

Use Azure Container Apps when the workload is:

- HTTP API, webhook gateway, worker, MCP server, job, or scheduler.
- Containerized and stateless or externally stateful.
- Suitable for managed identity, secret refs, ACR image deploy, and health probes.

Use Azure App Service when the workload is:

- Existing web app already stable on App Service.
- Bound to custom domains/certs and not causing operational pain.
- Not ready for container consolidation.

Use Azure VM only when the workload needs:

- Long-running OS-level agents or services with custom host setup.
- Interactive development workspace.
- Trading gateway/browser/desktop state or attached data disk semantics.
- Hardware/security constraints that managed containers do not satisfy.

Use lab/review when ownership or product dependency is unclear.

## Recommended Targets

| Project | Recommended runtime | Rationale | Next action |
|---|---|---|---|
| Eden voice gateway | Existing Container App `wrkflo-google-webhooks` | Webhook/MCP/tool gateway is stateless enough and already healthy on Container Apps | Keep on Container Apps; prove GitHub deploy, then retire local-only deployment path |
| WrkFlo orchestrator | Existing Container Apps `wrkflo-orchestrator` and `wrkflo-orchestrator-staging` | API/orchestration surface fits Container Apps; has Redis/Postgres external state | Keep; improve secret refs, branch protection, staging parity |
| WrkFlo web app | Existing App Service `wrkflo-app` | Running with HTTPS-only and custom domain; migration not urgent | Keep on App Service for now; revisit only if consolidating all app containers under Container Apps |
| WrkFlo dev app | Existing App Service `wrkflo-app-dev` | Running dev surface with HTTPS-only | Keep; align repo/deploy ownership |
| OpenClaw gateway | VM for gateway/trading pieces only | Possible IBKR/trading gateway needs may require OS-level runtime | NSG restricted to trusted CIDR on 2026-05-09; split dashboards/API into Container Apps later |
| Global Sentinel dashboard/API | Container Apps preferred | Dashboard/API/job workloads do not inherently need VM if containerized | Plan extraction from OpenClaw VM after source/runtime owner review |
| Global Sentinel quantum/research jobs | Container Apps jobs or Azure ML jobs | Batch/research workloads fit jobs better than always-on VM | Keep `quantum-research-job`; document trigger/owner |
| Dev workspace | VM | Interactive dev box is a VM-shaped workload | Keep VM; SSH restricted to trusted CIDR on 2026-05-09; document Tailscale/Bastion path |
| AINIME web/API | Existing App Services short-term | Running production surfaces; canonical repo is unclear | Do not migrate until repo owner/deploy path is known; enable HTTPS-only later |
| AINIME ML endpoint | Azure ML online endpoint | Model serving already lives in Azure ML | Keep; tag and document owner |
| Isaac AI lab | Lab/review AI Services/App Service | Product boundary unclear | Tag as lab/review; do not add new runtime until repo is known |
| AI lab groups `Wrk.Flo`, `Wrk`, `wrk`, `rg-moses-8586` | Lab/review | Mixed AI Services resources, some used by Eden Azure OpenAI | Tag exact production dependencies first; keep `Wrk/wrkflobiz` because Eden uses it |

## Do Not Build New Yet

Do not create these until the repo/runtime owner is explicit:

- New Eden VM: not needed.
- New Eden resource group: optional later, only after GitHub deploy is proven.
- New AINIME Container Apps: repo/deploy owner unclear.
- New Global Sentinel Container Apps: first split runtime responsibilities from OpenClaw VM.
- New WrkFlo foundation in `wrkflo-rg`: existing `wrkflo` group is active; `wrkflo-rg` may be future or duplicate infra.

## Safe Next Provisioning Candidates

These are the only new/provisioning candidates that look reasonable after the current inventory:

1. `eden-voice-staging` Container App, only if isolated staging is required.
   - Current `staging` GitHub environment points to the production Container App for workflow validation.
   - Better staging would need separate app name, secrets, health URL, and ElevenLabs non-live tools.

2. Global Sentinel dashboard/API Container App, after source and port ownership are confirmed.
   - Candidate repo: `WrkFlo-Biz/global-sentinel`.
   - Keep OpenClaw VM for any OS-level gateway dependency.

3. Managed-identity ACR pull for Eden.
   - Not a new app; it replaces ACR admin credentials with system-assigned identity and `AcrPull`.

## Applied 2026-05-09

- Confirmed Eden has no VM requirement and should remain on Container Apps.
- Confirmed `wrkflo-orchestrator` and `wrkflo-orchestrator-staging` are single-revision Container Apps.
- Confirmed `wrkflo-app` is a running Linux container App Service with HTTPS-only enabled.
- Restricted `dev-workspace-vm` SSH ingress to `174.232.30.68/32`.
- Restricted `openclaw-gateway-vm` SSH, dashboard, and IBKR ingress ports to `174.232.30.68/32`.
- Tagged the focused resource groups: `wrkflo-ai-rg`, `wrkflo`, `wrkflo-dev`, `openclaw-rg`, `gs-dev-rg`, and `dev-ws-westus2`.

## Controlled-Window Changes

These are important but should not be applied blind:

- Replace temporary trusted-IP VM ingress with Tailscale, Bastion, VPN, or another stable access path.
- Remove broad Postgres firewall rules.
- Disable ACR admin users.
- Done 2026-05-09: enabled HTTPS-only on AINIME/Isaac App Services.
- Rotate or move credential-like runtime env vars.
- Add GitHub branch protection if it might block current automation.

See `vm-access-hardening-state-2026-05-09.md`, `cloud-exposure-review-2026-05-09-worker4.md`, and `docs/testing/evidence/https-only-hardening-2026-05-09.md` for the latest controlled-window breakdown.
