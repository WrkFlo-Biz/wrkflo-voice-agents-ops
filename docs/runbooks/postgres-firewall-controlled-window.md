# Postgres Firewall Controlled Window

Runbook for tightening Azure Database for PostgreSQL Flexible Server exposure for the controlled-window servers identified in the 2026-05-09 cloud exposure review.

## Scope

In scope:

- `ainime_ua/ainime-server2`: public access enabled; rules include `allow-all` from `0.0.0.0` to `255.255.255.255`, one `174.199.35.193/32` client rule, and one Azure-services style `0.0.0.0` rule.
- `wrkflo/wrkflo-db`: public access enabled; rules include only an Azure-services style `0.0.0.0` rule.

Out of scope:

- `ainime_ua/isaac-server`, because public access was already disabled.
- App code, schema changes, credential rotation, and private endpoint build-out.

## Prerequisites

- Approved maintenance window with AINIME and Wrkflo owners present.
- Azure CLI logged in to the approved subscription with firewall rule write access.
- Confirmed database client inventory and egress IPs for each server.
- Break-glass operator IP and DB credentials available without printing secrets.
- Secure evidence directory for before/after JSON captures.
- `psql` available if direct DB validation is part of the plan.

Abort before changes if any required client egress path is unknown.

## Variables

```bash
export RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
export OUT_DIR="./evidence/postgres-firewall-${RUN_ID}"
mkdir -p "${OUT_DIR}"

export AINIME_RG="ainime_ua"
export AINIME_PG="ainime-server2"
export WRKFLO_RG="wrkflo"
export WRKFLO_PG="wrkflo-db"
```

## Read-Only Prechecks

Confirm account and server state:

```bash
az account show -o json > "${OUT_DIR}/account.json"

az postgres flexible-server show -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --query '{name:name,resourceGroup:resourceGroup,state:state,publicNetworkAccess:network.publicNetworkAccess,fullyQualifiedDomainName:fullyQualifiedDomainName}' \
  -o json > "${OUT_DIR}/ainime-server2-server.json"

az postgres flexible-server show -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --query '{name:name,resourceGroup:resourceGroup,state:state,publicNetworkAccess:network.publicNetworkAccess,fullyQualifiedDomainName:fullyQualifiedDomainName}' \
  -o json > "${OUT_DIR}/wrkflo-db-server.json"
```

Capture current firewall rules:

```bash
az postgres flexible-server firewall-rule list -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --query '[].{name:name,startIpAddress:startIpAddress,endIpAddress:endIpAddress}' \
  -o json > "${OUT_DIR}/ainime-server2-firewall-before.json"

az postgres flexible-server firewall-rule list -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --query '[].{name:name,startIpAddress:startIpAddress,endIpAddress:endIpAddress}' \
  -o json > "${OUT_DIR}/wrkflo-db-firewall-before.json"
```

Capture likely AINIME App Service egress candidates for interim allowlisting:

```bash
az webapp show -g "${AINIME_RG}" -n ainime-web \
  --query '{name:name,outboundIpAddresses:outboundIpAddresses,possibleOutboundIpAddresses:possibleOutboundIpAddresses,state:state}' \
  -o json > "${OUT_DIR}/ainime-web-egress.json"

az webapp show -g "${AINIME_RG}" -n ainime-api \
  --query '{name:name,outboundIpAddresses:outboundIpAddresses,possibleOutboundIpAddresses:possibleOutboundIpAddresses,state:state}' \
  -o json > "${OUT_DIR}/ainime-api-egress.json"
```

Observed 2026-05-09 preflight:

- `ainime-web` and `ainime-api` are running and expose `DATABASE_URL` as an app setting name.
- Both AINIME apps reported the same 31 possible outbound IP addresses.
- `wrkflo-app` reported 31 possible outbound IP addresses; `wrkflo-app-dev` reported 22.
- `wrkflo-orchestrator` and `wrkflo-orchestrator-staging` share Container Apps managed environment `wrkflo-env` and each reported 241 outbound IP addresses.
- Azure Resource Graph found `wrkflo-orchestrator` referencing `wrkflo-db.postgres.database.azure.com`; it did not find an App Service resource reference to `ainime-server2.postgres.database.azure.com` beyond the PostgreSQL server resource itself.

