---
name: reference-test-data-creation-flow
description: "Working API sequence (direct-to-microservice) to create a test client/caregiver/payer, link them, schedule a visit, and get to a finalized invoice in the Avneet office - with every gotcha found while debugging it"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4575fee3-ad35-45df-9324-2e573a28481c
  modified: 2026-10-08T11:17:53.109Z
---

Discovered 2026-08-01 while creating fresh test data for [[project_c360_44904]] test execution. Calls go directly to each microservice via `mcp__api__make_request` (the local api-mcp-server), NOT through the Angular app's `/api/v1/<service>service/<action>` gateway paths - those gateway paths often 404 or point at a different literal route than what the controller source shows. Always find the real `[Route]`/`[HttpPost]` attributes in the C# controller before calling directly. Also: a gateway path segment (e.g. `payerservice`) does not reliably indicate which microservice actually hosts the controller - `LinkPayerController` lives in the **Client** project despite being payer-related.

## Known-good reference values (Avneet office)

- `OfficeId` (Avneet): `B099866D-AFEA-40A0-82D6-36C4083A7E36` - FranchiseID `F8962E0E-B512-49A4-9BA4-FE264D6385F4`, no territories configured (TerritoryId not required for caregivers here).
- `CaregiverRoleId` (Caregiver, not Staff): `EBACAD42-CC16-E211-9AEA-52CB3DB5A35E`
- `PayerTypeId` (known-working, copied from an existing Avneet payer): `22E1D2AC-4818-475A-A82C-D0E3C6A3638B`
- `ServiceUnitTypeId`: `EBC1C557-BCA0-49B1-8856-28A164E49107`
- `BillUnitTypeId` / `PayUnitTypeId` (same value used for both): `A2F33875-7C63-E611-BAB0-000C294789CB`
- `ScheduleStatusId` (Approved - required for invoice eligibility): `62E444AF-B001-4416-B7FF-D9787FD034D7`
- `BillingType` (ClientPayer): `1EE505B9-91C2-4DC3-A48F-B8D70D05F1A8`
- `PaymentAllocation` (ClientPayer, int): `1`=Remainder, `2`=Per Diem Allowance, `3`=Difference, `4`=Visit, `5`=Weekly, `6`=Monthly
- `ClientPayerType`/Rank (ClientPayer, int): `1`=Primary, `2`=Secondary
- Valid US address for CityId FK (New York): `CityId 100379`, `StateId 33`, `CountryId 4`, zip `10038`, lat `40.7094236`, long `-74.0067938`
- `BillStatusId`: Not Billed `088174FB-8574-E211-B5AF-00155D0A1911`, Partially Billed `AFA04CF9-2413-43C8-9308-B557FA4C529C`, Billed `098174FB-8574-E211-B5AF-00155D0A1911`
- `PaymentStatus`: Not Paid `CD417660-4F72-4AB7-9F2F-42432C67A990`, Partially Paid `F69792B3-DDAE-4F38-8726-210133469852`, Fully Paid `C9A0304F-CC5C-4D79-9062-ECFE904C6B3A`, Over Paid `1932ECFF-D0F4-42AD-B850-CFC10321B101`

## Step-by-step flow

