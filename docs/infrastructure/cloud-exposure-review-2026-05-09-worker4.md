# Cloud Exposure Review - Worker 4 - 2026-05-09

Scope: remaining non-Eden ACR admin users, AINIME/Isaac HTTPS-only state, and Postgres firewall exposure called out in the infrastructure docs.

No live Azure state was changed during the initial review. Follow-up on 2026-05-09 enabled HTTPS-only for the three scoped App Services after one-at-a-time probes and rollback checks. Commands used for the initial review were read-only `az ... show/list`, Azure Resource Graph search, repository text search, and HTTP/HTTPS header checks. Existing dirty files in the repo were left untouched.

## Summary

HTTPS-only is now complete for the scoped AINIME/Isaac App Services. The remaining exposure reductions should be treated as controlled-window work because active runtimes still depend on registry username/password auth or database client egress is not fully pinned.

The closest low-risk ACR candidate is `wrkflo-rg/wrkfloacr`: no Azure Resource Graph consumer beyond the registry itself, no role assignments, and no scoped tokens. Do not disable it blindly; a follow-up check found it still contains `wrkflo-orchestrator` images last pushed on 2026-04-30, and local `wrkfloacr.azurecr.io` / `wrkfloacr` references remain in `/Users/mosestut/projects/wrkflo-orchestrator`, including an old Kubernetes deployment example, setup script, Redis operations docs, and tests.

## ACR Admin Users

All checked non-Eden ACRs still have public network access enabled and admin user enabled. No scoped ACR tokens were found on the checked non-Eden registries.

| Registry | Current consumers found | Managed identity / scoped auth state | Classification |
|---|---|---|---|
| `wrkflo/wrkfloacr637a2eee` | `wrkflo-orchestrator` and `wrkflo-orchestrator-staging` Container Apps pull with system identity; `wrkflo-app` and `wrkflo-app-dev` App Services pull `langflow` images with `DOCKER_REGISTRY_SERVER_*` settings and `acrUseManagedIdentityCreds=false`. | Container Apps have `AcrPull`; `wrkflo-app-dev` identity has `AcrPull`; `wrkflo-app` identity was not present in the ACR role list. | Controlled window. Grant missing `AcrPull`, switch App Services to managed identity registry auth, validate restarts/pulls, then disable admin. |
| `ainime_ua/ainimeuaacr` | `ainime-web` and `ainime-api` App Services pull AINIME images with `DOCKER_REGISTRY_SERVER_*` settings and `acrUseManagedIdentityCreds=false`. | `ainime-web` identity has `AcrPull`; `ainime-api` identity was not present in the ACR role list. No scoped tokens found. | Controlled window. Add/verify `AcrPull`, switch both App Services to managed identity registry auth, validate, then disable admin. |
| `openclaw-rg/wrkfloopenclawacr` | `openclaw-gateway-vm` references `wrkfloopenclawacr.azurecr.io/openclaw`; `OPENCLAW-RG/quantum-research-job` pulls `global-sentinel/quantum-research:latest` using a registry username and password secret ref. | VM system identity has `AcrPull`; the Container App job has `identity=None` and uses password secret ref `wrkfloopenclawacrazurecrio-wrkfloopenclawacr`. No scoped tokens found. | Controlled window. Move the Container App job to managed identity or scoped token auth, validate manual job start, then disable admin. |
| `wrkflo-rg/wrkfloacr` | No active Azure Resource Graph consumer found beyond the registry itself; registry contains `wrkflo-orchestrator:latest` and `wrkflo-orchestrator:6b140ec`, both last updated 2026-04-30; local orchestrator references still exist. | No role assignments and no scoped tokens found. | Lower-risk than active registries, but not a blind disable candidate. Confirm image retention, stale local references, and rollback ownership first. |

## AINIME / Isaac HTTPS-Only

Live App Service state:

