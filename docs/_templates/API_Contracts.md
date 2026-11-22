markdown
# API Contracts - ISSUE-NNNN

<!-- Only if this ticket adds or changes an endpoint.
     Verify every shape against the actual controller and middleware in use - not against what
     the convention says should happen. Two live examples of why:
       - Invoice.Centralized.ErrorHandlingMiddleware rewrites 401/403/404/405/501 into a flattened
         200 OK with a {Message, StatusCode} body. Only 400 passes through untouched.
       - Requests are case-insensitive, responses are always PascalCase (PropertyNamingPolicy null).
     Both are documented in exactly one ticket today. If you confirm behaviour like this again,
     it belongs in docs/_systems/API_And_Layering_Conventions.md, not only here. -->

## POST /Some/route-name

**BFF route:** <if the BFF route name differs from the backend route name, say both>
**Controller:** `SomeController.SomeMethod` in `<project>`
**Auth:** Bearer <JWT>

### Request

```json
{
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|

### Response - success

```json
{
}
```

### Response - errors

| Condition | HTTP status as actually returned | Body |
|-----------|----------------------------------|------|

<!-- Rule 11: unexpected/unhandled errors return a generic message, never the internal exception
     text. Deliberate, hand-written validation messages meant for display pass through as-is. -->

