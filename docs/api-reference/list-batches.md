---
title: List Batches
sidebar_label: List Batches
sidebar_position: 7.7
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/batches/list`

Returns your company's **batches** — the campaigns created via [`POST /v1/calls/bulk`](bulk-create-calls.md) — newest first, with cursor-based pagination. Each item is the **same `BatchCallSummary`** returned by [`GET /v1/calls/batches/:batchId`](get-batch.md) and by the [`batch-ended` webhook](webhooks.md#batch-ended): a batch's status and its per-status `counts`.

Like [List Calls](list-calls/index.md), it's a `POST` with a small JSON body — the cursor is opaque, so it travels in the body. You can narrow the list to one assistant.

---

## Request

```http
POST https://api.vindy.ai/v1/calls/batches/list
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "limit": 50,
  "cursor": null
}
```

## Body parameters

Every field is **optional** — send an empty body to page through all of your company's batches.

| Field | Type | Default | Description |
|---|---|---|---|
| `assistant_id` | string (UUID) | — | Narrows the list to a single assistant's batches — send its id from [`GET /v1/assistants`](list-assistants.md). Omit it to list every batch. An unknown or malformed id returns an empty page, not an error. |
| `limit` | int | `200` | Sets how many batches you get back in this page (1–500). Omit it or send `null` to use the default (200). |
| `cursor` | string | — | Send back the opaque `next_cursor` from your previous page to fetch the next one. Omit it on the first request. |

The body is optional — send `{}` (or nothing) to get the first page with the default limit.

## Response (200 OK)

```json
{
  "data": [
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
    },
    {
      "batch_call_id": "7c1a9e42-3b8d-4f6a-9c05-2e1d0b3a4f57",
      "status": "active",
      "total_count": 500,
      "counts": {
        "completed": 210,
        "failed": 18,
        "cancelled": 0,
        "pending": 260,
        "processing": 12
      },
      "created_at": "2026-06-10T08:15:00+00:00"
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0Ijoi...",
    "has_more": true,
    "limit": 50
  }
}
```

## Response fields

**Top-level**

| Field | Type | Description |
|---|---|---|
| `data` | array | Lists this page's batch summaries, each with the **same shape** as [`GET /v1/calls/batches/:batchId`](get-batch.md#response-fields), newest first by creation time. |
| `pagination` | object | Carries the standard [pagination object](list-calls/filtering-pagination.md#paginated), with the members listed below. |

**`pagination`**

| Field | Type | Description |
|---|---|---|
| `next_cursor` | string \| null | Holds the opaque cursor for the next page. It is `null` when `has_more` is `false`. |
| `has_more` | boolean | Tells you whether more pages remain after this one. |
| `limit` | int | Tells you the page size applied to this response. |

**Batch summary** — each item has the same fields as [Get a Batch](get-batch.md#response-fields): `batch_call_id`, `status` (`active` \| `completed` \| `cancelled`), `total_count`, `counts` (`completed`, `failed`, `cancelled`, `pending`, `processing`), and `created_at`.

:::note Cursor is opaque — keep the filter unchanged while paging
The `cursor` is opaque: don't build or change it. To get the next page, send it back as `cursor` with the **same `assistant_id`**. This cursor is specific to this endpoint and this filter: reusing a cursor from another endpoint, or after changing `assistant_id`, is rejected with `400 MALFORMED_CURSOR` — start a fresh walk instead. `limit` may change between pages. Stop when `has_more` is `false` (`next_cursor` is then `null`).
:::

## Errors

| Status | Code | Description |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` is out of the 1–500 range, or a body field has an invalid type. Unknown/extra fields are **ignored**, not rejected. |
| `400` | `INVALID_CURSOR` | Cursor is empty or cannot be decoded. |
| `400` | `MALFORMED_CURSOR` | Cursor can't be parsed, or was issued for a different endpoint or filter. |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | The request's authentication failed. |
| `429` | `RATE_LIMITED` | You've exceeded the per-minute rate limit; retry after the `Retry-After` seconds. |

## Examples

### Walk all pages

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# First request (no cursor)
curl -X POST https://api.vindy.ai/v1/calls/batches/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'

# Response: { "data": [50 batches], "pagination": { "next_cursor": "X", "has_more": true } }

# Next request (use next_cursor)
curl -X POST https://api.vindy.ai/v1/calls/batches/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "cursor": "X"}'

# Stop when has_more: false
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function listAllBatches(assistantId) {
  const batches = [];
  let cursor = undefined;

  do {
    const response = await fetch("https://api.vindy.ai/v1/calls/batches/list", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assistant_id: assistantId, limit: 50, cursor }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${error.extensions?.code}: ${error.message}`);
    }

    const body = await response.json();
    batches.push(...body.data);
    cursor = body.pagination.next_cursor;
  } while (cursor);

  return batches;
}

const batches = await listAllBatches("8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01");
console.log(`${batches.length} batches`);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def list_all_batches(assistant_id=None):
    batches = []
    cursor = None

    while True:
        payload = {"limit": 50}
        if assistant_id:
            payload["assistant_id"] = assistant_id
        if cursor:
            payload["cursor"] = cursor

        response = requests.post(
            "https://api.vindy.ai/v1/calls/batches/list",
            headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
            json=payload,
        )
        if not response.ok:
            error = response.json()
            code = error.get("extensions", {}).get("code")
            raise RuntimeError(f"{code}: {error.get('message')}")

        body = response.json()
        batches.extend(body["data"])
        cursor = body["pagination"]["next_cursor"]
        if not cursor:
            break

    return batches

batches = list_all_batches("8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01")
print(f"{len(batches)} batches")
```

</TabItem>
</Tabs>

:::note Related
Get one batch's summary with [`GET /v1/calls/batches/:batchId`](get-batch.md); page a batch's calls with [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md); create a batch with [`POST /v1/calls/bulk`](bulk-create-calls.md).
:::
