---
title: Filtering & Pagination
sidebar_label: Filtering & Pagination
sidebar_position: 3
---

# Filtering & Pagination

Everything about narrowing and paging through [`POST /v1/calls/list`](index.md): the `cursor`, `limit`, `date_from`, and `date_to` parameters, plus the `assistant_id`, `campaign_id`, and `call_bound_type` filters.

Calls are returned **newest first**, ordered by when each call took place (its start time), with the call id as a tiebreaker.

---

## How the parameters combine

| Request | What you get |
|---|---|
| No `date_from`, `date_to`, `cursor`, or `limit` | The **newest 50** terminal calls for your company. If more exist, `has_more` is `true` and `next_cursor` is set — send it back to get the next 50. |
| `limit` only (e.g. `200`) | The newest *N* calls in a single page (max 200). |
| `date_from` only | Calls on or after that day, newest first. Continue with `cursor`. |
| `date_to` only | Calls up to and including that day, newest first. Continue with `cursor`. |
| `date_from` + `date_to` | Calls inside the inclusive day range, newest first. |
| Any of the above **+ `cursor`** | The **next page** of that same query. Keep every other parameter identical across pages — only `cursor` changes. |

**Other filters.** `assistant_id`, `campaign_id`, and `call_bound_type` (`inbound` / `outbound`) narrow the scope further and combine with the date range and with each other (logical AND). `campaign_id` is the `batch_call_id` returned by [`POST /v1/calls/bulk`](../bulk-create-calls.md). Send the same filters on every page of a walk.

---

## `limit`

- Default **50**, maximum **200**, applied per page.
- A value outside the **1–200** range is rejected with `400 VALIDATION_FAILED`.
- `limit` sets the page size only — it does **not** cap how many calls you can retrieve in total. Keep paging with `cursor` to read everything.

## `cursor` {#cursors}

- Omit it on the **first** request.
- Every response returns `pagination.next_cursor`. While `has_more` is `true`, send that value back as `cursor` to fetch the next page.
- Stop when `has_more` is `false` (at that point `next_cursor` is `null`).
- The cursor is an **opaque** base64url token — a keyset marker over `(started_at, call id)` in descending order. Don't build or decode it. When you page with a cursor, **resend the same `assistant_id`, `campaign_id`, `call_bound_type`, `date_from`, and `date_to`, and `limit`**; the cursor only marks your position within that exact query.
- Don't persist cursors long-term (e.g. for days) — use them within a single sync session. For ongoing **incremental** sync, don't save a cursor between runs; instead remember the latest day you've already pulled and pass it as `date_from` on the next run (and deduplicate on `call_id`, since a day is re-scanned in full). A cursor marks a position *inside one query*, not a durable watermark. See the [incremental sync guide](../../guides/incremental-sync.md).

```bash
# First request (no cursor)
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":50}'

# Response: { "data": [...], "pagination": { "next_cursor": "X", "has_more": true } }

# Next request (use next_cursor)
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":50,"cursor":"X"}'

# Stop when has_more: false
```

Cursor errors:

| Status | Code | Meaning |
|---|---|---|
| `400` | `INVALID_CURSOR` | Cursor is empty or could not be decoded. Use a fresh cursor from a previous response. |
| `400` | `MALFORMED_CURSOR` | Cursor payload doesn't have the expected shape. Don't modify the cursor — use it exactly as returned. |

## The pagination object {#paginated}

Every page is wrapped in the same shape:

```json
{
  "data": [ /* calls */ ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0xNVQxMTowMjoxMCswMDowMCIsImkiOiJzZXNzXzZhNGIwZDNjMmY4MSJ9",
    "has_more": true,
    "limit": 50
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data` | array | Calls in this page. |
| `pagination.next_cursor` | string \| null | Opaque cursor for the next page. `null` on the last page. |
| `pagination.has_more` | boolean | Whether more calls exist after this page. |
| `pagination.limit` | int | Limit applied in this request. |

---

## Dates: `date_from` / `date_to` {#range-semantics}

Both parameters are **date-only** `YYYY-MM-DD` values, and both are **inclusive whole days**:

- `date_from` — the first day included ("from this day on")
- `date_to` — the last day included ("through this day")

Days are interpreted in **Europe/Istanbul** (UTC+3, fixed year-round; no daylight saving). Internally the range is `[date_from 00:00, (date_to + 1 day) 00:00)` in Istanbul time, so both endpoints' full local days are covered.

Send either one alone, or both together; omit both to scan from the very beginning. `date_from` after `date_to` is rejected with `DATE_RANGE_INVALID` (400).

### Accepted format

There is exactly one accepted format — a plain calendar date:

| Format | Example | Meaning |
|---|---|---|
| Date (`YYYY-MM-DD`) | `2026-05-23` | The whole day of May 23, in Europe/Istanbul |

There is **no** time or timezone component in the input — you pass a day, and the server applies Istanbul day boundaries for you.

### Rejected formats

| Format | Error Code | Problem |
|---|---|---|
| `2026-05-23T15:30:00Z` | `INVALID_DATE_FORMAT` | Has a time component — pass a date only |
| `2026-05-23 15:30:00` | `INVALID_DATE_FORMAT` | Not a plain date |
| `05/23/2026` | `INVALID_DATE_FORMAT` | Not `YYYY-MM-DD` — order is ambiguous |
| `23-05-2026` | `INVALID_DATE_FORMAT` | DD-MM-YYYY is not accepted |
| `2026-13-01` | `INVALID_DATE_FORMAT` | Invalid month (13) |
| `2026-02-30` | `INVALID_DATE_FORMAT` | Invalid day (February 30) |

Each rejection returns a structured 400 with the error code above. See the [Error Codes catalog](../../errors.md).

### Effective ranges

| Input | Effective Range (Europe/Istanbul) |
|---|---|
| `date_from=2026-05-23` | From `2026-05-23 00:00` onward |
| `date_to=2026-05-23` | Through `2026-05-23` (`< 2026-05-24 00:00`) |
| `date_from=2026-05-23` + `date_to=2026-05-23` | All of May 23 |
| `date_from=2026-05-01` + `date_to=2026-05-31` | All of May |

---

## Recipes

**A single day** — both ends inclusive, so all of May 23:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-23", "date_to": "2026-05-23" }
```

**A calendar month** — both ends inclusive, so May 1 through May 31:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-01", "date_to": "2026-05-31" }
```

**Everything since a day** — omit `date_to` to mean "up to now":

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-23" }
```

**Chaining windows without overlap** — because both ends are inclusive, one window's `date_to` and the next window's `date_from` must be **consecutive days**, never the same day:

```json
{ "date_from": "2026-05-01", "date_to": "2026-05-23" }
{ "date_from": "2026-05-24", "date_to": "2026-05-31" }
```

### Common pitfalls

| You send | What happens |
|---|---|
| `"2026-05-23T15:30:00Z"` (has a time) | `400 INVALID_DATE_FORMAT` — dates are day-only (`YYYY-MM-DD`) |
| `"23-05-2026"` or `"05/23/2026"` | `400 INVALID_DATE_FORMAT` — `YYYY-MM-DD` only |
| `date_from` after `date_to` | `400 DATE_RANGE_INVALID` |
