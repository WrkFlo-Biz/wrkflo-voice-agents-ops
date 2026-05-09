# Local Path Cleanup

Date: 2026-05-09

## Source Of Truth

The Eden gateway source now lives in:

```text
/Users/mosestut/wrkflo-voice-agents-ops/services/eden-gateway
```

This path is now the repo-owned deployment source for the Eden voice gateway.

## Legacy Working Copy

The previous local-only source path is:

```text
/Users/mosestut/workspace-google-webhooks
```

That folder was not a git repository. It was used for the live Azure Container App deployment. GitHub-owned deployments and live Eden tool smokes passed on 2026-05-09, so this folder is now archive-eligible. Keep it in place until explicit operator approval to move or delete the local rollback copy.

## Copied Into Repo

- `src/server.js`
- `package.json`
- `package-lock.json`
- `Dockerfile`
- `.dockerignore`
- `README.md`
- `scripts/`

Excluded from repo ownership:

- `node_modules/`
- `.DS_Store`
- `.env`
- `.env.*`
- runtime credential JSON files

## Next Cleanup Steps

1. Done: confirmed the GitHub Actions workflow at `.github/workflows/eden-gateway-deploy.yml`.
2. Done: confirmed the local git remote points to the enterprise account `WrkFlo-Biz/wrkflo-voice-agents-ops`.
3. Done: Azure OIDC for `WrkFlo-Biz/wrkflo-voice-agents-ops` is configured; keep details in `docs/runbooks/eden-gateway-github-deploy.md`.
4. Done: deployed from GitHub to the existing `wrkflo-ai-rg` Container App.
5. Done: verified the deployed image, health endpoint, tool catalog, orchestration tool, and image-generation tool.
6. Pending operator approval: archive or remove `/Users/mosestut/workspace-google-webhooks`.

## GitHub Actions Added

Added workflow:

```text
.github/workflows/eden-gateway-deploy.yml
```

The workflow builds `services/eden-gateway`, pushes a tagged image to
`cafe61646254acr.azurecr.io/wrkflo-google-webhooks`, updates
`wrkflo-ai-rg/wrkflo-google-webhooks`, and smoke checks `/health`.

It uses Azure OIDC and expects these GitHub environment secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

## Dry-Run Cleanup Helper

Use this from the repo root to compare the legacy folder with the canonical service path:

```bash
scripts/local/plan-eden-path-cleanup.sh
```

It prints source diffs, generated clutter, and runtime secret-like local files without deleting anything. The only apply mode currently supported is `.DS_Store` cleanup:

```bash
scripts/local/plan-eden-path-cleanup.sh --apply-ds-store-cleanup
```

Current expected differences between the legacy folder and repo-owned service:

- `README.md` differs because the repo copy documents GitHub ownership.
- `package.json` differs because the repo-owned service is now named `eden-gateway`.
- `package-lock.json` differs after dependency resolution and the service rename in the repo copy; `npm ci --ignore-scripts` passes with zero reported vulnerabilities.
- `src/server.js` differs because the repo-owned service contains the Azure OpenAI model router and image-generation tool changes deployed from GitHub.
- `scripts/deploy-azure-containerapp.sh` differs because the legacy script predates the GitHub Actions / managed-identity deployment path.

Use this from the repo root to check the GitHub remote before configuring OIDC:

```bash
scripts/local/plan-github-remote-reconcile.sh
```

It prints the current remote and the intended enterprise remote without changing git config. Apply only when the repo is ready to move to the enterprise account:

```bash
scripts/local/plan-github-remote-reconcile.sh --apply
```

Use this from the repo root to check local WrkFlo-related repo remotes and dirty worktrees:

```bash
scripts/local/plan-wrkflo-local-repos.sh
```

Current expected result:

- `wrkflo-voice-agents-ops` is aligned to `WrkFlo-Biz`.
- `dev-workspace`, `global-sentinel`, and `openclaw-prod` still point at `Wrk-Flo` remotes and have local changes, so do not rewrite their remotes until those worktrees are reviewed.
