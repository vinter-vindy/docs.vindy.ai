---
title: Cancel a Call
sidebar_label: Cancel a Call
sidebar_position: 6
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/:callId/cancel`

Cancels a single **queued** outbound call — one that is still `pending` or `scheduled` and has not yet been dialed. You can only cancel your own company's calls.

Once it has been dispatched (is being dialed) or has finished, it can no longer be cancelled.

:::note Where the `callId` comes from
The path takes the `call_id` of a **queued outbound** call. You get a `call_id` from [`POST /v1/calls`](create-call.md) (a single call), by listing a batch's calls via [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md), or from [`POST /v1/calls/list`](list-calls/index.md) — and you can also find a queued call by correlating your own `metadata`. Only calls still waiting in the queue can be cancelled; to cancel every remaining call in a batch at once, use [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md).
:::

---

## Request

```http
POST https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f/cancel
Authorization: Bearer <api-key>
```

No request body.

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `callId` | string | The `call_id` of the queued call to cancel. |

## Response (200 OK)

```json
{ "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f", "status": "cancelled" }
```

| Field | Type | Description |
|---|---|---|
| `call_id` | string | The ID of the cancelled call (the `callId` you passed in). |
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
curl -X POST https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f/cancel \
  -H "Authorization: Bearer $VINDY_API_KEY"
# → { "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f", "status": "cancelled" }
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

await cancelCall("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f");
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

cancel_call("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f")
```

</TabItem>
</Tabs>
