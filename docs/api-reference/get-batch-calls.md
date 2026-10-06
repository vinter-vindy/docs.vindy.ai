---
title: List Batch Calls
sidebar_label: List Batch Calls
sidebar_position: 8
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/batches/:batchId/calls`

Returns the calls belonging to one batch — the `batch_call_id` from [`POST /v1/calls/bulk`](bulk-create-calls.md) — with cursor-based pagination. Each call object is the **same shape** as an item in [`POST /v1/calls/list`](list-calls/index.md).

This returns **every call in the batch**, at any stage — not only finished ones — so you can poll it to watch a batch progress from queued to done.

Like List Calls, it's a `POST` with a small JSON body: the cursor is opaque, so it travels in the body rather than the query string. Unlike List Calls, it takes **no date filter** — it's scoped to a single batch and has its own cursor. Use it to page through a batch's results as they complete, or to pull the full set once the batch is done.

:::info Broader visibility than List Calls
Unlike [`POST /v1/calls/list`](list-calls/index.md) — which returns only **terminal** calls (`completed` or `failed`) — this endpoint returns **every call in the batch, at any stage**. Queued and in-progress calls come back with a queue `call_status` (`pending`, `scheduled`, `in_progress`, or `cancelled`) and `null` conversation, recording, and timing fields; terminal calls come back as the full object. Results are ordered **newest first** (by creation time). This is what lets you poll a batch from queued through to done.
:::

---

## Request

```http
POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/calls
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "status": "completed",
  "limit": 100,
  "cursor": null
}
```

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `batchId` | string | Identifies the batch — the `batch_call_id` that [`POST /v1/calls/bulk`](bulk-create-calls.md) returned. |

## Body parameters

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | int | no | `200` | Sets how many calls you get back in this page (1–500). Omit it or send `null` to use the default (200). |
| `cursor` | string | no | — | Send back the opaque `next_cursor` from your previous page to fetch the next one. Omit it on the first request. |
| `status` | string | no | — | Returns only the calls with this `call_status`. Because this endpoint returns a batch's calls at **any** stage, all six values work: `completed`, `failed`, `cancelled`, `pending`, `scheduled`, `in_progress`. It filters by the call's displayed `call_status` — a call that ran but failed is `failed`, not `completed`, even though it left the queue. Omit it for no status filter. An invalid value returns `400 VALIDATION_FAILED`. |

The body is optional — send `{}` (or nothing) to get the first page with the default limit.

:::note Filtering by status
`status` narrows the page to one `call_status`; the cursor is bound to it, so keep `status` unchanged while paging (changing it, like changing any filter, needs a fresh walk — see the cursor note below). The `counts` in the [batch summary](get-batch.md) tell you how many to expect for each status.

Each `call_status` value means:

- `completed` — the call connected and finished successfully.
- `failed` — the call ran but did not succeed (no answer, busy, rejected, or an error).
- `cancelled` — the call was cancelled from the queue before it was dialed.
- `pending` — queued, waiting its turn to be dialed.
- `scheduled` — queued for a future `scheduled_at` time, not yet due.
- `in_progress` — currently being dialed or in conversation.
:::

## Response (200 OK)

```json
{
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "calling_window": { "timezone": "Europe/Istanbul", "start": "09:00", "end": "18:00", "days": [1, 2, 3, 4, 5] },
  "data": [
    {
      "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "completed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905551112233",
      "call_bound_type": "outbound",
      "call_started_at": "2026-06-09T23:40:10+00:00",
      "call_ended_at": "2026-06-09T23:41:37+00:00",
      "call_created_at": "2026-06-09T23:39:20+00:00",
      "call_duration_seconds": 87,
      "call_end_reason": "completed",
      "call_transcript": "[23:40:10] Asistan: Hi, this is Vindy, your AI assistant. I'd like to ask a few quick questions for our customer satisfaction survey — is now a good time?\n[23:40:16] Müşteri: Sure, go ahead.",
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
        "url": "https://...?X-Amz-...",
        "expires_at": "2026-06-10T23:41:37+00:00"
      }
    },
    {
      "call_id": "01a0c8d0-5f2b-7a41-bc03-1e2d3c4b5a69",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "failed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905553334455",
      "call_bound_type": "outbound",
      "call_started_at": "2026-06-09T23:40:10+00:00",
      "call_ended_at": "2026-06-09T23:40:16+00:00",
      "call_created_at": "2026-06-09T23:39:20+00:00",
      "call_duration_seconds": 0,
      "call_end_reason": "User Busy",
      "call_transcript": null,
      "call_structured_data": null,
      "call_metadata": { "order_id": "ORD-4822" },
      "call_variables": { "first_name": "Deniz" },
      "call_recording": { "available": false }
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0Ijoi...",
    "has_more": true,
    "limit": 100
  }
}
```

## Response fields

**Top-level**

| Field | Type | Description |
|---|---|---|
| `batch_call_id` | string | Identifies the batch you queried, echoing the `batchId` you passed in the path. |
| `status` | string | Gives the batch's current status: `active`, `completed`, or `cancelled`. |
| `calling_window` | object | Shows the calling window applied to this batch. It is `null` for batches created before calling windows existed, or when the page has no calls. |
| `data` | array | Holds this page's call objects, each with the **same shape** as a [List Calls](list-calls/index.md#response-fields) item. |
| `pagination` | object | Carries the standard [pagination object](list-calls/filtering-pagination.md#paginated), with the members listed below. |

**`pagination`**

| Field | Type | Description |
|---|---|---|
| `next_cursor` | string \| null | Holds the opaque cursor for the next page. It is `null` when `has_more` is `false`. |
| `has_more` | boolean | Tells you whether more pages remain after this one. |
| `limit` | int | Tells you the page size applied to this response. |

**Call object**

Each item in `data` has the **same fields** as a [List Calls](list-calls/index.md#response-fields) item — `call_id` (a string), `call_status` (`completed` or `failed` for terminal calls, or a queue status — `pending`, `scheduled`, `in_progress`, `cancelled` — for calls not yet finished), `call_transcript`, `call_structured_data`, `call_metadata`, `call_recording`, the free-form `call_end_reason` string, and the rest. Queued and in-progress calls carry `null` for the conversation, recording, and timing fields until they reach a terminal state. See the full [List Calls field reference](list-calls/index.md#response-fields) rather than re-reading them here.

:::note Cursor is opaque — page with the same `batchId`
The `cursor` is opaque: don't build or change it. To get the next page, send it back as `cursor` in the body **with the same `batchId`**. Stop when `has_more` is `false` (at that point `next_cursor` is `null`). This cursor is specific to this endpoint, to this batch, **and** to the `status` filter you used: reusing a cursor from [`POST /v1/calls/list`](list-calls/index.md), from a different batch, or after changing `status`, is rejected with `400 MALFORMED_CURSOR` — start a fresh walk instead.
:::

:::note No date filter here
This endpoint takes no `date_from` / `date_to` — it's scoped to one batch. Date-range filtering lives only on [`POST /v1/calls/list`](list-calls/index.md). See [Filtering & Pagination](list-calls/filtering-pagination.md).
:::

## Errors

| Status | Code | Description |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` is out of the 1–500 range, or a body field has an invalid type. Unknown/extra fields are **ignored**, not rejected. |
| `400` | `INVALID_CURSOR` | Cursor is empty or cannot be decoded. |
| `400` | `MALFORMED_CURSOR` | Cursor can't be parsed, or was issued for a different endpoint, batch, or `status` filter. |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | The request's authentication failed. |
| `404` | `RESOURCE_NOT_FOUND` | The batch doesn't exist, or it belongs to another company. |
| `429` | `RATE_LIMITED` | You've exceeded the per-minute rate limit; retry after the `Retry-After` seconds. |