**1. Create Client** - environment `client`, `POST /main/add-client`
```json
{ "FirstName": "...", "LastName": "...", "OfficeId": "B099866D-AFEA-40A0-82D6-36C4083A7E36", "IsFacility": false }
```
Returns the new `ClientId` as a raw string in `Data`. Only FirstName/LastName/OfficeId are truly required server-side (Angular form requires more, but backend doesn't enforce it). Client is Active immediately, no separate admission step needed.

**2. Create Caregiver** - environment `caregiver`, `POST /caregiver-info/add-caregiver`
```json
{
  "FirstName": "...", "LastName": "...",
  "CaregiverRoleId": "EBACAD42-CC16-E211-9AEA-52CB3DB5A35E",
  "OfficeId": "B099866D-AFEA-40A0-82D6-36C4083A7E36",
  "HireDate": "2026-08-01", "UserName": "<must be globally unique>",
  "IsLiveInCaregiver": false,
  "AddressList": {
    "Address1": "123 William St", "Address2": "", "CountryId": 4, "CountryName": "USA",
    "StateId": 33, "StateName": "New York", "CityId": 100379, "CityName": "New York",
    "ZipCode": "10038", "ExtendedZip": "", "IsPrimary": true,
    "Latitude": 40.7094236, "Longitude": -74.0067938, "IsActive": true, "IsArchived": false
  }
}
```
**Two gotchas that both produced a generic `{"Error": "Error while adding Caregiver"}` with no detail** - root cause found by reading `dbo.ProfilesErrorLog` (the SP `CaregiverProfile_SaveNewCaregiver` logs real SQL errors there before rethrowing):
- `IsLiveInCaregiver` must be explicitly `false` - the DTO field is nullable and the C# layer always passes it through explicitly, so omitting it sends SQL `NULL` into a NOT NULL column (SQL Server's own default on the stored-proc parameter never kicks in, since Dapper supplies the parameter explicitly).
- `AddressList` must be a fully populated, valid address - the SP **unconditionally** inserts one Address row per new caregiver regardless of whether you provided one; omit it and `CityId` defaults to `0`, which violates `FK_InformationAddress_Cities`.

Returns `Data: true` + `Message: "Caregiver added Successfully |<CaregiverId>"` - parse the CaregiverId out of the message string.

**3. Create Payer** - environment `payer`, `POST /payer-info/add-payer` (NOT `/api/v1/payerservice/addPayer` - 404s when hit directly)
```json
{ "OfficeId": "B099866D-AFEA-40A0-82D6-36C4083A7E36", "PayerTypeId": "22E1D2AC-4818-475A-A82C-D0E3C6A3638B", "FirstName": "...", "LastName": "...", "CompanyName": "...", "IsFacility": false, "SendClientPortalCredential": false }
```
Returns the new `PayerId` in `Data` (string) and `Message: "Payer created successfully"`.

**4. Link Client + Payer - USE `POST /payer-info/link-payer-client` (payer service).** Verified by
reading the code 2026-10-14. One call writes the `ClientPayer` row, its `ClientAuthorization` rows
AND the `AuthBillUnitType` rows: `PayerService.SaveClientPayer` then `SaveUpdateAuth`, which calls
`SaveAuthBillUnitType`. Body is `LinkClientPayerRequestDTO`:
`ClientPayerDetail` (`ClientId`, `PayerId`, `ClientPayerType` 1=Primary, `BillingType`,
`PaymentAllocation`, `EffectiveFrom`/`EffectiveTo`, `IsActive`, and for Therap
`TherapPayerProgramId` (long, lookup into `dbo.TherapPayerProgram`) + `PayerProgrameForEVV`),
`ClientPayerAuthorizationList[]` (`AuthId`, `FromDate`, `EndDate`, `Status` - **must be 1**, and
`MultipleBillUnitId` = comma-separated `BillUnitTypeId` GUIDs; it is `Split(",")` with no null
guard, so never send null), and `IsAuthConflictCheck: false`.

> **The endpoint below is the broken one - do not confuse them.** The dead path is
> `LinkPayerController.SaveClientLinkPayer` in the **Client** service
> (`POST /link-payer/save-client-link-payer`). Re-checked 2026-10-14: its whole persistence block
> is still commented out and it returns an empty `APIResponse<string>`, so it can never save.
> The original note said "use the UI instead" because this was the only endpoint found at the time.

**Superseded note, kept for context - KNOWN BROKEN as of 2026-08-01, use the real UI instead.** Angular calls `POST /api/v1/payerservice/saveLinkPayer`, which actually routes to `LinkPayerController.SaveClientLinkPayer` in the **Client** service (`POST /link-payer/save-client-link-payer`, `SaveClientLinkPayerDTO`: `ClientId`, `PayerId`, `Rank` (int), `BillingType` (guid), `StartDate`, `EndDate`, `PaymentAllocation` (int), `PaymentAllowance` (decimal), `PaymentPercentage` (string), `IsActive`, `IsExpansePayable`). Calling it directly throws a `NullReferenceException` from deep inside (`CheckClientPayerStatus`/`IsAgencyFromOregon` or `GetAgencyCityID`'s raw ADO code) - and even past that, `LinkPayerService.SaveClientLinkPayer`'s actual persistence call is commented out, so the method can never really save anything as currently written. This looks like a genuine, pre-existing bug/dead code, not something caused by request shape - flagged to the user, who does this step manually in the browser instead. **Do not re-attempt this via API** without first confirming with the user whether it's been fixed.

**5. Create Schedule** - environment `scheduling`, `POST /schedules/add-schedule`
```json
{
  "Mode": 1, "ClientId": "...", "CaregiverId": "...", "OfficeId": "B099866D-AFEA-40A0-82D6-36C4083A7E36",
  "PrimaryPayerId": "...", "StartDateTime": "2026-08-05T11:00:00", "EndDateTime": "2026-08-05T21:00:00",
  "ServiceUnitTypeId": "EBC1C557-BCA0-49B1-8856-28A164E49107",
  "BillUnitTypeId": "A2F33875-7C63-E611-BAB0-000C294789CB", "PayUnitTypeId": "A2F33875-7C63-E611-BAB0-000C294789CB",
  "ScheduleStatusId": "62E444AF-B001-4416-B7FF-D9787FD034D7", "BillOverrideRate": 50
}
```
`BillOverrideRate` is the simplest way to guarantee a non-zero bill rate - it wins over every other rate source (authorization, rate tables) with zero extra setup. **Gotcha**: this call frequently returns `200 OK` with `Data: "Object reference not set to an instance of an object."` - looks like a failure, but the schedule slot is actually created correctly in the DB regardless (a non-critical post-processing step throws and its message gets stuffed into `Data` by a broad catch block in `AddNewSchedule.SaveScheduleIgnoreConflict`). **Always verify success via SQL** (`ScheduleEventsSlots WHERE ClientId = ...`) rather than trusting this response. Also auto-attaches an office-default "Remainder" secondary payer to the new `SchedulePayer` rows alongside the requested `PrimaryPayerId` - expect 2 rows per slot, not 1.

**6/7. Search + Finalize invoice** - environment `invoice`: `POST /Invoicing/invoice-schedule-invoice-dataV3` (body: `BLL.DTO.Inbound.Invoice.ClientSearch` - `offices`/`clients`/`payers`/`territories`/`serviceTypes`/`PayerType` as Guid lists, `startDate`/`endDate`, `pendingApproval`, `HideZeroInvoice` bools) returns a `SearchId` + billable rows; then `POST /Invoicing/finalize-invoice` (`FinalizeInvoiceDTO{SearchId, SearchScheduleCount, SelectedSlotsCount, Slots:[{ScheduleSlotId, ClientID, PayerId, OfficeId}]}`) creates the finalized `ClientInvoiceHeader`. **Unresolved issue as of 2026-08-01**: the search call hung/timed out 3 times in a row for a brand-new client (no draft rows ever appeared in `InvoiceFinalFilterDataV2`) - root cause not found, worked around by having the user run search+finalize through the actual browser UI instead. Revisit this if it keeps happening - worth checking the invoice service's logs/health directly next time before assuming it's request-shape related.

## Staging (usa.caresmartz360.net) - headless Playwright path, added 2026-10-08

Everything above targets the **dev** DB (`agency1_CS360`) via localhost services. On staging
(mssql env `staging`, DB `Staging_Base`) the office IDs differ: "Avneet Office" =
`CAC11CA2-DF00-412C-92B1-E3B1E1E47BF8` (active one); "Avneet" = `E0E5C331-...` (old, barely used).
Login `avneetadmin` from `D:\Projects\ai-context-bridge\e2e-playwright\.env`.

Working approach (C360-41652, scripts in `docs/C360-41652-mileage-charged-on-open-shifts/scratchpad/`):
plain node script requiring `e2e-playwright/node_modules/@playwright/test`, headless login
(`#txtUsername`/`#txtPassword`/`#btnSave`), capture the bearer token off the dashboard's own API
calls, then call staging services directly with `ctx.request.post`:
- `https://schedule.caresmartz360.net/schedules/add-schedule` - same body as step 5 above;
  `CaregiverId: null` makes an open shift. Same misleading "Object reference" 200 - verify via SQL.
- `https://invoice.caresmartz360.net/Invoicing/invoice-schedule-invoice-dataV3` - dates must be
  ISO (`2026-10-20T00:00:00`); `MM/DD/YYYY` gives a 400.
- Office settings are legacy WebForms: `/Admin/Setting/Setting.aspx`, select office in
  `#ddlSettingOffice`, click the "Payroll" tab, checkboxes by id (e.g. `#ChkHomeTravelCompensation`,
  `#ChkIncludeCGMileageOnInvoices`), save with `#btnPayrollSettingSave`.

## General lessons for next time

- When a direct API call returns a vague/generic error, check `dbo.ProfilesErrorLog` (or equivalent per-domain error tables) before guessing at payload shape - it captures the real underlying SQL error text.
- A `200 OK` response is not proof of success in this codebase - several endpoints swallow a downstream exception and stuff `ex.Message` into the normal `Data`/response field instead of an error field. Verify state changes via SQL, not just the HTTP response.
- Don't trust the Angular gateway URL's service-name segment (`.../api/v1/payerservice/...`) to indicate which microservice or controller actually implements the action - grep the C# solution for the literal method/DTO name instead.
