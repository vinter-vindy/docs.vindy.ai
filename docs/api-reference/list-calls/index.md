---
title: List Calls
sidebar_label: List Calls
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/list`

Returns your company's calls — each with its transcript, the data your structured outputs extracted, any metadata you attached, and a recording link when one is ready. Results come back a page at a time via an opaque cursor, and you can narrow them by assistant, campaign, direction, and a range of days.

:::info No half-baked data
Only calls that are **ready to be shown to you** are returned. A call is ready when:

- It reached a **terminal** state — `completed` or `failed` — AND
- If a recording exists, the recording transfer has settled (success or permanent failure)

Calls still in progress are **never** included, and browser (WebRTC) calls never appear in the API at all. This makes your sync logic idempotent.
:::

A call becomes available **shortly after it ends** — once its recording has finished transferring to durable storage. This typically takes a few seconds, and occasionally up to a few minutes for longer recordings. Until a call is ready it appears in neither this list nor the `call-ended` webhook, so a call that just ended may not show up on your very next request.

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
| `assistant_id` | string (UUID) | — | Only calls handled by this assistant. From [`GET /v1/assistants`](../list-assistants.md). |
| `campaign_id` | string (UUID) | — | Only calls from this campaign — the `batch_call_id` returned by [`POST /v1/calls/bulk`](../bulk-create-calls.md). |
| `call_bound_type` | string | — | `inbound` or `outbound`. Any other value (or omitting it) applies no direction filter. |
| `date_from` | string (`YYYY-MM-DD`) | — | Include calls from this day onward. See [Filtering & Pagination](filtering-pagination.md). |
| `date_to` | string (`YYYY-MM-DD`) | — | Include calls up to and including this day. See [Filtering & Pagination](filtering-pagination.md). |
| `limit` | int | `50` | Maximum items in this page. Range: 1–200. |
| `cursor` | string | — | Opaque cursor from a previous `next_cursor`. Omit on the first request. |

**Combining filters.** `assistant_id`, `campaign_id`, `call_bound_type`, and the date range are independent — pass any subset and they combine (logical AND). Omit them all to scan every terminal call your company has.

**Validation rules:**

- `date_from` after `date_to` → 400 (`DATE_RANGE_INVALID`).
- `limit` outside 1–200 → 400 (`VALIDATION_FAILED`).
- See [Filtering & Pagination](filtering-pagination.md) for date behavior and accepted formats.

## Pagination and filtering

Two independent controls shape the result, and they compose cleanly:

- **The filters** (`assistant_id`, `campaign_id`, `call_bound_type`, `date_from` / `date_to`) decide *which* calls are in scope. All are optional.
- **The cursor** (`cursor` / `limit`) walks *through* that scope, one page at a time, **newest first**.

You can use either on its own or both together. With no filters and no cursor, you simply page through all of your calls, **newest first** — the first request returns the newest `limit` calls (50 by default), and you keep going until there's nothing left. Add filters and you page through only that scope the same way. In every case the rule is the same: send your filters on the first request, then on each following request send back the `next_cursor` you received — **unchanged** — while keeping `assistant_id`, `campaign_id`, `call_bound_type`, `date_from`, `date_to`, and `limit` exactly as they were. The cursor encodes your position *within that specific query*, so changing a filter halfway through a walk produces meaningless results. You're done when `has_more` is `false` (at which point `next_cursor` is `null`).

The full parameter reference, accepted date formats, and copy-paste recipes live in **[Filtering & Pagination](filtering-pagination.md)**.

## Response (200 OK)

```json
{
  "data": [
    {
      "call_id": "sess_5f3a9c2b1e7d",
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
      "call_transcript": "[10:30:00] Asistan: Hi, this is Vindy, your AI assistant. I'd like to ask a few quick questions for our customer satisfaction survey — is now a good time?\n[10:30:07] Müşteri: Sure, go ahead.\n[10:30:11] Asistan: Thank you. First, may I ask your age?\n[10:30:16] Müşteri: Thirty-two.\n[10:30:21] Asistan: How would you rate your overall satisfaction with our service, on a scale of 1 to 5?\n[10:30:29] Müşteri: I'd say a four.\n[10:30:34] Asistan: And how would you rate how quickly our team resolved your request, from 1 to 5?\n[10:30:42] Müşteri: Five.\n[10:30:47] Asistan: Would you recommend us to a friend or colleague?\n[10:30:53] Müşteri: Yes, I would.\n[10:30:58] Asistan: Thank you so much — your feedback means a lot to us. Have a great day!\n[10:31:05] Müşteri: You're welcome, you too.",
      "call_structured_data": {
        "age": 32,
        "overall_satisfaction": 4,
        "support_speed": 5,
        "would_recommend": true
      },
      "call_metadata": { "crm_contact_id": "CNT-90412" },
      "call_variables": { "first_name": "Batu" },
      "call_recording": {
        "available": true,
        "url": "https://...",
        "expires_at": "2026-05-15T10:36:27+00:00"
      }
    },
    {
      "call_id": "sess_6a4b0d3c2f81",
      "call_status": "completed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905554445566",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T11:02:10+00:00",
      "call_ended_at": "2026-05-15T11:02:20+00:00",
      "call_created_at": "2026-05-15T11:01:58+00:00",
      "call_duration_seconds": 10,
      "call_end_reason": "user_hangup",
      "call_transcript": "[11:02:10] Asistan: Hi, this is Vindy calling about our customer satisfaction survey. Is now a good time?\n[11:02:16] Müşteri: Sorry, wrong number.",
      "call_structured_data": null,
      "call_metadata": null,
      "call_variables": { "first_name": "Batu" },
      "call_recording": {
        "available": false
      }
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0xNVQxMTowMjoxMCswMDowMCIsImkiOiJzZXNzXzZhNGIwZDNjMmY4MSJ9",
    "has_more": true,
    "limit": 50
  }
}
```

`call_transcript` is a single string; each turn within it is separated by a newline (`\n`). JSON escapes those newlines, so the value above shows on one line. Rendered with real line breaks, the first call's transcript reads:

```text
[10:30:00] Asistan: Hi, this is Vindy, your AI assistant. I'd like to ask a few quick questions for our customer satisfaction survey — is now a good time?
[10:30:07] Müşteri: Sure, go ahead.
[10:30:11] Asistan: Thank you. First, may I ask your age?
[10:30:16] Müşteri: Thirty-two.
[10:30:21] Asistan: How would you rate your overall satisfaction with our service, on a scale of 1 to 5?
[10:30:29] Müşteri: I'd say a four.
[10:30:34] Asistan: And how would you rate how quickly our team resolved your request, from 1 to 5?
[10:30:42] Müşteri: Five.
[10:30:47] Asistan: Would you recommend us to a friend or colleague?
[10:30:53] Müşteri: Yes, I would.
[10:30:58] Asistan: Thank you so much — your feedback means a lot to us. Have a great day!
[10:31:05] Müşteri: You're welcome, you too.
```

:::note Failed calls are included too
The list returns `failed` calls as well as `completed` ones — not only successful conversations. A call that never connected (for example a `failed` no-answer) has no conversation or audio, so its time-based fields are `null` and `call_recording.available` is `false`. Your code should tolerate these nulls:

```json
{
  "call_id": "sess_7b5c1e4d3a09",
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
  "call_metadata": { "crm_contact_id": "CNT-90418" },
  "call_variables": { "first_name": "Batu" },
  "call_recording": { "available": false }
}
```
:::

## Response fields

**Top-level**

| Field | Type | Description |
|---|---|---|
| `data` | array | Calls in this page. |
| `pagination` | object | Standard [pagination object](filtering-pagination.md#paginated). |

**Call object**

| Field | Type | Description |
|---|---|---|
| `call_id` | string | The call's stable, unique identifier in our system. Use it wherever an endpoint takes a `:callId` — for example [`GET /v1/calls/:callId`](../get-call.md) to fetch this call or [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md) for a fresh recording link — and to correlate the call with its [`call-ended` webhook](../webhooks.md) payload. |
| `call_status` | string | `completed` \| `failed`. Ongoing and cancelled-in-queue calls never reach this list. |
| `call_assistant_id` | string (UUID) \| null | Assistant that handled the call. |
| `call_assistant_name` | string \| null | Display name of the assistant. |
| `call_phone_number` | string \| null | Phone number called or calling (E.164 format when available). `null` when the number is unavailable (e.g. an anonymous inbound caller). |
| `call_bound_type` | string \| null | `inbound` \| `outbound` \| `null` |
| `call_started_at` | ISO 8601 (UTC) \| null | When the call actually started, in `+00:00` offset form (e.g. `2026-05-15T10:30:00+00:00`). Parse it with a real ISO-8601 parser — don't assume a `Z` suffix or fixed millisecond precision. `null` if the call never connected. |
| `call_ended_at` | ISO 8601 (UTC) \| null | When the call ended, same format. `null` if the call never connected. |
| `call_created_at` | ISO 8601 (UTC) | When we created the call record, same format. |
| `call_duration_seconds` | int \| null | Call duration in seconds. |
| `call_end_reason` | string \| null | A free-form string — the raw reason the call ended, returned unmapped. See [End reasons](#end-reasons) below. |
| `call_transcript` | string \| null | Plain-text transcript of the conversation. Each line is `[HH:MM:SS] Asistan:` (assistant, `Asistan`) or `[HH:MM:SS] Müşteri:` (caller, `Müşteri`) — Turkish role labels prefixed with a UTC `HH:MM:SS` timestamp — separated by newlines (`\n`). May be empty or null for very short or failed calls. |
| `call_structured_data` | object \| null | AI-extracted data, returned as a flat object whose keys are your assistant's structured output schema properties — see [Structured data shapes](#structured-data-shapes). `null` when the assistant has no structured output schema or nothing could be extracted (or the stored data couldn't be parsed). |
| `call_metadata` | object \| null | The metadata you attached when creating the call via [`POST /v1/calls/bulk`](../bulk-create-calls.md), returned to you verbatim for correlation. `null` if the call was created without metadata. See [Metadata](../bulk-create-calls.md#metadata) for the rules. |
| `call_variables` | object \| null | The template variables sent for this call, echoed back verbatim — the same object you passed as `variables` when creating the call. `null` when none were sent (e.g. inbound calls). |
| `call_recording` | object | Recording availability + URL (below). |

**`call_recording` object**

| Field | Type | Description |
|---|---|---|
| `available` | bool | Whether a downloadable recording exists for this call. |
| `url` | string \| absent | Presigned URL, valid for **~24 hours** (default 86400s, configurable). Present only when `available: true`. **Don't store it** — fetch a fresh one from [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md) when you need it. |
| `expires_at` | ISO 8601 (UTC) \| absent | When the URL expires. Present only when `available: true`. |

### `call_recording.available: false` — what it means {#recording-not-available}

This state is **terminal** — retrying does not help. If a call appears in this list, its recording state is finalized (this endpoint does NOT return calls whose recording transfer is still in progress). `available: false` indicates one of:

- No recording was produced for this call (e.g., very short or failed call where no audio was captured)
- The recording transfer to durable storage **permanently failed**

For a fresh link, call [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md): a `404 RECORDING_NOT_AVAILABLE` confirms no recording exists, and a `409 RECORDING_NOT_READY` means it isn't downloadable yet. Contact the Vindy team if you believe the recording should exist.

:::note Discrepancy with the panel
The Vindy admin panel may display recordings from other sources (e.g., a temporary provider URL). For security, the API only serves recordings from durable storage. Seeing a recording in the panel but not via the API is expected; **the API response is the authoritative customer-facing contract**.
:::

### Structured data shapes {#structured-data-shapes}

`call_structured_data` is the data the AI extracted according to **your assistant's structured output schema**, returned as a **flat object** whose keys are your schema's properties (e.g. `age`, `would_recommend`). It is **not** keyed by an output id and has no `name`/`result` wrapper. Its values can hold scalars, nested objects, and arrays — including arrays of objects — exactly as your schema defines them. It is `null` when the assistant has no structured output schema, when nothing could be extracted, or when the stored data couldn't be parsed. For example, an *Order Summary* schema might return:

```json
{
  "call_structured_data": {
    "customer_name": "Jane Doe",
    "callback_requested": false,
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

`call_end_reason` is a **free-form string** — the raw reason the call ended, returned unmapped. **Treat it as an opaque string — do not rely on a fixed enum.** Common values:

| Value | Description |
|---|---|
| `completed` | The call ran to a normal conclusion. |
| `user_hangup` | The customer (end-user) hung up. |
| `no_answer` | Outbound: the call was never answered. |
| `busy` | Outbound: the line was busy or the call was rejected. |
| `silence_timeout` | The call was ended after a long silence. |
| `end_call_phrase` | A configured end-of-call phrase was detected. |
| `idle_limit` | The call was ended after an idle period with no activity. |
| `max_duration` | The maximum call duration was reached. |
| `end_call_tool` | The assistant ended the call via its end-call tool. |
| `error` | The call ended due to an error in the pipeline (provider, model, etc.). |

Other values may appear, including **raw provider/SIP status text** (e.g. `User Busy`, `486`), and the set grows as new providers and adapters are added. If you keep a known-value list, **don't fail on unknown reasons** — log them and continue.

## Errors

| Status | Code | Description |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` out of range; malformed body; etc. |
| `400` | `DATE_RANGE_INVALID` | `date_from` after `date_to` |
| `400` | `INVALID_DATE_FORMAT` | Date is not a plain `YYYY-MM-DD` value |
| `400` | `INVALID_CURSOR` | Cursor is empty or cannot be decoded |
| `400` | `MALFORMED_CURSOR` | Cursor payload has unexpected shape |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Auth errors |
| `429` | `RATE_LIMITED` | Per-minute rate limit exceeded |

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

### Filter by campaign

```bash
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"campaign_id":"84213f7a-58cc-4372-a567-0e02b2c3d479","limit":50}'
```

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
