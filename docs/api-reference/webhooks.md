---
title: Webhooks
sidebar_label: Webhooks
sidebar_position: 9
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Webhooks (Event Delivery)

Vindy sends events via **HTTP POST** to the webhook URL configured for your company, so you can react in near real time instead of continuously polling [`POST /v1/calls/list`](list-calls/index.md). There are **three event types**:

| `event_type` | Fires when | `data` is |
|---|---|---|
| [`call-ended`](#call-ended) | A **physical call** reaches a terminal state — `completed` or `failed` — **or** a queued call is cancelled, whether on its own (from the Vindy panel or via [`POST /v1/calls/:callId/cancel`](cancel-call.md)) or as part of a [batch cancel](cancel-batch.md) (`call_status: cancelled`, minimal body). | The complete call object (or `null`). |
| [`recording-ready`](#recording-ready) | A call's **audio recording** has finished transferring to durable storage and is now downloadable. Fires **after** that call's `call-ended`, for the same `call_id`. Only fires when a recording actually becomes available (never for a failed or absent recording). | A **lean** payload — `call_id`, `batch_call_id`, `call_duration_seconds`, your `call_metadata`, and a ready `call_recording` (`available: true` + download `url`). Not the full call object. |
| [`batch-ended`](#batch-ended) | A **batch** reaches `completed` — every call in it has reached a terminal state — **or** a batch is cancelled (from the Vindy panel or via [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md)) (`status: cancelled`). Sent once. | A batch summary with a per-status breakdown (or `null`). |

All three share the same delivery semantics (retries, at-least-once delivery) — see [Behavior](#behavior).

---

## Setup

A webhook subscription is made up of three things — the URL to deliver to, optional custom headers, and the set of events you want:

- **URL** — the address events are sent to. Must be a public `https://` address (plain `http`, private/internal, loopback, and cloud-metadata addresses are rejected for security).
- **Custom headers (optional)** — custom HTTP headers you register for your webhook endpoint; they are sent **the same way on every delivery**. Use them to verify on your side that the request genuinely came from Vindy — e.g. `{"X-API-Key": "<your-secret>"}`. Vindy's own canonical headers (`Content-Type`, `User-Agent`, `X-Vindy-*`) always take precedence and cannot be overridden.
- **Events** — which events to receive, in any combination: `call.ended`, `recording.ready`, and `campaign.ended` (the batch-ended event).

:::info Setup is not self-service yet
Webhook endpoints are configured **by the Vindy team** — there is no self-service page for it yet. To enable webhooks, contact us with the three details above (the URL, any custom headers, and the events you want) and we'll register the subscription for your account. Changing them later — the URL, the headers, or the event set — also goes through us for now.
:::

:::note Authentication: use a static (non-rotating) method
Vindy does **not** support flows that **fetch a token and continuously re-authenticate** (OAuth token exchange, short-lived/rotating tokens, etc.) when delivering webhooks. Configure a **static security method** to verify the request instead — for example, send a fixed API key in a custom header (`X-API-Key`). The headers you register are replayed verbatim on every delivery, so use a constant secret, not a rotating value.
:::

## Request headers

Vindy sends the same set of headers on every delivery, regardless of event type:

| Header | Value | Notes |
|---|---|---|
| `Content-Type` | `application/json` | The body is always JSON. |
| `User-Agent` | `Vindy-Webhooks/1.0` | Identifies the sender as Vindy's webhook delivery system; the value is the same on every delivery. |
| `X-Vindy-Event` | `call.ended` \| `recording.ready` \| `campaign.ended` | Tells you which event type was delivered. The event name is **dotted** in this header, deliberately different from the **hyphenated** `event_type` in the body (`call.ended` ↔ `call-ended`, `recording.ready` ↔ `recording-ready`, `campaign.ended` ↔ `batch-ended`). To route by type, use either this header or the body's `event_type` — whichever you prefer. |
| `X-Vindy-Delivery-Id` | `<uuid>` | A unique ID for this delivery; it stays the same even when the same event is retried. If you receive an event more than once, use this value to de-duplicate (idempotency). The same value also appears in the body as `delivery_id`. |
| _custom headers_ | as configured | Any custom headers you registered for your webhook are sent verbatim on every delivery. If one of them collides with a standard Vindy header above, Vindy's value always wins; these headers cannot be overridden. |

## The `call-ended` event {#call-ended}

:::caution A cancelled queued call also fires `call-ended`
`call-ended` fires in two situations:

1. **A real call ends** — it reaches a terminal state (`completed` or `failed`).
2. **A queued call is cancelled** — whether you cancel it on its own (from the Vindy panel or via [`POST /v1/calls/:callId/cancel`](cancel-call.md)) or as part of a [batch cancel](cancel-batch.md).

Every cancelled queued call fires its **own** `call-ended`: `call_status` is `"cancelled"` and the body is minimal (transcript, structured data, and recording fields are `null`). Your `call_metadata` and `call_variables` are echoed back, so you can match each event to its call one-to-one. See [how cancellations map to webhooks](#batch-ended).
:::

Vindy sends an HTTP `POST` with a JSON body. The body is a **top-level object** (`event_type`, `delivery_id`, `call_id`) that wraps `data` — the **complete call object**, exactly the same shape returned by [`GET /v1/calls/:callId`](get-call.md) and by each item in [`POST /v1/calls/list`](list-calls/index.md).

```http
POST webhook-url
Content-Type: application/json
User-Agent: Vindy-Webhooks/1.0
X-Vindy-Event: call.ended
X-Vindy-Delivery-Id: 0190aa00-1c5a-7000-8000-abc123def456
<your custom headers, e.g. X-API-Key: ...>
```

```json
{
  "event_type": "call-ended",
  "delivery_id": "0190aa00-1c5a-7000-8000-abc123def456",
  "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
  "data": {
    "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
    "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
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
      "arama_sonucu": "tamamlandi",
      "genel_memnuniyet_puani": 4,
      "geri_arama_talebi": false,
      "ilgilenilen_urunler": null
    },
    "call_metadata": { "order_id": "ORD-4821" },
    "call_variables": { "first_name": "Elif" },
    "call_recording": {
      "available": true,
      "url": "https://your-bucket.s3.eu-central-1.amazonaws.com/call-records/...ogg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=86400&X-Amz-Signature=...",
      "expires_at": "2026-06-09T10:31:27+00:00"
    }
  }
}
```

`data.call_transcript` is a single string whose turns are separated by newlines (`\n`), so the escaped value above shows on one line. For the transcript format and a rendered example, see [List Calls](list-calls/index.md).

:::note Field ordering and encoding
The JSON we deliver keeps the **same field order** as the examples on this page: the request leads with `event_type` and `delivery_id`, and `data`'s first field is `call_id`. Non-ASCII characters are sent as raw UTF-8 (not `\u`-escaped). Even so, don't treat field order as a contract — always address fields by name.
:::

### Top-level fields

| Field | Type | Description |
|---|---|---|
| `event_type` | string | Holds `call-ended` for this event. |
| `delivery_id` | string (UUID) | Identifies this specific delivery. It stays the same across retries, so if the same event arrives more than once, de-duplicate on this value. It is also sent as the `X-Vindy-Delivery-Id` header. |
| `call_id` | string \| null | Identifies the call with a stable ID that stays unchanged across its whole life (queued → in progress → terminal). It is the same as `data.call_id` and matches the `call_id` in every other API response (for example [`POST /v1/calls/list`](list-calls/index.md) and [`GET /v1/calls/:callId`](get-call.md)), so you can use it to line the call up with your own records. We duplicate it at the top level so you can de-duplicate and route without parsing `data`. It is `null` in the rare case the call has no ID. |
| `data` | object \| null | Holds the complete call object, with all fields listed below. It is `null` if the source record can't be projected. |

### `data` — the call object

`data` is the same object returned by [`GET /v1/calls/:callId`](get-call.md):

| Field | Type | Description |
|---|---|---|
| `call_id` | string | Holds the call's stable identifier, the same value as the top-level `call_id`. |
| `batch_call_id` | string \| null | Identifies the batch this call belongs to, and matches the `batch_call_id` that [`POST /v1/calls/bulk`](bulk-create-calls.md) returned, so you can group a batch's `call-ended` events together. It is `null` when the call isn't part of a batch, which is the case for a single call from [`POST /v1/calls`](create-call.md) and for any inbound call. |
| `call_status` | string | Gives the call's status, one of `completed`, `failed`, or `cancelled`. You see `cancelled` when a queued call is cancelled — on its own **or** as part of a [batch cancel](cancel-batch.md) — and that delivery carries a minimal body (see [below](#a-cancelled-single-call)); a physical call is only ever `completed` or `failed`. |
| `call_assistant_id` | string (UUID) \| null | Identifies the assistant that ran this call, and matches the `assistant_id` from [`GET /v1/assistants`](list-assistants.md). It is `null` if unknown. |
| `call_assistant_name` | string \| null | Gives the display name of the assistant that handled the call, the same name you see in the panel. It is `null` if unknown. |
| `call_phone_number` | string \| null | Holds the other party's number on this call: the number dialed on an outbound call, or the caller's number on an inbound one, in E.164 format when available. It is `null` when unknown. |
| `call_bound_type` | string \| null | Tells you the call's direction: `inbound` when the customer called you, or `outbound` when the assistant placed the call. It is `null` if unknown. |
| `call_started_at` | ISO 8601 (UTC) \| null | Marks the moment the call actually started, as an ISO 8601 timestamp in **UTC** written with a `+00:00` offset. There is **no** guaranteed `Z` suffix or fixed millisecond precision, so parse it with a real ISO 8601 parser and convert it to your local timezone for display. It is `null` when the call never connected to the other party — for example a system error, no answer, or a busy line. |
| `call_ended_at` | ISO 8601 (UTC) \| null | Marks the moment the call ended, in the same ISO 8601 UTC format. It is `null` when the call never connected to the other party. |
| `call_created_at` | ISO 8601 (UTC) | Marks the moment we created the call record in our system, in the same ISO 8601 UTC format. |
| `call_duration_seconds` | int \| null | Tells you how long the call lasted, in seconds. It is `null` when the call never connected to the other party, as with a no-answer `failed` call. |
| `call_end_reason` | string \| null | Gives the raw reason the call ended, as a free-form string returned unmapped. See [End reasons](list-calls/index.md#end-reasons); treat it as opaque and don't fail on unknown values. |
| `call_transcript` | string \| null | Holds the plain-text transcript. Each line reads `[HH:MM:SS] Asistan:` (assistant, `Asistan`) or `[HH:MM:SS] Müşteri:` (caller, `Müşteri`) — Turkish role labels prefixed with a UTC `HH:MM:SS` timestamp — and the lines are separated by newlines (`\n`). It may be empty or `null` for a very short or failed call. |
| `call_structured_data` | object \| null | Holds the structured data the AI extracted from the call — a flat object whose keys are the field names from your assistant's structured output schema. It is `null` when the assistant has no structured output schema, when nothing could be extracted, or when the stored data couldn't be parsed; even when the object is present, individual fields inside it can be `null`. See [Structured data shapes](list-calls/index.md#structured-data-shapes). |
| `call_metadata` | object \| null | Returns, verbatim, the opaque metadata you sent via [`POST /v1/calls`](create-call.md) or [`POST /v1/calls/bulk`](bulk-create-calls.md), so you can line the call up with your own records. It is `null` if the call wasn't created with metadata. |
| `call_variables` | object \| null | Returns, verbatim, the template variables sent for this call — the same object you passed as `variables` when you created it. It is `null` when none were sent, as with inbound calls. |
| `call_recording` | object | Tells you whether the recording is available and, when it is, how to download it. Its fields are listed below. |

**`data.call_recording`**

| Field | Type | Description |
|---|---|---|
| `available` | bool | Tells you whether a downloadable recording exists for this call. |
| `url` | string \| absent | Gives a long-lived (about 24-hour) presigned download URL. It is present **only** when `available: true`. |
| `expires_at` | ISO string \| absent | Marks the moment the URL expires (UTC, `+00:00`). It is present **only** when `available: true`. |

:::info The recording URL is long-lived and generated at send time
`data.call_recording.url` is valid for about **~24 hours** from the moment the webhook was sent, so it comfortably survives normal processing delays and retries. Don't persist it — store the `call_id` and fetch a fresh URL on demand; for the full rules see [Get a Recording URL](get-recording-url.md).

On a **`call-ended`** delivery, `available` may be `false` **transiently** — the call is finalized but its recording is still transferring to durable storage (this is common for assistants with no structured-output schema, whose `call-ended` fires the instant the call finalizes). When the recording lands, Vindy sends a separate [`recording-ready`](#recording-ready) event with `available: true` and a fresh `url`. So treat `available: false` on `call-ended` as **"not yet," not "never"** — wait for [`recording-ready`](#recording-ready), or re-fetch via [`GET /v1/calls/:callId/recording-url`](get-recording-url.md) (which returns `409` while a recording is still processing and `404` only when none will ever exist).
:::

### A cancelled call {#a-cancelled-single-call}

When a queued call is cancelled — on its own (from the Vindy panel or via [`POST /v1/calls/:callId/cancel`](cancel-call.md)) **or** as part of a [batch cancel](cancel-batch.md) — a `call-ended` event fires for **that specific call**, with `call_status: "cancelled"` and a **minimal** `data` object: the call never happened, so the conversation, structured data, and timing fields are `null`, `call_end_reason` is `"cancelled"`, and `call_recording.available` is `false`. Your `call_metadata` and `call_variables` are still echoed back so you can correlate it one-to-one. Cancelling a batch does the same for every queued call it stops: a batch cancel that stops 100 queued calls sends 100 separate `call-ended` events. A single [`batch-ended`](#batch-ended) event then arrives last, after all of them.

```json
{
  "event_type": "call-ended",
  "delivery_id": "1c2d3e4f-5a6b-7c88-9d0e-1f2a3b4c5d6e",
  "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b",
  "data": {
    "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b",
    "batch_call_id": null,
    "call_status": "cancelled",
    "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "call_assistant_name": "Vindy - Asistan",
    "call_phone_number": "+905551112233",
    "call_bound_type": "outbound",
    "call_started_at": null,
    "call_ended_at": null,
    "call_created_at": "2026-06-08T10:29:55+00:00",
    "call_duration_seconds": null,
    "call_end_reason": "cancelled",
    "call_transcript": null,
    "call_structured_data": null,
    "call_metadata": { "order_id": "ORD-4821" },
    "call_variables": { "first_name": "Elif" },
    "call_recording": { "available": false }
  }
}
```

## The `recording-ready` event {#recording-ready}

Fires **after** a call's [`call-ended`](#call-ended), once that call's **audio recording** has finished transferring to durable storage and is downloadable. It's the push counterpart to polling for the recording: the moment the recording lands, you receive it — no timer, no re-fetch loop.

Use it when you need the recording reliably. A `call-ended` delivery can carry `call_recording.available: false` while the recording is still transferring — especially for assistants with **no structured-output schema**, whose `call-ended` fires the instant the call finalizes, before the recording has uploaded. `recording-ready` closes that gap.

- Fires **only** when a recording actually becomes available — **never** for a call that produced no recording or whose recording permanently failed. If you never receive it for a given call, that call has no downloadable recording.
- Carries the **same `call_id`** as that call's `call-ended` (and as [`GET /v1/calls/:callId`](get-call.md)) — correlate the two on `call_id`.
- Always **delivered after** that call's `call-ended`: Vindy holds `recording-ready` until the call's `call-ended` has reached your endpoint, so the order is guaranteed. Deliveries are still at-least-once (the same event may repeat). The one exception: if that `call-ended` can't be delivered at all after every retry, Vindy stops waiting for it — so de-duplicate by `delivery_id` and correlate by `call_id`.
- **Not tied to `batch-ended`.** For a call in a batch, its `recording-ready` may arrive **after** the batch's [`batch-ended`](#batch-ended) — recordings are processed in parallel and finish on their own timeline, so a batch can be "complete" (every call result delivered) while some recordings are still transferring. This is **expected**, not a missed or late event — keep accepting `recording-ready` after you've seen `batch-ended`.

The body is **lean and recording-focused** — deliberately **not** the full call object of `call-ended`. It reuses the same top-level envelope (`event_type`, `delivery_id`, `call_id`), and `data` carries what this event is about plus the fields you need to match it to your own records without a lookup: the `call_id`, the `batch_call_id`, your `call_metadata`, the `call_duration_seconds`, and a fresh `call_recording` block. `batch_call_id` and `call_metadata` are **identical** to that call's `call-ended` (same derivation) — both may be `null` (see each field below). Everything else about the call — transcript, structured data, cost — is on that call's `call-ended` (which always precedes this event) or [`GET /v1/calls/:callId`](get-call.md), reachable by the shared `call_id`.

| `data` field | Type | Description |
|---|---|---|
| `call_id` | string | Identifies the call this recording belongs to, and is identical to that call's [`call-ended`](#call-ended) and to [`GET /v1/calls/:callId`](get-call.md). Correlate on this. |
| `batch_call_id` | string \| null | Identifies the batch this call belongs to, and is identical to that call's [`call-ended`](#call-ended). It is `null` when the call isn't part of a batch, which is the case for a single call from [`POST /v1/calls`](create-call.md) and for any inbound call. |
| `call_duration_seconds` | integer \| null | Tells you how long the call lasted, in seconds. |
| `call_metadata` | object \| null | Returns, verbatim, the opaque metadata you sent via [`POST /v1/calls/bulk`](bulk-create-calls.md) or [`POST /v1/calls`](create-call.md) — identical to that call's [`call-ended`](#call-ended) — so you can match the recording to your own records. It is `null` if the call wasn't created with metadata. |
| `call_recording.available` | boolean | Is always `true` on this event. |
| `call_recording.url` | string | Gives a time-limited, presigned download URL for the audio file. |
| `call_recording.expires_at` | string (ISO 8601) | Marks the moment `url` stops working. Download the file — or re-request it via [`GET /v1/calls/:callId/recording-url`](get-recording-url.md) — before then. |

```http
POST webhook-url
Content-Type: application/json
User-Agent: Vindy-Webhooks/1.0
X-Vindy-Event: recording.ready
X-Vindy-Delivery-Id: 0190aa00-1c5a-7000-8000-abc987654321
<your custom headers, e.g. X-API-Key: ...>
```

```json
{
  "event_type": "recording-ready",
  "delivery_id": "0190aa00-1c5a-7000-8000-abc987654321",
  "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
  "data": {
    "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
    "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
    "call_duration_seconds": 87,
    "call_metadata": { "order_id": "ORD-4821" },
    "call_recording": {
      "available": true,
      "url": "https://your-bucket.s3.eu-central-1.amazonaws.com/call-records/...ogg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=86400&X-Amz-Signature=...",
      "expires_at": "2026-06-09T10:31:27+00:00"
    }
  }
}
```

Delivery semantics match every other event — respond `2xx` within ~15s, at-least-once, de-duplicate by `delivery_id`, retried with backoff — see [Behavior](#behavior). Need a field this lean payload omits (transcript, structured data, cost)? It's on that call's [`call-ended`](#call-ended) or [`GET /v1/calls/:callId`](get-call.md), reachable by the shared `call_id`.

## The `batch-ended` event {#batch-ended}

Fires **once** when a batch — created via [`POST /v1/calls/bulk`](bulk-create-calls.md) — reaches `completed` (**every call in it has finished dialing and reached a terminal state**), **or** when a batch is cancelled (from the Vindy panel or via [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md)) (`status: cancelled`). It marks the batch as fully settled: read the `counts` breakdown for the outcome, then fetch the calls via [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md). Vindy delivers it **after** every `call-ended` for the batch — so it doubles as a reliable "all calls are in" signal (see the guarantee below).

The `data` payload below is the **same `BatchCallSummary`** you can pull on demand from [`GET /v1/calls/batches/:batchId`](get-batch.md) (one batch) or [`POST /v1/calls/batches/list`](list-batches.md) (all your batches) — this event is its push counterpart.

:::caution How cancellations map to webhooks
Cancelling a batch produces **one `call-ended` per stopped queued call** (each with `call_status: "cancelled"`, a minimal body, and your `call_metadata`/`call_variables` echoed back) **plus one** `batch-ended` with `status: "cancelled"`. Every cancelled call is reported individually — exactly like a single-call cancel — so you can match each one to your own records by its `call_metadata`; there is **no** roll-up and nothing to infer. Calls in the batch that were **not** cancelled — those that had already run to completion, or were mid-dial and finished — emit their own `call-ended` as usual. As always, the `batch-ended` arrives **last**, after every one of those `call-ended` events (including the cancelled ones). Cancelling a single call on its own behaves identically: it emits its own [`call-ended`](#call-ended) with `call_status: "cancelled"`.
:::

:::tip `batch-ended` arrives after every `call-ended` for the batch
Vindy holds a batch's `batch-ended` until **every** `call-ended` for that batch has been delivered to your endpoint. So by the time `batch-ended` arrives, you have already received each of the batch's calls — you can treat it as the batch's "everything is in" signal and finalize your side. This includes a cancelled batch: each stopped queued call emits its own `call-ended` (`call_status: "cancelled"`) and the `batch-ended` waits for all of them too, so it still arrives strictly last (see [how cancellations map to webhooks](#batch-ended)).

This holds in the overwhelming majority of cases, but it is **not an absolute guarantee** — a few things can still leave a `call-ended` missing, or very rarely put one **after** its `batch-ended`, so your handler must account for them:

- **De-duplicate.** Because delivery is **at-least-once**, the same `call-ended` (or the `batch-ended` itself) may arrive more than once — always de-dup by `delivery_id`.
- **A permanently-failed `call-ended`.** If a call's `call-ended` could not be delivered after all retries (e.g. your endpoint was down for hours, and Vindy [gave up on it](#behavior)), Vindy stops waiting for it — so `batch-ended` can arrive with that one call missing.
- **A rarely-delayed `call-ended`.** Very occasionally a transient internal hiccup holds back a single `call-ended`, so it is delivered shortly **after** its `batch-ended` instead of before it.

For the last two cases the fix is the same: **keep accepting `call-ended` events even after `batch-ended`**, and treat [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) as the source of truth for the complete, final set.

`recording-ready` is **not** part of this ordering guarantee: a call's [`recording-ready`](#recording-ready) can still arrive **after** the batch's `batch-ended`, and that is **expected** — recordings are processed in parallel and finish on their own timeline, so the batch can be "complete" (every result delivered) while some recordings are still transferring. Treat a `recording-ready` that follows `batch-ended` as normal, not a missed delivery. This ordering guarantee covers `call-ended` — the per-call outcome — not the recording signal.
:::

The top-level object differs from `call-ended`: it carries `batch_call_id` (**not** `call_id`), and `data` is a **batch summary** rather than a call object.

```json
{
  "event_type": "batch-ended",
  "delivery_id": "0a61f9bd-2e77-4c8a-9d31-6b0f5a2c1e84",
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "data": {
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
  }
}
```

### Top-level fields

| Field | Type | Description |
|---|---|---|
| `event_type` | string | Holds `batch-ended` for this event. |
| `delivery_id` | string (UUID) | Identifies this delivery with a stable ID that is the same across every retry attempt. De-duplicate on it or on `batch_call_id`. |
| `batch_call_id` | string | Identifies the batch, duplicated at the top level for convenience. Use it to de-duplicate and to fetch the batch's calls via [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md). |
| `data` | object \| null | Holds the batch summary, with the fields below. It is `null` if the source record can't be projected. |

### `data` — the batch summary

| Field | Type | Description |
|---|---|---|
| `batch_call_id` | string | Identifies the batch, with the same value as the top-level `batch_call_id`. |
| `status` | string | Gives the batch's final status: `completed`, or `cancelled` when the batch was cancelled. |
| `total_count` | int | Tells you the total number of calls in the batch. |
| `counts` | object | Breaks the batch's calls down by status, with the fields below. |
| `created_at` | ISO string | Marks the moment the batch was created (UTC, `+00:00`). |

**`data.counts`**

| Field | Type | Description |
|---|---|---|
| `completed` | int | Counts the calls that finished successfully. |
| `failed` | int | Counts the calls that ended in failure. |
| `cancelled` | int | Counts the calls that were cancelled from the queue before dialing. Each of these also emits its own [`call-ended`](#call-ended) with `call_status: "cancelled"`, so this number is only the aggregate. See [how cancellations map to webhooks](#batch-ended). |
| `pending` | int | Counts the calls not yet started, covering both `pending` and `scheduled` calls. It is always `0` when `batch-ended` is delivered. |
| `processing` | int | Counts the calls still in progress (the `in_progress` call status). It is always `0` when `batch-ended` is delivered, because the event isn't sent until every call has finished — none is still dialing — so the breakdown you receive is always final. |

:::note Same delivery semantics as `call-ended`
`batch-ended` is delivered exactly like `call-ended` — respond `2xx` within ~15s, retried with backoff, at-least-once (de-duplicate by `delivery_id` or `batch_call_id`), and the same headers. The one difference is ordering: `batch-ended` is always delivered **after** every `call-ended` for its batch (the guarantee above). (A `recording-ready` is likewise delivered after its own `call-ended`; otherwise events have no ordering guarantee among themselves.) See [Behavior](#behavior).
:::

## Tracking a batch in your own system — the recommended approach {#reconcile-batch}

**Every** call in a batch emits its own [`call-ended`](#call-ended) — whether it `completed`, `failed`, or was `cancelled` (queued calls stopped by the batch cancel included). And `batch-ended` is delivered **after all of them** (the ordering guarantee above). So you can drive your integration entirely from events, matching each call to your own records by a unique id — with the API only as an outage fallback. There is nothing to infer: a batch cancel does **not** roll up its calls.

**Keep one row per call you submitted**, correlated by a unique id you attach in `metadata` (recommended — echoed back on every `call-ended`, including cancelled ones, and in the API), or by `call_phone_number`. Each row moves: `queued` → `completed` / `failed` / `cancelled`.

1. **On each `call-ended`** → set that call's row to its terminal status straight from `call_status` (`completed` / `failed` / `cancelled`). This is the **only** transition you need — match on your `metadata` id and you always know exactly which call it is, cancelled ones included. De-duplicate by `delivery_id`.

2. **On `batch-ended`** → the batch is fully settled and every `call-ended` has already arrived. Treat it purely as the "everything is in" signal: finalize the batch on your side and read `counts` for the summary. In the normal case **no row should still be `queued`** — every call already got its own `call-ended`.

Note that `status: "cancelled"` on `batch-ended` means the **batch** was cancelled (the action), not that every call was cancelled — calls that had already run still count under `counts.completed` / `counts.failed`, and each cancelled call is reported by its own `call-ended`.

:::tip The one outage gap
The single exception is a `call-ended` that could **not** be delivered after all retries (your endpoint was down long enough that Vindy [gave up on it](#behavior)); Vindy no longer waits for it, so `batch-ended` can arrive with that one call's row still `queued` on your side. Detect it trivially — any row still `queued` after `batch-ended` — and reconcile just those rows via [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md), the source of truth. A healthy endpoint hits this **never** and reconciles a batch with **zero** extra API calls.
:::

:::caution Handle your own concurrency
Delivery is at-least-once and your handlers may run in parallel. Make your updates safe to repeat and key them on your `metadata` id: applying the same `call-ended` twice should change nothing (de-duplicate by `delivery_id`), and setting a row already in its terminal state to the same state is harmless. Because each call — cancelled included — arrives as its own `call-ended`, you never have to fill in missing rows after the fact when `batch-ended` arrives, so there's no race between that clean-up and a late-arriving call to guard against.
:::

## Behavior

- **Respond `2xx`** — within ~15 seconds. A non-`2xx` response or a timeout is treated as a failed delivery and Vindy retries.
- **Retries** — failed deliveries are retried with increasing backoff (roughly `30s → 2m → 10m → 1h`, with about ±20% random jitter), about 5 attempts in total, after which Vindy stops retrying that delivery.
- **At-least-once delivery** — under adverse network conditions the same event may arrive more than once. **De-duplicate** on `delivery_id` (stable across retries; also in the `X-Vindy-Delivery-Id` header) — or on `call_id` for `call-ended` and `batch_call_id` for `batch-ended`.
- **No general ordering guarantee** — events may arrive in a different order than the calls ended in, so correlate by `call_id` / `batch_call_id`, not arrival order. **Two exceptions:** (1) a batch's `batch-ended` is always delivered **after** every `call-ended` for that batch (a "batch complete" guarantee — see [`batch-ended`](#batch-ended)); (2) a call's `recording-ready` is always delivered **after** that call's `call-ended` (a per-call guarantee — see [`recording-ready`](#recording-ready)). (De-dup still applies, and a `call-ended` that permanently failed delivery is the sole gap in either guarantee — reconcile via [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md).)
- **Public HTTPS only** — the webhook endpoint must be a public `https` URL; private, loopback, and cloud-metadata addresses are rejected (SSRF protection).
- **Recording URL freshness** — `data.call_recording.url` is a ~24-hour URL generated at send time. Don't persist it; fetch a fresh one on demand — see [Get a Recording URL](get-recording-url.md).
- **PII** — the payload may contain phone numbers and transcripts; handle and store it accordingly.

:::tip Acknowledge fast, process later
Return `2xx` as soon as you've safely stored the event, then do the heavy work (downloading recordings, updating your systems) asynchronously. This keeps you within the ~15s window and avoids unnecessary retries.
:::

## Handling a delivery

A robust handler (optionally) checks the custom auth header you registered, acknowledges quickly, de-duplicates on `delivery_id`, and re-fetches a fresh recording URL when needed.

<Tabs groupId="lang">
<TabItem value="node" label="Node.js (Express)">

```javascript
import express from "express";

const app = express();
const seen = new Set(); // back this with a DB / unique constraint in production

app.post("/vindy/webhook", express.json(), async (req, res) => {
  // 1. (Optional) authenticate using the custom header you registered with Vindy
  if (req.get("X-API-Key") !== process.env.VINDY_WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }

  // 2. De-duplicate on the stable delivery id (at-least-once delivery)
  const deliveryId = req.get("X-Vindy-Delivery-Id") ?? req.body.delivery_id;
  if (seen.has(deliveryId)) return res.sendStatus(200);
  seen.add(deliveryId);

  // 3. Acknowledge fast, then process asynchronously
  res.sendStatus(200);

  // 4. The recording URL is long-lived (~24 hours) — re-fetch a fresh call if you need it much later
  void processEvent(req.body);
});

app.listen(3000);
```

</TabItem>
<TabItem value="python" label="Python (Flask)">

```python
import os
from flask import Flask, request, abort

app = Flask(__name__)
seen = set()  # back this with a DB / unique constraint in production

@app.post("/vindy/webhook")
def vindy_webhook():
    # 1. (Optional) authenticate using the custom header you registered with Vindy
    if request.headers.get("X-API-Key") != os.environ["VINDY_WEBHOOK_SECRET"]:
        abort(401)

    body = request.get_json()

    # 2. De-duplicate on the stable delivery id (at-least-once delivery)
    delivery_id = request.headers.get("X-Vindy-Delivery-Id") or body["delivery_id"]
    if delivery_id in seen:
        return "", 200
    seen.add(delivery_id)

    # 3. Enqueue for async processing, then acknowledge fast.
    #    The recording URL is long-lived (~24 hours) — re-fetch a fresh call if you need it much later.
    enqueue_processing(body)
    return "", 200
```

</TabItem>
</Tabs>

:::note Related
Webhooks complement, but do not replace, [`POST /v1/calls/list`](list-calls/index.md). For a polling-based reconciliation pattern, see the [Incremental Sync guide](../guides/incremental-sync.md).
:::
