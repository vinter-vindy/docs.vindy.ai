---
title: List Phone Numbers
sidebar_label: List Phone Numbers
sidebar_position: 1.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/phone-numbers`

Returns the **caller lines** registered to your company — the phone numbers a batch of outbound calls can be placed **from**. Pick one and pass its `phone_number_id` as the caller when you launch calls with [`POST /v1/calls/bulk`](bulk-create-calls.md).

Only numbers that are **usable for outbound** (provisioned and ready to dial) are returned. A number that exists in your account but isn't yet provisioned won't appear here.

---

## Request

```http
GET https://api.vindy.ai/v1/phone-numbers
Authorization: Bearer <api-key>
```

No query parameters. The response is **not paginated** — every usable caller line is returned in one call (up to 1000).

## Response (200 OK)

```json
{
  "data": [
    {
      "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
      "phone_number": "+902323323389",
      "label": "3389"
    }
  ],
  "total": 1
}
```

## Response fields

**Top-level**

| Field | Type | Description |
|---|---|---|
| `data` | array | Phone number items. |
| `total` | int | Size of the `data` array. |

**Phone number item**

| Field | Type | Description |
|---|---|---|
| `phone_number_id` | string | Stable, opaque id of the caller line. Pass it as `phone_number_id` when launching a batch of outbound calls with [`POST /v1/calls/bulk`](bulk-create-calls.md). |
| `phone_number` | string | The line in E.164 form (e.g. `+902323323389`). |
| `label` | string \| null | A human-friendly name for the line, or `null` when none is set. |

## Errors

| Status | Code |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notes

:::info Inbound assignment does not restrict outbound
A phone number may be assigned to an assistant for **inbound** routing (so calls to that number reach that assistant). That assignment has **no bearing on outbound**: **any** number returned here can be used as the caller for a bulk call, with **any** of your assistants. Choose the caller line and the assistant independently.
:::

- Only outbound-usable (provisioned and ready) numbers are returned. If a line you expect is missing, it isn't provisioned for outbound yet.
- The `phone_number_id` is what [`POST /v1/calls/bulk`](bulk-create-calls.md) expects in its **required** `phone_number_id` field. A `phone_number_id` that is unknown or not in your company is rejected there with `404 PHONE_NUMBER_NOT_FOUND`; one that exists but isn't ready for outbound with `400 PHONE_NUMBER_NOT_USABLE`.
- Treat `phone_number_id` as an opaque string — don't parse it or derive the number from it; read the number from `phone_number`.

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
  console.log(`${line.phone_number_id}: ${line.phone_number} (${line.label ?? "no label"})`);
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
    print(f"{line['phone_number_id']}: {line['phone_number']} ({line['label'] or 'no label'})")
```

</TabItem>
</Tabs>
