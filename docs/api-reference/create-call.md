---
title: Create a Call
sidebar_label: Create a Call
sidebar_position: 5.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls`

Places a **single** outbound call. Unlike [`POST /v1/calls/bulk`](bulk-create-calls.md) it creates no batch, so there is no `batch_call_id`. Use this for one-off calls — a single reminder, one callback — and use bulk when you need to call many people at once.

The call is queued and dispatched asynchronously; no call is placed synchronously within the request. The response returns the call's `call_id`, which you use to [track](get-call.md) or [cancel](cancel-call.md) it.

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
| `assistant_id` | string (UUID) | **Required.** Chooses the AI assistant that will place and run the call — the one that does the talking. Get its id from [`GET /v1/assistants`](list-assistants.md). |
| `phone_number_id` | string (UUID) | **Required.** Sets the caller number that shows up on the person's phone when Vindy calls them. Pick one from [`GET /v1/phone-numbers`](list-phone-numbers.md). |
| `phone_number` | string | **Required.** Gives the number to call, in full international **E.164** format (e.g. `+905551112233`). See [Phone numbers](#phone-numbers) below. |
| `variables` | object \| null | Personalizes what the assistant says on this call. Wherever the assistant's script has a `{{placeholder}}`, Vindy fills it with the value you send (e.g. `{ "first_name": "Elif" }`), so the greeting and prompt address this person by name. Unlike `metadata`, `variables` **change what the assistant says**. See [Variables](#variables) for the limits. |
| `metadata` | object \| null | Attaches your own data object to the call and **returns it verbatim** wherever you later read it (e.g. `{ "order_id": "ORD-4821" }`). Vindy never reads it, so use it to tie the result back to your own record. See [Metadata](#metadata) for the limits. |
| `scheduled_at` | ISO 8601 datetime \| null | Set this to place the call at a **future** time instead of right away (e.g. `2026-06-10T09:00:00+03:00`). Omit it and the call is queued as soon as capacity allows. Send an ISO 8601 date-time **with a timezone offset**. See [Scheduling](#scheduled-at). |

### Phone numbers {#phone-numbers}

Give the number in full international **E.164** format: a leading `+`, then the country code, then the subscriber number (e.g. `+905551112233`). Common separators — spaces, dashes, parentheses, and dots — are tolerated and stripped, so `+90 555 111 22 33` is accepted too. After the `+` there must be 8 to 15 digits in total; anything shorter or longer is rejected.

| You send | Result |
|---|---|
| `+905551112233` | `+905551112233` — accepted |
| `+90 555 111 22 33` | `+905551112233` — separators stripped |
| `+441632960000` | `+441632960000` — accepted |
| `+12` | **Rejected** — fewer than 8 digits |
| `05551112233` | **Rejected** — `400 INVALID_PHONE_NUMBER` (no leading `+`) |
| `5551112233` | **Rejected** — no leading `+` |

There is **no country-specific normalization**. A number without a leading `+` is rejected with **`400 INVALID_PHONE_NUMBER`**. Accepted numbers are stored and dialed in their normalized form; that normalized value is what you get back as `phone_number` in the response, and what you see later as `call_phone_number` on the call in list, get, and webhook responses.

### Variables {#variables}

`variables` are **template values** the assistant uses **during the call**. Wherever the assistant's prompt or greeting contains a `{{name}}` placeholder, Vindy substitutes the value you send for `name` before the call starts. A greeting like `"Hello {{first_name}}, this is a reminder for {{appointment_time}}"` is therefore personalized for this call.

This is the opposite of `metadata`. Where `metadata` is opaque and **never affects the call**, `variables` **change what the assistant says**. Send `variables`, not `metadata`, for anything the assistant should speak.

Which names an assistant expects is listed in `assistant_variables` on [`GET /v1/assistants`](list-assistants.md), derived from the `{{…}}` in its prompt and greeting. A placeholder you don't supply is rendered as **empty**, so no `{{…}}` ever leaks into speech. Values are **scalar-only** — no nested objects or arrays:

| Limit | Value | Example |
|---|---|---|
| Max keys | 50 | an object with 51 keys is rejected |
| Max key length | 40 | `first_name` is fine; a 41-character key is rejected |
| Max value length | 500 | a 600-character value is rejected |
| Value types | `string`, `number`, `boolean` (numbers/booleans are stringified) | `{ "count": 3 }` is spoken as `3`; `{ "paid": true }` as `true` |
| Nested objects / arrays / `null` | Not allowed | `{ "order": { "id": 1 } }` and `{ "note": null }` are rejected |

A `variables` key must be non-empty (1–40 characters). A violation returns **`400 INVALID_VARIABLES`**.

### Metadata {#metadata}

`metadata` is a free-form key-value object that belongs entirely to **you**. Vindy treats it as an opaque payload: it is **never read, parsed, validated, or acted on**, and it has **no effect** on how the call is placed, routed, or processed. Vindy simply stores it and returns it to you unchanged on every view of that call — in [`GET /v1/calls/:callId`](get-call.md), in [`POST /v1/calls/list`](list-calls/index.md), and in [webhook events](webhooks.md).

Its only job is **correlation on your side**. Attach whatever identifiers your own systems need to tie the call back to your data — a CRM contact id, an order number, your internal request id. When the result comes back, you read those same keys off `call_metadata` and route the outcome straight into your CRM, database, or workflow, without keeping a separate phone-number-to-record mapping.

Unlike `variables`, `metadata` may be **structured** — values can be scalars or nested objects and arrays, so you can mirror the shape of your own records. The only rules are structural, so Vindy can store and return it reliably:

| Limit | Value | Example |
|---|---|---|
| Value types | `string`, `number`, `boolean`, `null`, and nested objects and arrays | `{ "orderId": "ORD-4821", "qty": 2, "paid": true, "note": null, "items": ["a", "b"] }` is valid |
| Max keys per object | 50 (top-level and each nested object) | an object with 51 keys is rejected |
| Max key length | 40 | `crm_contact_id` (14 characters) is fine; a 41-character key is rejected |
| Max string value length | 500 | a 600-character string value is rejected |
| Max nesting depth | 5 | `{ "a": { "b": { "c": { "d": 1 } } } }` is at the limit; one level deeper is rejected |
| Max total entries | 200 (all scalars and containers combined) | 250 values across the whole object is rejected |
| Max serialized size | 32 KB (JSON, UTF-8) | a payload that serializes to 40 KB is rejected |

A violation returns **`400 INVALID_METADATA`**.

:::caution Use it for your own keys — and keep PII out
Because Vindy never interprets `metadata`, it is the right place for **your** correlation keys (e.g. `crm_contact_id`, `orderId`, `campaign`). It is **not** the place for personal data (names, phone numbers, ID numbers) — keep those in your own systems and reference them by key instead.
:::

### Scheduling with `scheduled_at` {#scheduled-at}

By default the call is queued immediately. To place it later, send `scheduled_at` as an **ISO 8601 / RFC 3339 date-time that includes a timezone offset**:

| Form | Example | Fires at |
|---|---|---|
| Numeric offset (recommended) | `2026-06-10T09:00:00+03:00` | 09:00 in Istanbul (UTC+3) |
| UTC (`Z`) | `2026-06-10T06:00:00Z` | 06:00 UTC = 09:00 Istanbul |

**Always include the offset.** A value with no offset (a "naive" time such as `2026-06-10T09:00:00`) is interpreted as **UTC**, not local time — so it would fire at 12:00 Istanbul, three hours later than you probably intend. To schedule for 09:00 Istanbul, send `2026-06-10T09:00:00+03:00`.

- Times are stored and compared in **UTC**; timestamps elsewhere in the API are returned in UTC (`+00:00`).
- **No future check:** a time in the past is queued to start on the next dispatch cycle (≈immediately). To place a call right now, simply omit `scheduled_at`.
- Unlike a batch, a single call is **not** held by a business-hours window; it is placed as soon as it's due — right now, or at `scheduled_at`.
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
| `call_id` | string (UUID) | Holds this call's stable id. Query it with [`GET /v1/calls/:callId`](get-call.md), or cancel it while it is still queued with [`POST /v1/calls/:callId/cancel`](cancel-call.md). |
| `phone_number` | string | Gives the normalized E.164 number Vindy will dial — your input with its separators stripped. |

## Errors

| Status | Code |
|---|---|
| `400` | `VALIDATION_FAILED` (a required field is missing), `INVALID_PHONE_NUMBER`, `INVALID_VARIABLES`, `INVALID_METADATA`, `PHONE_NUMBER_NOT_USABLE` |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `404` | `ASSISTANT_NOT_FOUND`, `PHONE_NUMBER_NOT_FOUND` |
| `429` | `RATE_LIMITED` |

`PHONE_NUMBER_NOT_FOUND` means the `phone_number_id` is unknown, malformed, or not in your company; `PHONE_NUMBER_NOT_USABLE` means the number exists but is not ready for outbound.

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