:::note Existence is not leaked
A `batchId` that belongs to another company returns the same `404 RESOURCE_NOT_FOUND` as one that does not exist — the same rule as [`GET /v1/calls/:callId`](get-call.md). See [Multi-tenancy](../concepts/multi-tenancy.md).
:::

:::tip Knowing when the whole batch is done
When a batch **finishes on its own**, `status` reads `completed` — every call has reached a terminal state. Use the [`batch-ended` webhook](webhooks.md#batch-ended) for a per-status breakdown, or poll `status` here until it reads `completed`.

If you [cancel the batch](cancel-batch.md), `status` switches to `cancelled` right away (calls already in progress still run to completion). Cancelling the batch emits one [`call-ended` webhook](webhooks.md#call-ended) per stopped queued call (each `call_status: "cancelled"`, with your `call_metadata` echoed back) plus a single [`batch-ended` webhook](webhooks.md#batch-ended) with `status: "cancelled"` that always arrives last. You can also see each cancelled call here (filter with `status: "cancelled"`), or read the summary's `counts.cancelled`.
:::

## Examples

### Fetch one page

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function getBatchCalls(batchId, cursor) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/batches/${batchId}/calls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 100, cursor }),
    },
  );

  if (response.status === 404) {
    return null; // batch not found or not in your company
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  return response.json();
}

