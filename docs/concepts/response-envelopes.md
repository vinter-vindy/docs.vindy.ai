---
title: Response Format
sidebar_label: Response Format
sidebar_position: 1
---

# Response Format

Every Vindy API response is JSON (`application/json`), and follows one of a few predictable shapes. Once you've seen them, you can parse everything the same way.

:::note Unknown request fields are ignored
On a request body, any field the endpoint doesn't recognize is **ignored**; it never causes an error. So an extra or misspelled *optional* field simply does nothing. There's one exception: if you misspell a **required** field (for example `phone_number_id`), the real field is now missing, and the request fails with `VALIDATION_FAILED`. Send only the documented fields, and spell the required ones exactly.
:::

**List responses** come in two shapes:

- **Paginated lists** (most lists) look like `{ data, pagination }`. You read them a page at a time with a cursor — see [Filtering & Pagination](../api-reference/list-calls/filtering-pagination.md#paginated).
- **Full lists** ([`GET /v1/assistants`](../api-reference/list-assistants.md) and [`GET /v1/phone-numbers`](../api-reference/list-phone-numbers.md)) return everything at once. Instead of a pagination cursor they give you `{ data, total }`, where `total` is the number of items.

---

## Dates and times {#timestamps}

**Timestamps the API returns** are always in UTC, in ISO 8601 format with a `+00:00` offset. For example: `2026-05-15T10:30:00+00:00`. Parse them with a real date-time library; don't assume the value ends in `Z` or always has the same number of decimal places. This applies to every date-time field in every response: `call_started_at`, `call_ended_at`, `call_created_at`, a recording's `expires_at`, and the timestamps in [webhook](../api-reference/webhooks.md) payloads.

**Dates you send** come in two kinds:

- `date_from` and `date_to` (on [`POST /v1/calls/list`](../api-reference/list-calls/filtering-pagination.md#range-semantics)) are plain dates in `YYYY-MM-DD` form, with no time and no timezone. Vindy reads them as whole days in the **Europe/Istanbul** timezone.
- `scheduled_at` (on [`POST /v1/calls`](../api-reference/create-call.md#scheduled-at) and [`POST /v1/calls/bulk`](../api-reference/bulk-create-calls.md#scheduled-at)) is a full date-time. Always include a timezone offset, like `2026-06-10T09:00:00+03:00`. If you leave the offset out, Vindy reads the time as UTC.

---

## Error format {#error-envelope}

Every error response has the same shape. It carries a human-readable `message` and an `extensions` object, and that `extensions` object always holds a machine-readable `code`.

```json
{
  "message": "Invalid, expired, or revoked API key.",
  "extensions": {
    "code": "INVALID_API_KEY"
  }
}
```

In your code, branch on `extensions.code`, not on `message` (the wording can change). The HTTP status line tells you the status; `extensions.code` tells you the exact error.

| Field | Type | Description |
|---|---|---|
| `message` | string | Holds a human-readable description of the error. It is always present. |
| `extensions` | object | Carries the error's machine-readable detail. It is always present and always contains `code`, and some errors add more fields (listed below). |
| `extensions.code` | string | Holds the machine-readable error code — see the [Error Codes catalog](../errors.md). It is always present. |

The response has no top-level `statusCode`, `timestamp`, `path`, `requestId`, or `code` field.

:::note Unexpected server errors
A well-defined error always uses the shape above. An unexpected server error (HTTP 500) might not: it can return the framework's default body, `{ "detail": "Internal Server Error" }`, with no `extensions.code`. There is no `HTTP_500` code. If a 500 keeps happening, retry, then report it.
:::

---

## Extra fields in `extensions`

Depending on the error, `extensions` carries a few more fields next to `code`:

| Error (code / status) | Extra fields |
|---|---|
| `VALIDATION_FAILED` (400) | `validation_errors` — a list of objects |
| `INVALID_PHONE_NUMBER`, `INVALID_METADATA`, `INVALID_VARIABLES` (400) | `index` — which entry failed (see below) |
| `RATE_LIMITED` (429) | `retry_after` (seconds), `limit` |

### Validation errors

When a request fails validation, `extensions.validation_errors` lists one object per field that didn't pass:

```json
{
  "message": "Invalid request.",
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
| `field` | string | Tells you where the problem is (for example `body.calls`). |
| `message` | string | Describes what's wrong with that field. |
| `type` | string | Names the kind of validation error. |

### Which item failed, in a bulk request

On a bulk request, `extensions.index` tells you which call in the `calls` array caused the error (counting from 0):

```json
{
  "message": "Invalid phone number.",
  "extensions": {
    "code": "INVALID_PHONE_NUMBER",
    "index": 2
  }
}
```

On a single [`POST /v1/calls`](../api-reference/create-call.md), `INVALID_METADATA` and `INVALID_VARIABLES` use `index: 0`, and `INVALID_PHONE_NUMBER` has no `index`. A request-level `variables` error (one shared across the whole batch) uses `index: -1`.

### Rate limit

When you go over the limit, `extensions` tells you how long to wait and your per-minute limit. The same two values also come back as the `Retry-After` and `X-RateLimit-Limit` headers.

```json
{
  "message": "Rate limit exceeded. Please try again later.",
  "extensions": {
    "code": "RATE_LIMITED",
    "retry_after": 60,
    "limit": 300
  }
}
```

On a successful (2xx) response you normally also get `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers, so you can watch your remaining quota before you ever hit the limit. In rare cases (for example during an internal problem) rate limiting is skipped, and these headers may be missing.

---

## Reporting an error

There's no request ID to quote. When you report a problem, include the HTTP method and URL, the request and response bodies, and roughly when you sent the request. **Mask your API key** before you share anything.
