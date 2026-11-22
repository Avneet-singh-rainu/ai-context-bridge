---
name: user-profile-atlassian
description: "Avneet Singh's actual Atlassian/Jira identity and site (corrects prior wrong email in context)"
metadata: 
  node_type: memory
  type: user
  originSessionId: d76c09c4-fe4a-43a7-8cbf-8ba3ddd67585
  modified: 2026-11-03T06:02:28.825Z
---

The user's real email/username for Atlassian/Jira is avneet.singh@caresmartz360.com, NOT mandeep.singh@caresmartz360.com and NOT pawan.kumar@caresmartz360.com (= "Pawan Prashar" in Jira). Both of those have appeared in the `userEmail` session context field and are wrong for this user.

The Jira MCP server's token is Avneet's, so JQL `currentUser()` resolves correctly to Avneet Singh regardless of what `userEmail` says. Confirmed again on 2026-09-18: user explicitly chose Avneet Singh as the meaning of "my issues" when the context field said pawan.kumar.

Jira site: https://netsmartz.atlassian.net (cloud site is "netsmartz", not "caresmartz360").

**Why:** This Claude Code instance is shared across the organization, so the `userEmail` system context field can reflect a different teammate than the person actually using the session. Always confirm identity with the user rather than trusting that field for Atlassian queries.

**Standing order (2026-11-03):** user said "use the avneet.singh@caresmartz360.com account always". Do NOT search for pawan.kumar too, do NOT ask which identity - just use Avneet.

**How to apply:** When looking up "my" Jira issues or Atlassian data for this user, use avneet.singh@caresmartz360.com and cloudId/site netsmartz.atlassian.net. See [[project_c360_34098]] for the ticket context this user works on.
