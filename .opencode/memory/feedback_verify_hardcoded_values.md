---
name: feedback_verify_hardcoded_values
description: "Verify any hardcoded GUID/magic number/magic string against real code and data before relying on it, across environments where relevant, and confirm findings with the user before proceeding"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2fc83b20-653f-4b07-a296-f3c727adaf98
  modified: 2026-08-17T10:58:33.646Z
---

Never trust a hardcoded GUID, magic number, magic string, or other hardcoded literal (status
ids, type ids, mode flags, etc.) just because it appears in an existing constant, comment, or
doc. Verify it against the actual current code that sets/reads it, and against real data. If
the value is plausibly environment-specific (MasterTableValue-backed ids especially, in this
codebase), verify across every environment reachable - and say plainly which ones weren't
reachable rather than assuming they match. Report findings and get explicit confirmation before
proceeding with a fix or new implementation that depends on the value - don't self-verify and
continue silently.

**Why:** Two concrete incidents in this project already proved constant names/values can't be
trusted at face value:
1. C360-45543/45544: the "On-Hold" client-status GUID the frontend sent didn't match what
   existed in a given environment's `MasterTableValue` data - genuine cross-environment
   master-data drift, not a coding mistake.
2. C360-25530: a Voided-invoice exclusion check compared against
   `Utilities.Const.InvoiceStatus.Voided` ("C4870627-..."). Verification (reading the actual
   Void Invoice SP, then testing against a real voided invoice in dev) proved that constant is
   never actually set as an invoice `PaymentStatus` by any code path - it's a credit-card
   transaction status reused/mislabeled in the same shared constants class. The real value
   (mislabeled `"Adjusted"` in that same file) only surfaced by tracing the actual SP and
   checking real data, then cross-checking staging too, where `MasterTableValue` labels this
   same GUID differently again ("Voided" there, vs "Adjusted" in dev) - the label drifts even
   though the functional value, confirmed via the identical deployed SP and real voided rows in
   both environments, does not.

**How to apply:** Whenever a fix or new feature depends on a specific hardcoded id/value in
this codebase (Caresmartz360Next/AgencyWebApp/Database/BFF or sibling repos under Forge) -
trace it to where it's actually produced/consumed in code, not just where it's named/declared;
check real data in whichever environments are reachable (`dev`, `staging` via the MSSQL MCP
tool as of this project); explicitly flag any environment that couldn't be checked (e.g.
pre-prod, no query access) as unverified, not assumed-fine; and present the finding to the user
for confirmation before writing the fix, or before treating a just-written fix as done.
