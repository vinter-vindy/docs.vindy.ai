---
title: Overview
sidebar_label: Overview
sidebar_position: 1
---

# Overview

The Vindy API gives you **programmatic access** to your Vindy data from your own systems. You can retrieve assistant definitions, call records, transcripts, AI-extracted structured data, and audio recordings over HTTP. Beyond reading, you can start batches of outbound calls and cancel pending ones — a single call or an entire batch. You can also opt in to **webhooks** — Vindy notifies your endpoint the moment a call ends, and when a batch finishes, so you can react in near-real-time instead of polling. See [Webhooks](api-reference/webhooks.md).

**At a glance:**

- REST API with JSON responses
- Bearer token authentication (API key)
- All endpoints under the **`/v1/`** prefix
- Responses are `application/json`
- Cursor-based pagination on large lists
- Optional **webhook** delivery for `call-ended` and `batch-ended` events

---

## What can you do with it?

| You want to... | Use |
|---|---|
| See which assistants your company has | [`GET /v1/assistants`](api-reference/list-assistants.md) |
| See which caller numbers you can place calls from | [`GET /v1/phone-numbers`](api-reference/list-phone-numbers.md) |
| Create a batch of outbound calls (1–200 in one request) | [`POST /v1/calls/bulk`](api-reference/bulk-create-calls.md) |
| Pull call records — transcripts, structured data, recordings | [`POST /v1/calls/list`](api-reference/list-calls/index.md) |
| Fetch a single call by its ID | [`GET /v1/calls/:callId`](api-reference/get-call.md) |
| Track a batch and page through its calls | [`POST /v1/calls/batches/:batchId/calls`](api-reference/get-batch-calls.md) |
| Cancel a single pending (not-yet-dialed) call | [`POST /v1/calls/:callId/cancel`](api-reference/cancel-call.md) |
| Cancel a batch's pending calls | [`POST /v1/calls/batches/:batchId/cancel`](api-reference/cancel-batch.md) |
| Download the audio recording of a specific call | [`GET /v1/calls/:callId/recording-url`](api-reference/get-recording-url.md) |
| Be notified when a call ends or a batch finishes, instead of polling | [Webhooks](api-reference/webhooks.md) |

---

## How these docs are organized

- **[Quickstart](quickstart.md)** — make your first request in 5 minutes.
- **[Authentication](authentication.md)** — API keys: format, rules, common errors.
- **[Concepts](category/concepts)** — response format, multi-tenancy, and PII. Read these once; everything else builds on them.
- **[API Reference](category/api-reference)** — every endpoint with request/response details and curl, Node.js, and Python examples.
- **[Error Codes](errors.md)** — the full catalog of machine-readable error codes.
- **[Guides](category/guides)** — copy-paste patterns for common jobs: incremental sync, recording downloads, date-range queries.

---

## Your data stays yours

Every API key belongs to exactly one company. All endpoints automatically return only that company's data, so you only ever see your own — another company's id returns `404`. See [Multi-tenancy](concepts/multi-tenancy.md) for details.
