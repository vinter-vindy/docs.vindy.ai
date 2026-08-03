---
title: Create Call
sidebar_label: Create Call
sidebar_position: 5.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls`

Places a **single** outbound call. Unlike [`POST /v1/calls/bulk`](bulk-create-calls.md), it creates **no batch (campaign)** — there is no `batch_call_id`. Use this for one-off calls; for many calls at once, use bulk.

The call is queued and dispatched asynchronously (no call is placed synchronously in the request).

---

## Request

```http
POST https://api.vindy.ai/v1/calls
Authorization: Bearer <api-key>
Content-Type: application/json
```

```json
{
  "assistant_id": "8f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b",
  "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  "phone_number": "05551112233",
  "variables": { "first_name": "Ahmet", "appointment_time": "14:30" },
  "metadata": { "crm_contact_id": "CNT-90412" },
  "scheduled_at": "2026-08-01T09:00:00Z"
}
```

| Field | Type | Description |
|---|---|---|
| `assistant_id` | string (UUID) | **Required.** The assistant that will handle the call. From [`GET /v1/assistants`](list-assistants.md). |
| `phone_number_id` | string (UUID) | **Required.** The caller line the call is placed **from**. Must be one returned by [`GET /v1/phone-numbers`](list-phone-numbers.md) (owned by your organization and ready for outbound). |
| `phone_number` | string | **Required.** The number to call — E.164 (`+90…`) or a Turkish local number (`05…`), normalized to `+90…`. |
| `variables` | object \| null | Optional **template variables**. Fills the `{{placeholder}}` tokens in the assistant's prompt and greeting for this call — a JSON object of `name → value` (multiple keys allowed). Unlike `metadata` (echoed back, does not affect the call), **variables change what the assistant says**. Values may be string/number/boolean (coerced to string); ≤50 keys, key ≤40 chars, value ≤500 chars, no nesting. The names an assistant expects are listed in `assistant_variables` from [`GET /v1/assistants`](list-assistants.md). |
| `metadata` | object \| null | Optional opaque object echoed back verbatim on the call (≤50 keys; key ≤40, value ≤500; string/number/boolean; no nesting). Does **not** affect the call. |
| `scheduled_at` | ISO 8601 \| null | Optional future time to place the call. Omit to dispatch as soon as capacity allows. |

## Response (201 Created)

```json
{
  "call_id": "019fb38d-2620-7882-8530-1266cedfcfc8",
  "phone_number": "+905551112233"
}
```

| Field | Type | Description |
|---|---|---|
| `call_id` | string (UUID) | Stable id for this call. Query it with [`GET /v1/calls/:callId`](get-call.md) and cancel it (while still queued) with [`POST /v1/calls/:callId/cancel`](cancel-call.md). |
| `phone_number` | string | The normalized E.164 number that will be called. |

## Errors

| Status | Code |
|---|---|
| `400` | `VALIDATION_FAILED` (a required field is missing), `INVALID_PHONE_NUMBER`, `INVALID_VARIABLES`, `INVALID_METADATA`, `PHONE_NUMBER_NOT_USABLE` |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `404` | `ASSISTANT_NOT_FOUND`, `PHONE_NUMBER_NOT_FOUND` |
| `429` | `RATE_LIMITED` |

`PHONE_NUMBER_NOT_FOUND` means the `phone_number_id` is unknown, malformed, or not in your organization; `PHONE_NUMBER_NOT_USABLE` means the line exists but is not ready for outbound.

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b",
    "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    "phone_number": "05551112233"
  }'
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
const res = await fetch("https://api.vindy.ai/v1/calls", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    assistant_id: "8f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b",
    phone_number_id: "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    phone_number: "05551112233",
  }),
});
const { call_id } = await res.json();
console.log(call_id);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os, requests

res = requests.post(
    "https://api.vindy.ai/v1/calls",
    headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    json={
        "assistant_id": "8f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b",
        "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
        "phone_number": "05551112233",
    },
)
print(res.json()["call_id"])
```

</TabItem>
</Tabs>
