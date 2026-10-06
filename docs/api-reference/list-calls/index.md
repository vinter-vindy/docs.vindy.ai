---
title: List Calls
sidebar_label: List Calls
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/list`

Returns your company's calls — each with its transcript, the data your structured outputs extracted, any metadata you attached, and a recording link when one is ready. Results come back a page at a time via an opaque cursor, and you can narrow them by assistant, direction, and a range of days.

:::info Only finalized calls are returned
Only calls that are **ready to be shown to you** are returned. A call is ready when:

- It reached a **terminal** state — `completed` or `failed` — AND
- If it `completed`, its **post-call analysis has finished**, so `call_structured_data` is final when you read it. (A `failed` call has nothing to analyze, so it appears as soon as it's terminal.)

Calls still in progress are **never** included, and browser (WebRTC) calls never appear in the API at all. This makes your sync logic idempotent.

The audio **recording** is processed **asynchronously**, separately from the call, so its readiness is **never** a precondition for the call to be finalized or to appear here. A call surfaces as soon as it's finalized, even while its recording is still being prepared: `call_recording.available` can read `false` on one request and `true` on the same request a few seconds later. See [Recording retrieval](../../guides/recording-retrieval.md).
:::

A call becomes available **shortly after it ends** — usually within a few seconds, though it can take a few minutes when its post-call analysis runs long. So a call that just ended may not show up on your very next request.

:::tip Pull and push share the same signal
This endpoint is the **pull** counterpart of the [`call-ended` webhook](../webhooks.md): a call surfaces here and fires that webhook at the same moment it becomes ready. Use the webhook for real-time delivery, and this endpoint to fetch on demand or back-fill anything you may have missed.
:::

---

## Request

```http
POST https://api.vindy.ai/v1/calls/list
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "status": "completed",
  "date_from": "2026-05-01",
  "date_to": "2026-05-31",
  "limit": 50,
  "cursor": null
}
```

## Body parameters

Every field is **optional** — send an empty body to page through all of your company's terminal calls.

| Field | Type | Default | Description |
|---|---|---|---|
| `assistant_id` | string (UUID) | — | Send this to fetch only the calls handled by one assistant; get its id from [`GET /v1/assistants`](../list-assistants.md). Omit it to get calls from every assistant. |
| `call_bound_type` | string | — | Send `inbound` or `outbound` to narrow calls by direction. Any other value, or omitting it, applies no direction filter. |
| `status` | string | — | Send this to narrow the page to a single `call_status`. The meaningful values here are `completed` and `failed`; the four queue statuses are accepted but return an **empty page** (see the note below). Omit it for no status filter. An invalid value → `400 VALIDATION_FAILED`. |
| `date_from` | string (`YYYY-MM-DD`) | — | Narrows the list to calls on or after this day, the given day included. Days are read as calendar dates in Europe/Istanbul time. Omit it to scan from your earliest call. See [Filtering & Pagination](filtering-pagination.md). |
| `date_to` | string (`YYYY-MM-DD`) | — | Narrows the list to calls up to and including this day, again read in Europe/Istanbul time. Omit it to include everything up to now; sending `date_from` later than `date_to` is rejected. See [Filtering & Pagination](filtering-pagination.md). |
| `limit` | int | `200` | Sets how many calls come back per page (1–500). Omit it or send `null` to use the default of 200. |
| `cursor` | string | — | The opaque `next_cursor` from your previous page, sent back to fetch the next one. Omit it on the first request. |

**What each `call_status` means:**

- `completed` — the call connected and finished successfully.
- `failed` — the call ran but did not succeed (no answer, busy, rejected, or an error).
- `cancelled` — cancelled from the queue before it was dialed.
- `pending` — queued, waiting its turn.
- `scheduled` — queued for a future `scheduled_at` time, not yet due.
- `in_progress` — currently being dialed or in conversation.

Only `completed` and `failed` ever appear in this list; the other four are queue statuses, covered in the note below.

:::note Where to see queued, in-progress, and cancelled calls
This list only ever returns **terminal** calls (`completed` and `failed`). A call that is still queued, scheduled, in progress, or was cancelled before it was dialed never appears here, and asking for one of those statuses returns an empty page. To reach those calls, use one of the other two endpoints:

- **One specific call:** fetch it by id with [`GET /v1/calls/:callId`](../get-call.md). That endpoint returns a call in **any** state, including `pending`, `scheduled`, `in_progress`, and `cancelled`.
- **A whole batch:** list it with [`POST /v1/calls/batches/:batchId/calls`](../get-batch-calls.md). That endpoint returns **all** of a batch's statuses, not just the terminal ones.

The `status` filter spans all six values because these three endpoints share it. On this list, only `completed` and `failed` can ever match; the other four queue statuses return an empty page here.
:::

**Combining filters.** `assistant_id`, `call_bound_type`, `status`, and the date range are independent filters — pass any combination and a call must satisfy all of them to be returned (logical AND). Omit them all to scan every terminal call your company has.

**Validation rules:**

- `date_from` after `date_to` → 400 (`DATE_RANGE_INVALID`).
- `limit` outside 1–500 → 400 (`VALIDATION_FAILED`).
- `status` not one of `completed`, `failed`, `cancelled`, `pending`, `scheduled`, `in_progress` → 400 (`VALIDATION_FAILED`).
- See [Filtering & Pagination](filtering-pagination.md) for date behavior and accepted formats.

## Pagination and filtering

Two independent controls shape your results, and they work together cleanly.

- **The filters** (`assistant_id`, `call_bound_type`, `status`, `date_from` / `date_to`) decide *which* calls are in scope. All are optional.
- **The cursor** (`cursor` / `limit`) walks *through* that scope one page at a time, newest first.

Use either on its own, or both together. If you send no filters and no cursor, you page through every one of your calls from newest to oldest. The first request returns the newest `limit` calls (200 by default), and you keep going until nothing is left. Adding filters narrows the scope, and you page through that scope the same way.

The rule for paging is always the same. Send your filters on the first request. On each following request, send back the `next_cursor` you received, unchanged, and keep `assistant_id`, `call_bound_type`, `status`, `date_from`, and `date_to` exactly as they were. Only `limit` may change from page to page. A cursor records your position inside one specific query, so it is valid only for the exact endpoint and filters that issued it. If you change a filter (or send the cursor to a different endpoint) and reuse the cursor anyway, the request is rejected with `400 MALFORMED_CURSOR`, so drop the cursor and start a fresh walk. You are done when `has_more` is `false`, at which point `next_cursor` is `null`.

The step-by-step walk, the full parameter reference, accepted date formats, and copy-paste recipes live in **[Filtering & Pagination](filtering-pagination.md)**.

## Response (200 OK)

```json
{
  "data": [
    {
      "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "completed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905551112233",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T10:30:00+00:00",
      "call_ended_at": "2026-05-15T10:31:27+00:00",
      "call_created_at": "2026-05-15T10:29:55+00:00",
      "call_duration_seconds": 87,
      "call_end_reason": "completed",
      "call_transcript": "[10:30:00] Asistan: Hi, this is Vindy, your AI assistant, calling about your recent order. Do you have a moment for a short satisfaction survey?\n[10:30:07] Müşteri: Sure, go ahead.\n[10:30:11] Asistan: Thank you. On a scale of 1 to 5, how satisfied were you with your overall experience?\n[10:30:18] Müşteri: I'd say a four.\n[10:30:23] Asistan: Glad to hear it. Is there anything about your order you weren't happy with?\n[10:30:29] Müşteri: No, everything was fine.\n[10:30:34] Asistan: Great. Would you like a representative to call you back about anything?\n[10:30:40] Müşteri: No, that won't be necessary.\n[10:30:45] Asistan: Thank you so much for your time — have a great day!\n[10:30:50] Müşteri: You too, thanks.",
      "call_structured_data": {
        "arama_sonucu": "tamamlandi",
        "genel_memnuniyet_puani": 4,
        "geri_arama_talebi": false,
        "ilgilenilen_urunler": null
      },
      "call_metadata": { "order_id": "ORD-4821" },
      "call_variables": { "first_name": "Elif" },
      "call_recording": {
        "available": true,
        "url": "https://...",
        "expires_at": "2026-05-16T10:31:27+00:00"
      }
    },
    {
      "call_id": "019fb39a-2e5f-7c14-9a8b-1d3c5e7f9a20",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "failed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905554445566",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T11:02:10+00:00",
      "call_ended_at": "2026-05-15T11:02:16+00:00",
      "call_created_at": "2026-05-15T11:01:58+00:00",
      "call_duration_seconds": 0,
      "call_end_reason": "User Busy",
      "call_transcript": null,
      "call_structured_data": null,
      "call_metadata": { "order_id": "ORD-4822" },
      "call_variables": { "first_name": "Deniz" },
      "call_recording": {
        "available": false
      }
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0…",
    "has_more": true,
    "limit": 50
  }
}
```

`pagination.next_cursor` is an **opaque** token — send it back verbatim to fetch the next page; don't decode it (see [Filtering & Pagination](filtering-pagination.md#cursors)).

`call_transcript` is a single string; each turn within it is separated by a newline (`\n`). JSON escapes those newlines, so the value above shows on one line. Rendered with real line breaks, the first call's transcript reads:

```text
[10:30:00] Asistan: Hi, this is Vindy, your AI assistant, calling about your recent order. Do you have a moment for a short satisfaction survey?
[10:30:07] Müşteri: Sure, go ahead.
[10:30:11] Asistan: Thank you. On a scale of 1 to 5, how satisfied were you with your overall experience?
[10:30:18] Müşteri: I'd say a four.
[10:30:23] Asistan: Glad to hear it. Is there anything about your order you weren't happy with?
[10:30:29] Müşteri: No, everything was fine.
[10:30:34] Asistan: Great. Would you like a representative to call you back about anything?
[10:30:40] Müşteri: No, that won't be necessary.
[10:30:45] Asistan: Thank you so much for your time — have a great day!
[10:30:50] Müşteri: You too, thanks.
```

:::note Failed calls are included too
The list returns `failed` calls as well as `completed` ones — not only successful conversations. A call that never connected (for example a `failed` no-answer) has no conversation or audio, so its time-based fields are `null` and `call_recording.available` is `false`. Your code should tolerate these nulls.

Note that `date_from` / `date_to` match on a call's **start time**, falling back to its **creation time** for a call that never connected — so `no_answer` / `failed` calls are **included** in date-filtered results too.

```json
{
  "call_id": "019fb3a4-8b6d-7f33-a2e1-4c9f0b2d6e18",
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "call_status": "failed",
  "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "call_assistant_name": "Vindy - Asistan",
  "call_phone_number": "+905557778899",
  "call_bound_type": "outbound",
  "call_started_at": null,
  "call_ended_at": null,
  "call_created_at": "2026-05-15T11:05:00+00:00",
  "call_duration_seconds": null,
  "call_end_reason": "no_answer",
  "call_transcript": null,
  "call_structured_data": null,
  "call_metadata": { "order_id": "ORD-4823" },
  "call_variables": { "first_name": "Selin" },
  "call_recording": { "available": false }
}
```
:::

## Response fields

**Top-level**

| Field | Type | Description |
|---|---|---|
| `data` | array | Holds the calls on the current page. |
| `pagination` | object | Carries the standard [pagination object](filtering-pagination.md#paginated) you use to walk to the next page. |

**Call object**

| Field | Type | Description |
|---|---|---|
| `call_id` | string | Identifies the call uniquely and permanently in our system. Use it wherever an endpoint takes a `:callId` — for example [`GET /v1/calls/:callId`](../get-call.md) to fetch this call, or [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md) for a fresh recording link — and to match the call to its [`call-ended` webhook](../webhooks.md) payload. |
| `batch_call_id` | string \| null | Identifies the batch this call belongs to, and matches the `batch_call_id` that [`POST /v1/calls/bulk`](../bulk-create-calls.md) returned, so you can group a batch's calls together — for example while handling `call-ended` webhooks. It is `null` when the call isn't part of a batch, which is the case for a single call from [`POST /v1/calls`](../create-call.md) and for any inbound call. |
| `call_status` | string | Gives the call's terminal status, which is either `completed` or `failed`. A call that is still in progress, or that was cancelled while queued, never reaches this list. |
| `call_assistant_id` | string (UUID) | Identifies the assistant that handled this call, and matches the `assistant_id` returned by [`GET /v1/assistants`](../list-assistants.md). |
| `call_assistant_name` | string \| null | Gives that assistant's display name. It is `null` on the rare occasion the name can't be resolved. |
| `call_phone_number` | string \| null | Holds the other party's number on the call: the number dialed on an outbound call, or the caller's number on an inbound one, usually in E.164 format. It is `null` when the number isn't available, as with an anonymous inbound caller. |
| `call_bound_type` | `inbound` \| `outbound` | Tells you the call's direction: `inbound` means the customer called you, and `outbound` means the assistant placed the call. It is never `null`. |
| `call_started_at` | ISO 8601 (UTC) \| null | Marks the moment the call actually started, written with a `+00:00` offset (for example `2026-05-15T10:30:00+00:00`). Parse it with a real ISO 8601 parser rather than assuming a `Z` suffix or a fixed millisecond precision. It is `null` if the call never connected. |
| `call_ended_at` | ISO 8601 (UTC) \| null | Marks the moment the call ended, in the same format. It is `null` if the call never connected. |
| `call_created_at` | ISO 8601 (UTC) | Marks the moment we created the call record, in the same format. |
| `call_duration_seconds` | int \| null | Tells you how long the call lasted, in seconds. It is `null` when the call never connected, as with a no-answer `failed` call. |
| `call_end_reason` | string \| null | Gives the raw reason the call ended, returned to you as a free-form string without any mapping. See [End reasons](#end-reasons) below. |
| `call_transcript` | string \| null | Holds the plain-text transcript of the conversation. Each line reads `[HH:MM:SS] Asistan:` for the assistant or `[HH:MM:SS] Müşteri:` for the caller — Turkish role labels, each prefixed with a UTC `HH:MM:SS` timestamp — and the lines are separated by newlines (`\n`). It may be empty or `null` for a very short or failed call. |
| `call_structured_data` | object \| null | Holds the data the AI extracted, returned as a flat object whose keys are your assistant's structured output schema properties (see [Structured data shapes](#structured-data-shapes)). It is `null` when the assistant has no structured output schema, when nothing could be extracted, or when the stored data couldn't be parsed. Even when the object is present, an individual value inside it can be `null` where that particular field couldn't be extracted, so parse each one defensively. |
| `call_metadata` | object \| null | Returns, verbatim, the metadata you attached when you created the call, so you can line the call up with your own records. It is `null` if the call was created without metadata. See [Metadata](../bulk-create-calls.md#metadata) for the rules. |
| `call_variables` | object \| null | Returns, verbatim, the template variables sent for this call — the same object you passed as `variables` when you created it. It is `null` when none were sent, as with inbound calls. |
| `call_recording` | object | Tells you whether the call's recording is ready and, when it is, where to download it. Its fields are listed below. |

**`call_recording` object**

| Field | Type | Description |
|---|---|---|
| `available` | bool | Tells you whether a downloadable recording exists for this call. |
| `url` | string \| absent | Gives you a presigned download URL that stays valid for about **24 hours** (86400s by default, and configurable). It is present only when `available: true`. **Don't store it** — fetch a fresh one from [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md) when you need it. |
| `expires_at` | ISO 8601 (UTC) \| absent | Marks the moment the URL stops working. It is present only when `available: true`. |

### `call_recording.available: false` — what it means {#recording-not-available}

`available: false` happens for two different reasons — one temporary, one permanent:

- **Not ready yet (temporary).** The call is finalized but its audio recording is still transferring to durable storage — normal in the moments right after a call ends (a call appears here as soon as it's finalized, **independent** of its recording). It will become available shortly: re-fetch a little later, or subscribe to the [`recording-ready` webhook](../webhooks.md#recording-ready), which fires the moment it lands.
- **None will ever exist (terminal).** No recording was produced (e.g. a very short or failed call with no audio), or the transfer to durable storage **permanently failed**. Retrying won't help.

To tell them apart, call [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md): `409 RECORDING_NOT_READY` means it's still processing (temporary — try again soon), while `404 RECORDING_NOT_AVAILABLE` confirms none will ever exist (terminal). Contact the Vindy team if you believe a recording should exist but only ever get `404`.

:::note Discrepancy with the panel
The Vindy panel may display recordings from other sources (e.g., a temporary provider URL). For security, the API only serves recordings from durable storage. Seeing a recording in the panel but not via the API is expected; **the API response is the authoritative customer-facing contract**.
:::

### Structured data shapes {#structured-data-shapes}

`call_structured_data` is the data the AI extracted according to **your assistant's structured output schema**, returned as a **flat object** whose keys are your schema's properties (e.g. `age`, `would_recommend`). It is **not** keyed by an output ID and has no `name`/`result` wrapper. Its values can hold scalars, nested objects, and arrays — including arrays of objects — exactly as your schema defines them. It is `null` when the assistant has no structured output schema, when nothing could be extracted, or when the stored data couldn't be parsed. Beyond that, **individual fields can come back `null`** even when the object itself is present — that means the assistant ran your schema but couldn't extract that particular value, so check each field before you use it. For example, an *Order Summary* schema might return:

```json
{
  "call_structured_data": {
    "customer_name": "Jane Doe",
    "callback_requested": false,
    "coupon_code": null,
    "orders": [
      { "product": "Wireless Keyboard", "quantity": 2, "in_stock": true },
      { "product": "USB-C Cable", "quantity": 5, "in_stock": false }
    ],
    "shipping": {
      "city": "Istanbul",
      "methods": ["standard", "express"]
    }
  }
}
```

The object's keys and shape mirror the structured output schema you defined for your assistant (returned by [`GET /v1/assistants`](../list-assistants.md)), so you can parse it field by field.

## Call end reasons {#end-reasons}

`call_status` (`completed` / `failed`) is a derived summary of the call; `call_end_reason` is the **specific raw reason** it ended, returned unmapped. An outbound call that never reached a normal conversation comes back with **`call_status: failed`** and a reason such as `no_answer`, `busy`, or `rejected`. **Treat `call_end_reason` as an opaque string — do not rely on a fixed enum.** Common values:

| Value | Description |
|---|---|
| `completed` | The call ran to a normal conclusion. (`call_status: completed`.) |
| `user_hangup` | The customer (end-user) hung up. (`call_status: completed`.) |
| `no_answer` | Outbound: the call was never answered, including a ring timeout. (`call_status: failed`.) |
| `busy` | Outbound: the line was busy. (`call_status: failed`.) |
| `rejected` | Outbound: the callee declined/rejected the call. (`call_status: failed`.) |
| `error` | The call ended due to an error in the pipeline (provider, model, etc.). (`call_status: failed`.) |
| `silence_timeout` | The call was ended after a long silence. |
| `end_call_phrase` | A configured end-of-call phrase was detected. |
| `idle_limit` | The call was ended after an idle period with no activity. |
| `max_duration` | The maximum call duration was reached. |
| `end_call_tool` | The assistant ended the call via its end-call tool. |

Other values may appear, including **raw provider/SIP status text** (e.g. `User Busy`, `486`), and the set grows as new providers and adapters are added. In particular, an unanswered, busy, or rejected outbound call often carries that raw provider text rather than the tidy `no_answer` / `busy` / `rejected` label above, so treat those three as representative categories, not guaranteed literals. If you keep a known-value list, **don't fail on unknown reasons** — log them and continue. When you need the pass/fail summary rather than the specific reason, read `call_status`, not `call_end_reason`.

## Errors

| Status | Code | Description |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` out of range; malformed body; etc. |
| `400` | `DATE_RANGE_INVALID` | `date_from` after `date_to` |
| `400` | `INVALID_DATE_FORMAT` | Date is not a plain `YYYY-MM-DD` value |
| `400` | `INVALID_CURSOR` | Cursor is empty or cannot be decoded |
| `400` | `MALFORMED_CURSOR` | Cursor can't be parsed, or is for a different endpoint/filters |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Auth errors |
| `429` | `RATE_LIMITED` | Per-minute rate limit exceeded; wait the number of seconds in the `Retry-After` header, then retry |

## Examples

### Walk all pages

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# First request (no cursor)
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":50}'

# Response: { "data": [50 calls], "pagination": { "next_cursor": "X", "has_more": true } }

# Next request (use next_cursor)
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":50,"cursor":"X"}'

# Stop when has_more: false
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function listAllCalls(assistantId) {
  const calls = [];
  let cursor = undefined;

  do {
    const response = await fetch("https://api.vindy.ai/v1/calls/list", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assistant_id: assistantId, limit: 50, cursor }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${error.extensions?.code}: ${error.message}`);
    }

    const body = await response.json();
    calls.push(...body.data);
    cursor = body.pagination.next_cursor;
  } while (cursor);

  return calls;
}

const calls = await listAllCalls("8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01");
console.log(`${calls.length} calls`);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def list_all_calls(assistant_id):
    calls = []
    cursor = None

    while True:
        payload = {"assistant_id": assistant_id, "limit": 50}
        if cursor:
            payload["cursor"] = cursor

        response = requests.post(
            "https://api.vindy.ai/v1/calls/list",
            headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
            json=payload,
        )
        if not response.ok:
            error = response.json()
            raise RuntimeError(f"{error.get('extensions', {}).get('code')}: {error.get('message')}")

        body = response.json()
        calls.extend(body["data"])
        cursor = body["pagination"]["next_cursor"]
        if not cursor:
            break

    return calls

calls = list_all_calls("8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01")
print(f"{len(calls)} calls")
```

</TabItem>
</Tabs>

### List one batch's calls

This endpoint does not filter by batch. To page through the calls of a specific batch, use the dedicated [`POST /v1/calls/batches/:batchId/calls`](../get-batch-calls.md) endpoint — it also includes the batch's not-yet-dialed, in-progress, and cancelled calls.

### Date range — single day

```bash
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "date_from": "2026-05-23",
    "date_to": "2026-05-23"
  }'
```

`date_from` and `date_to` are inclusive whole days interpreted in **Europe/Istanbul**, so **all of May 23 is included** — see [date semantics](filtering-pagination.md#range-semantics).

### Date range — a calendar month

```bash
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "date_from": "2026-05-01",
    "date_to": "2026-05-31"
  }'
```

For periodic sync patterns, see the [incremental sync guide](../../guides/incremental-sync.md).