These counts make a public firewall allowlist noisy and fragile, especially for
Container Apps. Prefer private networking for the production fix unless owners
explicitly accept a temporary broad egress allowlist.

Search Azure Resource Graph for additional references:

```bash
az graph query -q "resources | where tostring(properties) has '${AINIME_PG}.postgres.database.azure.com' or tostring(properties) has '${WRKFLO_PG}.postgres.database.azure.com' | project name, type, resourceGroup, id" \
  -o json > "${OUT_DIR}/postgres-client-resource-graph.json"
```

## Decision Point

Use an interim public allowlist only if:

- Private networking is not ready for this window.
- Every required client has known, owner-approved egress IPs.
- Replacement rules can be added and validated before broad rules are removed.
- Owners accept that App Service possible outbound IPs are broad and can change after plan, scale, or networking changes.
- Owners accept that the current WrkFlo Container Apps environment reported 241 outbound IP addresses, making an interim public allowlist hard to review and maintain.

Stop and choose private networking first if:

- Required egress IPs are unknown, unstable, or shared by unrelated workloads.
- The service objective is no public DB reachability.
- Azure clients can use VNet integration, private endpoint, and private DNS.
- Owners cannot run same-window smoke tests.

For private networking, keep this runbook to capture evidence only. Build and validate the private path before returning to remove public broad rules.

## Change Steps

### 1. Add Replacement Rules

Use one rule per approved client egress IP or range. For one IP, start and end are the same.

AINIME command shapes:

```bash
az postgres flexible-server firewall-rule create -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --rule-name "ainime-web-egress-001" \
  --start-ip-address "<AINIME_WEB_EGRESS_IP_1>" \
  --end-ip-address "<AINIME_WEB_EGRESS_IP_1>"

az postgres flexible-server firewall-rule create -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --rule-name "ainime-api-egress-001" \
  --start-ip-address "<AINIME_API_EGRESS_IP_1>" \
  --end-ip-address "<AINIME_API_EGRESS_IP_1>"

az postgres flexible-server firewall-rule create -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --rule-name "operator-breakglass-001" \
  --start-ip-address "<OPERATOR_PUBLIC_IP>" \
  --end-ip-address "<OPERATOR_PUBLIC_IP>"
```

Wrkflo command shapes:

```bash
az postgres flexible-server firewall-rule create -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --rule-name "wrkflo-app-egress-001" \
  --start-ip-address "<WRKFLO_APP_EGRESS_IP_1>" \
  --end-ip-address "<WRKFLO_APP_EGRESS_IP_1>"

az postgres flexible-server firewall-rule create -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --rule-name "operator-breakglass-001" \
  --start-ip-address "<OPERATOR_PUBLIC_IP>" \
  --end-ip-address "<OPERATOR_PUBLIC_IP>"
```

Capture after adding:

```bash
az postgres flexible-server firewall-rule list -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --query '[].{name:name,startIpAddress:startIpAddress,endIpAddress:endIpAddress}' \
  -o json > "${OUT_DIR}/ainime-server2-firewall-after-add.json"

az postgres flexible-server firewall-rule list -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --query '[].{name:name,startIpAddress:startIpAddress,endIpAddress:endIpAddress}' \
  -o json > "${OUT_DIR}/wrkflo-db-firewall-after-add.json"
```

### 2. Validate Before Removal

Before deleting broad rules, owners must confirm:

- AINIME web/API database-backed health, login, or read workflow succeeds.
- Wrkflo database-backed owner-selected workflow succeeds.
- Optional direct `psql` check succeeds from an explicitly allowed IP.

