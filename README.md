# Wrk.Flo Voice Agents Ops

Operational documentation and audit artifacts for Wrk.Flo voice agents:
- Eden (widget): `agent_0601kja359hpeae8qfz7q40j7fhg`
- Eden v2 (widget): `agent_7301km4n7mm9egssp5aayg19ywk8`
- Ellie (phone): `agent_9601kjenmpbwewntb483he79nfvr`
- Eden gateway service: `services/eden-gateway`

## Scope
- ElevenLabs agent configuration
- Tool/integration reliability (Cal.com, Exa, live-notes webhooks)
- Telephony/Twilio behavior
- Azure webhook backend reliability
- Overhaul and validation evidence

## Current status
- Active hardening and drift-monitoring in progress.
- Canonical enterprise repo: `WrkFlo-Biz/wrkflo-voice-agents-ops`.
- Live Eden gateway revision: `wrkflo-google-webhooks--0000074`.
- GitHub OIDC deploy setup is configured; first workflow deployment is still pending.
- Latest comprehensive report: `docs/audit/comprehensive-overhaul-validation-pack.md`
- Latest Azure/GitHub separation audit: `docs/infrastructure/azure-github-separation-audit-2026-05-09.md`
- Latest live-state evidence: `docs/testing/evidence/live-state-2026-05-09.md`
- Current terminal coordination log: `docs/infrastructure/codex-terminal-coordination-2026-05-09.md`
- Eden gateway deploy runbook: `docs/runbooks/eden-gateway-github-deploy.md`

## Structure
- `docs/architecture/` system and data flow
- `docs/agents/` per-agent audits and prompt snapshots
- `docs/integrations/` service integration notes
- `docs/infrastructure/` Azure and runtime findings
- `docs/audit/` findings, residual risk, full validation report
- `docs/overhaul/` prioritized implementation plan
- `docs/testing/` scenario matrix and results
- `docs/runbooks/` incident and rollback operations
- `docs/security/` secrets/access templates
- `services/eden-gateway/` Azure Container App webhook/gateway source
- `scripts/azure/` and `scripts/local/` dry-run cleanup helpers
