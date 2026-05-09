# ElevenLabs Integration

Updated: 2026-05-09

Live read-only API check: 2026-05-09 20:52 UTC.

## Agents
- Eden: `agent_0601kja359hpeae8qfz7q40j7fhg`
- Ellie: `agent_9601kjenmpbwewntb483he79nfvr`
- Eden v2: `agent_7301km4n7mm9egssp5aayg19ywk8`

## Core tools
- `book_meeting`
- `check_availability`
- `workspace_live_demo_start`
- `workspace_live_demo_note`
- `workspace_live_demo_finalize`
- `request_live_human_handoff`

## Search tool state
- `exa_search` was removed from live active agents.
- `wrkflo_search` was created as the WrkFlo-owned gateway tool: `tool_1201kr74artsf808ctajck15ynje`.
- `wrkflo_search` is attached to Eden and Eden v2 only.
- Ellie has no search tool attached as of 2026-05-09; stale `exa_search` prompt references were removed.
- Latest read-only audit found no `exa_search`, no old Exa tool ID `tool_2001kjs12qeffwtrfkrsnec6jt6v`, and no `wrkflo_search` on Ellie.

## Live monitoring state
- `monitoring_enabled=false` on Eden, Eden v2, and Ellie as of the latest read-only audit.

## Security hardening note
Eden webhook token headers were migrated from plaintext to ElevenLabs secret references.

## Latest verified versions
- Eden: `agtvrsn_5801kr74exgvemcr912watwtt7bb`
- Eden v2: `agtvrsn_2501kr74ezvsfx4rm2st55qhasqq`
- Ellie: `agtvrsn_3501kr74f21hf8vb3813p4fsqq4r`
