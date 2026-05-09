# ACR Admin Migration Controlled Window

Date: 2026-05-09

Purpose: migrate the remaining non-Eden Azure Container Registry consumers away
from admin username/password auth before disabling ACR admin users.

Source facts: `docs/infrastructure/cloud-exposure-review-2026-05-09-worker4.md`.
Do not run this as an unattended bulk script. Move one registry at a time, keep a
rollback shell open, and stop on the first failed pull or failed health check.

## Scope

Registries and consumers covered:

```text
wrkflo/wrkfloacr637a2eee:
  wrkflo-app and wrkflo-app-dev App Services still have
  DOCKER_REGISTRY_SERVER_* settings and acrUseManagedIdentityCreds=false.
  wrkflo-app-dev already had AcrPull; wrkflo-app was missing from the role list.

ainime_ua/ainimeuaacr:
  ainime-web and ainime-api App Services still have
  DOCKER_REGISTRY_SERVER_* settings and acrUseManagedIdentityCreds=false.
  ainime-web already had AcrPull; ainime-api was missing from the role list.

openclaw-rg/wrkfloopenclawacr:
  OPENCLAW-RG/quantum-research-job has identity=None and uses password secret
  wrkfloopenclawacrazurecrio-wrkfloopenclawacr.

wrkflo-rg/wrkfloacr:
  Duplicate/legacy registry. No active Azure Resource Graph consumer beyond the
  registry itself, no role assignments, and no scoped tokens were found, but it
  still contains wrkflo-orchestrator images last pushed on 2026-04-30. Hidden
  CI, workstation, or rollback consumers must still be ruled out before
  disabling admin.
```

## Prechecks

1. Confirm the subscription and record the operator, start time, and target
   registry in the incident/change ticket.

```bash
az account show --query "{name:name,id:id,tenantId:tenantId}" -o table
```

2. Confirm admin state and login servers.

```bash
az acr show -g wrkflo -n wrkfloacr637a2eee \
  --query "{name:name,resourceGroup:resourceGroup,adminUserEnabled:adminUserEnabled,loginServer:loginServer}" -o json
az acr show -g ainime_ua -n ainimeuaacr \
  --query "{name:name,resourceGroup:resourceGroup,adminUserEnabled:adminUserEnabled,loginServer:loginServer}" -o json
az acr show -g openclaw-rg -n wrkfloopenclawacr \
  --query "{name:name,resourceGroup:resourceGroup,adminUserEnabled:adminUserEnabled,loginServer:loginServer}" -o json
az acr show -g wrkflo-rg -n wrkfloacr \
  --query "{name:name,resourceGroup:resourceGroup,adminUserEnabled:adminUserEnabled,loginServer:loginServer}" -o json
```

3. Re-run consumer discovery. Abort if new consumers appear.

```bash
az graph query -q "resources | where tostring(properties) has 'wrkfloopenclawacr.azurecr.io' or tostring(properties) has 'wrkfloacr.azurecr.io' or tostring(properties) has 'ainimeuaacr.azurecr.io' or tostring(properties) has 'wrkfloacr637a2eee.azurecr.io' | project name, type, resourceGroup, id"
```

4. Confirm no scoped ACR tokens were introduced.

```bash
az acr token list -g wrkflo -r wrkfloacr637a2eee -o table
az acr token list -g ainime_ua -r ainimeuaacr -o table
az acr token list -g openclaw-rg -r wrkfloopenclawacr -o table
az acr token list -g wrkflo-rg -r wrkfloacr -o table
```

5. Capture current runtime registry config. Do not paste secret values into the
   ticket; record only setting names, identity state, image, and registry server.

