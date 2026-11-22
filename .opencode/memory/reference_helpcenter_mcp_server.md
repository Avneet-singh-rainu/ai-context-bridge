---
name: reference-helpcenter-mcp-server
description: caresmartz-help MCP server queries the public Intercom help center live for documented business logic
metadata: 
  node_type: memory
  type: reference
  originSessionId: 0c584abb-0575-4fde-8e20-6b2a96086c42
  modified: 2026-08-28T11:40:15.412Z
---

Local MCP server `caresmartz-help` at `D:\Caresmartz360\caresmartz-help-mcp\server.py` (Python +
FastMCP + httpx + beautifulsoup4 + markdownify, run via `uv run --project`). Registered in local
scope for the Forge project. Built 2026-08-28. Sibling to [[reference-jira-mcp-server]].

Queries https://intercom.help/caresmartz/en/ **live on every call** - deliberately no local corpus.
Use it to check what the product's documented behavior is when working a ticket.

Five tools: `search_help(query)` (Intercom's own full-text index, ranked, **hard-capped at 10
results, no pagination**), `get_article(id|slug|url)` (body as markdown, nesting and bold labels
preserved), `list_collections()` (20 product areas with article counts), `list_collection_articles`,
`find_articles(regex)` (title match across all 581 articles from sitemap.xml - the breadth escape
hatch for the 10-result cap).

Gotchas worth remembering:
- Screenshots are replaced with `[screenshot]`; Intercom's real image URLs are signed and expire,
  and raw they added ~1,200 chars each (one article went 34k -> 2.2k chars once stripped).
- Roughly a third of the catalogue is training videos and recorded webinars with thin text bodies.
- Many articles date to 2018-2019. Every result carries `last_updated` so staleness is visible.
- **Docs are evidence of intended behavior, not proof of current code.** Treat a doc-vs-code
  disagreement as something to investigate, not as a bug in either one. Relevant to
  [[feedback-verify-hardcoded-values]].