```bash
PGPASSWORD="<SECRET>" psql "host=${AINIME_PG}.postgres.database.azure.com port=5432 dbname=<DB_NAME> user=<DB_USER> sslmode=require connect_timeout=10" -c "select 1;"
PGPASSWORD="<SECRET>" psql "host=${WRKFLO_PG}.postgres.database.azure.com port=5432 dbname=<DB_NAME> user=<DB_USER> sslmode=require connect_timeout=10" -c "select 1;"
```

### 3. Remove Broad Rules

Remove AINIME full internet access:

```bash
az postgres flexible-server firewall-rule delete -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --rule-name "allow-all" \
  --yes
```

Remove Azure-services style rules after finding their exact names in the before capture. These rules have `startIpAddress` and `endIpAddress` set to `0.0.0.0`.

```bash
az postgres flexible-server firewall-rule delete -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --rule-name "<AINIME_AZURE_SERVICES_RULE_NAME>" \
  --yes

az postgres flexible-server firewall-rule delete -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --rule-name "<WRKFLO_AZURE_SERVICES_RULE_NAME>" \
  --yes
```

Capture after removal:

```bash
az postgres flexible-server firewall-rule list -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --query '[].{name:name,startIpAddress:startIpAddress,endIpAddress:endIpAddress}' \
  -o json > "${OUT_DIR}/ainime-server2-firewall-after-remove.json"

az postgres flexible-server firewall-rule list -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --query '[].{name:name,startIpAddress:startIpAddress,endIpAddress:endIpAddress}' \
  -o json > "${OUT_DIR}/wrkflo-db-firewall-after-remove.json"
```

## Final Validation

Check no broad public rule remains:

```bash
az postgres flexible-server firewall-rule list -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --query "[?startIpAddress=='0.0.0.0' || endIpAddress=='255.255.255.255']" \
  -o json

az postgres flexible-server firewall-rule list -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --query "[?startIpAddress=='0.0.0.0' || endIpAddress=='255.255.255.255']" \
  -o json
```

Expected result: empty arrays unless an approved temporary exception is documented.

Then rerun owner smoke tests and watch application logs, failed connection metrics, and user-facing health checks for the agreed observation period.

## Rollback

Rollback restores the broad rules that existed before the window.

Recreate AINIME full internet access:

```bash
az postgres flexible-server firewall-rule create -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --rule-name "allow-all" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "255.255.255.255"
```

Recreate Azure-services style rules with the original names from the before capture:

```bash
az postgres flexible-server firewall-rule create -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --rule-name "<AINIME_AZURE_SERVICES_RULE_NAME>" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "0.0.0.0"

az postgres flexible-server firewall-rule create -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --rule-name "<WRKFLO_AZURE_SERVICES_RULE_NAME>" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "0.0.0.0"
```

Remove bad replacement rules only after broad access is restored:

```bash
az postgres flexible-server firewall-rule delete -g "${AINIME_RG}" -n "${AINIME_PG}" \
  --rule-name "<REPLACEMENT_RULE_NAME>" \
  --yes

az postgres flexible-server firewall-rule delete -g "${WRKFLO_RG}" -n "${WRKFLO_PG}" \
  --rule-name "<REPLACEMENT_RULE_NAME>" \
  --yes
```

Capture rollback state with the same firewall-rule list commands used above, writing to `*-firewall-rollback.json`.

## Abort Criteria

Abort before changes if:

- The selected subscription is not the approved subscription.
- Either server is not `Ready` or public access is not in the expected state.
- Prechange firewall rules differ from the owner-approved plan.
- Required client egress IPs are missing or disputed.
- Owners are unavailable for smoke tests.
- Rollback commands or credentials are unavailable.

Abort during the window and roll back if:

- Replacement rule creation fails.
- Smoke tests fail after replacement rules are added.
- Broad-rule removal leaves a partial state that cannot be explained from captures.
- New PostgreSQL connection failures appear after broad-rule removal.
- Owners cannot confirm service health inside the window.
