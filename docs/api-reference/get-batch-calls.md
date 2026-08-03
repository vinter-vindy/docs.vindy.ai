---
title: List a Batch's Calls
sidebar_label: List Batch Calls
sidebar_position: 8
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/batches/:batchId/calls`

Returns the calls belonging to one batch — the `batch_call_id` from [`POST /v1/calls/bulk`](bulk-create-calls.md) — with cursor-based pagination. Each call object is the **same shape** as an item in [`POST /v1/calls/list`](list-calls/index.md).

This returns **every call in the batch**, whatever its stage — not only finished ones. Calls still waiting to be dialed appear with a queue `call_status` (`pending`, `scheduled`, `in_progress`, or `cancelled`) and `null` conversation, recording, and timing fields; calls that have finished carry the full object with `completed` or `failed`. So you can poll this endpoint to watch a batch progress from queued to done.

Like List Calls, it's a `POST` with a small JSON body: the cursor is opaque, so it travels in the body rather than the query string. Unlike List Calls, it takes **no date filter** — it's scoped to a single batch and has its own cursor. Use it to page through a batch's results as they complete, or to pull the full set once the batch is done.

:::info Same visibility rule as List Calls
Calls appear in the same order and with the same visibility as [`POST /v1/calls/list`](list-calls/index.md): **newest first**, and **only terminal calls** (status `completed` or `failed`). In-progress calls are not returned as objects — they show up here once they reach a terminal state. Browser (WebRTC) calls are never returned.
:::

---

## Request

```http
POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/calls
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "limit": 100,
  "cursor": null
}
```

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `batchId` | string | The batch's id — the `batch_call_id` from [`POST /v1/calls/bulk`](bulk-create-calls.md). |

## Body parameters

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `limit` | int | no | `50` | Maximum items in this page. Range: 1–200. |
| `cursor` | string | no | — | Opaque cursor from a previous `next_cursor`. Omit on the first request. |

The body is optional — send `{}` (or nothing) to get the first page with the default limit.

## Response (200 OK)

```json
{
  "batch_call_id": "842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f",
  "status": "completed",
  "data": [
    {
      "call_id": "sess_a1b2c3d4e5f6",
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
        "age": 32,
        "overall_satisfaction": 4,
        "support_speed": 5,
        "would_recommend": true
      },
      "call_metadata": { "crm_contact_id": "CNT-90412" },
      "call_variables": { "first_name": "Batu" },
      "call_recording": {
        "available": true,
        "url": "https://...?X-Amz-...",
        "expires_at": "2026-06-09T23:46:40+00:00"
      }
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
| `batch_call_id` | string | The batch you queried (the `batchId` you passed in the path). |
| `status` | string | The batch's current status — `active`, `completed`, or `cancelled`. |
| `data` | array | Call objects in this page — **same shape** as a [List Calls](list-calls/index.md#response-fields) item. |
| `pagination` | object | Standard [pagination object](list-calls/filtering-pagination.md#paginated). |

**Call object**

Each item in `data` has the **same fields** as a [List Calls](list-calls/index.md#response-fields) item — `call_id` (a string), `call_status` (`completed` or `failed`), `call_transcript`, `call_structured_data`, `call_metadata`, `call_recording`, the free-form `call_end_reason` string, and the rest. See the full [List Calls field reference](list-calls/index.md#response-fields) rather than re-reading them here.

:::note Cursor is opaque — page with the same `batchId`
The `cursor` is opaque: don't build or change it. To get the next page, send it back as `cursor` in the body **with the same `batchId`**, and keep `limit` identical across pages. Stop when `has_more` is `false` (at that point `next_cursor` is `null`). This cursor is independent from the one used by [`POST /v1/calls/list`](list-calls/index.md).
:::

:::note No date filter here
This endpoint takes no `date_from` / `date_to` — it's scoped to one batch. Date-range filtering lives only on [`POST /v1/calls/list`](list-calls/index.md). See [Filtering & Pagination](list-calls/filtering-pagination.md).
:::

## Errors

| Status | Code | Description |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` is out of the 1–200 range, or the body has an unexpected field. |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Auth errors. |
| `404` | `RESOURCE_NOT_FOUND` | Batch not found or belongs to another company. |
| `429` | `RATE_LIMITED` | Rate limit exceeded (per-minute). Retry after `Retry-After` seconds. |

:::note Existence is not leaked
A `batchId` that belongs to another company returns the same `404 RESOURCE_NOT_FOUND` as one that does not exist — the same rule as [`GET /v1/calls/:callId`](get-call.md). See [Multi-tenancy](../concepts/multi-tenancy.md).
:::

:::tip Knowing when the whole batch is done
When a batch **finishes on its own**, `status` reads `completed` — every call has reached a terminal state. Use the [`batch-ended` webhook](webhooks.md#batch-ended) for a per-status breakdown, or poll `status` here until it reads `completed`.

If you [cancel the batch](cancel-batch.md), `status` switches to `cancelled` right away (calls already in progress still run to completion). Cancelling the batch sends a single [`batch-ended` webhook](webhooks.md#batch-ended) with `status: "cancelled"`; the batch's individual calls are **not** each reported via `call-ended`, so reconcile them by paging through this endpoint or via the summary's `counts.cancelled`.
:::

## Examples

### Fetch one page

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/calls \
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

const page = await getBatchCalls("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f");
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

page = get_batch_calls("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f")
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
curl -X POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# Response: { "status": "...", "data": [100 calls], "pagination": { "next_cursor": "X", "has_more": true } }

# Next request (use next_cursor)
curl -X POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/calls \
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

const calls = await listAllBatchCalls("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f");
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

calls = list_all_batch_calls("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f")
print(f"{len(calls) if calls else 0} calls")
```

</TabItem>
</Tabs>

:::note Related
This endpoint pages through the calls of a batch created via [`POST /v1/calls/bulk`](bulk-create-calls.md). To stop queued calls, see [Cancel a Call Batch](cancel-batch.md). To be notified when the whole batch finishes, see the [`batch-ended` webhook](webhooks.md#batch-ended).
:::
