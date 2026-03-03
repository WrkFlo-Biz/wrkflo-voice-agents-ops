# Findings Summary

Top root-cause categories observed:
1. Prompt/instruction drift and conflict
2. Conversation-flow drift (turn settings changed externally)
3. Workflow node tool visibility drift
4. Tool response/retry behavior causing user-perceived stalls
5. Telephony account constraints (trial behavior)

Primary remediation applied:
- Agent hardening + turn profile normalization
- Search stability/truth guards
- Eden tool security migration to secret refs
- Webhook pipeline validation (start/note/finalize/email)
