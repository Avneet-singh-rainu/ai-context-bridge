---
name: reference-repo-structure
description: "D:\\Projects\\ai-context-bridge is a common parent folder holding multiple separate git repos, not one repo itself"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4575fee3-ad35-45df-9324-2e573a28481c
  modified: 2026-08-04T09:28:30.812Z
---

`D:\Projects\ai-context-bridge` (the project working directory) is a **common folder containing multiple separate projects** - it is not itself a git repository. The actual git repos live in nested subfolders:

- `D:\Projects\ai-context-bridge\AgencyWebApp\` - git repo (pure Angular frontend - no `.cs`/`.sql` files, no backend or DB access code at all)
- `D:\Projects\ai-context-bridge\Caresmartz360Next\` - git repo (the main .NET API solution: BLL, DAL, Invoice, Scheduling, etc. - branch seen in use: `Finalize-slot-delete`)
- `D:\Projects\ai-context-bridge\Database\` - git repo (the SSDT DB project, `CS360Database.sqlproj`)
- `D:\Projects\ai-context-bridge\BFF\BFF\` - git repo (note the double nesting - `BFF` is a plain folder, the actual repo is one level deeper). Node.js/TypeScript backend-for-frontend proxy service (Express-style, `src/facade/*.ts`). No SQL/ADO.NET/Dapper/EF anywhere - errors go to Application Insights, not a DB table.
- `D:\Projects\ai-context-bridge\Homecare\HomeCare-CS360\` - git repo (double nesting again). Contains `ABCMobile` (caregiver portal mobile API, `AbcMobile.WebAPI`/`.DAL`/`.BusinessService`), `Services\CoreAPIs` (a service with its own Serilog config), `Caresmartz_OpenAPis5`, and `DBProjects\StagingDB` (raw `.sql` scripts, separate from the main `Database` SSDT project).
- `D:\Projects\ai-context-bridge\SSRS\HomeCare_SSRS\` - git repo (double nesting again). SSRS reporting project, ~1,390+ `.rdl` files.

`D:\Projects\ai-context-bridge\docs\<TICKET>\` (the ticket documentation folder - see [[project_c360_34098]]) is a **sibling** of these repos, not nested inside any of them - it is not under git at all, so changes there can never be staged/committed. This applies no matter which repo the actual ticket's code lives in (confirmed for a Homecare\HomeCare-CS360 ticket, C360-43382, after initially writing docs nested inside that repo by mistake - the user corrected this and confirmed the shared Forge-root location is the rule for every repo, not just Database).

**How to apply:** any `git status`/`git add`/`git commit` request must `cd` into the actual nested repo folder first (e.g. `BFF\BFF`, `Homecare\HomeCare-CS360`, `SSRS\HomeCare_SSRS`, or the flat `AgencyWebApp`/`Caresmartz360Next`/`Database`), never run at the `Forge` root or at the outer non-repo folder for the double-nested ones. `Caresmartz360Next` and `Database` repos also track build artifacts (`bin/`, `obj/`, `.vs/` - including large unrelated binaries like a bundled XULRunner browser engine) as tracked/modified files - never `git add -A` or `git add .` in these repos; always stage specific real source files by exact path.
