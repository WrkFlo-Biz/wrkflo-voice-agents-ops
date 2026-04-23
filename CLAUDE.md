# wrkflo-voice-agents-ops

Operational docs and audit artifacts for two ElevenLabs voice agents. No runtime code — docs only.

## Agents
- Eden: website widget agent (ElevenLabs conversational AI)
- Ellie: phone agent (ElevenLabs + Twilio)

## Key directories
- docs/audit/ — residual issues matrix, validation pack, task/resource registries
- docs/testing/ — contingency test results + evidence JSON files
- docs/agents/ — per-agent audit docs and system prompts
- docs/integrations/ — ElevenLabs and Twilio integration notes
- docs/overhaul/ — prioritized action plan, residual fix plan

## Current open issues
- RI-105: live-notes finalize still missed in some scenarios
- RI-108: monitoring disabled for both agents
- RI-118: Twilio trial verified-number limit blocks handoffs

## Integration
- Webhook backend: Azure Container App wrkflo-google-webhooks (revision 0000072)
- Handoff agent: agent_9601kjenmpbwewntb483he79nfvr
- PR #1 (reconcile-voice-agent-docs) marked ready for review
