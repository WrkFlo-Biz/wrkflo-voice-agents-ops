# Azure Foundry Model Inventory

Date: 2026-05-09

Purpose: identify which Azure AI Services accounts already have model deployments before routing Eden/Wrk.Flo workloads. This is live inventory evidence, not a request to delete or consolidate resources.

## Accounts Checked

| Account | Resource group | Region | Endpoint |
|---|---|---|---|
| `WrkFlo` | `Wrk.Flo` | `eastus` | `https://wrkflo.cognitiveservices.azure.com/` |
| `wrkflobiz` | `Wrk` | `eastus` | `https://wrkflobiz.cognitiveservices.azure.com/` |
| `moses-ml3wzzrk-eastus2` | `wrk` | `eastus2` | `https://moses-ml3wzzrk-eastus2.cognitiveservices.azure.com/` |
| `isaac-resource` | `rg-isaac` | `eastus2` | `https://isaac-resource.cognitiveservices.azure.com/` |
| `moses-8586-resource` | `rg-moses-8586` | `eastus2` | `https://moses-8586-resource.cognitiveservices.azure.com/` |
| `ai-isaac9924ai918303587699` | `ainime_ua` | `eastus2` | `https://ai-isaac9924ai918303587699.cognitiveservices.azure.com/` |
| `isaac-8836-resource` | `rg-isaac` | `centralus` | `https://isaac-8836-resource.cognitiveservices.azure.com/` |
| `isaac-1294-resource` | `rg-isaac` | `polandcentral` | `https://isaac-1294-resource.cognitiveservices.azure.com/` |
| `wrkflobiz-images-poland` | `Wrk` | `polandcentral` | `https://wrkflobiz-images-poland.cognitiveservices.azure.com/` |

## Existing Deployments Before The New `wrkflobiz` Additions

These deployments were already present before the 2026-05-09 `wrkflobiz` expansion:

### `Wrk/wrkflobiz`

| Deployment | Model | Version | SKU | Capacity |
|---|---|---|---|---:|
| `gpt-4o` | `gpt-4o` | `2024-08-06` | `GlobalStandard` | 225 |
| `text-embedding-3-small` | `text-embedding-3-small` | `1` | `Standard` | 120 |
| `DeepSeek-V3.1` | `DeepSeek-V3.1` | `1` | `GlobalStandard` | 500 |

### `wrk/moses-ml3wzzrk-eastus2`

| Deployment | Model | Version | SKU | Capacity |
|---|---|---|---|---:|
| `model-router` | `model-router` | `2025-11-18` | `GlobalStandard` | 100 |

### `rg-isaac/isaac-resource`

| Deployment | Model | Version | SKU | Capacity | State |
|---|---|---|---|---:|---|
| `gpt-image-1.5` | `gpt-image-1.5` | `2025-12-16` | `GlobalStandard` | 50 | Succeeded |
| `gpt-5.2-chat` | `gpt-5.2-chat` | `2026-02-10` | `GlobalStandard` | 2500 | Succeeded |
| `gpt-4o` | `gpt-4o` | `2024-08-06` | `GlobalStandard` | 14000 | Succeeded |
| `gpt-5.2` | `gpt-5.2` | `2025-12-11` | `GlobalStandard` | 4000 | Succeeded |
| `gpt-5.2-codex` | `gpt-5.2-codex` | `2026-01-14` | `GlobalStandard` | 4995 | Succeeded |
| `sora` | `sora` | `2025-05-02` | `GlobalStandard` | 60 | Disabled |
| `gpt-5.4-pro` | `gpt-5.4-pro` | `2026-03-05` | `GlobalStandard` | 800 | Succeeded |
| `gpt-5.4` | `gpt-5.4` | `2026-03-05` | `GlobalStandard` | 5000 | Succeeded |
| `FLUX.2-pro` | `FLUX.2-pro` | `1` | `GlobalStandard` | 100 | Succeeded |
| `claude-opus-4-7` | `claude-opus-4-7` | `1` | `GlobalStandard` | 1000 | Succeeded |
| `gpt-5.4-mini-1` | `gpt-5.4-mini` | `2026-03-17` | `GlobalStandard` | 5000 | Succeeded |
| `sora-2-1` | `sora-2` | `2025-10-06` | `GlobalStandard` | 50 | Succeeded |
| `gpt-image-2` | `gpt-image-2` | `2026-04-21` | `GlobalStandard` | 12 | Succeeded |

### `rg-moses-8586/moses-8586-resource`

