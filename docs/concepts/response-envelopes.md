---
title: Response Format
sidebar_label: Response Format
sidebar_position: 1
---

# Response Format

All Vindy API responses are JSON (`application/json`) and follow a small set of predictable shapes. Learn them once and every endpoint feels familiar.

Most list responses are wrapped in a pagination object — see [Filtering & Pagination](../api-reference/list-calls/filtering-pagination.md#paginated). The one exception is [`GET /v1/assistants`](../api-reference/list-assistants.md), which returns `{ data, total }` instead.

---

## Error format {#error-envelope}

Every error response has the same **minimal** shape: a human-readable `message` and an `extensions` object that always carries a machine-readable `code`.

```json
{
  "message": "API key is invalid, expired, or has been revoked.",
  "extensions": {
    "code": "INVALID_API_KEY"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `message` | string | Human-readable description. Always present. |
| `extensions` | object | Always present. Always carries `code`; some errors add extra detail (see below). |
| `extensions.code` | string | Machine-readable error code — see the [Error Codes catalog](../errors.md). Always present. |

There are **no** top-level `statusCode`, `timestamp`, `path`, `requestId`, or `code` fields. The HTTP status line carries the status; `extensions.code` carries the code.

:::note Unexpected 5xx
Well-defined errors always follow the envelope above. An unexpected server error (`500`) may not — it can fall back to the framework default `{ "detail": "Internal Server Error" }`. There is no `HTTP_500` code. If you hit a persistent `5xx`, retry and then report it.
:::

---

## Extra detail in `extensions`

Depending on the error, `extensions` carries extra machine-readable fields alongside `code`:

| Error (code / status) | Extra fields in `extensions` |
|---|---|
| `VALIDATION_FAILED` (400) | `validation_errors` — an array of objects |
| `INVALID_PHONE_NUMBER`, `INVALID_METADATA` (400, from `POST /v1/calls/bulk`) | `index` — the 0-based index of the offending item in `calls` |
| `RATE_LIMITED` (429) | `retry_after` (seconds), `limit` |

### Validation errors

On `VALIDATION_FAILED`, `extensions.validation_errors` is an **array of objects** — one entry per field that failed validation:

```json
{
  "message": "Request validation failed.",
  "extensions": {
    "code": "VALIDATION_FAILED",
    "validation_errors": [
      { "field": "body.calls", "message": "Field required", "type": "missing" }
    ]
  }
}
```

| Field | Type | Description |
|---|---|---|
| `field` | string | Location of the invalid input (e.g. `body.calls`). |
| `message` | string | What went wrong for this field. |
| `type` | string | Validation error type. |

### Per-item errors (bulk)

When a bulk request fails on one specific call, `extensions.index` identifies the offending item in the `calls` array (0-based):

```json
{
  "message": "Invalid phone number.",
  "extensions": {
    "code": "INVALID_PHONE_NUMBER",
    "index": 2
  }
}
```

### Rate limit

On `RATE_LIMITED`, `extensions` reports how long to wait and the per-minute limit (the same values are also sent as the `Retry-After` and `X-RateLimit-Limit` headers):

```json
{
  "message": "Rate limit exceeded.",
  "extensions": {
    "code": "RATE_LIMITED",
    "retry_after": 60,
    "limit": 60
  }
}
```

**Every** successful (2xx) response also carries `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers, so you can track your remaining quota before you ever hit the limit.

---

## Reporting an error

There is no request ID to quote. When you report a problem, include the HTTP method and URL, the request and response bodies, and the approximate time of the request — and **mask your API key** before sharing anything.
