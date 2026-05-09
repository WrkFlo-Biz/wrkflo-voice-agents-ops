# Codex Terminal Coordination

Date: 2026-05-09

Purpose: keep concurrent Eden voice-agent cleanup work from overwriting shared files.

## Current Repository State

Branch:

```text
codex/reconcile-voice-agent-docs
```

Primary repo:

```text
/Users/mosestut/wrkflo-voice-agents-ops
```

Legacy Eden gateway working copy:

```text
/Users/mosestut/workspace-google-webhooks
```

Repo-owned Eden gateway source:

```text
/Users/mosestut/wrkflo-voice-agents-ops/services/eden-gateway
```

## Terminal Ownership

This terminal owns:

- Repo path cleanup and GitHub ownership documentation.
- `services/eden-gateway/` source import and local syntax checks.
- `.github/workflows/eden-gateway-ci.yml`.
- `.github/workflows/eden-gateway-deploy.yml` review, not live execution.
- `scripts/azure/plan-project-tags.sh`.
- `scripts/local/plan-eden-path-cleanup.sh`.
- `scripts/local/plan-github-remote-reconcile.sh`.
- Infrastructure docs under `docs/infrastructure/*2026-05-09.md`.
- GitHub deploy setup docs in `docs/runbooks/eden-gateway-github-deploy.md`.

The other Eden voice-agent terminal should own:

- ElevenLabs agent configuration checks.
- Live Eden/Eden v2 search behavior tests.
- Ellie no-search fallback tests.
- Azure Container App runtime env discovery for search provider setup.
- New test evidence files under `docs/testing/evidence/`.

## Do Not Touch Without Coordination

Avoid concurrent edits to these files:

- `docs/integrations/elevenlabs.md`
- `docs/infrastructure/azure-audit.md`
- `services/eden-gateway/src/server.js`
- `.github/workflows/eden-gateway-deploy.yml`

If one terminal must update these, run `git diff -- <path>` first and append only the minimal section needed.

## Safe Parallel Work Split

Terminal A, repo cleanup:

1. Keep Eden gateway source under `services/eden-gateway`.
2. Keep old `/Users/mosestut/workspace-google-webhooks` as rollback until GitHub deployment succeeds.
3. Maintain dry-run scripts for Azure tags and local path cleanup.
4. Do not mutate Azure resources from cleanup scripts unless explicitly switching to an apply mode.

Terminal B, live agent testing:

1. Test current Eden/Eden v2 behavior through ElevenLabs.
2. Capture whether `wrkflo_search` returns fallback or real results.
3. Confirm Ellie still has no search tool dependency.
4. Write fresh evidence into a new file, for example:

```text
docs/testing/evidence/eden-live-search-2026-05-09.md
```

## Pre-Edit Checklist

Before changing shared files:

```bash
cd /Users/mosestut/wrkflo-voice-agents-ops
git status --short --branch
git diff -- <path-you-plan-to-edit>
```

Before changing the live Azure Container App:

```bash
az containerapp show \
  --resource-group wrkflo-ai-rg \
  --name wrkflo-google-webhooks \
  --query "{image:properties.template.containers[0].image,latestRevision:properties.latestRevisionName,active:properties.runningStatus}" \
  -o json
```

## Current Cleanup Rule

Do not delete `/Users/mosestut/workspace-google-webhooks` yet. Archive or remove it only after:

1. GitHub OIDC is configured.
2. `.github/workflows/eden-gateway-deploy.yml` has deployed a new image.
3. `/health` passes on the deployed revision.
4. Eden and Eden v2 still call their tools successfully.

Use `docs/runbooks/eden-gateway-github-deploy.md` for the exact environment secret, federated credential, role assignment, and rollback shape. `WrkFlo-Biz/wrkflo-voice-agents-ops` is the enterprise repo, and GitHub OIDC subjects use that owner/repo.

As of 2026-05-09, the GitHub environments, Azure OIDC federated credentials, and least-privilege deploy role assignments are configured. The remaining unproven step is the first GitHub Actions deployment from `.github/workflows/eden-gateway-deploy.yml`.
