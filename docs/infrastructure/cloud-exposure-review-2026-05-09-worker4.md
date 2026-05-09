# Cloud Exposure Review - Worker 4 - 2026-05-09

Scope: remaining non-Eden ACR admin users, AINIME/Isaac HTTPS-only state, and Postgres firewall exposure called out in the infrastructure docs.

No live Azure state was changed during this review. Commands used were read-only `az ... show/list`, Azure Resource Graph search, repository text search, and HTTP/HTTPS header checks. Existing dirty files in the repo were left untouched.

## Summary

No remaining live fix met the "clearly non-disruptive" threshold except documentation/metadata follow-up. The remaining exposure reductions should be treated as controlled-window work because active runtimes still depend on registry username/password auth, HTTP endpoints currently serve traffic, or database client egress is not fully pinned.

The closest low-risk candidate is `wrkflo-rg/wrkfloacr`: no Azure Resource Graph consumer, no role assignments, and it is already documented as a duplicate ACR. Disable its admin user only after a final owner/rollback check confirms no hidden CI, workstation, or rollback path still uses the admin credentials.

## ACR Admin Users

All checked non-Eden ACRs still have public network access enabled and admin user enabled. No scoped ACR tokens were found on the checked non-Eden registries.

| Registry | Current consumers found | Managed identity / scoped auth state | Classification |
|---|---|---|---|
| `wrkflo/wrkfloacr637a2eee` | `wrkflo-orchestrator` and `wrkflo-orchestrator-staging` Container Apps pull with system identity; `wrkflo-app` and `wrkflo-app-dev` App Services pull `langflow` images with `DOCKER_REGISTRY_SERVER_*` settings and `acrUseManagedIdentityCreds=false`. | Container Apps have `AcrPull`; `wrkflo-app-dev` identity has `AcrPull`; `wrkflo-app` identity was not present in the ACR role list. | Controlled window. Grant missing `AcrPull`, switch App Services to managed identity registry auth, validate restarts/pulls, then disable admin. |
| `ainime_ua/ainimeuaacr` | `ainime-web` and `ainime-api` App Services pull AINIME images with `DOCKER_REGISTRY_SERVER_*` settings and `acrUseManagedIdentityCreds=false`. | `ainime-web` identity has `AcrPull`; `ainime-api` identity was not present in the ACR role list. No scoped tokens found. | Controlled window. Add/verify `AcrPull`, switch both App Services to managed identity registry auth, validate, then disable admin. |
| `openclaw-rg/wrkfloopenclawacr` | `openclaw-gateway-vm` references `wrkfloopenclawacr.azurecr.io/openclaw`; `OPENCLAW-RG/quantum-research-job` pulls `global-sentinel/quantum-research:latest` using a registry username and password secret ref. | VM system identity has `AcrPull`; the Container App job has `identity=None` and uses password secret ref `wrkfloopenclawacrazurecrio-wrkfloopenclawacr`. No scoped tokens found. | Controlled window. Move the Container App job to managed identity or scoped token auth, validate manual job start, then disable admin. |
| `wrkflo-rg/wrkfloacr` | No active Azure Resource Graph consumer found beyond the registry itself; repository docs already mark it as duplicate/not used by active workflow. | No role assignments and no scoped tokens found. | Low-risk candidate after owner/rollback confirmation. Not changed in this pass because hidden CI/local consumers cannot be ruled out from Azure state alone. |

## AINIME / Isaac HTTPS-Only

Live App Service state:

| App Service | Hostnames | HTTPS-only | HTTP/HTTPS probe result | Classification |
|---|---|---:|---|---|
| `ainime_ua/ainime-web` | `ainime.io`, `www.ainime.io`, Azure default hostname | Disabled | HTTP and HTTPS both return `200`. | Controlled window. HTTPS works, but HTTP currently serves the site directly; enabling HTTPS-only changes public behavior for any HTTP clients. |
| `ainime_ua/ainime-api` | Azure default hostname | Disabled | HTTP and HTTPS both return `405` to `HEAD`, with `Allow: GET`. | Controlled window. Validate API clients and health path, then enable HTTPS-only. |
| `openclaw-rg/Isaac` | Azure default hostname | Disabled | HTTP and HTTPS both return `200`. | Controlled window. Low risk, but still changes reachable HTTP behavior. |

Suggested window steps: capture current health responses, enable HTTPS-only one app at a time, verify HTTPS health and expected HTTP redirect behavior, then keep rollback command ready to set `--https-only false` if a client breaks.

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
- Treat `wrkflo-rg/wrkfloacr` as the only low-risk admin-disable candidate, but do one explicit owner/rollback check first.

Controlled-window required:

- Disable admin on `wrkfloacr637a2eee`, `ainimeuaacr`, or `wrkfloopenclawacr`.
- Switch App Service or Container App job registry auth from password secrets to managed identity.
- Enable HTTPS-only on `ainime-web`, `ainime-api`, or `Isaac`.
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
