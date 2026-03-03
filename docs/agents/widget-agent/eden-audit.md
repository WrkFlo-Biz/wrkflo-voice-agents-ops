# Eden Audit

- Agent ID: `agent_0601kja359hpeae8qfz7q40j7fhg`
- Channel: website widget

## Findings summary
- Historical failure pattern included repeat loops and interruption instability.
- Workflow node tool visibility drift was observed and remediated.
- Search behavior required explicit one-call guardrails and truth-gating.

## Current checks (post-hardening)
- Node tool counts: 7/7 across override nodes.
- Search stability guard blocks present (`V36`, `V37`).
- Soft timeout static and non-LLM generated.
