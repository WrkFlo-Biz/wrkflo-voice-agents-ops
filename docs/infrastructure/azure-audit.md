# Azure Audit Summary

## Current live state

- Container App: `wrkflo-google-webhooks`
- Resource Group: `wrkflo-ai-rg`
- Latest revision: `wrkflo-google-webhooks--0000072`
- Traffic: `100%` to latest revision
- Secret refs in use: `google-oauth-client-id`, `google-oauth-client-secret`, `google-oauth-refresh-token`, `webhook-token`, `azure-storage-connection-string`, `elevenlabs-api-key`
- `HANDOFF_AGENT_ID`: `agent_9601kjenmpbwewntb483he79nfvr`
- Health endpoint observed healthy.

## Notable runtime settings
- `LIVE_DEMO_START_TIMEOUT_MS=15000`
- `LIVE_DEMO_DOC_OP_TIMEOUT_MS=12000`
- Async start enabled

## Remaining infra follow-ups
- Probe hardening and observability depth can be improved further.