```bash
for target in wrkflo:wrkflo-app wrkflo-dev:wrkflo-app-dev; do
  APP_RG="${target%%:*}"
  app="${target##*:}"
  az webapp identity show -g "$APP_RG" -n "$app" \
    --query "{type:type,principalId:principalId}" -o json
  az webapp config show -g "$APP_RG" -n "$app" \
    --query "{linuxFxVersion:linuxFxVersion,acrUseManagedIdentityCreds:acrUseManagedIdentityCreds,acrUserManagedIdentityID:acrUserManagedIdentityID}" -o json
  az webapp config appsettings list -g "$APP_RG" -n "$app" \
    --query "[?starts_with(name, 'DOCKER_REGISTRY_SERVER')].name" -o tsv
done

for app in ainime-web ainime-api; do
  az webapp identity show -g ainime_ua -n "$app" \
    --query "{type:type,principalId:principalId}" -o json
  az webapp config show -g ainime_ua -n "$app" \
    --query "{linuxFxVersion:linuxFxVersion,acrUseManagedIdentityCreds:acrUseManagedIdentityCreds,acrUserManagedIdentityID:acrUserManagedIdentityID}" -o json
  az webapp config appsettings list -g ainime_ua -n "$app" \
    --query "[?starts_with(name, 'DOCKER_REGISTRY_SERVER')].name" -o tsv
done

az containerapp job show -g OPENCLAW-RG -n quantum-research-job \
  --query "{identity:identity,registries:properties.configuration.registries,secrets:properties.configuration.secrets[].name,image:properties.template.containers[0].image}" -o json
```

6. Confirm rollback prerequisites:

- An operator with permission to re-enable ACR admin and update App Service or
  Container App job registry settings is present for the whole window.
- Known-good health checks exist for `wrkflo-app`, `wrkflo-app-dev`,
  `ainime-web`, and `ainime-api`.
- For `quantum-research-job`, a manual job execution is safe during the window.
- No active deployment, scale event, or incident is in progress for the target.

## App Service Migration

Run one app at a time. `wrkflo-app-dev` is in `wrkflo-dev`, while its registry
is in `wrkflo`; do not use a single app resource group for both WrkFlo apps.

```text
wrkflo/wrkfloacr637a2eee:
  ACR_RG=wrkflo
  ACR=wrkfloacr637a2eee
  apps:
    wrkflo/wrkflo-app
    wrkflo-dev/wrkflo-app-dev

ainime_ua/ainimeuaacr:
  ACR_RG=ainime_ua
  ACR=ainimeuaacr
  apps:
    ainime_ua/ainime-web
    ainime_ua/ainime-api
```

1. Grant or verify `AcrPull` for each App Service system identity.

```bash
ACR_ID=$(az acr show -g "$ACR_RG" -n "$ACR" --query id -o tsv)

APP_RG=<app-resource-group>
APP=<app-name>

APP_PID=$(az webapp identity assign -g "$APP_RG" -n "$APP" \
    --query principalId -o tsv)

HAS_ACRPULL=$(az role assignment list --assignee "$APP_PID" --scope "$ACR_ID" \
    --query "[?roleDefinitionName=='AcrPull'] | length(@)" -o tsv)

if [ "$HAS_ACRPULL" = "0" ]; then
  az role assignment create \
    --assignee-object-id "$APP_PID" \
    --assignee-principal-type ServicePrincipal \
    --role AcrPull \
    --scope "$ACR_ID"
fi
```

Abort on authorization failures, wrong subscription, or an empty principal ID.

2. Switch each App Service to managed identity registry auth.

```bash
az webapp config set -g "$APP_RG" -n "$APP" \
  --acr-use-identity true \
  --acr-identity "[system]"

az webapp restart -g "$APP_RG" -n "$APP"
```

3. Validate each App Service.

```bash
az webapp show -g "$APP_RG" -n "$APP" \
  --query "{name:name,state:state,defaultHostName:defaultHostName}" -o table

az webapp log tail -g "$APP_RG" -n "$APP"
```

Use the service-specific health URL in the change ticket. The service must start
cleanly after restart and must not show `unauthorized`, `denied`, `401`, `403`,
`manifest unknown`, or image pull backoff errors.

