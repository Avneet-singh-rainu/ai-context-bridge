---
name: reference_cs360_privilege_grant_check
description: a row in Privileges master does NOT mean a user can see a feature; check RoleTypePrivileges + RolePrivileges grants
metadata:
  node_type: memory
  type: reference
  originSessionId: 6600d84b-f079-4180-81b6-fdf2aed939f7
  modified: 2026-11-12T10:46:26.662Z
---

In CS360, a privilege existing in the `Privileges` master table is NOT the same as a
user actually having it. `GetUserPrivileges` (what the Angular app reads) returns only
**granted** privileges, resolved through the role chain:

`Privileges` -> `RoleTypePrivileges` (PrivilegeId + RoleTypeId) -> `RolePrivileges`
(RoleId + RoleTypePrivilegeId, with IsActive=1 / IsArchived=0 / FullAccess).

So to decide whether a feature is visible for a role, check the **active RolePrivileges
grants**, not just that the `Privileges` row exists. A new child privilege (ParentId set,
e.g. under Billing-Rates `C2BBF530-19B3-E211-A5A4-00155D0A1911`) is typically seeded by:
insert into Privileges -> insert RoleTypePrivileges for the role types
(Admin `1B3962F9...`, Agency `1B110C8D...`, Area-Reps `DBAC447B...` only when
`dbo.fn_getAgencyType()=2`) -> back-fill RolePrivileges -> UPDATE child to inherit the
parent's access (guard the UPDATE with `preAccess.FullAccess IS NOT NULL`).

A missing seed on one environment (e.g. autoqa_base) makes the whole sub-tab gate off.
If the UI gates the ENTIRE view behind such a privilege, a missing grant shows as a blank
page, not a "no access" message. See [[reference_mssql_environments]].
