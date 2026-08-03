---
title: Cancel a Call Batch
sidebar_label: Cancel a Call Batch
sidebar_position: 7
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/batches/:batchId/cancel`

Cancels all **queued** calls in a batch created via [`POST /v1/calls/bulk`](bulk-create-calls.md). Only calls still waiting in the queue (`pending` or `scheduled`) are cancelled; calls already being dialed or already finished are left untouched.

The `batchId` is the `batch_call_id` returned in the bulk response.

---

## Request

```http
POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/cancel
Authorization: Bearer <api-key>
```

No request body.

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `batchId` | string | The batch's id — the `batch_call_id` from [`POST /v1/calls/bulk`](bulk-create-calls.md). |

## Response (200 OK)

Returns the batch summary, plus `cancelled_now` — how many queued calls this request just cancelled.

```json
{
  "batch_call_id": "842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f",
  "status": "cancelled",
  "total_count": 200,
  "counts": {
    "completed": 120,
    "failed": 8,
    "cancelled": 72,
    "pending": 0,
    "processing": 0
  },
  "created_at": "2026-06-09T23:39:20+00:00",
  "cancelled_now": 37
}
```

| Field | Type | Description |
|---|---|---|
| `batch_call_id` | string | The cancelled batch's id (the `batchId` you passed in the request). |
| `status` | string | The batch's status after cancellation. |
| `total_count` | int | Total number of calls in the batch. |
| `counts` | object | Per-status breakdown: `completed`, `failed`, `cancelled`, `pending`, `processing`. |
| `created_at` | ISO string | When the batch was created (UTC, `+00:00`). |
| `cancelled_now` | int | How many queued calls this request just cancelled. |

## Errors

| Status | Code | Description |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Auth errors. |
| `404` | `RESOURCE_NOT_FOUND` | Batch not found or not in your company. |
| `429` | `RATE_LIMITED` | Rate limit exceeded (per-minute). Retry after `Retry-After` seconds. |

:::note Only queued calls are affected
This endpoint stops calls that haven't started yet. Calls already in progress run to completion, and finished calls are unchanged. The returned `cancelled_now` tells you exactly how many were stopped by this request. Calling it again on the same batch returns the current summary with `cancelled_now: 0`.
:::

:::note Cancelling a batch emits one `batch-ended` webhook
If you have a webhook subscription, cancelling a batch emits a single [`batch-ended`](webhooks.md#batch-ended) event with `status: "cancelled"`. The individual calls this stops are **not** each reported via `call-ended` — they roll up into that one event, which avoids a flood on large batches. To cancel a single call and get a per-call [`call-ended`](webhooks.md#call-ended) (with `call_status: "cancelled"`) instead, use [`POST /v1/calls/:callId/cancel`](cancel-call.md).
:::

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/cancel \
  -H "Authorization: Bearer $VINDY_API_KEY"
# → { "batch_call_id": "842f1e9a-...", "status": "cancelled", "cancelled_now": 37, ... }
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function cancelBatch(batchId) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/batches/${batchId}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` },
    },
  );

  if (response.status === 404) {
    return null; // batch not found or not in your company
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  const summary = await response.json();
  console.log(`Cancelled ${summary.cancelled_now} queued calls`);
  return summary;
}

await cancelBatch("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f");
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def cancel_batch(batch_call_id):
    response = requests.post(
        f"https://api.vindy.ai/v1/calls/batches/{batch_call_id}/cancel",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )

    if response.status_code == 404:
        return None  # batch not found or not in your company
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")

    summary = response.json()
    print(f"Cancelled {summary['cancelled_now']} queued calls")
    return summary

cancel_batch("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f")
```

</TabItem>
</Tabs>
