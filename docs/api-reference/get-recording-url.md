---
title: Get Recording URL
sidebar_label: Get Recording URL
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/calls/:callId/recording-url`

Generates a presigned (time-limited) download URL for a specific call's recording. The URL goes directly to storage and requires no further authentication — the signature is embedded in the URL. It is valid for about **24 hours**, so download it to your own storage rather than persisting the URL.

---

## Request

```http
GET https://api.vindy.ai/v1/calls/sess_a1b2c3d4e5f6/recording-url
Authorization: Bearer <api-key>
```

## Path parameters

| Parameter | Type | Description |
|---|---|---|
| `callId` | string | The call's stable string ID (from [`POST /v1/calls/list`](list-calls/index.md)). |

## Response (200 OK)

```json
{
  "url": "https://...?X-Amz-Algorithm=...&X-Amz-Signature=...",
  "expires_at": "2026-06-04T12:39:56+00:00"
}
```

| Field | Type | Description |
|---|---|---|
| `url` | string | Presigned URL. Issue an HTTP GET directly against it to download the audio. The signature and validity info are embedded. |
| `expires_at` | ISO string | When the URL expires (UTC). About **24 hours** after generation (86400s by default, configurable). |

## Errors

| Status | Code | Description |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Auth errors. |
| `404` | `RESOURCE_NOT_FOUND` | Call not found, a browser (WebRTC) call, or not in your company. |
| `404` | `RECORDING_NOT_AVAILABLE` | The call exists, but no recording was ever produced for it. **Terminal** — retrying does not help. |
| `409` | `RECORDING_NOT_READY` | A recording exists but is not downloadable yet. Rare race condition — retry in a few minutes. |
| `429` | `RATE_LIMITED` | Rate limit exceeded (per-minute). Retry after `Retry-After` seconds. |

**404 example — no recording was produced (terminal):**

```json
{
  "message": "No recording was produced for this call. This is permanent — there is nothing to retrieve, and retrying will not help.",
  "extensions": {
    "code": "RECORDING_NOT_AVAILABLE"
  }
}
```

**409 example — recording not downloadable yet (rare race):**

```json
{
  "message": "Recording is not ready yet. Retry in a few minutes.",
  "extensions": {
    "code": "RECORDING_NOT_READY"
  }
}
```

:::info Terminal vs. rare race
For `call_id`s obtained from [`POST /v1/calls/list`](list-calls/index.md), you will almost always get either a **200** (recording ready, with a URL) or a terminal **404 `RECORDING_NOT_AVAILABLE`** — because a call doesn't appear in the list until its recording reaches a terminal state. A **409 `RECORDING_NOT_READY`** is a rare race condition; if you hit it, retry after a few minutes.
:::

## Notes

- **Do NOT cache the URL**: it expires after ~24 hours. Storing it in your DB leads to stale URLs. Generate on demand and download to your own storage.
- **Multiple downloads**: you can issue multiple GETs against the same URL within its validity window. If forwarding to different users, **generate a fresh URL per user**.
- **Terminal vs. rare race**: for `call_id`s obtained from [`POST /v1/calls/list`](list-calls/index.md), a not-ready response is almost always terminal — a `404 RECORDING_NOT_AVAILABLE`, where retrying does not help. In rare race conditions you might see a `409 RECORDING_NOT_READY`; in that case retry after a few minutes.
- **Format**: audio files are `.wav` (mono, 8kHz or 16kHz). Some recordings may use a different codec; check the `Content-Type` header.
- **Size**: typically 1–10 MB; can reach 30 MB for long calls.

## Examples

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# 1. Get URL
curl -H "Authorization: Bearer $VINDY_API_KEY" \
  https://api.vindy.ai/v1/calls/sess_a1b2c3d4e5f6/recording-url
# → { "url": "https://...call.wav?X-Amz-...", "expires_at": "..." }

# 2. Download immediately (quote the URL — query string is long)
curl -o call.wav "https://...call.wav?X-Amz-..."
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
    // RECORDING_NOT_READY — rare race; the recording isn't downloadable yet
    throw new Error("Recording not ready yet — retry in a few minutes");
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  // 2. Download the audio (the URL is valid for ~24 hours)
  const { url } = await response.json();
  const audio = await fetch(url);
  await writeFile(`call-${callId}.wav`, Buffer.from(await audio.arrayBuffer()));
  return `call-${callId}.wav`;
}

await downloadRecording("sess_a1b2c3d4e5f6");
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
        # RECORDING_NOT_READY — rare race; the recording isn't downloadable yet
        raise RuntimeError("Recording not ready yet — retry in a few minutes")
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")

    # 2. Download the audio (the URL is valid for ~24 hours)
    url = response.json()["url"]
    audio = requests.get(url)
    audio.raise_for_status()

    path = f"call-{call_id}.wav"
    with open(path, "wb") as f:
        f.write(audio.content)
    return path

download_recording("sess_a1b2c3d4e5f6")
```

</TabItem>
</Tabs>