const page = await getBatchCalls("84213f7a-58cc-4372-a567-0e02b2c3d479");
console.log(page?.status, page?.data.length);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def get_batch_calls(batch_call_id, cursor=None):
    payload = {"limit": 100}
    if cursor:
        payload["cursor"] = cursor

    response = requests.post(
        f"https://api.vindy.ai/v1/calls/batches/{batch_call_id}/calls",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
        json=payload,
    )

    if response.status_code == 404:
        return None  # batch not found or not in your company
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")
    return response.json()

page = get_batch_calls("84213f7a-58cc-4372-a567-0e02b2c3d479")
if page:
    print(page["status"], len(page["data"]))
```

</TabItem>
</Tabs>

### Walk all pages

Resend `next_cursor` as `cursor` — with the same `batchId` — until `has_more` is `false`.

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# First request (no cursor)
curl -X POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# Response: { "status": "...", "data": [100 calls], "pagination": { "next_cursor": "X", "has_more": true } }

# Next request (use next_cursor)
curl -X POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100, "cursor": "X"}'

# Stop when has_more: false
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function listAllBatchCalls(batchId) {
  const calls = [];
  let cursor = undefined;

  do {
    const response = await fetch(
      `https://api.vindy.ai/v1/calls/batches/${batchId}/calls`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 100, cursor }),
      },
    );

    if (response.status === 404) {
      return null; // batch not found or not in your company
    }
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

const calls = await listAllBatchCalls("84213f7a-58cc-4372-a567-0e02b2c3d479");
console.log(`${calls?.length ?? 0} calls`);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def list_all_batch_calls(batch_call_id):
    calls = []
    cursor = None

    while True:
        payload = {"limit": 100}
        if cursor:
            payload["cursor"] = cursor

        response = requests.post(
            f"https://api.vindy.ai/v1/calls/batches/{batch_call_id}/calls",
            headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
            json=payload,
        )

        if response.status_code == 404:
            return None  # batch not found or not in your company
        if not response.ok:
            error = response.json()
            code = error.get("extensions", {}).get("code")
            raise RuntimeError(f"{code}: {error.get('message')}")

        body = response.json()
        calls.extend(body["data"])
        cursor = body["pagination"]["next_cursor"]
        if not cursor:
            break

    return calls

calls = list_all_batch_calls("84213f7a-58cc-4372-a567-0e02b2c3d479")
print(f"{len(calls) if calls else 0} calls")
```

</TabItem>
</Tabs>

:::note Related
This endpoint pages through the calls of a batch created via [`POST /v1/calls/bulk`](bulk-create-calls.md). To stop queued calls, see [Cancel a Call Batch](cancel-batch.md). To be notified when the whole batch finishes, see the [`batch-ended` webhook](webhooks.md#batch-ended).
:::
