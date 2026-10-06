---
title: Authentication
sidebar_label: Authentication
sidebar_position: 3
---

# Authentication

Every request must include an `Authorization` header:

```
Authorization: Bearer <api-key>
```

---

## How to get a key

1. Sign into the Vindy panel.
2. Go to **Settings → API Keys**.
3. Create a key. The plain key is shown **only once** — save it somewhere safe.

---

## Rules

- The plain key is visible **only** at creation time. If lost, generate a new one — recovery is not possible.
- A key does **not** expire — it stays valid until you revoke it. Revoked keys become invalid immediately, so all subsequent requests return 401.
- Each key is bound to a single company, so it **cannot** access another company's data. See [Multi-tenancy](concepts/multi-tenancy.md).

---

## Possible errors

| Status | Code | Description |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER` | `Authorization` header is missing |
| `401` | `INVALID_AUTH_FORMAT` | Doesn't follow `Bearer <api-key>` format |
| `401` | `INVALID_API_KEY` | Key is invalid or revoked |

All error responses share the same JSON shape — see [Response Format](concepts/response-envelopes.md#error-envelope).

**Example — missing header:**

```bash
curl -i https://api.vindy.ai/v1/assistants
```

```json
{
  "message": "Authorization header is required.",
  "extensions": {
    "code": "MISSING_AUTH_HEADER"
  }
}
```

---

## Base URLs

| Environment | Base URL |
|---|---|
| Production | `https://api.vindy.ai` |
