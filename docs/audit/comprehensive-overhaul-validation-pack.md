# Comprehensive Overhaul & Validation Pack (Post-Fix Deep Dive)

Updated: 2026-03-03

## 1) Executive Summary

### What was verified as fixed
- Webhook auth enforcement is working (`401` on unauthenticated protected endpoints).
- Live notes webhook flow is functioning (`start -> note -> finalize`) with successful doc creation and finalize path.
- Eden workflow node token ceilings were raised (`max_tokens=140`) and noise/repetition guard block added.
- Eden workflow node model drift was corrected from `glm-45-air-fp8` to `gpt-5.2`.

### What remains broken or incomplete
- Booking flow tool invocation is still not reliably triggered in simulation for Eden.
- Ellie search (`exa_search`) trigger is still inconsistent/missing in simulation.
- Ellie finalize tool call is intermittent in notes flow.
- End-call tool triggering remains inconsistent across simulated close intents.
- Monitoring is still disabled for both agents.
- MCP servers are not attached to either agent (if expected by design).

### Highest-risk current gaps
1. Tool-routing mismatches (booking/search/finalize) under active prompts/workflow nodes.
2. Configuration drift risk between top-level and workflow-node overrides.
3. Missing observability (monitoring disabled) reducing incident response speed.

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
- Azure webhook backend: reachable and healthy
- Twilio: partially verifiable via integrated call behavior snapshots
- GitHub docs repo: reachable and writable
- Supabase: not observed in active runtime path in this sweep
- Resend: not observed in active runtime path in this sweep
- Figma embed implementation: direct code-path access not fully validated in this pass

## 4) Post-Fix Gap Review (What was missing/errors in prior fixes)

### Observed facts
- Prior fixes were applied but left routing inconsistencies for booking/search/end-call in simulation.
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

1. Fix booking trigger reliability in Eden nodes (`check_availability`, `book_meeting`).
2. Align Ellie search/finalize/end-call trigger rules in active node prompts.
3. Enable monitoring for both agents and define fail-rate alert thresholds.
4. Add drift checker for node-level model/turn/tool settings.
5. Validate with 3 live widget + 3 live phone calls under noise scenarios.

## 7) Rollback + Monitoring

### Rollback order (if regressions increase)
1. Revert Eden/Ellie to last known stable version IDs before latest node edits.
2. Keep webhook backend unchanged unless endpoint failures appear.
3. Re-run auth + start/note/finalize smoke tests after rollback.

### Monitoring signals
- Failed-call ratio by version ID
- Tool invocation success rates (`booking/search/finalize/end_call`)
- Repetition-loop indicators in transcript tail
- Webhook latency for start/note/finalize

## 8) Confidence and Access Gaps

- Confidence in webhook health and auth findings: high (0.97+)
- Confidence in simulation-based routing findings: high (0.84–0.90)
- Access gap: no direct, complete Supabase/Resend/Figma source-path verification in this pass

