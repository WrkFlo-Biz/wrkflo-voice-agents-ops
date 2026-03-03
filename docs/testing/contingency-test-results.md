# Contingency Test Results

Updated: 2026-03-03

## Summary

- Executed scenarios: 13
- Pass: 7
- Partial: 3
- Fail: 3

## Detailed Results

| Scenario ID | Objective | Setup | Steps | Expected | Actual | Pass/Fail | Evidence | Root Cause Category | Mitigation / Next Step | Retest |
|---|---|---|---|---|---|---|---|---|---|---|
| CT-001 | Verify webhook health | Prod endpoint | GET `/health` | `ok=true` and session store healthy | Returned `ok=true`, `sessionStoreOk=true` | PASS | CLI output 2026-03-03 | Backend runtime / infra | Keep as periodic health check | N/A |
| CT-002 | Verify webhook auth rejection | No auth header | POST `/workspace-live-demo/start` | 401 unauthorized | 401 unauthorized | PASS | `docs/testing/evidence/webhook-smoke-2026-03-03.json` | Auth / permissions | Keep auth smoke test in CI/runbook | N/A |
| CT-003 | Verify authenticated start path | Valid webhook token | POST `/workspace-live-demo/start` | 200 and `started=true` | 200, `started=true`, pending true | PASS | `docs/testing/evidence/webhook-smoke-2026-03-03.json` | Tool timeout / upstream dependency | None | N/A |
| CT-004 | Verify note append path | Existing conversation ID | POST `/workspace-live-demo/note` | 200 and `docId` present | 200 with valid `docId` | PASS | `docs/testing/evidence/webhook-smoke-2026-03-03.json` | Tool timeout / upstream dependency | None | N/A |
| CT-005 | Verify finalize path | Existing conversation ID | POST `/workspace-live-demo/finalize` | 200 and finalized | 200; finalized; internal email true | PASS | `docs/testing/evidence/webhook-smoke-2026-03-03.json` | Tool workflow | None | N/A |
| CT-006 | Verify handoff validation safety | Missing callback number | POST `/widget-human-handoff` | Safe failure with actionable prompt | 200 `ok=false`, `needsCallbackNumber=true` | PASS | `docs/testing/evidence/webhook-smoke-2026-03-03.json` | Tool input validation | Improve prompt wording for retry | N/A |
| CT-007 | Eden search tool trigger | Eden simulation | simulate-conversation search prompt | `exa_search` invoked once | `exa_search` invoked (+notes tools) | PASS | `docs/testing/evidence/tool-matrix-2026-03-03.json` | Prompt/config | Add cap to avoid side tool noise | Planned |
| CT-008 | Eden booking tools trigger | Eden simulation | booking scenario | `check_availability` + `book_meeting` | Neither tool invoked | FAIL | `docs/testing/evidence/tool-matrix-2026-03-03.json` | Prompt/routing conflict | Tighten booking trigger + route conditions | Pending |
| CT-009 | Eden live notes full flow | Eden simulation | notes/transcript scenario | start + note + finalize | All 3 invoked | PASS | `docs/testing/evidence/tool-matrix-2026-03-03.json` | Tool order guard | None | N/A |
| CT-010 | Ellie search tool trigger | Ellie simulation | search scenario | `exa_search` invoked | `exa_search` missing | FAIL | `docs/testing/evidence/tool-matrix-2026-03-03.json` | Prompt/routing conflict | Port/align search guards in active Ellie nodes | Pending |
| CT-011 | Ellie live notes full flow | Ellie simulation | notes/transcript scenario | start + note + finalize | start + note only; finalize missing | PARTIAL | `docs/testing/evidence/tool-matrix-2026-03-03.json` | Tool-order / turn budget | Add explicit finalize-before-close instruction | Pending |
| CT-012 | End-call trigger reliability | Eden + Ellie simulation | explicit close prompts | `end_call` invoked | inconsistent; missing in tool matrix cases | PARTIAL | `docs/testing/evidence/tool-matrix-2026-03-03.json` plus prior regression simulation logs | Ambiguous speech / close policy | enforce close-intent decision block | Pending |
| CT-013 | MCP attachment validation | Agent config snapshot | Inspect `mcp_server_ids` | expected MCPs attached (if required) | none attached on either agent | FAIL (expectation mismatch) | docs/testing/evidence/agent-mcp-monitoring-2026-03-03.json | Config scope mismatch | Confirm intended MCP list and attach | Pending |

## Additional Observations

- Ellie simulation still shows heavy use of filler phrase in some scenarios, even when duplicate exact lines are low.
- Eden and Ellie remain vulnerable to config drift because node-level overrides can diverge from top-level settings.

## Immediate 24h Follow-Up Tests

1. Re-run CT-008 after booking-trigger patch (5 simulation runs).
2. Re-run CT-010/CT-011 after Ellie search/finalize patch (5 simulation runs).
3. Run 3 live widget calls and 3 live phone calls with real noise interruption scripts and capture `conv_...` IDs.
4. Track failed-call ratio by version ID for 24 hours and compare against pre-patch baseline.

## Postfix Incident Validation (conv_5601)

- Incident: `conv_5601kjt8a4hvejv9c832qz40jaxa`
- Root cause verified: ElevenLabs webhook tools were sending stale/invalid auth token (`401 unauthorized` on start/note/finalize/handoff).
- Fix applied: re-bound all webhook tools to active Azure `webhook-token` and patched Eden widget handoff policy (`WIDGET_HANDOFF_PATH_V48`).
- Tool dedupe applied: removed 4 legacy duplicate tool IDs; both agents now use canonical 7 custom tools.

Evidence:
- [postfix-tool-validation-2026-03-03.json](/tmp/wrkflo-voice-agents-ops/docs/testing/evidence/postfix-tool-validation-2026-03-03.json)

Post-fix results:
- Webhook smoke: `start`, `note`, `finalize`, `widget-human-handoff` all `ok=true`.
- Simulation: no unauthorized tool errors in Eden/Ellie regression scenarios.
- Booking strong-intent simulation: `check_availability` + `book_meeting` both invoked without tool errors.
