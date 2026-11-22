---
name: feedback-db-deployment-script-drift
description: "Never let <TICKET>_DB_Deployment.sql drift from the Database repo - re-verify it after EVERY DB edit, including comment-only ones"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 753c2b8d-aa6f-4175-94f5-6b527a750de6
  modified: 2026-09-29T05:49:59.671Z
---

The ticket's `<TICKET>_DB_Deployment.sql` must be re-derived from the Database repo after **every**
change to a stored procedure, table or type the ticket touches - including changes that only alter
comments. Verify with
`python docs/_systems/runbooks/verify_db_deployment_script.py docs/<TICKET-FOLDER>` (add `--fix` to
regenerate drifted blocks) and report the result, rather than assuming the script is current.

**Why:** on C360-38441 the script silently drifted from `BulkPayerSync_ClaimNextClient.sql` and
`BulkPayerSync_SaveClientResult.sql` after a comment-trimming pass. Logic was identical, comments
were not. Pawan's words on 2026-09-29: *"i cant bear the consiquences of misisng this ensure that u
never miss htis file"*. This script is what a DBA runs by hand against a real environment - a stale
copy means shipping a procedure body nobody reviewed. CLAUDE.md rule 9 already requires it; nothing
enforced it, so it was missed.

**How to apply:** treat the deployment script as part of the edit, not a follow-up. The moment a
`.sql` file under `Database/` changes for a ticket, update the script in the same pass and run the
checker before saying the work is done. Also re-run it before any staging round and before handing
the script to anyone. See [[feedback-dont-rebuild-db-repeatedly]] for how to batch the MSBuild
verification separately - the drift check is cheap and runs every time, the DB rebuild does not.