| App Service | Hostnames | HTTPS-only | HTTP/HTTPS probe result | Classification |
|---|---|---:|---|---|
| `ainime_ua/ainime-web` | `ainime.io`, `www.ainime.io`, Azure default hostname | Enabled 2026-05-09 | HTTP now redirects to HTTPS; HTTPS returns `200`. | Complete for HTTPS-only. |
| `ainime_ua/ainime-api` | Azure default hostname | Enabled 2026-05-09 | HTTP now redirects to HTTPS; HTTPS returns `405` to `HEAD`, with `Allow: GET`. | Complete for HTTPS-only. |
| `openclaw-rg/Isaac` | Azure default hostname | Enabled 2026-05-09 | HTTP now redirects to HTTPS; HTTPS returns `200`. | Complete for HTTPS-only. |

Evidence: `docs/testing/evidence/https-only-hardening-2026-05-09.md`.

## Postgres Firewall Exposure

| Server | Public network access | Firewall rules / state | Classification |
|---|---:|---|---|
| `ainime_ua/ainime-server2` | Enabled | `allow-all` from `0.0.0.0` to `255.255.255.255`, one client IP rule `174.199.35.193/32`, and an allow-Azure-services rule `0.0.0.0`. | Controlled window. Remove `allow-all` only after confirming AINIME app/database clients and replacing it with app-specific firewall rules or private networking. |
| `ainime_ua/isaac-server` | Disabled | Firewall rule operations are rejected because public access is disabled. | No exposure fix needed from this review. |
| `wrkflo/wrkflo-db` | Enabled | Only an allow-Azure-services style rule `0.0.0.0` was found. | Controlled window. Replace broad Azure-services access with private networking or the minimum required app egress path. |

AINIME web/API currently share the same App Service possible outbound IP set. That can support an interim firewall allowlist, but private networking is the better target because App Service possible outbound IPs are broad and can change with plan/network changes.

## Safe Versus Controlled-Window Fixes

Safe or metadata-only:

- Keep this review as evidence and add any missing `project`, `environment`, `owner`, `repo`, `managed_by`, and `lifecycle` tags for AINIME/Isaac resources if owners agree.
- Treat `wrkflo-rg/wrkfloacr` as the lowest-risk admin-disable candidate, but complete explicit owner/rollback and image-retention checks first because the registry is not empty and stale local references still exist.

Controlled-window required:

- Disable admin on `wrkfloacr637a2eee`, `ainimeuaacr`, or `wrkfloopenclawacr`.
- Switch App Service or Container App job registry auth from password secrets to managed identity.
- Remove `ainime-server2` `allow-all` firewall rule or replace `wrkflo-db` allow-Azure-services access.

## Evidence Commands

Representative read-only checks used:

```bash
az acr list --query '[].{name:name,resourceGroup:resourceGroup,adminUserEnabled:adminUserEnabled,publicNetworkAccess:publicNetworkAccess,loginServer:loginServer}' -o json
az webapp list --query "[?name=='ainime-web' || name=='ainime-api' || name=='Isaac'].{name:name,resourceGroup:resourceGroup,httpsOnly:httpsOnly,hostNames:hostNames,state:state}" -o json
az postgres flexible-server list --query '[].{name:name,resourceGroup:resourceGroup,publicNetworkAccess:network.publicNetworkAccess,state:state}' -o json
az postgres flexible-server firewall-rule list -g ainime_ua -n ainime-server2 --query '[].{name:name,startIpAddress:startIpAddress,endIpAddress:endIpAddress}' -o json
az containerapp list --query '[].{name:name,resourceGroup:resourceGroup,images:properties.template.containers[].image,registries:properties.configuration.registries,identity:identity}' -o json
az containerapp job show -g OPENCLAW-RG -n quantum-research-job --query '{name:name,identity:identity,registries:properties.configuration.registries}' -o json
az graph query -q "resources | where tostring(properties) has 'wrkfloopenclawacr.azurecr.io' or tostring(properties) has 'wrkfloacr.azurecr.io' or tostring(properties) has 'ainimeuaacr.azurecr.io' or tostring(properties) has 'wrkfloacr637a2eee.azurecr.io' | project name, type, resourceGroup, id"
```
