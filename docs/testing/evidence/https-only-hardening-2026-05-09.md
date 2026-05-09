# HTTPS-Only Hardening Evidence - 2026-05-09

Scope: AINIME and Isaac App Services called out in the cloud exposure review.

Live changes made:

- `openclaw-rg/Isaac`: set `httpsOnly=true`.
- `ainime_ua/ainime-api`: set `httpsOnly=true`.
- `ainime_ua/ainime-web`: set `httpsOnly=true`.

Final App Service state:

| App | Resource group | Hostnames | HTTPS-only | State |
|---|---|---|---:|---|
| `Isaac` | `openclaw-rg` | `isaac-gtcwe7eqdqgdfjek.centralus-01.azurewebsites.net` | `true` | `Running` |
| `ainime-web` | `ainime_ua` | `www.ainime.io`, `ainime.io`, `ainime-web.azurewebsites.net` | `true` | `Running` |
| `ainime-api` | `ainime_ua` | `ainime-api.azurewebsites.net` | `true` | `Running` |

Final probe results:

| URL | Result |
|---|---|
| `http://ainime.io` | `301` to `https://ainime.io/` |
| `https://ainime.io` | `200` |
| `http://www.ainime.io` | `301` to `https://www.ainime.io/` |
| `https://www.ainime.io` | `200` |
| `http://ainime-web.azurewebsites.net` | `301` to `https://ainime-web.azurewebsites.net/` |
| `https://ainime-web.azurewebsites.net` | `200` |
| `http://ainime-api.azurewebsites.net` | `301` to `https://ainime-api.azurewebsites.net/` |
| `https://ainime-api.azurewebsites.net` | `405` to `HEAD`, matching the pre-change API baseline |
| `http://isaac-gtcwe7eqdqgdfjek.centralus-01.azurewebsites.net` | `301` to `https://isaac-gtcwe7eqdqgdfjek.centralus-01.azurewebsites.net/` |
| `https://isaac-gtcwe7eqdqgdfjek.centralus-01.azurewebsites.net` | `200` |

Notes:

- `ainime-web` apex HTTP briefly returned `200` immediately after the setting change, then settled to `301` on the follow-up probe.
- No rollback was needed.

Commands used:

```bash
az webapp update -g openclaw-rg -n Isaac --https-only true
az webapp update -g ainime_ua -n ainime-api --https-only true
az webapp update -g ainime_ua -n ainime-web --https-only true
az webapp list --query "[?name=='ainime-web' || name=='ainime-api' || name=='Isaac'].{name:name,resourceGroup:resourceGroup,httpsOnly:httpsOnly,state:state,hostNames:hostNames}" -o json
for u in http://ainime.io https://ainime.io http://www.ainime.io https://www.ainime.io http://ainime-web.azurewebsites.net https://ainime-web.azurewebsites.net http://ainime-api.azurewebsites.net https://ainime-api.azurewebsites.net http://isaac-gtcwe7eqdqgdfjek.centralus-01.azurewebsites.net https://isaac-gtcwe7eqdqgdfjek.centralus-01.azurewebsites.net; do printf '%s ' "$u"; curl -k -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' -I --max-time 15 "$u" || true; done
```
