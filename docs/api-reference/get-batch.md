---
title: Get a Batch
sidebar_label: Get a Batch
sidebar_position: 7.8
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/calls/batches/:batchId`

Returns a **summary of one batch**, identified by its `batch_call_id`, with its status and a per-status breakdown of its calls. The batch can be one you launched with [`POST /v1/calls/bulk`](bulk-create-calls.md) or one created from the Vindy dashboard; either way, you look it up here by its id (from the bulk response, or from [`POST /v1/calls/batches/list`](list-batches.md)).

The body is **exactly the same** `BatchCallSummary` object that the [`batch-ended` webhook](webhooks.md#batch-ended) delivers in its `data` field — this is its **pull** counterpart. Use the webhook for a push notification when a batch settles, and this endpoint to fetch the same summary on demand (to poll a batch's progress, or to reconcile after the fact).

To page through the individual **calls** of a batch, use [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md); to list your **batches**, use [`POST /v1/calls/batches/list`](list-batches.md).

---

## Request

```http
GET https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer <api-key>
```

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `batchId` | string | Identifies the batch — the `batch_call_id` that [`POST /v1/calls/bulk`](bulk-create-calls.md) returned. |

## Response (200 OK)

```json
{
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "total_count": 200,
  "counts": {
    "completed": 180,
    "failed": 12,
    "cancelled": 8,
    "pending": 0,
    "processing": 0
  },
  "created_at": "2026-06-09T23:39:20+00:00"
}
```

## Response fields

| Field | Type | Description |
|---|---|---|
| `batch_call_id` | string | Identifies the batch, echoing the `batchId` you passed in the path. |
| `status` | string | Gives the batch's status: `active` (still running), `completed` (every call reached a terminal state), or `cancelled` (the batch was cancelled). |
| `total_count` | int | Tells you the total number of calls in the batch. |
| `counts` | object | Breaks the batch's calls down by status, with the members listed below. |
| `created_at` | ISO 8601 (UTC) | Marks when the batch was created, as an ISO 8601 UTC timestamp with a `+00:00` offset. |

**`counts`**

| Field | Type | Description |
|---|---|---|
| `completed` | int | Counts the calls that finished successfully. |
| `failed` | int | Counts the calls that ended in failure (no-answer, busy, error, and the like). |
| `cancelled` | int | Counts the calls that were cancelled from the queue before dialing. Each of these also emits its own [`call-ended`](webhooks.md#call-ended) with `call_status: "cancelled"`, so this number is only the aggregate. |
| `pending` | int | Counts the calls not yet started, covering both `pending` and `scheduled` calls. It drops to `0` once the batch is `completed`. |
| `processing` | int | Counts the calls still in progress (the `in_progress` call status). It drops to `0` once the batch is `completed`. |

:::note Same object as the `batch-ended` webhook
This is exactly the `data` payload of the [`batch-ended` webhook](webhooks.md#batch-ended) — the webhook additionally wraps it with `event_type`, `delivery_id`, and a top-level `batch_call_id`, which this endpoint omits (you already have the `batchId`). The `counts` reconcile with the batch's calls: `completed + failed + cancelled + pending + processing == total_count`.
:::

:::tip Polling a batch to completion
Poll this endpoint until `status` reads `completed` (or `cancelled`). While it reads `active`, `pending` + `processing` count the calls still to finish. For the individual call outcomes, page [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md).
:::

## Errors

| Status | Code | Description |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | The request's authentication failed. |
| `404` | `RESOURCE_NOT_FOUND` | The batch doesn't exist, or it belongs to another company. |
| `429` | `RATE_LIMITED` | You've exceeded the per-minute rate limit; retry after the `Retry-After` seconds. |

:::note Existence is not leaked
A `batchId` that belongs to another company returns the same `404 RESOURCE_NOT_FOUND` as one that does not exist — the same rule as [`GET /v1/calls/:callId`](get-call.md). See [Multi-tenancy](../concepts/multi-tenancy.md).
:::

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer $VINDY_API_KEY"
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function getBatch(batchId) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/batches/${batchId}`,
    { headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` } },
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

const batch = await getBatch("84213f7a-58cc-4372-a567-0e02b2c3d479");
console.log(batch?.status, batch?.counts);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def get_batch(batch_call_id):
    response = requests.get(
        f"https://api.vindy.ai/v1/calls/batches/{batch_call_id}",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )
    if response.status_code == 404:
        return None  # batch not found or not in your company
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")
    return response.json()

batch = get_batch("84213f7a-58cc-4372-a567-0e02b2c3d479")
if batch:
    print(batch["status"], batch["counts"])
```

</TabItem>
</Tabs>

:::note Related
List your batches with [`POST /v1/calls/batches/list`](list-batches.md); page a batch's calls with [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md); get the same summary pushed to you with the [`batch-ended` webhook](webhooks.md#batch-ended).
:::
