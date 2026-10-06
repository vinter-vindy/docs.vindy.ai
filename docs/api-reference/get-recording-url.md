---
title: Get Recording URL
sidebar_label: Get Recording URL
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/calls/:callId/recording-url`

Generates a presigned (time-limited) download URL for one call's recording. The URL points straight at storage and needs no extra authentication, because the signature is embedded in the URL itself. It stays valid for about **24 hours**, so download the audio into your own storage rather than storing the URL.

Call this endpoint once a call has **finished**, for example right after it appears in [`POST /v1/calls/list`](list-calls/index.md) or its [`call-ended` webhook](webhooks.md) fires.

---

## Request

```http
GET https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f/recording-url
Authorization: Bearer <api-key>
```

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `callId` | string | Identifies the call with its stable, unique ID. It is the same `call_id` returned by [`POST /v1/calls/list`](list-calls/index.md) and [`GET /v1/calls/:callId`](get-call.md), and carried in the [`call-ended` webhook](webhooks.md). |

## Response (200 OK)

```json
{
  "url": "https://storage.vindy.ai/recordings/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f.ogg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=vindy%2F20260607%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260607T120000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=8f2b1c4d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
  "expires_at": "2026-06-08T12:00:00+00:00"
}
```

| Field | Type | Description |
|---|---|---|
| `url` | string | Gives a presigned URL. Issue an HTTP GET directly against it to download the audio; the signature and validity info are embedded in it. |
| `expires_at` | ISO string | Marks when the URL expires (UTC). It is about **24 hours** after generation (86400s by default, and configurable). |

## Errors

| Status | Code | Description |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | The request's authentication failed. |
| `404` | `RESOURCE_NOT_FOUND` | The call was not found, is a browser (WebRTC) call, belongs to another company, or has not finished yet (it is still ringing or in conversation). |
| `404` | `RECORDING_NOT_AVAILABLE` | No recording is available for this call. For a **finished** call this is **terminal** and retrying will not help, because none was ever produced (for example a very short or failed call), or the recording permanently failed or was disabled. You also get this code for an outbound call that is still **queued and not yet dialed**; in that case wait for the call to run, then retry. |
| `409` | `RECORDING_NOT_READY` | A recording exists but is still transferring to durable storage, so it is not downloadable yet. This is common in the first moments after a call ends. Retry shortly, or wait for the [`recording-ready` webhook](webhooks.md#recording-ready). |
| `429` | `RATE_LIMITED` | You've exceeded the per-minute rate limit; retry after the number of seconds in the `Retry-After` header. |

**404 example — no recording available (terminal):**

```json
{
  "message": "No recording is available for this call.",
  "extensions": {
    "code": "RECORDING_NOT_AVAILABLE"
  }
}
```

**409 example — recording not downloadable yet (still transferring):**

```json
{
  "message": "The recording is not ready yet.",
  "extensions": {
    "code": "RECORDING_NOT_READY"
  }
}
```

:::info 200 vs 409 vs 404 — which outcome, and what to do
For a call that has **finished**, three outcomes are possible, and each one means something different:

- **200** — the recording is ready. Use the `url` to download the audio.
- **409 `RECORDING_NOT_READY`** — the recording is still transferring to durable storage. This is **normal right after a call ends**, not an unusual edge case: a call shows up in [`POST /v1/calls/list`](list-calls/index.md) as soon as it is finalized, **independent** of its recording. Retry shortly, or subscribe to the [`recording-ready` webhook](webhooks.md#recording-ready) to receive the file the moment it lands.
- **404 `RECORDING_NOT_AVAILABLE`** — no recording will ever exist. Do not retry.

The list endpoint shows the same split on each call through its [`call_recording.available: false`](list-calls/index.md#recording-not-available) field.
:::

## Notes

- **Do NOT cache the URL**: it expires after ~24 hours. Storing it in your DB leads to stale URLs. Generate on demand and download to your own storage.
- **Multiple downloads**: you can issue multiple GETs against the same URL within its validity window. If forwarding to different users, **generate a fresh URL per user**.
- **Format**: recordings are OGG/Opus audio (`audio/ogg`). Read the `Content-Type` header rather than assuming a file extension.
- **Size**: OGG/Opus is compressed, so files are small — usually well under a few MB, growing with the call's length.

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# 1. Get URL
curl -H "Authorization: Bearer $VINDY_API_KEY" \
  https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f/recording-url
# → { "url": "https://...call.ogg?X-Amz-...", "expires_at": "..." }

# 2. Download immediately (quote the URL — query string is long)
curl -o call.ogg "https://...call.ogg?X-Amz-..."
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
import { writeFile } from "node:fs/promises";

async function downloadRecording(callId) {
  // 1. Get a fresh presigned URL
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/${callId}/recording-url`,
    { headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` } },
  );

  if (response.status === 404) {
    const error = await response.json();
    if (error.extensions?.code === "RECORDING_NOT_AVAILABLE") {
      return null; // terminal — no recording was ever produced
    }
    throw new Error(error.message); // RESOURCE_NOT_FOUND
  }
  if (response.status === 409) {
    // RECORDING_NOT_READY — still transferring; retry shortly, or use the recording-ready webhook
    throw new Error("Recording not ready yet — still transferring, retry shortly");
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  // 2. Download the audio (the URL is valid for ~24 hours)
  const { url } = await response.json();
  const audio = await fetch(url);
  await writeFile(`call-${callId}.ogg`, Buffer.from(await audio.arrayBuffer()));
  return `call-${callId}.ogg`;
}

await downloadRecording("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f");
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def download_recording(call_id):
    # 1. Get a fresh presigned URL
    response = requests.get(
        f"https://api.vindy.ai/v1/calls/{call_id}/recording-url",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )

    if response.status_code == 404:
        error = response.json()
        if error.get("extensions", {}).get("code") == "RECORDING_NOT_AVAILABLE":
            return None  # terminal — no recording was ever produced
        raise RuntimeError(error.get("message"))  # RESOURCE_NOT_FOUND
    if response.status_code == 409:
        # RECORDING_NOT_READY — still transferring; retry shortly, or use the recording-ready webhook
        raise RuntimeError("Recording not ready yet — still transferring, retry shortly")
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")

    # 2. Download the audio (the URL is valid for ~24 hours)
    url = response.json()["url"]
    audio = requests.get(url)
    audio.raise_for_status()

    path = f"call-{call_id}.ogg"
    with open(path, "wb") as f:
        f.write(audio.content)
    return path

download_recording("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f")
```

</TabItem>
</Tabs>
