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
2. If `call_recording.available: false`: this is a **terminal state** — either the recording was not produced, or its transfer permanently failed. Retrying does not help. To confirm, call [`GET /v1/calls/:callId/recording-url`](../api-reference/get-recording-url.md); a terminal case returns `404 RECORDING_NOT_AVAILABLE`.
3. Download the audio **to your own storage** — the presigned URL is valid for about **24 hours**. There's no rush, but don't persist the URL in your DB; store the `call_id` and generate a URL on demand.
4. If the URL expires before you download, issue another GET on the same endpoint to receive a fresh (~24 hour) URL.

---

## Decision table

| You see | Meaning | Action |
|---|---|---|
| `call_recording.available: true` + `url` | Recording available | Download now, or generate a fresh URL later |
| `call_recording.available: false` | **Terminal** — no recording, or transfer permanently failed | Don't retry |
| 404 `RECORDING_NOT_AVAILABLE` | **Terminal** — no recording was produced | Don't retry. Contact Vindy if you believe a recording should exist |
| 409 `RECORDING_NOT_READY` | Rare race condition — recording not downloadable yet | Retry after a few minutes |

:::caution The most common mistake
Polling `recording-url` in a retry loop for a call whose `call_recording.available` is `false`. That state is **final** — a call doesn't even appear in `/v1/calls/list` until its recording reaches a terminal state. Save your retry budget for actual network errors.
:::

---

## Rules of thumb

- **Never store the presigned URL.** It expires in about 24 hours. Store the `call_id` and generate a URL on demand, then download to your own storage.
- **One URL per consumer.** If you forward recordings to your own users, generate a fresh URL per user instead of sharing one.
- **Check `Content-Type`.** Audio files are typically `.wav` (mono, 8kHz or 16kHz), but some recordings may use a different codec.
- **Expect 1–10 MB** per recording; long calls can reach 30 MB.

For complete download code in Node.js and Python, see the [recording-url examples](../api-reference/get-recording-url.md#examples).
