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

## API key format

`<uuid>.<secret>` — 80 characters total:

- `uuid` part (36 chars) → the key ID, not sensitive
- `.` (period) → separator
- `secret` part (43 chars) → the actual secret

**Example:**

```
01902f6e-7c5a-7000-8000-abc123def456.R3vP9LkX2nM8jY7fW1qZ4tH6cB0sN5aDmGuI3oVpQ7r
```

---

## How to get a key

1. Sign into the Vindy panel.
2. Go to **Settings → API Keys**.
3. Create a key. The plain key is shown **only once** — save it somewhere safe.

---

## Rules

- The plain key is visible ONLY at creation time. If lost, generate a new one — recovery is not possible.
- Revoked keys become invalid immediately → all subsequent requests return 401.
- Expired keys (`expires_at < now()`) are automatically invalid.
- Each key is bound to a single company → it **cannot** access another customer's data. See [Multi-tenancy](concepts/multi-tenancy.md).
- Do NOT put keys in logs, source code, or public repositories. Use environment variables or a secret manager.
- Do NOT share keys over email, Slack, WhatsApp, etc. If a key may be compromised, revoke it immediately and create a new one.

---

## Possible errors

| Status | Code | Description |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER` | `Authorization` header is missing |
| `401` | `INVALID_AUTH_FORMAT` | Doesn't follow `Bearer <api-key>` format |
| `401` | `INVALID_API_KEY` | Key is invalid, expired, or revoked |

All error responses share the same JSON shape — see [Response Format](concepts/response-envelopes.md#error-envelope).

**Example — missing header:**

```bash
curl -i https://api.vindy.ai/v1/assistants
```

```json
{
  "message": "Authorization header is missing.",
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
