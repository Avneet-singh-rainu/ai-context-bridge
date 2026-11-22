---
name: project-c360-34098-impl
description: Key file paths and implementation patterns for C360-34098 multi-tax tasks
metadata: 
  node_type: memory
  type: project
  originSessionId: 3c3ab5c3-fbe1-47a0-a042-9184d7a9a9a4
---

Full plan at: `d:\Caresmartz360\Jira\C360-34098\docs\C360-34098_Implementation_Plan.md`
API contracts at: `d:\Caresmartz360\Jira\C360-34098\docs\C360-34098_API_Contracts.md`

**Ticket status (verified 2026-06-27):**
- C360-42597 â€” DONE (client-payer IsTaxable toggle + ClientPayerTaxSetting diff-save)
- C360-42596 â€” DONE (client-level cascade via SPs; TaxAggregateState on GET)
- C360-42598 â€” Not started (payer default tax logic on new link)
- C360-42918 â€” DONE (verified 2026-06-29)
- C360-42601 â€” Not started (invoice tax, needs new DB tables)
- C360-42606 â€” Not started (CSV/QB export, depends on 42601)
- C360-42609 â€” Not started (SSRS reports, depends on 42601 SPs)

**Key new DB objects:**
- `ClientPayer.IsTaxable BIT` (renamed from IsChargeTax)
- `ClientPayerTaxSetting` table (ClientId, PayerId, ServiceTypeId â€” per-payer per-service-type taxability)
- `OfficeTaxDefinition` table â€” pending (for 42601)
- `ClientInvoiceHeaderTax` table â€” pending (for 42601)

**C360-42596 actual implementation (no new controller, SP-only):**
- GET uses existing `/client-Preferences/fetch-client-preferences` â€” `TaxAggregateState` added to result model, computed via variable in SP
- UPDATE uses existing `/client-Preferences/update-client-preferences` â€” cascade added to `Update_ClientPreferences_Result` SP

**C360-42918 â€” Global Payer Tax Setting (DONE as of 2026-06-29):**
- Controller: 3 endpoints in `GeneralInformationController.cs` (lines 870â€“933)
- SP `Payer_FetchTaxConfiguration` â€” done (3 result sets: rows + taxSettings + counts)
- `GetTaxConfigurationFilters()` â€” LINQ against MasterTableValues
- `GetPayerTaxConfiguration()` â€” reads 3 SP result sets, builds TaxableServiceTypeIds lookup per row
- `SavePayerTaxConfigRowDTO` has `TaxableServiceTypeIds: List<Guid>`
- `SavePayerTaxConfiguration()` â€” updates IsTaxable, calls `SaveServiceTypeTaxSettings()` with diff logic

**Implementation order:** 42597 â†’ 42596 â†’ 42598 â†’ 42918 â†’ 42601 â†’ 42606 â†’ 42609
