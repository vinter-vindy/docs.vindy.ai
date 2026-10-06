---
title: Filtering & Pagination
sidebar_label: Filtering & Pagination
sidebar_position: 3
---

# Filtering & Pagination

Everything about narrowing and paging through [`POST /v1/calls/list`](index.md): the `cursor`, `limit`, `date_from`, and `date_to` parameters, plus the `assistant_id`, `call_bound_type`, and `status` filters.

Calls are returned **newest first**, ordered by start time (falling back to creation time).

---

## How the parameters combine

| Request | What you get |
|---|---|
| No `date_from`, `date_to`, `status`, `cursor`, or `limit` | The **newest 200** terminal calls for your company. If more exist, `has_more` is `true` and `next_cursor` is set; send it back to get the next 200. |
| `limit` only (e.g. `500`) | The newest *N* calls in a single page (max 500). |
| `status: completed` or `status: failed` | Only calls with that outcome, newest first. These are the only two `status` values that match anything here. |
| `status: cancelled` / `pending` / `scheduled` / `in_progress` | An **empty page**. These queue statuses never match on this list; see the note below. |
| `date_from` only | Calls on or after that day, newest first. Continue with `cursor`. |
| `date_to` only | Calls up to and including that day, newest first. Continue with `cursor`. |
| `date_from` + `date_to` | Calls inside the inclusive day range, newest first. |
| Any of the above **+ `cursor`** | The **next page** of that same query. Keep every other parameter identical across pages; only `cursor` changes. |

**Other filters.** `assistant_id`, `call_bound_type` (`inbound` / `outbound`), and `status` narrow the scope further, and they combine with the date range and with each other (logical AND). Send the same filters on every page of a walk. To list the calls of one batch, use the dedicated [`POST /v1/calls/batches/:batchId/calls`](../get-batch-calls.md) endpoint instead; this list does not filter by batch.

:::note What `status` matches on this list
This list only ever returns **terminal** calls, so only `status: completed` and `status: failed` can match here. The four queue statuses (`cancelled`, `pending`, `scheduled`, `in_progress`) are still valid values, and all six are meaningful on [`POST /v1/calls/batches/:batchId/calls`](../get-batch-calls.md), but on this list they just return an empty page. An unknown value is rejected with `400 VALIDATION_FAILED`.
:::

---

## `limit`

- Default **200**, maximum **500**, applied per page. Sending `null` (or omitting `limit`) uses the default.
- A value outside the **1–500** range is rejected with `400 VALIDATION_FAILED`.
- `limit` sets the page size only; it does **not** cap how many calls you can retrieve in total. Keep paging with `cursor` to read everything.

## `cursor` {#cursors}

Think of the cursor as a bookmark. Each response hands you a bookmark that points at where the current page ended. You send that bookmark back on your next request, and the server continues from exactly that spot. You never build or read the bookmark yourself.

Here is the whole loop, with one filter (`assistant_id`) and a small page size.

**1. First request (no cursor).** You send your filters and a `limit`:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "limit": 50 }
```

You get back the newest 50 calls plus a `pagination` object. `next_cursor` is your bookmark, and `has_more: true` means more pages follow:

```json
{ "data": [ /* newest 50 calls */ ], "pagination": { "next_cursor": "eyJ0...", "has_more": true } }
```

**2. Next request (send the cursor back).** You repeat the same filters and add the bookmark you just received:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "limit": 50, "cursor": "eyJ0..." }
```

This returns the next 50 calls, together with a fresh `next_cursor` for the page after that.

**3. Repeat until `has_more` is `false`.** On that final page `next_cursor` is `null`, and your walk is finished.

The same walk in `curl`:

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

### Rules for the cursor

- **Omit it on the first request.** A cursor only exists after a response gives you one.
- **The cursor is opaque.** It is a base64url token that marks your position in the newest-first order (start time, falling back to creation time). Don't build it, decode it, or edit it; send it back exactly as you received it.
- **Keep your filters identical across pages.** When you page with a cursor, resend the same `assistant_id`, `call_bound_type`, `status`, `date_from`, and `date_to`. The cursor marks your position *within that one query*, so it is bound to the endpoint and filters that issued it. Only `limit` (the page size) may change between pages.
- **Changing a filter invalidates the cursor.** If you change any filter, or send the cursor to a different endpoint such as the batch-calls list, and reuse the cursor anyway, the request is rejected with `400 MALFORMED_CURSOR`. To query a different scope, start a fresh walk with no cursor.
- **Don't store cursors long-term.** Use a cursor within a single sync session, not for days. For ongoing **incremental** sync, don't save a cursor between runs. Instead remember the latest day you already pulled, pass it as `date_from` on the next run, and de-duplicate on `call_id` (a day is always re-scanned in full). A cursor marks a position inside one query, not a durable watermark. See the [incremental sync guide](../../guides/incremental-sync.md).

