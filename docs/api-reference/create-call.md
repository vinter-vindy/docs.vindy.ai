---
title: Create a Call
sidebar_label: Create a Call
sidebar_position: 5.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls`

Places a **single** outbound call. Unlike [`POST /v1/calls/bulk`](bulk-create-calls.md), it creates **no batch** — there is no `batch_call_id`. Use this for one-off calls; for many calls at once, use bulk.

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
  "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  "phone_number": "+905551112233",
  "variables": { "first_name": "Elif", "appointment_time": "14:30" },
  "metadata": { "order_id": "ORD-4821" },
  "scheduled_at": "2026-06-10T09:00:00+03:00"
}
```

| Field | Type | Description |
|---|---|---|
| `assistant_id` | string (UUID) | **Required.** The assistant that will handle the call. From [`GET /v1/assistants`](list-assistants.md). |
| `phone_number_id` | string (UUID) | **Required.** The caller line the call is placed **from**. Must be one returned by [`GET /v1/phone-numbers`](list-phone-numbers.md) (owned by your company and ready for outbound). |
| `phone_number` | string | **Required.** The number to call, in full international **E.164** format (e.g. `+905551112233`). See [Phone numbers](#phone-numbers) below. |
| `variables` | object \| null | Optional **template variables**. Fills the `{{placeholder}}` tokens in the assistant's prompt and greeting for this call — a JSON object of `name → value` (multiple keys allowed). Unlike `metadata` (echoed back, does not affect the call), **variables change what the assistant says**. Values may be string/number/boolean (coerced to string); ≤50 keys, key ≤40 chars, value ≤500 chars, no nesting. The names an assistant expects are listed in `assistant_variables` from [`GET /v1/assistants`](list-assistants.md). |
| `metadata` | object \| null | Optional opaque object echoed back verbatim on the call. Values may be `string`/`number`/`boolean`/`null` **plus nested objects and arrays** (≤50 keys per object; key ≤40, string value ≤500; max nesting depth 5; ≤200 total entries; ≤32 KB serialized). Does **not** affect the call. |
| `scheduled_at` | ISO 8601 datetime \| null | Optional future time to place the call. Omit to dispatch as soon as capacity allows. Send an ISO 8601 date-time **with a timezone offset** — see [Scheduling](#scheduled-at). |

### Phone numbers {#phone-numbers}

Give the number in full international **E.164** format: a leading `+`, then the country code, then the number (e.g. `+905551112233`). Common separators — spaces, dashes, and parentheses — are tolerated and stripped, so `+90 555 111 22 33` is accepted too.

There is **no country-specific normalization** — a number without a leading `+` is rejected with **`400 INVALID_PHONE_NUMBER`**. Provide the number in full E.164 (`+` + country code + number); it is stored and dialed in its normalized form, returned as `phone_number` in the response.

### Scheduling with `scheduled_at` {#scheduled-at}

By default the call is queued immediately. To place it later, send `scheduled_at` as an **ISO 8601 / RFC 3339 date-time that includes a timezone offset**:

| Form | Example | Fires at |
|---|---|---|
| Numeric offset (recommended) | `2026-06-10T09:00:00+03:00` | 09:00 in Istanbul (UTC+3) |
| UTC (`Z`) | `2026-06-10T06:00:00Z` | 06:00 UTC = 09:00 Istanbul |

**Always include the offset.** A value with no offset (a "naive" time such as `2026-06-10T09:00:00`) is interpreted as **UTC**, not local time — so it would fire at 12:00 Istanbul, three hours later than you probably intend. To schedule for 09:00 Istanbul, send `2026-06-10T09:00:00+03:00`.

- Times are stored and compared in **UTC**; timestamps elsewhere in the API are returned in UTC (`+00:00`).
- **No future check:** a time in the past is queued to start on the next dispatch cycle (≈immediately). To place a call right now, simply omit `scheduled_at`.
- A value that isn't a valid ISO 8601 date-time (e.g. `10.06.2026`, `now`) is rejected with **`400 VALIDATION_FAILED`**.

## Response (201 Created)

```json
{
  "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
  "phone_number": "+905551112233"
}
```

| Field | Type | Description |
|---|---|---|
| `call_id` | string (UUID) | Stable ID for this call. Query it with [`GET /v1/calls/:callId`](get-call.md) and cancel it (while still queued) with [`POST /v1/calls/:callId/cancel`](cancel-call.md). |
| `phone_number` | string | The normalized E.164 number that will be called. |

## Errors

| Status | Code |
|---|---|
| `400` | `VALIDATION_FAILED` (a required field is missing), `INVALID_PHONE_NUMBER`, `INVALID_VARIABLES`, `INVALID_METADATA`, `PHONE_NUMBER_NOT_USABLE` |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `404` | `ASSISTANT_NOT_FOUND`, `PHONE_NUMBER_NOT_FOUND` |
| `429` | `RATE_LIMITED` |

`PHONE_NUMBER_NOT_FOUND` means the `phone_number_id` is unknown, malformed, or not in your company; `PHONE_NUMBER_NOT_USABLE` means the line exists but is not ready for outbound.

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    "phone_number": "+905551112233"
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
    assistant_id: "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    phone_number_id: "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    phone_number: "+905551112233",
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
        "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
        "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
        "phone_number": "+905551112233",
    },
)
print(res.json()["call_id"])
```

</TabItem>
</Tabs>
