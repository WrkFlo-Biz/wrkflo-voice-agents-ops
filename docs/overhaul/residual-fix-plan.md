# Residual Fix Plan

Addresses open blockers from `docs/audit/residual-issues-matrix.md` (snapshot 2026-04-09): RI-105, RI-108, RI-110, RI-118.

## RI-105 — live-notes finalize misses `workspace_live_demo_finalize`

**Category:** Both — primarily a workflow-node prompt issue, reinforced by a tool-order policy gap.

**What to change:**
1. In Eden and Ellie active node prompts, add a close-intent decision block:
   > Before calling `end_call` or acknowledging close-intent, check: if `live_demo_started == true` AND `live_demo_finalized != true`, you MUST call `workspace_live_demo_finalize` first.
2. Track state via `dynamic_variables`: set `live_demo_started=true` when start returns, `live_demo_finalized=true` when finalize returns.
3. Place `workspace_live_demo_finalize` above `end_call` in active node's `tool_ids` order.

**Where:** node-level system prompts; patched via PATCH `/v1/convai/agents/{agent_id}`.

**Expected outcome:** `workspace_live_demo_finalize` present in 100% of simulation runs that included start.

## RI-108 — monitoring disabled for both agents

**API call (per agent):**
```
PATCH https://api.elevenlabs.io/v1/convai/agents/{agent_id}
{ "platform_settings": { "monitoring": { "enabled": true }, "call_limits": { "daily_limit": 500 } } }
```

**Alert thresholds:**
| Metric | Threshold | Window | Severity |
|---|---|---|---|
| Call failure rate | > 5% | rolling 10 calls | P2 |
| Unauthorized tool errors (401) | > 0 | 1 hour | P1 |
| Avg turn latency | > 3.0s | rolling 20 turns | P3 |
| Tool invocation failure rate | > 10% | 24h | P2 |

## RI-110 — no MCP servers attached

**Recommendation: SKIP MCP for now.**

Current `tool_ids` approach (7 canonical tools + built-ins) is stable and low-latency. MCP adds latency, failure modes, and auth complexity with no current benefit. Revisit when >3 agents need shared toolset, or tool catalog updates without redeploy.

**Action:** Add decision record at `docs/adr/0001-defer-mcp.md`.

## RI-118 — Twilio trial verified-number limit

**Fix:** Upgrade Twilio from Trial to Pay-as-you-go (Console → Billing → Upgrade).

**Cost:** < $10/month at current handoff volume. $0 upfront.

**Not needed:** A2P 10DLC registration (only for SMS, not voice handoff).

## Summary priorities

| Issue | Fix type | Complexity | First action |
|---|---|---|---|
| RI-118 | Ops (account upgrade) | 15 min | Upgrade Twilio → pay-as-you-go |
| RI-108 | API PATCH + alert config | 1–2 hr | Verify field path, PATCH both agents |
| RI-105 | Prompt + session-state edit | 2–4 hr | Patch active node prompts, retest |
| RI-110 | Documentation only | 30 min | ADR, no config change |