Cursor errors:

| Status | Code | Meaning |
|---|---|---|
| `400` | `INVALID_CURSOR` | Cursor is empty or could not be decoded. Use a fresh cursor from a previous response. |
| `400` | `MALFORMED_CURSOR` | Cursor can't be parsed, **or** it was issued for a different endpoint or a different set of filters. Don't modify the cursor; if you changed a filter or switched endpoints, start a fresh walk without a cursor. |

## The pagination object {#paginated}

Every page is wrapped in the same shape:

```json
{
  "data": [ /* calls */ ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0…",
    "has_more": true,
    "limit": 50
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data` | array | Holds the calls on this page. |
| `pagination.next_cursor` | string \| null | Holds the opaque cursor for the next page. It is `null` on the last page. |
| `pagination.has_more` | boolean | Tells you whether more calls exist after this page. |
| `pagination.limit` | int | Tells you the limit applied in this request. |

---

## Dates: `date_from` / `date_to` {#range-semantics}

Start with a concrete example. You ask for a single day:

```json
{ "date_from": "2026-05-23", "date_to": "2026-05-23" }
```

You get every call from May 23 in Istanbul time, from `00:00:00` right through `23:59:59`. Both the first day and the last day count in full. That is the core idea: `date_from` and `date_to` are **inclusive whole days**.

- `date_from` — the first day included ("from this day on")
- `date_to` — the last day included ("through this day")

A few details fill in the rest:

- Both values are **date-only** `YYYY-MM-DD`. There is no time or timezone part, so you pass a day and the server applies the day boundaries for you.
- Days are interpreted in **Europe/Istanbul** (UTC+3, fixed year-round, no daylight saving). So `date_to: 2026-05-23` means "through the end of May 23 in Istanbul", which the server treats as everything before `00:00` on May 24.
- Send either one alone, or both together. Omit both to scan from the very beginning.
- `date_from` after `date_to` is rejected with `400 DATE_RANGE_INVALID`.

:::note Failed calls without a start time
`date_from` / `date_to` match on a call's **start time**, falling back to its **creation time** for a call that never connected (some `no_answer` / `failed` calls have no start time). Such calls are therefore **included** in date-filtered results, so a date window is safe for incremental sync.
:::

### Accepted format

The only accepted format is a plain calendar date:

| Format | Example | Meaning |
|---|---|---|
| Date (`YYYY-MM-DD`) | `2026-05-23` | The whole day of May 23, in Europe/Istanbul |

There is **no** time or timezone component in the input. You pass a day, and the server applies Istanbul day boundaries for you.

### Rejected formats

| Format | Error Code | Problem |
|---|---|---|
| `2026-05-23T15:30:00Z` | `INVALID_DATE_FORMAT` | Has a time component; pass a date only |
| `2026-05-23 15:30:00` | `INVALID_DATE_FORMAT` | Not a plain date |
| `05/23/2026` | `INVALID_DATE_FORMAT` | Not `YYYY-MM-DD`; the order is ambiguous |
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

**A single day.** Both ends are inclusive, so this covers all of May 23:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-23", "date_to": "2026-05-23" }
```

**A calendar month.** Both ends are inclusive, so this covers May 1 through May 31:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-01", "date_to": "2026-05-31" }
```

**Everything since a day.** Omit `date_to` to mean "up to now":

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-23" }
```

**Chaining windows without overlap.** Because both ends are inclusive, one window's `date_to` and the next window's `date_from` must be **consecutive days**, never the same day:

```json
{ "date_from": "2026-05-01", "date_to": "2026-05-23" }
{ "date_from": "2026-05-24", "date_to": "2026-05-31" }
```

### Common pitfalls

| You send | What happens |
|---|---|
| `"2026-05-23T15:30:00Z"` (has a time) | `400 INVALID_DATE_FORMAT`; dates are day-only (`YYYY-MM-DD`) |
| `"23-05-2026"` or `"05/23/2026"` | `400 INVALID_DATE_FORMAT`; `YYYY-MM-DD` only |
| `date_from` after `date_to` | `400 DATE_RANGE_INVALID` |
