---
description: >
  After any backend change, update API.md with the new or modified endpoint contract.
  Ensures the Angular team always has an accurate, copy-pasteable reference.
---

## API Contract Update — ${input:endpoint}

### Project: ${input:project}

---

### Step 1 — Read current contract

```
todo_read   → C:/aidocs/${input:project}/API.md
```

---

### Step 2 — Gather endpoint details

Inspect the changed controller / action and collect:

| Item             | Value                                           |
| ---------------- | ----------------------------------------------- |
| Method + path    | e.g. `POST /api/schools/{id}/years`             |
| Auth required    | JWT? Which role or claim?                       |
| Request DTO      | All fields, types, validation attributes        |
| Response DTO     | All fields, types (including nested)            |
| HTTP 200 example | Full JSON                                       |
| Error responses  | All status codes + `ProblemDetails` body shapes |
| Enums            | `int` value + string name for each member       |
| Angular service  | Method name, return type, `HttpClient` call     |

---

### Step 3 — Update API.md

Append or update the relevant section in `C:/aidocs/${input:project}/API.md` using this template:

```markdown
## [METHOD] /api/[path]

> Added/updated: [date]  
> Auth: Bearer JWT — role: `[RoleName]` / claim: `[ClaimName]`

### Request body

\`\`\`json
{
"field": "value" // type | validation rule
}
\`\`\`

### Response `200 OK`

\`\`\`json
{
"field": "value"
}
\`\`\`

### Error responses

| Status | `type`             | Description                          |
| ------ | ------------------ | ------------------------------------ |
| 400    | `validation_error` | One or more fields failed validation |
| 401    | `unauthorized`     | Missing or invalid JWT               |
| 403    | `forbidden`        | Insufficient role/claim              |
| 404    | `not_found`        | Resource does not exist              |
| 409    | `conflict`         | Business rule violation              |

### Enums

| Name            | Value | String     |
| --------------- | ----- | ---------- |
| `MyEnum.Active` | 1     | `"Active"` |

### Angular service snippet

\`\`\`typescript
// [feature].service.ts
[methodName](id: number, dto: [RequestDto]): Observable<[ResponseDto]> {
return this.http.post<[ResponseDto]>(`${this.apiUrl}/[path]/${id}`, dto);
}
\`\`\`

### cURL example

\`\`\`bash
curl -X [METHOD] "https://api.example.com/api/[path]" \
 -H "Authorization: Bearer $TOKEN" \
 -H "Content-Type: application/json" \
 -d '{ "field": "value" }'
\`\`\`
```

---

### Step 4 — Cross-check frontend

Verify:

- [ ] Angular service method exists and uses the correct DTO types
- [ ] No `any` in the DTO type definitions
- [ ] Error handling uses the global error interceptor in `core/`
- [ ] New enum values are added to `core/Enums.ts`

---

### Step 5 — Notify

After updating, confirm: **"API.md updated. Frontend team can consume `[METHOD] /api/[path]`."**