| Deployment | Model | Version | SKU | Capacity | State |
|---|---|---|---|---:|---|
| `claude-opus-4-6` | `claude-opus-4-6` | `1` | `GlobalStandard` | 2000 | Succeeded |
| `gpt-5-mini` | `gpt-5-mini` | `2025-08-07` | `GlobalStandard` | 8000 | Succeeded |
| `gpt-5.2` | `gpt-5.2` | `2025-12-11` | `GlobalStandard` | 5000 | Succeeded |
| `gpt-5.2-codex` | `gpt-5.2-codex` | `2026-01-14` | `GlobalStandard` | 5000 | Succeeded |
| `gpt-realtime` | `gpt-realtime` | `2025-08-28` | `GlobalStandard` | 10 | Succeeded |
| `gpt-realtime-mini` | `gpt-realtime-mini` | `2025-12-15` | `GlobalStandard` | 10 | Succeeded |
| `gpt-4o` | `gpt-4o` | `2024-11-20` | `Standard` | 1000 | Succeeded |
| `text-embedding-3-small` | `text-embedding-3-small` | `1` | `Standard` | 1000 | Succeeded |
| `claude-haiku-4-5` | `claude-haiku-4-5` | `20251001` | `GlobalStandard` | 4000 | Succeeded |
| `claude-sonnet-4-6` | `claude-sonnet-4-6` | `1` | `GlobalStandard` | 4000 | Succeeded |
| `gpt-5.1-codex-mini` | `gpt-5.1-codex-mini` | `2025-11-13` | `GlobalStandard` | 8000 | Succeeded |
| `gpt-5.4` | `gpt-5.4` | `2026-03-05` | `GlobalStandard` | 5000 | Succeeded |
| `gpt-5.5` | `gpt-5.5` | `2026-04-24` | `GlobalStandard` | 10000 | Succeeded |
| `claude-opus-4-7` | `claude-opus-4-7` | `1` | `GlobalStandard` | 1000 | Succeeded |
| `claude-opus-4-1` | `claude-opus-4-1` | `20250805` | `GlobalStandard` | 1 | Succeeded |
| `claude-opus-4-5` | `claude-opus-4-5` | `20251101` | `GlobalStandard` | 1 | Succeeded |
| `claude-sonnet-4-5` | `claude-sonnet-4-5` | `20250929` | `GlobalStandard` | 4000 | Succeeded |
| `deepseek-v3.2-speciale` | `DeepSeek-V3.2-Speciale` | `1` | `GlobalStandard` | 50 | Succeeded |
| `deepseek-r1-0528` | `DeepSeek-R1-0528` | `1` | `GlobalStandard` | 50 | Succeeded |
| `kimi-k2.6` | `Kimi-K2.6` | `2026-04-20` | `GlobalStandard` | 50 | Succeeded |
| `sora-2` | `sora-2` | `2025-10-06` | `GlobalStandard` | 40 | Succeeded |

## New `Wrk/wrkflobiz` Deployments Added On 2026-05-09

These were added to make the enterprise `wrkflobiz` account directly usable for Eden/Wrk.Flo routing:

| Deployment | Model | Version | SKU | Capacity |
|---|---|---|---|---:|
| `gpt-5.4-mini` | `gpt-5.4-mini` | `2026-03-17` | `GlobalStandard` | 100 |
| `wrkflo-premium-gpt-5.4` | `gpt-5.4` | `2026-03-05` | `GlobalStandard` | 50 |
| `gpt-5.4-nano` | `gpt-5.4-nano` | `2026-03-17` | `GlobalStandard` | 100 |
| `gpt-5.3-codex` | `gpt-5.3-codex` | `2026-02-24` | `GlobalStandard` | 50 |
| `o4-mini` | `o4-mini` | `2025-04-16` | `GlobalStandard` | 50 |
| `o3` | `o3` | `2025-04-16` | `GlobalStandard` | 25 |
| `text-embedding-3-large` | `text-embedding-3-large` | `1` | `GlobalStandard` | 120 |

## New `Wrk/wrkflobiz-images-poland` Image Deployment Added On 2026-05-09

This account was added because `Wrk/wrkflobiz` in East US did not expose `gpt-image-2` as a normal deployment target.

| Deployment | Model | Version | SKU | Capacity | State |
|---|---|---|---|---:|---|
| `gpt-image-2` | `gpt-image-2` | `2026-04-21` | `GlobalStandard` | 12 | Succeeded |

Poland Central quota check:

| Quota | Current | Limit | Unit |
|---|---:|---:|---|
| `OpenAI.GlobalStandard.gpt-image-2` | 12 | 12 | Requests per minute |

## Placement Notes

- `Wrk/wrkflobiz` should be the enterprise Wrk.Flo/Eden default account.
- `Wrk/wrkflobiz-images-poland` is the enterprise Wrk.Flo/Eden image-generation account for `gpt-image-2`.
- `rg-moses-8586/moses-8586-resource` already has `gpt-5.5`, realtime models, and `sora-2`. Treat it as lab/advanced-model capacity unless intentionally promoted into enterprise routing.
- `rg-isaac/isaac-resource` already has `gpt-image-2`, `sora-2`, `gpt-5.4`, `gpt-5.4-pro`, and image/video models. Treat it as Isaac/AINIME-owned unless intentionally shared.
- Do not create duplicate Sora or realtime deployments in `Wrk/wrkflobiz` until project ownership and quota/cost boundaries are explicit.
- Request more Poland Central `gpt-image-2` quota before production creative workloads; the current image deployment consumes the full 12 RPM quota.

## Commands Used

```bash
az cognitiveservices account list
az cognitiveservices account deployment list --resource-group <rg> --name <account>
az cognitiveservices account list-models --resource-group Wrk --name wrkflobiz
az cognitiveservices usage list --location eastus
az cognitiveservices account show --resource-group Wrk --name wrkflobiz-images-poland
az cognitiveservices account deployment show --resource-group Wrk --name wrkflobiz-images-poland --deployment-name gpt-image-2
az cognitiveservices usage list --location polandcentral
```
