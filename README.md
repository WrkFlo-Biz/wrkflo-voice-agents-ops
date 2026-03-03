# Wrk.Flo Voice Agents Ops

Operational documentation and audit artifacts for Wrk.Flo voice agents:
- Eden (widget): `agent_0601kja359hpeae8qfz7q40j7fhg`
- Ellie (phone): `agent_9601kjenmpbwewntb483he79nfvr`

## Scope
- ElevenLabs agent configuration
- Tool/integration reliability (Cal.com, Exa, live-notes webhooks)
- Telephony/Twilio behavior
- Azure webhook backend reliability
- Overhaul and validation evidence

## Current status
- Active hardening and drift-monitoring in progress.
- Latest comprehensive report: `docs/audit/comprehensive-overhaul-validation-pack.md`

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
