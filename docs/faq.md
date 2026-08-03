---
title: FAQ
sidebar_label: FAQ
sidebar_position: 8
---

# FAQ

## Can I see another company's data?

No. Each API key is bound to a single company, and every request is automatically scoped to it. Using another company's `call_id` returns 404 — you can't even tell whether it exists. See [Multi-tenancy](concepts/multi-tenancy.md).

## I lost my API key. Can you recover it?

No. The plain key is shown only once at creation. Create a new key and revoke the old one. See [Authentication](authentication.md).

## Why doesn't a call appear in `POST /v1/calls/list`?

The endpoint only returns calls that reached a **terminal** state — `completed` or `failed` — with the recording transfer settled. A call that just ended may take a short while to appear. Calls still in progress never appear, and browser (WebRTC) calls never appear in the API at all. See [no half-baked data](api-reference/list-calls/index.md).

## A recording shows in the Vindy panel but the API says `available: false`. Bug?

Expected. The panel may display recordings from temporary sources; the API only serves recordings from durable storage. The API response is the authoritative contract. See [the explanation](api-reference/list-calls/index.md#recording-not-available).

## `call_recording.available` is `false`. Should I retry?

No — that state is **terminal**. Either no recording was produced, or its transfer permanently failed. See [recording retrieval](guides/recording-retrieval.md).

## Is it safe to retry requests?

Yes for reads. All `GET` endpoints are idempotent, and `POST /v1/calls/list` is a **query, not a mutation** — it has no side effects and is safe to retry. Upsert calls on your side (UNIQUE constraint on `call_id`) and retries become harmless.

Write requests are different. `POST /v1/calls/bulk` creates calls, and there is **no server-side lock** that blocks a concurrent or repeated submission — nothing rejects a second call with a "batch in progress" error. So blindly retrying it can start a **second batch and call people twice**. Guard against this on your side: only retry a bulk request when you're sure the previous one didn't succeed, and deduplicate (for example, key each batch by your own idempotency token, or check whether the numbers were already accepted before resubmitting). The cancel endpoints are safe to call again.

## How often should I poll?

No more than once per minute. For continuous syncing, use `date_from` with your last sync point — see [incremental sync](guides/incremental-sync.md).

## Is there a rate limit?

Yes — **60 requests per minute per API key** by default. Going over returns a `429` with the `RATE_LIMITED` code, plus a `Retry-After` header (also in `extensions.retry_after`) telling you how many seconds to wait before retrying. Back off and retry after that window. See [Error Codes](errors.md).

## Why do my date filters fail with 400?

Dates must be plain `YYYY-MM-DD` values — anything with a time, timezone, or a different order (e.g. `05/23/2026`) is rejected with `INVALID_DATE_FORMAT`, and `date_from` after `date_to` is `DATE_RANGE_INVALID`. See [Filtering & Pagination](api-reference/list-calls/filtering-pagination.md) for accepted and rejected formats.

## How do I report an issue?

Include all of the following — it makes debugging dramatically faster:

- Full HTTP method + URL
- Request headers (**mask the Authorization key**: `Bearer 01902f6e...***`)
- Request body
- Response status + body
- The approximate time of the request (with your timezone)
