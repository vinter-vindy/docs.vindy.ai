---
title: Create a Call Batch
sidebar_label: Create a Call Batch
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/bulk`

Creates outbound calls to the phone numbers you provide, using one assistant (1–1000 numbers per request).

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
  "scheduled_at": "2026-06-10T09:00:00+03:00",
  "calling_window": { "timezone": "Europe/Istanbul", "start": "09:00", "end": "18:00", "days": [1, 2, 3, 4, 5] },
  "calls": [
    { "phone_number": "+905551112233", "variables": { "first_name": "Elif" }, "metadata": { "order": { "id": "ORD-4821", "items": [{ "sku": "A", "qty": 2 }] }, "tags": ["vip"], "priority": 1 } },
    { "phone_number": "+905551112244", "variables": { "first_name": "Mehmet" }, "metadata": { "order_id": "ORD-4822" } }
  ]
}
```

## Body parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `assistant_id` | string (UUID) | yes | Assistant that places the calls. Get it from [`GET /v1/assistants`](list-assistants.md). |
| `phone_number_id` | string | yes | The **caller line** the calls are placed from (the outbound caller/CLI). Must be one returned by [`GET /v1/phone-numbers`](list-phone-numbers.md) — i.e. it belongs to your company and is provisioned for outbound. Any usable number works with any assistant; an inbound assignment does not restrict it. |
| `variables` | object | no | **Shared** template variables applied to **every** call as a base — filled into the assistant's `{{placeholder}}` tokens. Each `calls[].variables` overrides these per call. See [Variables](#variables). |
| `calls` | array | yes | Call targets (1–1000). |
| `calls[].phone_number` | string | yes | Destination number. See [Phone numbers](#phone-numbers) below. |
| `calls[].variables` | object | no | **Per-call** template variables for this number (e.g. `{ "first_name": "Ahmet" }`). Merged over the request-level `variables` (the per-call value wins). See [Variables](#variables). |
| `calls[].metadata` | object | no | Optional key-value object (see [Metadata](#metadata) limits). Returned verbatim. |
| `scheduled_at` | ISO 8601 datetime | no | If set, the whole batch is queued to start at this **future** time instead of immediately. Send an ISO 8601 date-time **with a timezone offset** — see [Scheduling](#scheduled-at). |
| `calling_window` | object \| null | no | Optional **business-hours window** for the whole batch — calls are only dialed inside it; those that come due outside it are **deferred**, not rejected. Omit to use the platform's default business-hours window. See [Calling window](#calling-window). |

### Phone numbers {#phone-numbers}

Numbers must be given in full international **E.164** format: a leading `+`, then the country code, then the number. Common separators — spaces, dashes, and parentheses — are tolerated and stripped, so `+90 555 111 22 33` is accepted too.

| You send | Result |
|---|---|
| `+905551112233` | `+905551112233` — accepted |
| `+90 555 111 22 33` | `+905551112233` — separators stripped |
| `+441632960000` | `+441632960000` — accepted |
| `05551112233` | **Rejected** — `400 INVALID_PHONE_NUMBER` (no leading `+`) |
| `5551112233` | **Rejected** — no leading `+` |
| `905551112233` | **Rejected** — no leading `+` |

There is **no country-specific normalization** — a number without a leading `+` is rejected with **`400 INVALID_PHONE_NUMBER`** (in bulk, the offending array position is in `extensions.index`). Provide every number in full E.164 (`+` + country code + number).

Accepted numbers are stored and dialed in their normalized form; you see that value later as `call_phone_number` on each call in list, get, and webhook responses.

### Metadata {#metadata}

`metadata` is a free-form key-value object that belongs entirely to **you**. Vindy treats it as an opaque payload — it is **never read, parsed, validated, or acted on**, and it has **no effect** on how a call is placed, routed, or processed. Vindy simply stores it and returns it to you unchanged on every view of that call — in [`POST /v1/calls/list`](list-calls/index.md), in [`GET /v1/calls/:callId`](get-call.md), and in [webhook events](webhooks.md).

Its only job is **correlation on your side**. Attach whatever identifiers your own systems need to tie a call back to your data — a CRM contact ID, an order number, a campaign tag, your internal request ID, and so on. When the result comes back, you read those same keys off `call_metadata` and route the outcome straight into your CRM, database, or workflow — no need to keep a separate phone-number-to-record mapping.

You can send **structured** metadata — not just flat key-value pairs. Values may be scalars *or* nested objects and arrays, so you can mirror the shape of your own records. The only rules are structural, so that Vindy can store and return it reliably:

| Limit | Value |
|---|---|
| Value types | `string`, `number`, `boolean`, `null`, and nested objects and arrays |
| Max keys per object | 50 (top-level and each nested object) |
| Max key length | 40 |
| Max string value length | 500 |
| Max nesting depth | 5 |
| Max total entries | 200 (all scalars and containers combined) |
| Max serialized size | 32 KB (JSON, UTF-8) |

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

Which names an assistant expects is listed in `assistant_variables` on [`GET /v1/assistants`](list-assistants.md) (derived from the `{{…}}` in its prompt and greeting). A placeholder you don't supply is rendered as **empty** — no `{{…}}` ever leaks into speech. The key and length limits match `metadata` (≤50 keys, key ≤40, value ≤500), but — unlike `metadata` — variables are **scalar-only**: no nested objects or arrays:

| Limit | Value |
|---|---|
| Max keys | 50 |
| Max key length | 40 |
| Max value length | 500 |
| Value types | `string`, `number`, `boolean` (numbers/booleans are stringified) |
| Nested objects / arrays / `null` | Not allowed |

Unlike `metadata` — where an empty key is tolerated — a `variables` **key must be non-empty**: it must be 1–40 characters. An empty key is rejected.

A violation returns **`400 INVALID_VARIABLES`**; for a per-call `variables` the offending array position is in `extensions.index` (a request-level violation reports `index: -1`).

### Scheduling with `scheduled_at` {#scheduled-at}

By default the whole batch is queued immediately. To start it later, send `scheduled_at` as an **ISO 8601 / RFC 3339 date-time that includes a timezone offset** (it applies to the entire batch):

| Form | Example | Fires at |
|---|---|---|
| Numeric offset (recommended) | `2026-06-10T09:00:00+03:00` | 09:00 in Istanbul (UTC+3) |
| UTC (`Z`) | `2026-06-10T06:00:00Z` | 06:00 UTC = 09:00 Istanbul |

**Always include the offset.** A value with no offset (a "naive" time such as `2026-06-10T09:00:00`) is interpreted as **UTC**, not local time — so it would fire at 12:00 Istanbul, three hours later than you probably intend. To schedule for 09:00 Istanbul, send `2026-06-10T09:00:00+03:00`.

- Times are stored and compared in **UTC**; timestamps elsewhere in the API are returned in UTC (`+00:00`).
- **No future check:** a time in the past queues the batch to start on the next dispatch cycle (≈immediately). To start now, simply omit `scheduled_at`.
- A value that isn't a valid ISO 8601 date-time (e.g. `10.06.2026`, `now`) is rejected with **`400 VALIDATION_FAILED`**.

### Calling window {#calling-window}

`calling_window` restricts the hours during which the batch's calls may be dialed (business hours). It applies to the **whole batch**. Calls that come due outside the window are **not rejected — they are deferred** to the next opening, so a batch is only ever dialed during its allowed hours.

```json
{
  "timezone": "Europe/Istanbul",
  "start": "09:00",
  "end": "18:00",
  "days": [1, 2, 3, 4, 5]
}
```

| Field | Type | Description |
|---|---|---|
| `timezone` | string | IANA timezone name (e.g. `Europe/Istanbul`). The window's hours are interpreted in this zone. Omit to default to `Europe/Istanbul`. |
| `start` | string | Opening time, `HH:MM` (24-hour). |
| `end` | string | Closing time, `HH:MM`. Must be **after** `start` — overnight windows (crossing midnight) are not supported. |
| `days` | array | Days of the **week** the window is active, ISO numbering **1 = Monday … 7 = Sunday**; a non-empty subset of `1..7`. |

- **Recurring weekly rule, not calendar dates.** `days` are weekdays, so the window repeats every week.
- **Whole batch.** Every call in the request obeys the same window.
- **`scheduled_at` is clamped too.** The effective start is the later of `scheduled_at` and now, then moved into the window — if `scheduled_at` falls outside the window, dialing begins at the next opening after it.
- **Omitted or `null` → platform default.** If you don't send `calling_window` (or send `null`), the platform's default business-hours window is applied — currently **weekday (Mon–Fri) 09:00–18:00 Europe/Istanbul** (`days: [1, 2, 3, 4, 5]`), configurable by the platform via `CALLING_WINDOW_DEFAULT_*`. The window that was actually **applied** is echoed back in the response's `calling_window`, so you can always confirm exactly what was used.

An invalid `calling_window` (bad timezone, `start ≥ end`, empty or out-of-range `days`, or a malformed `HH:MM`) is rejected with **`400 INVALID_CALLING_WINDOW`**:

```json
{
  "message": "calling_window is invalid. Provide { timezone: IANA name, start: 'HH:MM', end: 'HH:MM' (start before end, same day), days: non-empty list of ISO weekdays 1-7 (Mon=1..Sun=7) }.",
  "extensions": { "code": "INVALID_CALLING_WINDOW" }
}
```

## Response (201 Created)

```json
{
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "accepted": 2,
  "calling_window": { "timezone": "Europe/Istanbul", "start": "09:00", "end": "18:00", "days": [1, 2, 3, 4, 5] }
}
```

| Field | Type | Description |
|---|---|---|
| `batch_call_id` | string (UUID) | Identifier of the created batch. **Always present** — `/v1/calls/bulk` always creates a batch, even for a single number. **Keep it** to cancel the batch later via [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) or to list its calls via [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md). For a one-off call with no batch, use [`POST /v1/calls`](create-call.md) instead. |
| `accepted` | int | Number of calls queued. |
| `calling_window` | object | The calling window **applied** to this batch — your normalized window, or the platform default if you didn't send one. **Always present.** See [Calling window](#calling-window). |

:::info Correlating results — no per-call ids are returned
By design, the bulk response returns **only** `batch_call_id` and `accepted` — it does **not** list a `call_id` for each queued call (returning up to 1000 ids on every batch is unnecessary overhead). You correlate results in one of two ways:

- **By your `metadata`** (recommended): attach your own identifier (e.g. `crm_contact_id`) to each call. Every outcome — via [`POST /v1/calls/list`](list-calls/index.md) and the [`call-ended` webhook](webhooks.md) — echoes it back as `call_metadata`, so you can route each result without ever needing Vindy's `call_id`.
- **By listing the batch's calls**: page through the batch with [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md), which returns each call (with its `call_id`, phone number, and current status).

For a one-off call where you *do* want the ID back immediately, use the single-call endpoint [`POST /v1/calls`](create-call.md) instead — it returns that call's `call_id`.
:::

Calls are queued and run in the background. Results (transcript, recording, structured data) become available as each call completes.

:::tip Track a batch's progress
When a `batch_call_id` was returned (a multi-call batch), page through its calls as they finish with [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md). To know the moment the **whole** batch is done — with a per-status breakdown — listen for the [`batch-ended` webhook](webhooks.md#batch-ended).
:::

## Errors

| Status | Code | Description |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `calls` empty or over 1000, malformed body, a missing `phone_number_id`, etc. |
| `400` | `INVALID_PHONE_NUMBER` | A `calls[i].phone_number` could not be normalized. The offending index is in `extensions.index`. |
| `400` | `INVALID_VARIABLES` | A `variables` object violates the limits or uses an invalid value type. For a per-call value the offending index is in `extensions.index`; a request-level violation reports `index: -1`. |
| `400` | `INVALID_METADATA` | A call's metadata violates the limits or uses an invalid value type. The offending index is in `extensions.index`. |
| `400` | `PHONE_NUMBER_NOT_USABLE` | The `phone_number_id` line exists but is not ready for outbound (not provisioned). |
| `400` | `INVALID_CALLING_WINDOW` | The `calling_window` is invalid — bad timezone, `start ≥ end`, empty/out-of-range `days`, or malformed `HH:MM`. |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Auth errors. |
| `404` | `ASSISTANT_NOT_FOUND` | Assistant not found, not in your company, or not callable. |
| `404` | `PHONE_NUMBER_NOT_FOUND` | The `phone_number_id` is unknown, malformed, or not in your company. Pick one from [`GET /v1/phone-numbers`](list-phone-numbers.md). |
| `429` | `RATE_LIMITED` | Rate limit exceeded (per-minute). Retry after `Retry-After` seconds. |

:::caution Atomic request
If **any** number or metadata in the request is invalid, **no calls are created** — the whole request is rejected. Fix the offending entry (see `extensions.index`) and resubmit.
:::

:::warning No server-side de-duplication
There is no server-side lock against concurrent or repeated submissions — a second identical request simply creates a **second batch** and calls everyone again. Retry only when you're sure the previous request didn't succeed, and de-duplicate on your side. See the [FAQ](../faq.md#is-it-safe-to-retry-requests).
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
      { "phone_number": "+905551112233", "metadata": { "order_id": "ORD-4821" } },
      { "phone_number": "+905551112244", "metadata": { "order_id": "ORD-4822" } }
    ]
  }'
# → { "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479", "accepted": 2, "calling_window": { "timezone": "Europe/Istanbul", "start": "09:00", "end": "18:00", "days": [1, 2, 3, 4, 5] } }
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

  const { batch_call_id, accepted } = await response.json();
  console.log(`Batch ${batch_call_id} queued ${accepted} calls`);
  return batch_call_id; // always present — keep it to cancel the batch later
}

await createBulkCalls(
  "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  [
    { phone_number: "+905551112233", metadata: { order_id: "ORD-4821" } },
    { phone_number: "+905551112244", metadata: { order_id: "ORD-4822" } },
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
    return body["batch_call_id"]  # always present — keep it to cancel the batch later

create_bulk_calls(
    "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    [
        {"phone_number": "+905551112233", "metadata": {"order_id": "ORD-4821"}},
        {"phone_number": "+905551112244", "metadata": {"order_id": "ORD-4822"}},
    ],
)
```

</TabItem>
</Tabs>
