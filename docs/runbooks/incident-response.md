# Incident Response

1. Capture `conv_...` and timestamp.
2. Pull conversation trace with tool calls.
3. Classify failure by taxonomy (prompt/flow/tool/infra/telephony).
4. Apply targeted patch with rollback snapshot.
5. Re-test on fresh call only (never reuse in-progress call for validation).
