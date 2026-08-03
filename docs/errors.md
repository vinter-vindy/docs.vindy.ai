---
title: Error Codes
sidebar_label: Error Codes
sidebar_position: 6
---

# Error Codes

Every error carries a machine-readable code at `extensions.code`. Branch on that code in your own `switch/case` logic instead of parsing the human-readable `message`, which may change. There is **no** top-level `code` field — always read it from `extensions.code`.

All error responses share the same JSON shape — see the [error format](concepts/response-envelopes.md#error-envelope).

---

## Catalog

| Code | Status | Description | What to do |
|---|---|---|---|
| `MISSING_AUTH_HEADER` | 401 | `Authorization` header is missing. | Add the header. |
| `INVALID_AUTH_FORMAT` | 401 | Header is not in `Bearer <api-key>` format. | Fix the format. |
| `INVALID_API_KEY` | 401 | API key is invalid, expired, or revoked. | Generate a new key. |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found or not in your company — a call, a batch, or a call task. | Verify the ID. Across companies you can't tell whether it exists. |
| `VALIDATION_FAILED` | 400 | Body or path parameter validation failed. | Fix per `extensions.validation_errors` (see below). |
| `RATE_LIMITED` | 429 | Per-minute rate limit exceeded. | Back off and retry after `Retry-After` seconds (default 60). |
| `INVALID_DATE_FORMAT` | 400 | `date_from` / `date_to` is not a `YYYY-MM-DD` date. | Use a plain date. See [Filtering & Pagination](api-reference/list-calls/filtering-pagination.md). |
| `DATE_RANGE_INVALID` | 400 | `date_from` is after `date_to`. | Fix the range. |
| `INVALID_CURSOR` | 400 | Cursor is empty or could not be decoded. | Use a fresh cursor from a previous response. |
| `MALFORMED_CURSOR` | 400 | Cursor payload doesn't have the expected shape. | Don't modify the cursor; use it as returned. |
| `INVALID_PHONE_NUMBER` | 400 | A `calls[i].phone_number` could not be normalized. | Fix the number; the offending index is in `extensions.index`. See [Create a Call Batch](api-reference/bulk-create-calls.md#phone-numbers). |
| `INVALID_METADATA` | 400 | A call's metadata exceeds the limits or uses an invalid value type. | Stay within the limits; the offending index is in `extensions.index`. See [Create a Call Batch](api-reference/bulk-create-calls.md#metadata). |
| `INVALID_VARIABLES` | 400 | A `variables` object violates the limits (≤50 keys; key ≤40; value ≤500; string/number/boolean, no nesting). | For a per-call value the offending index is in `extensions.index`; a request-level violation reports `index: -1`. |
| `ASSISTANT_NOT_FOUND` | 404 | Assistant not found, not in your company, or not callable. | Verify the `assistant_id`. |
| `PHONE_NUMBER_NOT_FOUND` | 404 | The `phone_number_id` on `POST /v1/calls/bulk` is unknown, malformed, or not in your company. | Pick a caller line from [`GET /v1/phone-numbers`](api-reference/list-phone-numbers.md). |
| `PHONE_NUMBER_NOT_USABLE` | 400 | The `phone_number_id` line exists but is not ready for outbound (not provisioned). | Choose a provisioned line from [`GET /v1/phone-numbers`](api-reference/list-phone-numbers.md). |
| `RECORDING_NOT_AVAILABLE` | 404 | The call exists but no recording was ever produced for it. **Terminal.** | Don't retry. See [Get a Recording URL](api-reference/get-recording-url.md). |
| `RECORDING_NOT_READY` | 409 | A recording exists but is not downloadable yet. | Try again shortly. See [Get a Recording URL](api-reference/get-recording-url.md). |
| `ERR_CALL_NOT_CANCELLABLE` | 409 | Only a call still in the queue can be cancelled; this one is already being dialed (or was just dispatched). | Don't retry; wait for the outcome. See [Cancel a Call](api-reference/cancel-call.md). |

---

## Reading the detail

Some errors attach extra machine-readable fields inside `extensions`:

| Field | Appears on | What it holds |
|---|---|---|
| `extensions.validation_errors` | `VALIDATION_FAILED` | An **array of objects**, each `{ "field": "body.calls", "message": "...", "type": "..." }`, pinpointing what failed. |
| `extensions.index` | `INVALID_PHONE_NUMBER`, `INVALID_METADATA`, `INVALID_VARIABLES` | The integer index of the offending entry in the `calls` array you sent (`-1` for a request-level `variables` violation). |
| `extensions.retry_after`, `extensions.limit` | `RATE_LIMITED` | Seconds to wait (also in the `Retry-After` header) and your per-minute limit. |

:::note Unexpected 5xx errors
An unexpected server error may **not** follow the uniform envelope: a raw `500` can return the framework default `{ "detail": "Internal Server Error" }` with no `extensions.code`. There is no `HTTP_500` code. Don't rely on a code being present for `5xx` — treat any `5xx` as a transient server error and report it (see the [FAQ](faq.md#how-do-i-report-an-issue)).
:::
