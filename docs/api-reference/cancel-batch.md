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
POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/cancel
Authorization: Bearer <api-key>
```

No request body.

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `batchId` | string | Identifies the batch — the `batch_call_id` that [`POST /v1/calls/bulk`](bulk-create-calls.md) returned. |

## Response (200 OK)

Returns the batch summary, plus `cancelled_now` — how many queued calls this request just cancelled.

```json
{
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
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
| `batch_call_id` | string | Identifies the cancelled batch, echoing the `batchId` you passed in the request. |
| `status` | string | Gives the batch's status after the cancel. It reads `cancelled` when the batch was still running; a batch that had already `completed` stays `completed`. |
| `total_count` | int | Tells you the total number of calls in the batch. |
| `counts` | object | Breaks the batch's calls down by status, with each value an integer: `completed`, `failed`, `cancelled`, `pending`, `processing`. (`pending` = scheduled + pending, `processing` = in_progress.) |
| `created_at` | ISO string | Marks when the batch was created (UTC, `+00:00`). |
| `cancelled_now` | int | Tells you how many queued calls this request just cancelled. |

## Errors

| Status | Code | Description |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | The request's authentication failed. |
| `404` | `RESOURCE_NOT_FOUND` | The batch doesn't exist, or it belongs to another company. |
| `429` | `RATE_LIMITED` | You've exceeded the per-minute rate limit; retry after the `Retry-After` seconds. |

:::note Only queued calls are affected
This endpoint stops calls that haven't started yet. Calls already in progress run to completion, and finished calls are unchanged. The returned `cancelled_now` tells you exactly how many were stopped by this request. Calling it again on the same batch returns the current summary with `cancelled_now: 0`.
:::

:::note Cancelling a batch emits a per-call `call-ended` plus one `batch-ended`
If you have a webhook subscription, cancelling a batch emits one [`call-ended`](webhooks.md#call-ended) for **each** stopped queued call (each with `call_status: "cancelled"`, a minimal body, and your `call_metadata`/`call_variables` echoed back so you can match it one-to-one), **plus** a single [`batch-ended`](webhooks.md#batch-ended) with `status: "cancelled"`. The `batch-ended` always arrives **last**, after every one of those `call-ended` events. Cancelling a single call via [`POST /v1/calls/:callId/cancel`](cancel-call.md) behaves the same way for that one call. See [how cancellations map to webhooks](webhooks.md#batch-ended).
:::

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/cancel \
  -H "Authorization: Bearer $VINDY_API_KEY"
# → { "batch_call_id": "84213f7a-...", "status": "cancelled", "cancelled_now": 37, ... }
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

await cancelBatch("84213f7a-58cc-4372-a567-0e02b2c3d479");
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

cancel_batch("84213f7a-58cc-4372-a567-0e02b2c3d479")
```

</TabItem>
</Tabs>
