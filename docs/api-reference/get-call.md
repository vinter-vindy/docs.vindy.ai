---
title: Get a Call
sidebar_label: Get a Call
sidebar_position: 5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/calls/:callId`

Returns a single call by its stable `call_id`. The response is **identical to a call object** in [`POST /v1/calls/list`](list-calls/index.md) — transcript, structured data, metadata, and (if ready) a fresh recording URL included.

Use it whenever you have a `call_id` — from [List Calls](list-calls/index.md), a [webhook](webhooks.md), or your own records — to pull the call on demand. After a webhook you already have the full object; the usual reason to call this afterward is to refresh a recording URL that has expired. Recording URLs are long-lived (~24 hours) and generated fresh on each request, so a URL you received earlier will usually still work — but if you're pulling a call more than ~24 hours after that URL was issued, fetch it here to get a fresh one.

:::info Visibility
Terminal calls — status `completed` or `failed` — return the full object below. In addition, when you pass the `call_id` of an **outbound call you created** (from the bulk `calls[]` response), you can fetch it at **any** point in its lifecycle: while it is still queued it returns a minimal object whose `call_status` is `pending`, `scheduled`, `in_progress`, or `cancelled`, with the conversation and recording fields `null` — those fill in once the call reaches a terminal state. Inbound calls still in progress, and browser (WebRTC) calls, are never returned; they respond `404`.
:::

---

## Request

```http
GET https://api.vindy.ai/v1/calls/sess_a1b2c3d4e5f6
Authorization: Bearer <api-key>
```

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `callId` | string | The call's stable string id — from [`POST /v1/calls/list`](list-calls/index.md), the `calls[]` array of [`POST /v1/calls/bulk`](bulk-create-calls.md), or a [webhook event](webhooks.md). |

## Response (200 OK)

Same shape as a [`POST /v1/calls/list`](list-calls/index.md) `data[]` item:

```json
{
  "call_id": "sess_a1b2c3d4e5f6",
  "call_status": "completed",
  "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "call_assistant_name": "Vindy - Asistan",
  "call_phone_number": "+905551112233",
  "call_bound_type": "outbound",
  "call_started_at": "2026-06-08T10:30:00+00:00",
  "call_ended_at": "2026-06-08T10:31:27+00:00",
  "call_created_at": "2026-06-08T10:29:55+00:00",
  "call_duration_seconds": 87,
  "call_end_reason": "completed",
  "call_transcript": "[10:30:00] Asistan: Hi, this is Vindy, your AI assistant. I'd like to ask a few quick questions for our customer satisfaction survey — is now a good time?\n[10:30:07] Müşteri: Sure, go ahead.\n[10:30:11] Asistan: Thank you. First, may I ask your age?\n[10:30:16] Müşteri: Thirty-two.",
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
    "expires_at": "2026-06-08T10:35:00+00:00"
  }
}
```

A queued outbound call returns this minimal shape until it completes:

```json
{
  "call_id": "0f1e2d3c-4b5a-7c88-9d0e-1f2a3b4c5d6e",
  "call_status": "scheduled",
  "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "call_assistant_name": null,
  "call_phone_number": "+905551112233",
  "call_bound_type": "outbound",
  "call_started_at": null,
  "call_ended_at": null,
  "call_created_at": "2026-06-08T10:29:55+00:00",
  "call_duration_seconds": null,
  "call_end_reason": null,
  "call_transcript": null,
  "call_structured_data": null,
  "call_metadata": { "crm_contact_id": "CNT-90412" },
  "call_variables": { "first_name": "Batu" },
  "call_recording": { "available": false }
}
```

## Response fields

The call object has the **same fields** as a [List Calls](list-calls/index.md#response-fields) item. A few worth calling out here:

| Field | Type | Description |
|---|---|---|
| `call_id` | string | The call's stable string id — the same value you pass in the path. |
| `call_status` | string | For a terminal call, `completed` or `failed`. For an outbound call fetched while still queued or in progress, this is the queue status instead: `pending`, `scheduled`, `in_progress`, or `cancelled`. A physical call is never `cancelled` — a cancelled queued call simply never becomes one. |
| `call_metadata` | object \| null | The metadata you sent via [`POST /v1/calls/bulk`](bulk-create-calls.md), echoed back verbatim. `null` if the call wasn't created with metadata. |
| `call_variables` | object \| null | The template variables sent for this call, echoed back verbatim — the same object you passed as `variables` when creating the call. `null` when none were sent (e.g. inbound calls). |

For every other field — `call_transcript`, `call_structured_data`, `call_recording`, the free-form `call_end_reason` string, and what `call_recording.available: false` means — see the full [List Calls field reference](list-calls/index.md#response-fields).

:::tip Fresh recording URL
The `call_recording.url` returned here is generated **at request time** and is valid for about **24 hours** (86400s by default, configurable). Do not store it — if a webhook payload's recording URL has expired by the time you process it, call this endpoint to get a fresh one, then download immediately.
:::

## Errors

| Status | Code | Description |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Auth errors. |
| `404` | `RESOURCE_NOT_FOUND` | Call not found, an inbound call still in progress, a browser (WebRTC) call, or belongs to another company. (An outbound call you created returns `200` even while queued — see Visibility above.) |
| `429` | `RATE_LIMITED` | Rate limit exceeded (per-minute). Retry after `Retry-After` seconds. |

:::note Existence is not leaked
A `call_id` that belongs to another company returns the same `404 RESOURCE_NOT_FOUND` as one that does not exist — see [Multi-tenancy](../concepts/multi-tenancy.md).
:::

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -H "Authorization: Bearer $VINDY_API_KEY" \
  https://api.vindy.ai/v1/calls/sess_a1b2c3d4e5f6
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function getCall(callId) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/${callId}`,
    { headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` } },
  );

  if (response.status === 404) {
    return null; // not found, not yet terminal, WebRTC, or not in your company
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  return response.json();
}

const call = await getCall("sess_a1b2c3d4e5f6");
console.log(call?.call_status, call?.call_metadata);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def get_call(call_id):
    response = requests.get(
        f"https://api.vindy.ai/v1/calls/{call_id}",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )

    if response.status_code == 404:
        return None  # not found, not yet terminal, WebRTC, or not in your company
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")
    return response.json()

call = get_call("sess_a1b2c3d4e5f6")
if call:
    print(call["call_status"], call.get("call_metadata"))
```

</TabItem>
</Tabs>