4. Remove obsolete admin credential settings only after the managed identity
   restart and health checks pass.

```bash
az webapp config appsettings delete -g "$APP_RG" -n "$APP" \
  --setting-names DOCKER_REGISTRY_SERVER_USERNAME DOCKER_REGISTRY_SERVER_PASSWORD

az webapp restart -g "$APP_RG" -n "$APP"
```

Validate health again before disabling the registry admin user.

## Container App Job Migration

Target:

```text
ACR_RG=openclaw-rg
ACR=wrkfloopenclawacr
JOB_RG=OPENCLAW-RG
JOB=quantum-research-job
SERVER=wrkfloopenclawacr.azurecr.io
OLD_SECRET=wrkfloopenclawacrazurecrio-wrkfloopenclawacr
```

1. Assign a system identity to the job and grant `AcrPull`.

```bash
ACR_ID=$(az acr show -g "$ACR_RG" -n "$ACR" --query id -o tsv)

JOB_PID=$(az containerapp job identity assign -g "$JOB_RG" -n "$JOB" \
  --system-assigned --query principalId -o tsv)

if [ -z "$JOB_PID" ]; then
  JOB_PID=$(az containerapp job show -g "$JOB_RG" -n "$JOB" \
    --query identity.principalId -o tsv)
fi

HAS_ACRPULL=$(az role assignment list --assignee "$JOB_PID" --scope "$ACR_ID" \
  --query "[?roleDefinitionName=='AcrPull'] | length(@)" -o tsv)

if [ "$HAS_ACRPULL" = "0" ]; then
  az role assignment create \
    --assignee-object-id "$JOB_PID" \
    --assignee-principal-type ServicePrincipal \
    --role AcrPull \
    --scope "$ACR_ID"
fi
```

Abort on authorization failures, wrong subscription, or an empty principal ID.

2. Switch job registry auth to managed identity.

```bash
az containerapp job registry set -g "$JOB_RG" -n "$JOB" \
  --server "$SERVER" \
  --identity system
```

3. Start and validate one manual execution.

```bash
az containerapp job start -g "$JOB_RG" -n "$JOB"

az containerapp job execution list -g "$JOB_RG" -n "$JOB" \
  --query "[0].{name:name,status:properties.status,startTime:properties.startTime,endTime:properties.endTime}" -o table

az containerapp job show -g "$JOB_RG" -n "$JOB" \
  --query "{identity:identity,registries:properties.configuration.registries,secrets:properties.configuration.secrets[].name}" -o json
```

The execution must reach the expected terminal state for this job and must not
show registry authentication, pull, or image resolution errors.

4. Remove the old password secret only after the managed identity execution has
   passed.

```bash
az containerapp job secret remove -g "$JOB_RG" -n "$JOB" \
  --secret-names "$OLD_SECRET" \
  --yes
```

Start and validate one more execution before disabling admin.

## Duplicate Registry Check

For `wrkflo-rg/wrkfloacr`, do not migrate consumers because none were found in
Azure Resource Graph beyond the registry itself and repository docs already
mark it as duplicate. Before disabling admin, complete this owner check. A
follow-up preflight found `wrkflo-orchestrator:latest` and
`wrkflo-orchestrator:6b140ec` in the registry, both last pushed on 2026-04-30.
Local `wrkfloacr.azurecr.io` and `wrkfloacr` references also remain in
`/Users/mosestut/projects/wrkflo-orchestrator`, including an old Kubernetes
deployment example, setup script, Redis operations docs, and tests, so this is
not a no-evidence change.

- Confirm no GitHub Actions, local workstation scripts, release rollback notes,
  or external vendors still use `wrkfloacr.azurecr.io`.
- Confirm the two old `wrkflo-orchestrator` image tags are not needed for
  rollback or historical release reconstruction.
- Confirm no ACR tokens or role assignments appeared since the review.
- Confirm re-enabling admin is an accepted rollback for this duplicate registry.

