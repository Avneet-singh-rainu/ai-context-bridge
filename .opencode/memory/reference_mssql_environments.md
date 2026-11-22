---
name: reference_mssql_environments
description: mssql MCP tool environments and which DB each maps to; autoqa_base is NOT reachable
metadata:
  node_type: memory
  type: reference
  originSessionId: 6600d84b-f079-4180-81b6-fdf2aed939f7
  modified: 2026-11-12T10:46:17.484Z
---

The `mssql` MCP tool exposes only these environments (as of 2026-11-12):

| env name | server | database |
|---|---|---|
| dev | 192.168.15.4 | agency1_CS360 |
| staging | 135.18.215.109 | Staging_Base |
| AbbeyCare | 135.18.215.109 | abbeycare_base_1 |

Gotchas:
- `autoqa_base` (the DB behind autoqa.caresmartz360.com pre-prod) is **NOT** one of these - it cannot be queried via this tool. Do not assume `AbbeyCare`/`abbeycare_base_1` is autoqa's DB; in C360-47xxx-era blank-page work they were confirmed different (abbeycare_base_1 had the grants, autoqa_base did not).
- The agency shown in the app (e.g. "AbbeyCare, Inc.") does not reliably tell you which physical DB the environment uses - ask the user which DB when it matters.

See [[reference_repo_structure]].
