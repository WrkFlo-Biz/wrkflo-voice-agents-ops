# Comprehensive Overhaul & Validation Pack (Post-Fix Deep Dive)

Updated: 2026-03-03

## 1) Executive Summary

### What was verified as fixed
- Webhook auth enforcement is working (`401` on unauthenticated protected endpoints).
- Live notes webhook smoke path is functioning (`start -> note -> finalize`) with successful doc creation and finalize path in API validation.
- Eden workflow node token ceilings were raised (`max_tokens=140`) and noise/repetition guard block added.
- Eden workflow node model drift was corrected from `glm-45-air-fp8` to `gpt-5.2`.
- Post-incident auth mismatch (`conv_5601...`) was remediated by rebinding webhook tool auth to active Azure secret.
- Legacy duplicate tool objects were removed; canonical custom tool set is now 7.
- Later evidence confirms booking, search, and end-call regression cases are passing in simulation again. See [tool-matrix-v3-2026-03-03.json](/tmp/wrkflo-voice-agents-ops/docs/testing/evidence/tool-matrix-v3-2026-03-03.json) and [postfix-tool-validation-2026-03-03.json](/tmp/wrkflo-voice-agents-ops/docs/testing/evidence/postfix-tool-validation-2026-03-03.json).

### What remains broken or incomplete
- Live-notes finalize can still be missed in some Eden/Ellie notes scenarios.
- Monitoring is still disabled for both agents.
- MCP servers are not attached to either agent (if expected by design).
- Twilio trial verified-number limits still block some handoff attempts.

Channel policy note:
- Ellie (phone/Twilio) should retain `transfer_to_number`.
- Eden (widget) should prioritize `request_live_human_handoff` callback flow.

### Highest-risk current gaps
1. Live-notes finalize mismatch under active prompts/workflow nodes.
2. Missing observability (monitoring disabled) reducing incident response speed.
3. Twilio trial verified-number limit blocking some handoff attempts.
4. MCP attachment gap if MCP support is required by design.

## 2) Codex Subagents Plan + Execution Summary

Assigned subagents for the final three tasks:

1. `Subagent L` — Residual gap/error synthesis and final verification pack.
2. `Subagent K` — Contingency scenario execution (simulation + webhook + auth).
3. `Subagent J` — Documentation updates + registries + audit artifact updates.

Execution artifacts:
- Task registry: [task-ownership-registry.md](/tmp/wrkflo-voice-agents-ops/docs/audit/task-ownership-registry.md)
- Lock registry: [resource-lock-registry.md](/tmp/wrkflo-voice-agents-ops/docs/audit/resource-lock-registry.md)
- Residual matrix: [residual-issues-matrix.md](/tmp/wrkflo-voice-agents-ops/docs/audit/residual-issues-matrix.md)
- Contingency results: [contingency-test-results.md](/tmp/wrkflo-voice-agents-ops/docs/testing/contingency-test-results.md)

## 3) Systems Inventory (Current Reachability)

- ElevenLabs: reachable via API + browser workspace
- Azure webhook backend: reachable and healthy (`wrkflo-google-webhooks--0000072`)
- Twilio: partially verifiable via integrated call behavior snapshots
- GitHub docs repo: reachable and writable
- Supabase: not observed in active runtime path in this sweep
- Resend: not observed in active runtime path in this sweep
- Figma embed implementation: direct code-path access not fully validated in this pass

## 4) Post-Fix Gap Review (What was missing/errors in prior fixes)

### Observed facts
- Prior fixes were applied; later evidence shows booking/search/end-call are now passing, while notes-finalize, monitoring, and MCP/Twilio gaps remain.
- Node-level overrides were the dominant source of behavior drift versus top-level settings.
- Some legacy config structures (`prompt.tools` + `tool_ids`) remain dual-populated.

### Inferences
- Tool misfires are likely due active node prompt/routing constraints rather than webhook unavailability.
- End-call inconsistencies are likely close-intent interpretation conflicts plus turn-limit effects.

## 5) Last 3 Tasks Completed

### Task 1: Build Residual Issues Matrix
- Completed with evidence-backed status categories and root-cause taxonomy.
- Output: [residual-issues-matrix.md](/tmp/wrkflo-voice-agents-ops/docs/audit/residual-issues-matrix.md)

### Task 2: Run Contingency + Scenario Sweep
- Completed API/webhook/simulation batch with pass/fail matrix.
- Output: [contingency-test-results.md](/tmp/wrkflo-voice-agents-ops/docs/testing/contingency-test-results.md)

### Task 3: Deliver Consolidated Verification Pack
- Completed with prioritized actions, risks, and 24h follow-up plan.
- Output: this document

## 6) Priority Action Plan (Next 24 Hours)

1. Reconcile the March 3 contingency report with the later evidence pack so the repo reflects current state.
2. Fix live-notes finalize reliability in Eden/Ellie nodes.
3. Enable monitoring for both agents and define fail-rate alert thresholds.
4. Decide whether MCP servers are required; if yes, attach them and update the docs.
5. Resolve the Twilio trial verified-number handoff constraint.
6. Validate with 3 live widget + 3 live phone calls under noise scenarios.

## 7) Rollback + Monitoring

### Rollback order (if regressions increase)
1. Revert Eden/Ellie to last known stable version IDs before latest node edits.
2. Keep webhook backend unchanged unless endpoint failures appear.
3. Re-run auth + start/note/finalize smoke tests after rollback.

### Monitoring signals
- Failed-call ratio by version ID
- Tool invocation success rates (`notes_finalize/search/end_call/handoff`)
- Repetition-loop indicators in transcript tail
- Webhook latency for start/note/finalize

## 8) Confidence and Access Gaps

- Confidence in webhook health and auth findings: high (0.97+)
- Confidence in simulation-based routing findings: high (0.84–0.90)
- Access gap: no direct, complete Supabase/Resend/Figma source-path verification in this pass
