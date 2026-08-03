---
title: Create a Call Batch
sidebar_label: Create a Call Batch
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/bulk`

Creates outbound calls to the phone numbers you provide, using one assistant (1–200 numbers per request).

Each call may carry an optional `metadata` object: Vindy does not process it and **returns it verbatim** on each call object in [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md), and [webhook events](webhooks.md). Use it to tie a call back to a record in your own system (a CRM contact, an order, a support ticket). See [Metadata](#metadata) for details and limits.

Each call may also carry `variables` — **template values** that fill the `{{placeholder}}` tokens in the assistant's prompt and greeting (e.g. the contact's first name). Unlike `metadata`, variables **change what the assistant says**. Provide them per call and/or once at the request level for values shared by every call. See [Variables](#variables).

You choose the **caller line** the calls are placed from with `phone_number_id` — one of the numbers returned by [`GET /v1/phone-numbers`](list-phone-numbers.md).

---

## Request

```http
POST https://api.vindy.ai/v1/calls/bulk
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  "variables": { "company": "Vindy" },
  "calls": [
    { "phone_number": "+905551112233", "variables": { "first_name": "Ahmet" }, "metadata": { "crm_contact_id": "CNT-90412" } },
    { "phone_number": "05554445566", "variables": { "first_name": "Ayşe" }, "metadata": { "crm_contact_id": "CNT-90413" } }
  ]
}
```

## Body parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `assistant_id` | string (UUID) | yes | Assistant that places the calls. Get it from [`GET /v1/assistants`](list-assistants.md). |
| `phone_number_id` | string | yes | The **caller line** the calls are placed from (the outbound caller/CLI). Must be one returned by [`GET /v1/phone-numbers`](list-phone-numbers.md) — i.e. it belongs to your company and is provisioned for outbound. Any usable number works with any assistant; an inbound assignment does not restrict it. |
| `variables` | object | no | **Shared** template variables applied to **every** call as a base — filled into the assistant's `{{placeholder}}` tokens. Each `calls[].variables` overrides these per call. See [Variables](#variables). |
| `calls` | array | yes | Call targets (1–200). |
| `calls[].phone_number` | string | yes | Destination number. See [Phone numbers](#phone-numbers) below. |
| `calls[].variables` | object | no | **Per-call** template variables for this number (e.g. `{ "first_name": "Ahmet" }`). Merged over the request-level `variables` (the per-call value wins). See [Variables](#variables). |
| `calls[].metadata` | object | no | Optional key-value object (see [Metadata](#metadata) limits). Returned verbatim. |
| `scheduled_at` | ISO 8601 datetime | no | If set, the whole batch is queued to start at this **future** time instead of immediately. Include an offset, e.g. `2026-06-10T09:00:00+03:00`. |

### Phone numbers {#phone-numbers}

Numbers are normalized to E.164 before dialing. Common separators — spaces, dashes, and parentheses — are tolerated and stripped, so `+90 555 111 22 33` and `0555-111-2233` are accepted too.

| You send | Normalized to |
|---|---|
| `+905551112233` | `+905551112233` |
| `905551112233` | `+905551112233` |
| `05551112233` | `+905551112233` |
| `5551112233` | `+905551112233` |
| `00905551112233` | `+905551112233` |
| `+441632960000` | `+441632960000` |

Turkish inputs — a leading `0`, a `90`/`0090` country prefix, or a bare 10-digit line — are normalized to `+90…`. A number already written in `+` international form (8–15 digits) is kept **as-is**. Anything that can't be normalized is rejected with **`400 INVALID_PHONE_NUMBER`**, and the offending array position is in `extensions.index`.

Accepted numbers are stored and dialed in their normalized form; you see that value later as `call_phone_number` on each call in list, get, and webhook responses.

### Metadata {#metadata}

`metadata` is a free-form key-value object that belongs entirely to **you**. Vindy treats it as an opaque payload: we **never read, parse, validate, or act on its contents**, and it has **no effect** on how a call is placed, routed, or processed. We simply store it and return it to you unchanged on every view of that call — in [`POST /v1/calls/list`](list-calls/index.md), in [`GET /v1/calls/:callId`](get-call.md), and in [webhook events](webhooks.md).

Its only job is **correlation on your side**. Attach whatever identifiers your own systems need to tie a call back to your data — a CRM contact ID, an order number, a campaign tag, your internal request ID, and so on. When the result comes back, you read those same keys off `call_metadata` and route the outcome straight into your CRM, database, or workflow — no need to keep a separate phone-number-to-record mapping.

The only rules are structural, so that we can store and echo it reliably:

| Limit | Value |
|---|---|
| Max keys | 50 |
| Max key length | 40 |
| Max value length | 500 |
| Value types | `string`, `number`, `boolean` |
| Nested objects / arrays / `null` | Not allowed |

:::caution Use it for your own keys — and keep PII out
Because Vindy never interprets `metadata`, it is the right place for **your** correlation keys (e.g. `crm_contact_id`, `orderId`, `campaign`). It is **not** the place for personal data (names, phone numbers, ID numbers) — keep those in your own systems and reference them by key instead.
:::

### Variables {#variables}

`variables` are **template values** the assistant uses **during the call**. Wherever the assistant's prompt or greeting contains a `{{name}}` placeholder, Vindy substitutes the value you send for `name` before the call starts — so a greeting like `"Hello {{first_name}}, this is a reminder for {{appointment_time}}"` is personalized per call.

This is the opposite of `metadata`: `metadata` is opaque and **never affects the call**, while `variables` **change what the assistant says**. Send `variables`, not `metadata`, for anything the assistant should speak.

Two levels, merged per call (the per-call value wins on key conflicts):

| Level | Field | Applies to |
|---|---|---|
| Request | `variables` | Every call (a shared base — e.g. `{ "company": "Vindy" }`). |
| Per call | `calls[].variables` | That one call (e.g. `{ "first_name": "Ahmet" }`), overriding the request-level base. |

Which names an assistant expects is listed in `assistant_variables` on [`GET /v1/assistants`](list-assistants.md) (derived from the `{{…}}` in its prompt and greeting). A placeholder you don't supply is rendered as **empty** — no `{{…}}` ever leaks into speech. Structural limits match `metadata`:

| Limit | Value |
|---|---|
| Max keys | 50 |
| Max key length | 40 |
| Max value length | 500 |
| Value types | `string`, `number`, `boolean` (numbers/booleans are stringified) |
| Nested objects / arrays / `null` | Not allowed |

A violation returns **`400 INVALID_VARIABLES`**; for a per-call `variables` the offending array position is in `extensions.index` (a request-level violation reports `index: -1`).

## Response (201 Created)

```json
{
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "accepted": 2,
  "calls": [
    { "call_id": "0f1e2d3c-4b5a-7c88-9d0e-1f2a3b4c5d6e", "phone_number": "+905551112233" },
    { "call_id": "1a2b3c4d-5e6f-7a99-8b0c-2d3e4f5a6b7c", "phone_number": "+905554445566" }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `batch_call_id` | string (UUID) | Identifier of the created batch (campaign). **Always present** — `/v1/calls/bulk` always creates a batch, even for a single number. **Keep it** to cancel the batch later via [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) or to filter its calls with `campaign_id` in [`POST /v1/calls/list`](list-calls/index.md). For a one-off call with no batch, use [`POST /v1/calls`](create-call.md) instead. |
| `accepted` | int | Number of calls queued. |
| `calls` | array | One entry per queued call, in request order — each `{ call_id, phone_number }`. `call_id` is that call's stable id: use it to fetch the call with [`GET /v1/calls/:callId`](get-call.md), cancel it with [`POST /v1/calls/:callId/cancel`](cancel-call.md), or match it to incoming webhooks. `phone_number` is the normalized E.164 number. |

:::info Correlating results
Each queued call gets its own `call_id`, returned in `calls[]` in request order. Keep them — mapped to your `metadata` — so you can fetch, cancel, or correlate each call individually. Outcomes also arrive as calls complete via [`POST /v1/calls/list`](list-calls/index.md) and [webhook events](webhooks.md), which echo the `metadata` you sent.
:::

Calls are queued and run in the background. Results (transcript, recording, structured data) become available as each call completes.

:::tip Track a batch's progress
When a `batch_call_id` was returned (a multi-call batch), page through its calls as they finish with [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md). To know the moment the **whole** batch is done — with a per-status breakdown — listen for the [`batch-ended` webhook](webhooks.md#batch-ended).
:::

## Errors

| Status | Code | Description |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `calls` empty or over 200, malformed body, a missing `phone_number_id`, etc. |
| `400` | `INVALID_PHONE_NUMBER` | A `calls[i].phone_number` could not be normalized. The offending index is in `extensions.index`. |
| `400` | `INVALID_VARIABLES` | A `variables` object violates the limits or uses an invalid value type. For a per-call value the offending index is in `extensions.index`; a request-level violation reports `index: -1`. |
| `400` | `INVALID_METADATA` | A call's metadata violates the limits or uses an invalid value type. The offending index is in `extensions.index`. |
| `400` | `PHONE_NUMBER_NOT_USABLE` | The `phone_number_id` line exists but is not ready for outbound (not provisioned). |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Auth errors. |
| `404` | `ASSISTANT_NOT_FOUND` | Assistant not found, not in your company, or not callable. |
| `404` | `PHONE_NUMBER_NOT_FOUND` | The `phone_number_id` is unknown, malformed, or not in your company. Pick one from [`GET /v1/phone-numbers`](list-phone-numbers.md). |
| `429` | `RATE_LIMITED` | Rate limit exceeded (per-minute). Retry after `Retry-After` seconds. |

:::caution Atomic request
If **any** number or metadata in the request is invalid, **no calls are created** — the whole request is rejected. Fix the offending entry (see `extensions.index`) and resubmit.
:::

:::warning No dedup on our side
There is no server-side lock against concurrent or repeated submissions — a second identical request simply creates a **second batch** and calls everyone again. Retry only when you're sure the previous request didn't succeed, and deduplicate on your side. See the [FAQ](../faq.md#is-it-safe-to-retry-requests).
:::

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/bulk \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    "calls": [
      { "phone_number": "+905551112233", "metadata": { "crm_contact_id": "CNT-90412" } },
      { "phone_number": "05554445566", "metadata": { "crm_contact_id": "CNT-90413" } }
    ]
  }'
# → { "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479", "accepted": 2, "calls": [ ... ] }
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function createBulkCalls(assistantId, phoneNumberId, targets) {
  const response = await fetch("https://api.vindy.ai/v1/calls/bulk", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistant_id: assistantId,
      phone_number_id: phoneNumberId, // caller line from GET /v1/phone-numbers
      calls: targets,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    // INVALID_PHONE_NUMBER / INVALID_METADATA carry extensions.index
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  const { batch_call_id, accepted, calls } = await response.json();
  console.log(`Batch ${batch_call_id} queued ${accepted} calls`);
  console.log(calls.map((c) => c.call_id)); // one stable call_id per queued call
  return batch_call_id; // always present — keep it to cancel the batch later
}

await createBulkCalls(
  "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  [
    { phone_number: "+905551112233", metadata: { crm_contact_id: "CNT-90412" } },
    { phone_number: "05554445566", metadata: { crm_contact_id: "CNT-90413" } },
  ],
);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def create_bulk_calls(assistant_id, phone_number_id, targets):
    response = requests.post(
        "https://api.vindy.ai/v1/calls/bulk",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
        # phone_number_id is the caller line from GET /v1/phone-numbers
        json={"assistant_id": assistant_id, "phone_number_id": phone_number_id, "calls": targets},
    )

    if not response.ok:
        error = response.json()
        # INVALID_PHONE_NUMBER / INVALID_METADATA carry extensions.index
        raise RuntimeError(f"{error.get('extensions', {}).get('code')}: {error.get('message')}")

    body = response.json()
    print(f"Batch {body['batch_call_id']} queued {body['accepted']} calls")
    print([c["call_id"] for c in body["calls"]])  # one stable call_id per queued call
    return body["batch_call_id"]  # always present — keep it to cancel the batch later

create_bulk_calls(
    "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    [
        {"phone_number": "+905551112233", "metadata": {"crm_contact_id": "CNT-90412"}},
        {"phone_number": "05554445566", "metadata": {"crm_contact_id": "CNT-90413"}},
    ],
)
```

</TabItem>
</Tabs>
