markdown
# Changelog - ISSUE-NNNN

<!-- Answers WHAT and WHEN. WHY lives in adr/.
     If an entry has a date and a file list, it is a changelog entry - not a decision.
     Newest entry at the top.
     Do not log documentation-only edits here. A changelog of changelog edits is noise. -->

## YYYY-MM-DD

- `Database/dbo/Stored Procedures/Procs6/SomeProc.sql` - one line covering what changed and why.
  Name the actual mechanism, not just the symptom.

<!-- ------------------------------------------------------------------------------------------
     TIER 1 TICKETS: this file is the only doc. The entry must also carry the root cause and a
     Verify line, because there is no Design.md to hold them. Shape:

     ## 2026-08-08

     - `Database/dbo/Stored Procedures/Procs5/PrReports_ClientswithNoCompletedSchedules.sql` -
       fixed the Caregiver column showing a literal ", " instead of "OpenShift" for schedules
       with no assigned caregiver. Root cause: the previous CONCAT/ISNULL fallback never fired,
       since CONCAT treats NULL arguments as empty strings.
       Verify: run the report for an office with an unassigned slot; the Caregiver column reads
       "OpenShift".

     That entry is self-sufficient - a stranger can understand the bug, the fix, and how to check
     it, without any other file. That is the bar for Tier 1.
     ------------------------------------------------------------------------------------------ -->