```bash
az acr repository show-tags -g wrkflo-rg -n wrkfloacr \
  --repository wrkflo-orchestrator --orderby time_desc --detail -o table
az acr token list -g wrkflo-rg -r wrkfloacr -o table
az role assignment list \
  --scope "$(az acr show -g wrkflo-rg -n wrkfloacr --query id -o tsv)" \
  -o table
```

## Disable Admin Users

Disable admin only after all known consumers for that registry have passed
managed identity validation and old password references have been removed.

```bash
az acr update -g wrkflo -n wrkfloacr637a2eee --admin-enabled false
az acr update -g ainime_ua -n ainimeuaacr --admin-enabled false
az acr update -g openclaw-rg -n wrkfloopenclawacr --admin-enabled false
az acr update -g wrkflo-rg -n wrkfloacr --admin-enabled false
```

Validate final state:

```bash
az acr show -g wrkflo -n wrkfloacr637a2eee --query "{name:name,adminUserEnabled:adminUserEnabled}" -o table
az acr show -g ainime_ua -n ainimeuaacr --query "{name:name,adminUserEnabled:adminUserEnabled}" -o table
az acr show -g openclaw-rg -n wrkfloopenclawacr --query "{name:name,adminUserEnabled:adminUserEnabled}" -o table
az acr show -g wrkflo-rg -n wrkfloacr --query "{name:name,adminUserEnabled:adminUserEnabled}" -o table
```

Then restart or execute each migrated consumer once more and repeat the health
or execution validation.

## Rollback

Prefer fixing the managed identity role/config error first. Roll back only if a
consumer cannot pull during the window and the service owner approves restoring
admin credential auth.

App Service rollback:

```bash
az acr update -g "$ACR_RG" -n "$ACR" --admin-enabled true

ACR_USER=$(az acr credential show -g "$ACR_RG" -n "$ACR" --query username -o tsv)
ACR_PASS=$(az acr credential show -g "$ACR_RG" -n "$ACR" --query 'passwords[0].value' -o tsv)

az webapp config set -g "$APP_RG" -n "$APP" --acr-use-identity false
az webapp config appsettings set -g "$APP_RG" -n "$APP" --settings \
    DOCKER_REGISTRY_SERVER_URL="https://${ACR}.azurecr.io" \
    DOCKER_REGISTRY_SERVER_USERNAME="$ACR_USER" \
    DOCKER_REGISTRY_SERVER_PASSWORD="$ACR_PASS"
az webapp restart -g "$APP_RG" -n "$APP"
```

Container App job rollback:

```bash
az acr update -g "$ACR_RG" -n "$ACR" --admin-enabled true

ACR_USER=$(az acr credential show -g "$ACR_RG" -n "$ACR" --query username -o tsv)
ACR_PASS=$(az acr credential show -g "$ACR_RG" -n "$ACR" --query 'passwords[0].value' -o tsv)

az containerapp job registry set -g "$JOB_RG" -n "$JOB" \
  --server "$SERVER" \
  --username "$ACR_USER" \
  --password "$ACR_PASS"

az containerapp job start -g "$JOB_RG" -n "$JOB"
```

After rollback, rotate the ACR admin password during the next approved window
and re-open this migration with the failed command output attached.

## Abort Criteria

Abort before making changes if:

- Consumer discovery finds an undocumented active consumer.
- Any target identity principal ID is empty or belongs to the wrong resource.
- `AcrPull` cannot be assigned or verified.
- A service owner cannot confirm health checks and rollback authority.
- There is an active incident, deployment, or autoscale event for the target.

Abort after a migration step and roll back if:

- A restarted App Service fails health checks.
- The Container App job cannot start or cannot reach its expected terminal state.
- Logs show registry `401`, `403`, `unauthorized`, `denied`, image pull backoff,
  or manifest resolution errors.
- More than one consumer in the same registry shows pull instability.
- Any command targets a different subscription, resource group, or registry than
  the values in this runbook.
