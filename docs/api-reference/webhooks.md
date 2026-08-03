---
title: Webhooks
sidebar_label: Webhooks
sidebar_position: 9
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Webhooks (Event Delivery)

Vindy sends events via **HTTP POST** to the webhook URL configured for your account, so you can react in near-real-time instead of continuously polling [`POST /v1/calls/list`](list-calls/index.md). There are **two event types**:

| `event_type` | Fires when | `data` is |
|---|---|---|
| [`call-ended`](#call-ended) | A **physical call** reaches a terminal state — `completed` or `failed` — **or** a **single** queued call is cancelled via [`POST /v1/calls/:callId/cancel`](cancel-call.md) (`call_status: cancelled`, minimal body). | The complete call object (or `null`). |
| [`batch-ended`](#batch-ended) | A **batch** reaches `completed` — every call in it has reached a terminal state — **or** a batch is cancelled via [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) (`status: cancelled`). Sent once. | A batch summary with a per-status breakdown (or `null`). |

Both share the same delivery semantics (retries, at-least-once delivery) — see [Behavior](#behavior).

---

## Setup

:::info Webhook setup is not self-service yet
Webhook endpoints are configured **by the Vindy team**. To enable webhooks, contact us and provide:

- **URL** — must be a public `https://` endpoint (plain `http`, private, loopback, and cloud-metadata addresses are rejected).
- **Custom headers (optional)** — a free-form map of HTTP headers, sent **verbatim** on every delivery. Use them to authenticate the request on your side, e.g. `{"X-API-Key": "<your-secret>"}` or `{"Authorization": "Bearer <your-token>"}`. Vindy's own canonical headers (`Content-Type`, `User-Agent`, `X-Vindy-*`) always take precedence and cannot be overridden.
- **Events** — which events to receive: `call.ended`, `campaign.ended`, or both.
:::

## Request headers

Vindy sends the same set of headers on every delivery, for both event types:

| Header | Value | Notes |
|---|---|---|
| `Content-Type` | `application/json` | |
| `User-Agent` | `Vindy-Webhooks/1.0` | Identifies Vindy's delivery agent. |
| `X-Vindy-Event` | `call.ended` \| `campaign.ended` | The internal event name — **dotted**, and deliberately different from the hyphenated `event_type` in the body. `call.ended` maps to body `call-ended`; `campaign.ended` maps to body `batch-ended`. Route on whichever you prefer. |
| `X-Vindy-Delivery-Id` | `<uuid>` | Stable id for this delivery — **identical across every retry** of the same event. Use it as your idempotency / de-duplication key. Also present in the body as `delivery_id`. |
| _custom headers_ | as configured | Any custom headers you registered — sent verbatim. Vindy's canonical headers above always win and cannot be overridden. |

## The `call-ended` event {#call-ended}

:::caution When a cancelled call fires `call-ended` — and when it doesn't
`call-ended` fires when a real call reaches a terminal state (`completed` or `failed`), and **also** when you cancel a **single** queued call via [`POST /v1/calls/:callId/cancel`](cancel-call.md) — that delivery carries `call_status: "cancelled"` and a **minimal** body (transcript, structured data, and recording fields are `null`). The exception: calls stopped as part of a **batch** cancel ([`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md)) do **not** each fire a `call-ended` — they roll up into a single [`batch-ended`](#batch-ended) event instead, to avoid a flood on large batches.
:::

Vindy sends an HTTP `POST` with a JSON body. The body is a **top-level object** (`event_type`, `delivery_id`, `call_id`) that wraps `data` — the **complete call object**, byte-for-byte the same shape returned by [`GET /v1/calls/:callId`](get-call.md) and by each item in [`POST /v1/calls/list`](list-calls/index.md).

```http
POST <your-webhook-url>
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
  "call_id": "sess_9f2c8a10b3d4",
  "data": {
    "call_id": "sess_9f2c8a10b3d4",
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
      "age": 32,
      "overall_satisfaction": 4,
      "support_speed": 5,
      "would_recommend": true
    },
    "call_metadata": { "crm_contact_id": "CNT-90412" },
    "call_variables": { "first_name": "Batu" },
    "call_recording": {
      "available": true,
      "url": "https://your-bucket.s3.eu-central-1.amazonaws.com/call-records/...wav?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=86400&X-Amz-Signature=...",
      "expires_at": "2026-06-09T10:31:27+00:00"
    }
  }
}
```

`data.call_transcript` is a single string; each turn within it is separated by a newline (`\n`). JSON escapes those newlines, so the value above shows on one line. Rendered with real line breaks, the transcript above reads:

```text
[10:30:00] Asistan: Hi, this is Vindy, your AI assistant. I'd like to ask a few quick questions for our customer satisfaction survey — is now a good time?
[10:30:07] Müşteri: Sure, go ahead.
[10:30:11] Asistan: Thank you. First, may I ask your age?
[10:30:16] Müşteri: Thirty-two.
```

### Top-level fields

| Field | Type | Description |
|---|---|---|
| `event_type` | string | `call-ended` for this event. |
| `delivery_id` | string (UUID) | Stable id for this delivery. It stays the same across every retry attempt of the same event, so you can de-duplicate on it (also sent as the `X-Vindy-Delivery-Id` header). |
| `call_id` | string \| null | The call's stable id (a string). For an **outbound** call it's the id you received in the [`POST /v1/calls/bulk`](bulk-create-calls.md) `calls[]` response; for an **inbound** call it's the call's own id. Stable across the call's whole life and across delivery retries. Duplicated at the top level so you can de-duplicate and route without parsing `data`. `null` in the rare case the call has no id. |
| `data` | object \| null | The complete call object — all fields below. `null` if the source record can't be projected. |

### `data` — the call object

`data` is the same object returned by [`GET /v1/calls/:callId`](get-call.md):

| Field | Type | Description |
|---|---|---|
| `call_id` | string | Stable call id (same value as the top-level `call_id`). |
| `call_status` | string | `completed` \| `failed` \| `cancelled`. `cancelled` appears only when you cancelled this as a **single** queued call — that delivery carries a minimal body (see [above](#a-cancelled-single-call)). Physical calls are only ever `completed` or `failed`. |
| `call_assistant_id` | string (UUID) \| null | Assistant that handled the call. `null` if unknown. |
| `call_assistant_name` | string \| null | Human-readable assistant name. |
| `call_phone_number` | string \| null | Phone number called or calling (E.164 format when available). `null` when unknown. |
| `call_bound_type` | string \| null | `inbound` \| `outbound` \| `null`. |
| `call_started_at` | ISO 8601 (UTC) \| null | When the call actually started — an ISO-8601 timestamp in **UTC**, written with a `+00:00` offset. There is **no** guaranteed `Z` suffix or fixed millisecond precision, so parse it with a real ISO-8601 parser and convert to your local timezone for display. `null` if the call never connected. |
| `call_ended_at` | ISO 8601 (UTC) \| null | When the call ended, in the same ISO-8601 UTC format. `null` if the call never connected. |
| `call_created_at` | ISO 8601 (UTC) | When we created the call record in our system, in the same ISO-8601 UTC format. |
| `call_duration_seconds` | int \| null | Call duration in seconds. |
| `call_end_reason` | string \| null | Free-form string — the raw reason the call ended, returned unmapped. See [End reasons](list-calls/index.md#end-reasons); treat it as opaque and don't fail on unknown values. |
| `call_transcript` | string \| null | Plain-text transcript. Each line is `[HH:MM:SS] Asistan:` (assistant, `Asistan`) or `[HH:MM:SS] Müşteri:` (caller, `Müşteri`) — Turkish role labels prefixed with a UTC `HH:MM:SS` timestamp — separated by newlines (`\n`). May be empty or `null` for very short or failed calls. |
| `call_structured_data` | object \| null | AI-extracted data, returned as a flat object whose keys are your assistant's structured output schema properties. `null` when the assistant has no structured output schema or nothing could be extracted — see [Structured data shapes](list-calls/index.md#structured-data-shapes). |
| `call_metadata` | object \| null | The opaque metadata you sent via [`POST /v1/calls/bulk`](bulk-create-calls.md), echoed back verbatim for correlation. `null` if the call wasn't created with metadata. |
| `call_variables` | object \| null | The template variables sent for this call, echoed back verbatim — the same object you passed as `variables` when creating the call. `null` when none were sent (e.g. inbound calls). |
| `call_recording` | object | Recording availability + URL — fields below. |

**`data.call_recording`**

| Field | Type | Description |
|---|---|---|
| `available` | bool | Whether a downloadable recording exists for this call. |
| `url` | string \| absent | Long-lived (~24-hour) presigned download URL. Present **only** when `available: true`. |
| `expires_at` | ISO string \| absent | When the URL expires (UTC, `+00:00`). Present **only** when `available: true`. |

:::info The recording URL is long-lived and generated at send time
`data.call_recording.url` is valid for about **~24 hours** (default 86400 seconds, configurable) **from the moment the webhook was sent**, so it comfortably survives normal processing delays and webhook retries (which happen within about an hour). Only if you process an event **more than ~24 hours late** will the URL have expired — in that case fetch a fresh one via [`GET /v1/calls/:callId`](get-call.md). Either way, don't persist the URL: store the `call_id` and fetch on demand. When `available` is `false`, no durable recording exists for the call — see [what that means](list-calls/index.md#recording-not-available).
:::

### A cancelled single call {#a-cancelled-single-call}

When you cancel a **single** queued call via [`POST /v1/calls/:callId/cancel`](cancel-call.md), a `call-ended` event still fires — but with `call_status: "cancelled"` and a **minimal** `data` object: the call never happened, so the conversation, structured data, and timing fields are `null`, `call_end_reason` is `"cancelled"`, and `call_recording.available` is `false`. Your `call_metadata` is still echoed back so you can correlate it. Calls stopped as part of a **batch** cancel do not each send this — see [`batch-ended`](#batch-ended).

```json
{
  "event_type": "call-ended",
  "delivery_id": "1c2d3e4f-5a6b-7c88-9d0e-1f2a3b4c5d6e",
  "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b",
  "data": {
    "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b",
    "call_status": "cancelled",
    "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "call_assistant_name": null,
    "call_phone_number": "+905551112233",
    "call_bound_type": "outbound",
    "call_started_at": null,
    "call_ended_at": null,
    "call_created_at": "2026-06-08T10:29:55+00:00",
    "call_duration_seconds": null,
    "call_end_reason": "cancelled",
    "call_transcript": null,
    "call_structured_data": null,
    "call_metadata": { "crm_contact_id": "CNT-90412" },
    "call_variables": { "first_name": "Batu" },
    "call_recording": { "available": false }
  }
}
```

## The `batch-ended` event {#batch-ended}

Fires **once** when a batch — created via [`POST /v1/calls/bulk`](bulk-create-calls.md) — reaches `completed` (**every call in it has reached a terminal state**), **or** when a batch is cancelled via [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) (`status: cancelled`). This is how you know all the calls in a batch are done; use the `counts` breakdown for the outcome, then fetch the calls via [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md).

:::caution How cancellations map to webhooks
Cancelling a batch sends **one** `batch-ended` event with `status: "cancelled"`. The individual calls that a batch cancel stops do **not** each emit a `call-ended` — they roll up into that single `batch-ended` (this avoids a flood of events on large batch cancels). If you instead cancel a **single** call via [`POST /v1/calls/:callId/cancel`](cancel-call.md), that one call emits its own [`call-ended`](#call-ended) with `call_status: "cancelled"`.
:::

The top-level object differs from `call-ended`: it carries `batch_call_id` (**not** `call_id`), and `data` is a **batch summary** rather than a call object.

```json
{
  "event_type": "batch-ended",
  "delivery_id": "0a61f9bd-2e77-4c8a-9d31-6b0f5a2c1e84",
  "batch_call_id": "842f7c19-3b6d-4e02-a5c8-9f1d2e3a4b50",
  "data": {
    "batch_call_id": "842f7c19-3b6d-4e02-a5c8-9f1d2e3a4b50",
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
| `event_type` | string | `batch-ended` for this event. |
| `delivery_id` | string (UUID) | Stable id for this delivery — the same across every retry attempt. De-duplicate on it or on `batch_call_id`. |
| `batch_call_id` | string | The batch's id, duplicated at the top level for convenience. Use it to de-duplicate and to fetch the batch's calls via [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md). |
| `data` | object \| null | The batch summary — fields below. `null` if the source record can't be projected. |

### `data` — the batch summary

| Field | Type | Description |
|---|---|---|
| `batch_call_id` | string | The batch's id (same value as the top-level `batch_call_id`). |
| `status` | string | The batch's final status — `completed`, or `cancelled` when the batch was cancelled. |
| `total_count` | int | Total number of calls in the batch. |
| `counts` | object | Per-status breakdown of the batch's calls. |
| `created_at` | ISO string | When the batch was created (UTC, `+00:00`). |

**`data.counts`**

| Field | Type | Description |
|---|---|---|
| `completed` | int | Calls that finished successfully. |
| `failed` | int | Calls that ended in failure. |
| `cancelled` | int | Calls that were cancelled from the queue before dialing. Calls stopped as part of a **batch** cancel are summarized here and do **not** each emit a `call-ended`; a **single**-call cancel emits its own [`call-ended`](#call-ended) with `call_status: "cancelled"`. |
| `pending` | int | Calls not yet started. `0` for a completed batch. |
| `processing` | int | Calls still in progress. `0` for a completed batch. |

:::note Same delivery semantics as `call-ended`
`batch-ended` is delivered exactly like `call-ended` — respond `2xx` within ~15s, retried with backoff, at-least-once (de-duplicate by `delivery_id` or `batch_call_id`), no ordering guarantee, and the same headers. See [Behavior](#behavior).
:::

## Behavior

- **Respond `2xx`** — within ~15 seconds. A non-`2xx` response or a timeout is treated as a failed delivery and Vindy retries.
- **Retries** — failed deliveries are retried with increasing backoff (roughly `30s → 2m → 10m → 1h`, with about ±20% random jitter), about 5 attempts in total, after which the delivery is marked dead.
- **At-least-once delivery** — under adverse network conditions the same event may arrive more than once. **De-duplicate** on `delivery_id` (stable across retries; also in the `X-Vindy-Delivery-Id` header) — or on `call_id` for `call-ended` and `batch_call_id` for `batch-ended`.
- **No ordering guarantee** — events may arrive in a different order than the calls ended in.
- **Public HTTPS only** — the webhook endpoint must be a public `https` URL; private, loopback, and cloud-metadata addresses are rejected (SSRF protection).
- **Recording URL freshness** — `data.call_recording.url` is a ~24-hour URL generated at send time, so it comfortably survives normal processing and retries. Only if you process an event more than ~24 hours late will it have expired — then fetch a fresh one via [`GET /v1/calls/:callId`](get-call.md).
- **PII** — the payload may contain phone numbers and transcripts, so your endpoint must be `https`.

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
