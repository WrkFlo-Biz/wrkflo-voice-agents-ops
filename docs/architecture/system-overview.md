# System Overview

## Primary components
- ElevenLabs agents: Eden (widget) and Ellie (phone)
- Shared tools: scheduling, Exa search, live-notes start/note/finalize, human handoff
- Webhook backend: Azure Container App (`wrkflo-google-webhooks`)
- Persistence: Azure Table Storage + Google Docs/Gmail workflows

## Key risk patterns observed
- Runtime config drift (agent settings changed outside controlled rollout)
- Search/tool retry loops during unstable tool-response scenarios
- Legacy security gaps in tool header handling (now remediated)
