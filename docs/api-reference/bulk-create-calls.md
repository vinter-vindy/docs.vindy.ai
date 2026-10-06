---
title: Create a Call Batch
sidebar_label: Create a Call Batch
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/bulk`

Creates outbound calls to the phone numbers you provide, using one assistant (1–1000 numbers per request).

Each call may carry an optional `metadata` object. Vindy does not process it. Vindy **returns it verbatim** on each call object in [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md), and [webhook events](webhooks.md). Use it to tie a call back to a record in your own system (a CRM contact, an order, a support ticket). See [Metadata](#metadata) for details and limits.

Each call can also carry `variables`. These personalize what the assistant says: when the assistant's script contains a placeholder like `{{first_name}}`, Vindy replaces it with the value you send (for example, the customer's name) before the call starts. So where `metadata` never touches the call, `variables` **change what the assistant says**. Send the values that are the same for everyone once at the request level, and the values specific to each person on that call. See [Variables](#variables).

You choose the **caller number** the calls are placed from with `phone_number_id`. This is one of the numbers returned by [`GET /v1/phone-numbers`](list-phone-numbers.md), and it is the number that shows up on the recipient's phone when Vindy dials on your behalf.

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
| `assistant_id` | string (UUID) | yes | Chooses the AI assistant that will place and run the calls — the one that does the talking. Get its id from [`GET /v1/assistants`](list-assistants.md). |
| `phone_number_id` | string | yes | Sets the caller number that shows up on the person's phone when Vindy calls them. Pick one from [`GET /v1/phone-numbers`](list-phone-numbers.md). |
| `variables` | object | no | Sets template variables shared by **every** call as a base, for values that are the same on all of them (e.g. `{ "company": "Vindy" }`). They fill the assistant's `{{…}}` placeholders, and a call's own `calls[].variables` can override any of them. See [Variables](#variables). |
| `calls` | array | yes | Lists the people to call, one entry per recipient. Each entry carries that person's phone number and, if you choose to send them, its own `variables` and `metadata`. You can send 1 to 1000 entries in a single request. |
| `calls[].phone_number` | string | yes | Gives the number to dial for this call, in full international **E.164** form (e.g. `+905551112233`). See [Phone numbers](#phone-numbers) below. |
| `calls[].variables` | object | no | Sets template variables for **this one call** (e.g. `{ "first_name": "Ahmet" }`). They are merged onto the request-level `variables`, and on a key clash this per-call value wins. See [Variables](#variables). |
| `calls[].metadata` | object | no | Attaches your own optional data object to this call (e.g. `{ "order_id": "ORD-4821" }`). Vindy never reads it and returns it verbatim with the result, so you can match the call back to your own record. See [Metadata](#metadata) for the limits. |
| `scheduled_at` | ISO 8601 datetime | no | If set, the whole batch is queued to start at this **future** time instead of immediately. Send an ISO 8601 date-time **with a timezone offset**. See [Scheduling](#scheduled-at). |
| `calling_window` | object \| null | no | Sets a time range so you only call people at suitable hours — for example weekdays 09:00–18:00, never at night or on weekends. Calls that fall outside it aren't cancelled; they're placed once the window next opens. Omit it and Vindy uses a sensible default. See [Calling window](#calling-window). |

### Phone numbers {#phone-numbers}

Numbers must be given in full international **E.164** format. That means a leading `+`, then the country code, then the subscriber number. Common separators (spaces, dashes, parentheses, and dots) are tolerated and stripped, so `+90 555 111 22 33` is accepted too. After the `+`, there must be 8 to 15 digits in total; anything shorter or longer is rejected.

| You send | Result |
|---|---|
| `+905551112233` | `+905551112233` — accepted |
| `+90 555 111 22 33` | `+905551112233` — separators stripped |
| `+441632960000` | `+441632960000` — accepted |
| `+12` | **Rejected** — fewer than 8 digits |
| `05551112233` | **Rejected** — `400 INVALID_PHONE_NUMBER` (no leading `+`) |
| `5551112233` | **Rejected** — no leading `+` |
| `905551112233` | **Rejected** — no leading `+` |

There is **no country-specific normalization**. A number without a leading `+` is rejected with **`400 INVALID_PHONE_NUMBER`** (in bulk, the offending array position is in `extensions.index`). Provide every number in full E.164 (`+` + country code + number).

Accepted numbers are stored and dialed in their normalized form; you see that value later as `call_phone_number` on each call in list, get, and webhook responses.

### Metadata {#metadata}

`metadata` is a free-form key-value object that belongs entirely to **you**. Vindy treats it as an opaque payload. It is **never read, parsed, validated, or acted on**, and it has **no effect** on how a call is placed, routed, or processed. Vindy simply stores it and returns it to you unchanged on every view of that call. You see it in [`POST /v1/calls/list`](list-calls/index.md), in [`GET /v1/calls/:callId`](get-call.md), and in [webhook events](webhooks.md).

Its only job is **correlation on your side**. Attach whatever identifiers your own systems need to tie a call back to your data, such as a CRM contact ID, an order number, a campaign tag, or your internal request ID. When the result comes back, you read those same keys off `call_metadata` and route the outcome straight into your CRM, database, or workflow. You never need to keep a separate phone-number-to-record mapping.

You can send **structured** metadata, not just flat key-value pairs. Values may be scalars *or* nested objects and arrays, so you can mirror the shape of your own records. The only rules are structural, so that Vindy can store and return it reliably:

| Limit | Value | Example |
|---|---|---|
| Value types | `string`, `number`, `boolean`, `null`, and nested objects and arrays | `{ "orderId": "ORD-4821", "qty": 2, "paid": true, "note": null, "items": ["a", "b"] }` is valid |
| Max keys per object | 50 (top-level and each nested object) | an object with 51 keys is rejected |
| Max key length | 40 | `crm_contact_id` (14 characters) is fine; a 41-character key is rejected |
| Max string value length | 500 | a 600-character string value is rejected |
| Max nesting depth | 5 | `{ "a": { "b": { "c": { "d": 1 } } } }` is at the limit; nesting one level deeper is rejected |
| Max total entries | 200 (all scalars and containers combined) | 250 values across the whole object is rejected |
| Max serialized size | 32 KB (JSON, UTF-8) | a payload that serializes to 40 KB is rejected |

:::caution Use it for your own keys — and keep PII out
Because Vindy never interprets `metadata`, it is the right place for **your** correlation keys (e.g. `crm_contact_id`, `orderId`, `campaign`). It is **not** the place for personal data (names, phone numbers, ID numbers) — keep those in your own systems and reference them by key instead.
:::

### Variables {#variables}

`variables` are **template values** the assistant uses **during the call**. Wherever the assistant's prompt or greeting contains a `{{name}}` placeholder, Vindy substitutes the value you send for `name` before the call starts. A greeting like `"Hello {{first_name}}, this is a reminder for {{appointment_time}}"` is therefore personalized per call.

This is the opposite of `metadata`. Where `metadata` is opaque and **never affects the call**, `variables` **change what the assistant says**. Send `variables`, not `metadata`, for anything the assistant should speak.

Variables come in two levels, and Vindy merges them for each call. A request-level `variables` object sets a shared base for every call, and each `calls[].variables` adds to or overrides that base for one call. For example, given this request:

```json
{
  "variables": { "company": "Vindy", "agent_name": "Ada" },
  "calls": [
    { "phone_number": "+905551112233", "variables": { "first_name": "Elif", "agent_name": "Mert" } }
  ]
}
```

the first call is placed with the merged set `{ "company": "Vindy", "first_name": "Elif", "agent_name": "Mert" }`. `company` comes from the shared base, `first_name` is added by the call, and `agent_name` is sent at both levels, so the per-call value (`"Mert"`) wins.

| Level | Field | Applies to |
|---|---|---|
| Request | `variables` | Every call (a shared base — e.g. `{ "company": "Vindy" }`). |
| Per call | `calls[].variables` | That one call (e.g. `{ "first_name": "Ahmet" }`), overriding the request-level base. |

Which names an assistant expects is listed in `assistant_variables` on [`GET /v1/assistants`](list-assistants.md), derived from the `{{…}}` in its prompt and greeting. A placeholder you don't supply is rendered as **empty**, so no `{{…}}` ever leaks into speech. The key and length limits match `metadata` (≤50 keys, key ≤40, value ≤500). Unlike `metadata`, though, variables are **scalar-only**, with no nested objects or arrays:

| Limit | Value | Example |
|---|---|---|
| Max keys | 50 | an object with 51 keys is rejected |
| Max key length | 40 | `first_name` is fine; a 41-character key is rejected |
| Max value length | 500 | a 600-character value is rejected |
| Value types | `string`, `number`, `boolean` (numbers/booleans are stringified) | `{ "count": 3 }` is spoken as `3`; `{ "paid": true }` as `true` |
| Nested objects / arrays / `null` | Not allowed | `{ "order": { "id": 1 } }` and `{ "note": null }` are rejected |

Unlike `metadata`, where an empty key is tolerated, a `variables` **key must be non-empty**. It must be 1–40 characters, and an empty key is rejected.

A violation returns **`400 INVALID_VARIABLES`**; for a per-call `variables` the offending array position is in `extensions.index` (a request-level violation reports `index: -1`).

### Scheduling with `scheduled_at` {#scheduled-at}

By default the whole batch is queued immediately. To start it later, send `scheduled_at` as an **ISO 8601 / RFC 3339 date-time that includes a timezone offset** (it applies to the entire batch):

| Form | Example | Fires at |
|---|---|---|
| Numeric offset (recommended) | `2026-06-10T09:00:00+03:00` | 09:00 in Istanbul (UTC+3) |
| UTC (`Z`) | `2026-06-10T06:00:00Z` | 06:00 UTC = 09:00 Istanbul |

**Always include the offset.** A value with no offset (a "naive" time such as `2026-06-10T09:00:00`) is interpreted as **UTC**, not local time, so it would fire at 12:00 Istanbul, three hours later than you probably intend. To schedule for 09:00 Istanbul, send `2026-06-10T09:00:00+03:00`.

- Times are stored and compared in **UTC**; timestamps elsewhere in the API are returned in UTC (`+00:00`).
- **No future check:** a time in the past queues the batch to start on the next dispatch cycle. To start as soon as possible, simply omit `scheduled_at`.
- **The calling window still applies.** Whether you schedule a time or omit `scheduled_at`, dialing is gated by the calling window, and a default business-hours window applies when you don't send one. A batch whose start moment falls outside the window waits until the window next opens. See [Calling window](#calling-window).
- A value that isn't a valid ISO 8601 date-time (e.g. `10.06.2026`, `now`) is rejected with **`400 VALIDATION_FAILED`**.

### Calling window {#calling-window}

Most of the time you only want to call people at certain hours — say, weekday business hours, not at night or on the weekend. That's what `calling_window` is for: it guarantees the batch is only dialed during the hours you allow. Calls that fall outside those hours aren't cancelled; they wait and go out the next time the window opens. The window applies to every call in the batch.

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
| `timezone` | string | Gives the IANA timezone name (e.g. `Europe/Istanbul`); the window's hours are interpreted in this zone. Omit it to default to `Europe/Istanbul`. |
| `start` | string | Sets the opening time, as `HH:MM` on a 24-hour clock. |
| `end` | string | Sets the closing time, as `HH:MM`. It must be **after** `start`; overnight windows (crossing midnight) are not supported. |
| `days` | array | Lists the **weekdays** the window is active, using ISO numbering (**1 = Monday … 7 = Sunday**); send a non-empty subset of `1..7`. |

- **Recurring weekly rule, not calendar dates.** `days` are weekdays, so the window repeats every week.
- **Whole batch.** Every call in the request obeys the same window.
- **`scheduled_at` is adjusted to the window too.** Dialing starts from `scheduled_at` (or from now, if you didn't send one), clamped to the window. If that moment falls outside the window, it waits until the window next opens.
- **Omitted or `null` → platform default.** If you don't send `calling_window` (or send `null`), the platform's default business-hours window is applied. That default is currently **weekday (Mon–Fri) 09:00–18:00 Europe/Istanbul** (`days: [1, 2, 3, 4, 5]`), and the platform can change it via `CALLING_WINDOW_DEFAULT_*`. The window that was actually **applied** is echoed back in the response's `calling_window`, so you can always confirm exactly what was used.

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
| `batch_call_id` | string (UUID) | Identifier of the created batch. It is **always present**, because `/v1/calls/bulk` always creates a batch, even for a single number. **Keep it** to cancel the batch later via [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) or to list its calls via [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md). For a one-off call with no batch, use [`POST /v1/calls`](create-call.md) instead. |
| `accepted` | int | Tells you how many calls were queued. |
| `calling_window` | object | Echoes the calling window **applied** to this batch. This is your normalized window, or the platform default if you didn't send one, and it is **always present**. See [Calling window](#calling-window). |

:::info Correlating results — no per-call ids are returned
By design, the bulk response returns a `batch_call_id` and a count, but **no per-call `call_id`s** — returning up to 1000 ids on every batch would be unnecessary overhead. You correlate results in one of two ways:

- **By your `metadata`** (recommended): attach your own identifier (for example `crm_contact_id`) to each call. Every outcome echoes it back as `call_metadata`, through [`POST /v1/calls/list`](list-calls/index.md) and the [`call-ended` webhook](webhooks.md), so you can route each result without ever needing Vindy's `call_id`.
- **By listing the batch's calls**: page through the batch with [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md), which returns each call (with its `call_id`, phone number, and current status).

For a one-off call where you *do* want the ID back immediately, use the single-call endpoint [`POST /v1/calls`](create-call.md) instead. It returns that call's `call_id`.
:::

Calls are queued and run in the background. Results (transcript, recording, structured data) become available as each call completes.

:::tip Track a batch's progress
Since `/v1/calls/bulk` always returns a `batch_call_id`, you can page through the batch's calls as they finish with [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md). To know the moment the **whole** batch is done, with a per-status breakdown, listen for the [`batch-ended` webhook](webhooks.md#batch-ended).
:::

## Errors

| Status | Code | Description |
|---|---|---|
| `400` | `VALIDATION_FAILED` | The `calls` array is empty or over 1000, the body is malformed, `phone_number_id` is missing, or a similar validation failed. |
| `400` | `INVALID_PHONE_NUMBER` | A `calls[i].phone_number` could not be normalized. The offending index is in `extensions.index`. |
| `400` | `INVALID_VARIABLES` | A `variables` object violates the limits or uses an invalid value type. For a per-call value the offending index is in `extensions.index`; a request-level violation reports `index: -1`. |
| `400` | `INVALID_METADATA` | A call's metadata violates the limits or uses an invalid value type. The offending index is in `extensions.index`. |
| `400` | `PHONE_NUMBER_NOT_USABLE` | The `phone_number_id` exists but is not yet set up for outbound calls. |
| `400` | `INVALID_CALLING_WINDOW` | The `calling_window` is invalid (bad timezone, `start ≥ end`, empty/out-of-range `days`, or malformed `HH:MM`). |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | The request's authentication failed. |
| `404` | `ASSISTANT_NOT_FOUND` | The assistant doesn't exist, or it isn't in your company. |
| `404` | `PHONE_NUMBER_NOT_FOUND` | The `phone_number_id` is unknown, malformed, or not in your company. Pick one from [`GET /v1/phone-numbers`](list-phone-numbers.md). |
| `429` | `RATE_LIMITED` | You've exceeded the per-minute rate limit; retry after the `Retry-After` seconds. |

:::caution Atomic request
If **any** number, metadata, or variable in the request is invalid, **no calls are created**; the whole request is rejected. Fix the offending entry (see `extensions.index`) and resubmit.
:::

:::warning No server-side de-duplication
There is no server-side lock against concurrent or repeated submissions. A second identical request simply creates a **second batch** and calls everyone again. Retry only when you're sure the previous request didn't succeed, and de-duplicate on your side. See the [FAQ](../faq.md#is-it-safe-to-retry-requests).
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
      phone_number_id: phoneNumberId, // caller number from GET /v1/phone-numbers
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
        # phone_number_id is the caller number from GET /v1/phone-numbers
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