---
name: feedback-jira-read-only
description: "Only make read-only calls against Jira via the local MCP server, for now"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8038a0bd-be32-4549-97de-73f8e1632f4f
---

Only perform read-only operations (GET/search/fetch) against Jira through [[reference_jira_mcp_server]] â€” do not create, update, transition, comment on, or otherwise mutate issues.

**Why:** User explicitly restricted this to read-only "for now" (as of 2026-07-08), implying write support may be added later but is not currently authorized.

**How to apply:** Before adding or invoking any Jira tool/call, confirm it's a read operation (search_issues, get_issue, myself, etc.). If a task would require writing to Jira, stop and ask the user for explicit go-ahead before implementing or calling it.
