---
name: project-amount-comma-convention
description: "In this app's currency/amount fields, a comma is only ever a thousands separator, never a decimal separator - safe to strip when sanitizing input"
metadata: 
  node_type: memory
  type: project
  originSessionId: f2ead83b-c588-4bd6-ae22-e8a5f2f8d7df
  modified: 2026-08-25T07:28:26.840Z
---

In HomeCare-CS360 (and presumably the rest of the Caresmartz360 suite), a comma typed or pasted
into a currency/amount field is only ever used as a thousands separator (e.g. "1,234.56") - never
as a decimal separator (the "100,00" meaning "$100.00" European-style convention does not apply
here).

**Why:** Confirmed directly by the user while discussing [[C360-46397]]'s paste-sanitization fix
(`sanitizePastedAmount` in `HomeCareWeb\Client\ClientInvoice\JS\Invoice.js`, added to strip commas
from pasted amounts since `onkeypress` filters don't fire on paste). I'd flagged a theoretical risk
that stripping a comma could silently misinterpret a decimal-separator comma as a thousands
separator (turning "100,00" into "10000", a 100x error) - the user clarified this ambiguity does
not exist in practice for this app.

**How to apply:** When sanitizing, parsing, or validating amount/currency input anywhere in this
codebase, it's safe to treat a comma as a thousands separator to be stripped/ignored, without
needing reject-on-comma or locale-aware decimal-separator handling. Don't re-litigate this as an
open ambiguity in future currency-parsing work on this app.
