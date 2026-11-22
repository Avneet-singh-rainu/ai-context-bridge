---
name: reference-jira-mcp-server
description: "Local Jira MCP server location and how to query the user's Jira issues"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8038a0bd-be32-4549-97de-73f8e1632f4f
  modified: 2026-11-13T00:00:00.000Z
---

Avneet has a local FastMCP-based Jira MCP server at `D:\Caresmartz360\jira-mcp-server` (corrected 2026-08-03 â€” no `Jira\` parent folder; confirmed via `claude mcp list` showing `jira: python D:\Caresmartz360\jira-mcp-server\server.py`).

- Entry point: `server.py` (Python, FastMCP framework)
- Config: `.env` in that folder holds `JIRA_URL` (https://netsmartz.atlassian.net), `JIRA_EMAIL`, `JIRA_API_TOKEN` â€” see [[user_profile_atlassian]] for identity details
- Exposes two tools: `search_issues(jql, max_results)` and `get_issue(issue_key)`, both read-only GETs against the Jira REST API v3
- If `/rest/api/3/myself` returns 401, the API token in `.env` has expired â€” user needs to generate a fresh one at https://id.atlassian.com/manage-profile/security/api-tokens and update `.env`

**2026-10-08:** `search_issues` returned `[]` for every JQL, even `project = C360` (silent failure, not a 401 - likely the deprecated `/rest/api/3/search` endpoint or an expired token; not diagnosed). Fallback used: the claude.ai Atlassian Rovo connector (`searchJiraIssuesUsingJql`, cloudId `netsmartz.atlassian.net`) - BUT that connector is logged in as **Arpit Yadav** (arpit.yadav@caresmartz360.com), so `currentUser()` there returns Arpit's issues. With Rovo always filter by `assignee = "avneet.singh@caresmartz360.com"`, never `currentUser()`. I got this wrong once and showed Arpit's issues as Avneet's.

**2026-11-13:** local `search_issues` returned `[]` again for both `currentUser()` and the explicit
email JQL - still undiagnosed, still treat it as broken. Rovo fallback worked first try with
`cloudId = https://netsmartz.atlassian.net` and `assignee = "avneet.singh@caresmartz360.com" AND
statusCategory != Done` (returned 6 open issues). Skip the local server and go straight to Rovo
until someone fixes the local one.

Use this server/location whenever the user asks to check, list, or look up their Jira issues, rather than guessing at other Jira integrations. See [[feedback_jira_read_only]] for the constraint on what calls are allowed against it.
