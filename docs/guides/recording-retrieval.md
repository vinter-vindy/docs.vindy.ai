---
title: Recording Retrieval
sidebar_label: Recording Retrieval
sidebar_position: 2
---

# Recording Retrieval

How to reliably download call recordings — and how to know when there's nothing to download.

---

## The pattern

1. Fetch calls with [`POST /v1/calls/list`](../api-reference/list-calls/index.md). If a recording exists and is retrievable, an inline URL is returned in `call_recording`.
2. If `call_recording.available: false`, it's one of two things: **not ready yet** (the recording is still transferring — normal right after a call, since a call is listed as soon as it's finalized, independent of its recording) or **terminal** (no recording, or transfer permanently failed). Distinguish them with [`GET /v1/calls/:callId/recording-url`](../api-reference/get-recording-url.md): `409 RECORDING_NOT_READY` = still transferring (retry shortly), `404 RECORDING_NOT_AVAILABLE` = terminal. Or skip polling entirely and subscribe to the [`recording-ready` webhook](../api-reference/webhooks.md#recording-ready), which fires the moment a recording becomes downloadable.
3. Download the audio **to your own storage** — the presigned URL is valid for about **24 hours**. There's no rush, but don't persist the URL in your DB; store the `call_id` and generate a URL on demand.
4. If the URL expires before you download, issue another GET on the same endpoint to receive a fresh (~24 hour) URL.

:::tip Push instead of poll
To avoid polling for the recording at all, subscribe to the [`recording-ready` webhook](../api-reference/webhooks.md#recording-ready). Vindy pushes you the call — with a fresh recording URL in `data.call_recording` — the moment its recording is downloadable. It fires only when a recording actually becomes available, never for a call that has none.
:::

---

## Decision table

| You see | Meaning | Action |
|---|---|---|
| `call_recording.available: true` + `url` | The recording is ready | Download now, or generate a fresh URL later |
| `call_recording.available: false` | It is either not ready yet (still transferring) **or** terminal (none was produced, or it failed) | Classify via `recording-url` below, or use the [`recording-ready` webhook](../api-reference/webhooks.md#recording-ready) |
| 409 `RECORDING_NOT_READY` | The recording is still transferring, which is normal right after a call | Retry shortly, or wait for the [`recording-ready` webhook](../api-reference/webhooks.md#recording-ready) |
| 404 `RECORDING_NOT_AVAILABLE` | **Terminal** — no recording will ever exist | Don't retry. Contact Vindy if you believe a recording should exist |

:::caution Don't tight-loop on `available: false`
`available: false` isn't always terminal — right after a call it usually just means the recording is **still transferring**. Don't hammer `recording-url` in a tight loop: call it once to classify (`409` = still transferring, retry with backoff; `404` = terminal, stop), or — better — subscribe to the [`recording-ready` webhook](../api-reference/webhooks.md#recording-ready) and skip polling for the recording entirely.
:::

---

## Rules of thumb

- **Never store the presigned URL.** It expires in about 24 hours. Store the `call_id` and generate a URL on demand, then download to your own storage.
- **One URL per consumer.** If you forward recordings to your own users, generate a fresh URL per user instead of sharing one.
- **Check `Content-Type`.** Recordings are delivered as **OGG/Opus audio** (`audio/ogg`); read the `Content-Type` header rather than assuming a file extension.
- **Expect compact files.** OGG/Opus is compressed, so a recording is usually well under a few MB, and its size grows with the call's length.

For complete download code in Node.js and Python, see the [recording-url examples](../api-reference/get-recording-url.md#examples).
