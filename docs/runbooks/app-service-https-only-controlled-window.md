# App Service HTTPS-Only Controlled Window

Use this runbook to enable or verify App Service HTTPS-only one app at a time
for AINIME and Isaac. Do not batch apps. Each change alters public HTTP behavior
and must be done in a monitored window with rollback ready.

Status: completed for the three scoped apps on 2026-05-09. Keep this runbook for
future verification and rollback.

Source state: `docs/infrastructure/cloud-exposure-review-2026-05-09-worker4.md`
reported HTTPS-only disabled for all three apps. HTTP and HTTPS were both live:
`ainime-web` returned `200`, `ainime-api` returned `405` to `HEAD` with
`Allow: GET`, and `Isaac` returned `200`.

## App Inventory

| App | Resource group | Current hostnames | Current HTTPS-only | Current probe baseline |
|---|---|---|---:|---|
| `ainime-web` | `ainime_ua` | `ainime.io`, `www.ainime.io`, `ainime-web.azurewebsites.net` | Enabled 2026-05-09 | HTTP redirects to HTTPS; HTTPS `200` |
| `ainime-api` | `ainime_ua` | `ainime-api.azurewebsites.net` | Enabled 2026-05-09 | HTTP redirects to HTTPS; HTTPS `405` to `HEAD`, `Allow: GET` |
| `Isaac` | `openclaw-rg` | `isaac-gtcwe7eqdqgdfjek.centralus-01.azurewebsites.net` | Enabled 2026-05-09 | HTTP redirects to HTTPS; HTTPS `200` |

Before the window, confirm the live hostnames still match:

```bash
az webapp show -g <resource-group> -n <app-name> \
  --query '{name:name,resourceGroup:resourceGroup,httpsOnly:httpsOnly,hostNames:hostNames,state:state}' \
  -o json
```

## Preflight

1. Confirm owner approval, active support coverage, and a rollback operator.
2. Confirm the app is healthy over HTTPS before changing anything.
3. Capture HTTP and HTTPS response headers for every hostname on the app.
4. Confirm no known client or monitor depends on direct HTTP `200` responses.
5. Keep the rollback command ready in a separate shell.

Set app variables:

```bash
RG=<resource-group>
APP=<app-name>
HOSTS="<space-separated-hostnames>"
```

Capture current App Service state:

```bash
az webapp show -g "$RG" -n "$APP" \
  --query '{name:name,resourceGroup:resourceGroup,httpsOnly:httpsOnly,hostNames:hostNames,state:state}' \
  -o json
```

Capture HTTP/HTTPS headers:

```bash
for host in $HOSTS; do
  echo "== $host HTTP =="
  curl -sS -I --max-time 10 "http://$host" || exit 1
  echo "== $host HTTPS =="
  curl -sS -I --max-time 10 "https://$host" || exit 1
done
```

For `ainime-api`, a `HEAD` response of `405` with `Allow: GET` matches the
review baseline. Also validate the API health or known read-only GET endpoint
used by operators:

```bash
curl -sS --max-time 10 "https://ainime-api.azurewebsites.net/<health-or-readonly-path>"
```

Abort before changing if HTTPS fails, certificates are invalid, expected custom
hostnames are missing, the app is not running, or owners identify HTTP-only
clients that cannot tolerate redirects.

## Enable One App

Enable HTTPS-only:

```bash
az webapp update -g "$RG" -n "$APP" --https-only true \
  --query '{name:name,resourceGroup:resourceGroup,httpsOnly:httpsOnly,hostNames:hostNames}' \
  -o json
```

Confirm Azure reports the setting:

```bash
az webapp show -g "$RG" -n "$APP" --query '{name:name,httpsOnly:httpsOnly}' -o json
```

Expected result: `httpsOnly` is `true`.

## Validate

Re-run probes for every hostname:

```bash
for host in $HOSTS; do
  echo "== $host HTTP after =="
  curl -sS -I --max-time 10 "http://$host" || exit 1
  echo "== $host HTTPS after =="
  curl -sS -I --max-time 10 "https://$host" || exit 1
done
```

Expected validation:

- HTTP returns a redirect to the matching HTTPS URL instead of serving the app
  directly.
- HTTPS still returns the same application-level status observed before the
  change: `ainime-web` `200`, `ainime-api` expected API health/read-only GET
  success and `HEAD` may remain `405` with `Allow: GET`, `Isaac` `200`.
- No spike in App Service 4xx/5xx, restart count, or application errors.
- External monitors that use HTTPS remain green.

Keep the app under observation for at least one normal monitor interval before
starting the next app.

## Rollback

Rollback is per app:

```bash
az webapp update -g "$RG" -n "$APP" --https-only false \
  --query '{name:name,resourceGroup:resourceGroup,httpsOnly:httpsOnly,hostNames:hostNames}' \
  -o json
```

After rollback, confirm HTTP behavior returned to the preflight baseline for the
affected app and leave the other apps unchanged.

## Monitoring

During and after each app change, watch:

- App Service availability, response time, HTTP 4xx/5xx, and restart count.
- Application logs for failed callbacks, webhooks, health checks, CORS/preflight
  failures, or mixed-content complaints.
- Uptime checks for both custom domains on `ainime-web`.
- API client errors for `ainime-api`, especially clients configured with
  `http://` base URLs.

Useful Azure checks:

```bash
az webapp log tail -g "$RG" -n "$APP"
az webapp show -g "$RG" -n "$APP" --query '{state:state,httpsOnly:httpsOnly,hostNames:hostNames}' -o json
```

## Abort Criteria

Abort the current app change and roll back if any of these occur:

- HTTPS validation fails or the certificate chain is invalid.
- HTTP does not redirect to HTTPS after the setting is enabled.
- The app returns unexpected 5xx responses or fails its operator health check.
- Critical client traffic breaks and cannot be fixed by changing client base
  URLs to HTTPS during the window.
- App Service logs show new repeated startup, routing, auth, callback, or CORS
  failures.
- Hostname state in Azure differs from the app inventory and cannot be explained
  before the change.

If an abort happens, stop the sequence. Do not move to the next app until the
cause is understood and a new window is approved.
