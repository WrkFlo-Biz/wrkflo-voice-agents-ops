# wrkflo-voice-agents-ops

Operational docs, audit artifacts, and Eden gateway source for Wrk.Flo ElevenLabs voice agents.

## Agents
- Eden: website widget agent (ElevenLabs conversational AI)
- Eden v2: second website widget agent
- Ellie: phone agent (ElevenLabs + Twilio)

## Key directories
- services/eden-gateway/ - Azure Container App webhook/gateway source
- .github/workflows/ - Eden gateway CI and Azure deploy workflows
- docs/audit/ — residual issues matrix, validation pack, task/resource registries
- docs/testing/ — contingency test results + evidence JSON files
- docs/agents/ — per-agent audit docs and system prompts
- docs/integrations/ — ElevenLabs and Twilio integration notes
- docs/overhaul/ — prioritized action plan, residual fix plan
- docs/runbooks/ - deploy and operations runbooks

## Current open issues
- RI-105: live-notes finalize still missed in some scenarios
- RI-108: monitoring disabled for both agents
- RI-118: Twilio trial verified-number limit blocks handoffs
- Real web search still needs a dedicated `WRKFLO_SEARCH_ENDPOINT`; Azure OpenAI orchestration is configured.

## Integration
- Canonical repo: WrkFlo-Biz/wrkflo-voice-agents-ops
- Webhook backend: Azure Container App wrkflo-google-webhooks (revision 0000074)
- Live image: cafe61646254acr.azurecr.io/wrkflo-google-webhooks:gateway-20260509194019
- Runtime Azure boundary: wrkflo-ai-rg contains the Container App, managed env, ACR, storage state account, and Log Analytics workspace.
- Handoff agent: agent_9601kjenmpbwewntb483he79nfvr
- GitHub OIDC deploy setup is configured for production and staging; first workflow deploy is still pending.
