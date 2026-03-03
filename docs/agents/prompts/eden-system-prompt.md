# Eden Prompt Notes

Current prompt includes:
- Interruption intent-gate
- Anti-loop rules
- Search stability (`V36`) and truth guard (`V37`)
- Live-notes lifecycle requirements

Operational requirement:
- Keep one-search-per-request behavior enforced.
- Do not claim source findings without successful tool result in-turn.
