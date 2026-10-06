---
title: List Phone Numbers
sidebar_label: List Phone Numbers
sidebar_position: 1.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/phone-numbers`

This endpoint returns the phone numbers registered to your company that you can use for outbound calls. Each one is the number that shows up on the recipient's phone when Vindy dials on your behalf; throughout these docs we call them **caller numbers**.

When you launch a call — a single call with [`POST /v1/calls`](create-call.md) or a batch with [`POST /v1/calls/bulk`](bulk-create-calls.md) — you pick one of these and pass its `phone_number_id` to set the caller number for that call.

Only numbers that are **ready for outbound** (provisioned and able to dial) appear here. A number that exists in your company but hasn't been provisioned yet won't be listed.

---

## Request

```http
GET https://api.vindy.ai/v1/phone-numbers
Authorization: Bearer <api-key>
```

This endpoint takes no query parameters, and the response is **not paginated**: it returns every usable caller number in a single call, up to a maximum of 1000.

## Response (200 OK)

```json
{
  "data": [
    {
      "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
      "phone_number": "+902323323389"
    },
    {
      "phone_number_id": "d7c4a1b2-9e3f-4a5b-8c6d-0e1f2a3b4c5d",
      "phone_number": "+902123320000"
    }
  ],
  "total": 2
}
```

## Response fields

**Top-level**

| Field | Type | Description |
|---|---|---|
| `data` | array | Lists your company's caller numbers, one object per number. |
| `total` | int | Tells you how many items `data` holds. |

**Phone number item**

| Field | Type | Description |
|---|---|---|
| `phone_number_id` | string | Identifies the caller number with a stable, opaque ID. Pass it as `phone_number_id` when placing outbound calls, whether single ([`POST /v1/calls`](create-call.md)) or batch ([`POST /v1/calls/bulk`](bulk-create-calls.md)). |
| `phone_number` | string | Gives the number itself, in international E.164 form (for example `+902323323389`); this is what shows on the recipient's phone. |

## Errors

| Status | Code |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notes

:::info Inbound assignment does not restrict outbound
A phone number may be assigned to an assistant for **inbound** routing (so calls to that number reach that assistant). That assignment has **no bearing on outbound**: **any** number returned here can be used as the caller for an outbound call (single or batch), with **any** of your assistants. Choose the caller number and the assistant independently.
:::

- Numbers are ordered newest first.
- Only outbound-ready (provisioned and able to dial) numbers are returned. If a number you expect is missing, it isn't provisioned for outbound yet.
- The `phone_number_id` is what both [`POST /v1/calls`](create-call.md) and [`POST /v1/calls/bulk`](bulk-create-calls.md) expect in their **required** `phone_number_id` field. A `phone_number_id` that is unknown or not in your company is rejected there with `404 PHONE_NUMBER_NOT_FOUND`; one that exists but isn't ready for outbound with `400 PHONE_NUMBER_NOT_USABLE`.

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl https://api.vindy.ai/v1/phone-numbers \
  -H "Authorization: Bearer $VINDY_API_KEY"
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
const response = await fetch("https://api.vindy.ai/v1/phone-numbers", {
  headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` },
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(`${error.extensions?.code}: ${error.message}`);
}

const { data, total } = await response.json();
console.log(`${total} phone numbers`);

for (const line of data) {
  console.log(`${line.phone_number_id}: ${line.phone_number}`);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

response = requests.get(
    "https://api.vindy.ai/v1/phone-numbers",
    headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
)
if not response.ok:
    error = response.json()
    raise RuntimeError(f"{error.get('extensions', {}).get('code')}: {error.get('message')}")

body = response.json()
print(f"{body['total']} phone numbers")

for line in body["data"]:
    print(f"{line['phone_number_id']}: {line['phone_number']}")
```

</TabItem>
</Tabs>
