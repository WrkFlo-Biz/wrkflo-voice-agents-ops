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

That folder was not a git repository. It was used for the live Azure Container App deployment. Keep it temporarily as a rollback/reference copy until the GitHub deployment workflow is confirmed.

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

1. Confirm the GitHub Actions workflow at `.github/workflows/eden-gateway-deploy.yml`.
2. Confirm the local git remote points to the enterprise account `WrkFlo-Biz/wrkflo-voice-agents-ops`.
3. Azure OIDC for `WrkFlo-Biz/wrkflo-voice-agents-ops` is configured; keep details in `docs/runbooks/eden-gateway-github-deploy.md`.
4. Deploy from GitHub to the existing `wrkflo-ai-rg` Container App.
5. Verify the deployed image and health endpoint.
6. Archive or remove `/Users/mosestut/workspace-google-webhooks` only after GitHub deploy has succeeded.

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
