markdown
# ISSUE-NNNN - Low-Level Design

<!-- ==========================================================================================
     The ONLY file in this ticket containing implementable detail.
     If it is copy-pasteable into a source file, it belongs here - not in HLD.md.
     Cross-reference HLD.md by heading NAME, never by step number. Numbers get renumbered and
     the references go stale silently (see C360-44904, where "see LLD step 8" now points at 7).
     ========================================================================================== -->

**High-level design:** [HLD.md](HLD.md)

## Files Touched

| File | Change |
|------|--------|
| `Homecare/HomeCare-CS360/...` | |
| `Database/dbo/Stored Procedures/Procs6/...` | |

## Database Changes

<!-- DDL, indexes, migrations.
     Rule 7: reads use WITH (NOLOCK).
     Rule 8: new DB files get a .sqlproj entry, placed in the highest-numbered folder of that
             type (Procs6, not Procs4).
     Rule 12: any hardcoded GUID/status id must be verified against real code and real data
             across every reachable environment, recorded in _systems/Reference_IDs.md, and
             confirmed with the user before it is relied on. Check Reference_IDs.md first -
             it may already be verified. -->

## Stored Procedure Logic

<!-- Name the steps, do not number them. "Tax recompute", not "step 4".
     Numbering is what breaks cross-references between this file and HLD.md/Test_Cases.md. -->

## API / Method Signatures

<!-- Rule 14: new members go at the END of the existing list/class, never inserted mid-file.
     Rule 13: follow SOLID. -->

## Edge Cases & Error Handling

<!-- Rule 11: never surface internal exception messages to the UI layer - generic message for
     anything genuinely unexpected. Hand-written validation messages meant for display pass
     through as-is. -->

## Verification / Rollout

<!-- How to prove it works, what to watch after deploy, how to back it out.
     Reference Test_Cases.md rather than repeating cases here. -->

