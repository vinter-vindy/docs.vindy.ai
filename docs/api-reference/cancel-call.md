---
title: Cancel a Call
sidebar_label: Cancel a Call
sidebar_position: 6
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/:callId/cancel`

Cancels a single **queued** outbound call — one that is still `pending` or `scheduled` and has not yet been dialed. You can only cancel your own company's calls.

A call can only be cancelled while it is still waiting in the queue. Once it has been dispatched (is being dialed) or has finished, it can no longer be cancelled.

:::note Where the `callId` comes from
The path takes the `call_id` of a **queued outbound** call — one of the ids returned in the `calls[]` array of [`POST /v1/calls/bulk`](bulk-create-calls.md). Only calls still waiting in the queue can be cancelled; to cancel every remaining call in a batch at once, use [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md).
:::

---

## Request

```http
POST https://api.vindy.ai/v1/calls/7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b/cancel
Authorization: Bearer <api-key>
```

No request body.

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `callId` | string | The `call_id` of the queued call to cancel (from the bulk `calls[]` response). |

## Response (200 OK)

```json
{ "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b", "status": "cancelled" }
```

| Field | Type | Description |
|---|---|---|
| `call_id` | string | The id of the cancelled call (the `callId` you passed in). |
| `status` | string | Always `cancelled` on success. |

## Errors

| Status | Code | Description |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Auth errors. |
| `404` | `RESOURCE_NOT_FOUND` | No such call, or it belongs to another company. |
| `409` | `ERR_CALL_NOT_CANCELLABLE` | The call cannot be cancelled: it is not a queued outbound call. Either it has already been dispatched or finished, a race occurred, or it is an **inbound / already-started call** (which can never be cancelled). |
| `429` | `RATE_LIMITED` | Rate limit exceeded (per-minute). Retry after `Retry-After` seconds. |

:::note When cancellation is no longer possible
A queued call moves quickly from waiting to being dialed. If you receive `409 ERR_CALL_NOT_CANCELLABLE`, the call has already left the queue and cannot be stopped via the API. Once it ends you'll see its outcome through [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md), or a [webhook event](webhooks.md).
:::

:::note A cancelled call emits a `call-ended` webhook
If you have a webhook subscription, cancelling a single queued call emits a [`call-ended`](webhooks.md#call-ended) event with `call_status: "cancelled"` and a minimal body (no transcript or recording) — this is how you confirm the cancellation asynchronously. Cancelling a whole batch instead emits **one** [`batch-ended`](webhooks.md#batch-ended) event, not a `call-ended` per call.
:::

:::tip Cancelling a whole batch
To cancel many queued calls at once — for example every remaining call in a bulk batch — use [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) with the `batch_call_id` from your bulk request, instead of cancelling each call individually.
:::

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b/cancel \
  -H "Authorization: Bearer $VINDY_API_KEY"
# → { "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b", "status": "cancelled" }
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function cancelCall(callId) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/${callId}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    if (error.extensions?.code === "ERR_CALL_NOT_CANCELLABLE") {
      return false; // too late — the call already left the queue
    }
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  const { status } = await response.json();
  return status === "cancelled";
}

await cancelCall("7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b");
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def cancel_call(call_id):
    response = requests.post(
        f"https://api.vindy.ai/v1/calls/{call_id}/cancel",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )

    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        if code == "ERR_CALL_NOT_CANCELLABLE":
            return False  # too late — the call already left the queue
        raise RuntimeError(f"{code}: {error.get('message')}")

    return response.json()["status"] == "cancelled"

cancel_call("7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b")
```

</TabItem>
</Tabs>
