# Residual Issues Matrix

Updated: 2026-03-03

## Current Snapshot (2026-04-09)

Confirmed current blockers:
- RI-105: live-notes finalize can still miss `workspace_live_demo_finalize` in Eden/Ellie simulation runs.
- RI-108: monitoring remains disabled for both agents.
- RI-110: no MCP servers are attached, if MCP support is required by design.
- RI-118: Twilio trial verified-number limits still block some handoff attempts.

Fixed or superseded by later evidence:
- RI-103 booking trigger, RI-104 Ellie search, RI-106 end-call, RI-111/112/115/116/117.

| Issue ID | Symptom | Status | Evidence | Root Cause Category | Severity | Confidence | Next Action | Owner |
|---|---|---|---|---|---|---|---|---|
| RI-101 | Eden still occasionally emits style tags/odd spacing in simulation outputs | Improved but still present | Regression simulations and tool matrix evidence (`docs/testing/evidence/tool-matrix-2026-03-03.json`) show style-tag artifacts | Prompt / instruction conflict | High | 0.86 | Remove style-tag patterns from override prompts; retest with simulation + live call | Subagent A |
| RI-102 | Eden was using workflow-node model drift (`glm-45-air-fp8`) despite top-level `gpt-5.2` | Fixed and verified | Patched to `gpt-5.2`; versions `agtvrsn_1501...` and `agtvrsn_3901...` | Conversation flow / config drift | Critical | 0.98 | Keep drift monitor on node-level `llm` field | Subagent B |
| RI-103 | Booking flow does not consistently trigger `check_availability`/`book_meeting` in simulation | Fixed and verified | Later tool-matrix evidence shows `check_availability` + `book_meeting` passing; postfix validation also confirms the booking path | Tool binding / routing logic | High | 0.98 | Keep a regression check in the nightly simulation suite | Subagent D |
| RI-104 | Ellie search scenario did not invoke `exa_search` in simulation | Fixed and verified | Later tool-matrix evidence shows `exa_search` passing; postfix validation also confirms the search path | Prompt / routing conflict | High | 0.98 | Keep a regression check in the nightly simulation suite | Subagent A |
| RI-105 | Eden/Ellie live-notes flow sometimes misses finalize call | Still broken | `docs/testing/evidence/tool-matrix-v3-2026-03-03.json` and the contingency sweep show missing `workspace_live_demo_finalize` in notes-finalize scenarios | Tool-order policy / turn budget | High | 0.90 | Add explicit finalize-before-close rule in active node prompts; retest | Subagent D |
| RI-106 | End-call tool not reliably triggered in simulations (both agents in some scenarios) | Fixed and verified | Later tool-matrix evidence shows `end_call` passing for Eden and Ellie; postfix validation keeps the close-intent path green | User behavior / ambiguous speech + turn policy | Medium | 0.98 | Keep periodic regression coverage for close-intent phrases | Subagent B |
| RI-107 | Legacy `prompt.tools` list and `tool_ids` both populated | Open (risk) | Agent snapshot shows `legacy_tools_count=13` while `tool_ids` active | Prompt/config drift risk | Medium | 0.77 | Migrate to single source of truth (`tool_ids` + built-in system tools), backup first | Subagent D |
| RI-108 | Monitoring remains disabled for both agents | Still broken | `monitoring=false` in live snapshots | Observability gap | High | 0.96 | Enable monitoring for both agents and define alert thresholds | Subagent E |
| RI-109 | Twilio transfer reliability is still constrained by account/state variability, mainly the verified-number limit | Open | Prior telephony snapshots indicate transfer-path variability; latest explicit blocker is RI-118 | Telephony / upstream dependency | High | 0.74 | Treat RI-118 as the active blocker; keep transfer-path synthetic checks | Subagent D |
| RI-110 | MCP tools expected by operator, but no MCP servers attached to either agent | Open (intent check required) | `mcp_server_ids=[]`, `native_mcp_server_ids=[]` for both agents | Configuration / scope mismatch | Medium | 0.95 | Confirm intended MCP list and attach only if required | Subagent F |
| RI-111 | Webhook auth enforcement previously suspected weak; now verified | Fixed and verified | Unauthorized `/start` returns `401`; authorized path succeeds | Auth / permissions | High | 0.99 | Keep periodic auth smoke test in runbook | Subagent E |
| RI-112 | Handoff webhook requires callback number and currently fails safely without one | Fixed and verified (safe failure) | `/widget-human-handoff` returns `needsCallbackNumber=true` | Tool input validation | Medium | 0.97 | Keep validation; improve user-facing retry phrasing | Subagent D |
| RI-113 | Recent historical failed-call cluster still exists in conversation history | Improved but still present | Conversation list shows mix of `done` + historical `failed` calls | Multi-factor historical regression | High | 0.88 | Track failure rate by version ID post-patch for 24h | Subagent L |
| RI-114 | Supabase and Resend were requested scope, but stack currently uses Azure Table + Gmail flow | Unknown (missing access / likely N/A) | Current backend endpoints and configs reference Azure/Google path; no active Supabase/Resend artifacts found in this sweep | Unknown (needs more evidence) | Low | 0.72 | Confirm architecture intent; document if Supabase/Resend are inactive by design | Subagent F/G |
| RI-115 | `conv_5601...` failed live notes and handoff with `401 unauthorized` on all webhook tools | Fixed and verified | Conversation forensic export + post-fix evidence (`docs/testing/evidence/postfix-tool-validation-2026-03-03.json`) | Auth / permissions | Critical | 0.99 | Keep periodic token-alignment check between ElevenLabs tools and Azure secret | Subagent D/E |
| RI-116 | Legacy duplicate tool objects existed in workspace and could cause node-level reference confusion | Fixed and verified | Duplicate IDs removed; custom tools reduced to canonical 7 (`docs/testing/evidence/postfix-tool-validation-2026-03-03.json`) | Tool binding / config drift | High | 0.98 | Keep canonical tool-ID audit in runbook | Subagent D |
| RI-117 | Widget path previously attempted `transfer_to_number` (phone-only behavior) | Fixed and verified | Eden prompt/workflow patched with `WIDGET_HANDOFF_PATH_V48`; handoff path now callback tool-first | Conversation flow / channel mismatch | High | 0.95 | Keep channel-specific handoff policy blocks in top-level + node prompts | Subagent A/B |
| RI-118 | Live human handoff still blocked for some callback numbers | Still broken (environment constraint) | `conv_0601kjtfgff7fw3as4ny9wwbpy9w` shows `handoff_trial_unverified_number`; Azure logs show Twilio rejects `+15074033105` as unverified on trial account | Telephony / upstream account limits | High | 0.99 | Verify destination numbers in Twilio trial or upgrade Twilio account to remove verified-number restriction | Subagent D |
