---
title: Quickstart
sidebar_label: Quickstart
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quickstart

Make your first Vindy API request in about 5 minutes.

:::info Base URL
Production: `https://api.vindy.ai`
:::

---

## 1. Create an API key

1. Sign into the Vindy panel.
2. Go to **Settings → API Keys** and create a key.
3. The plain key is shown **only once** — save it somewhere safe. If you lose it, you must create a new one.

Store it as an environment variable, never in source code:

```bash
export VINDY_API_KEY="01902f6e-7c5a-7000-8000-abc123def456.R3vP9LkX2nM8jY7fW1qZ4tH6cB0sN5aDmGuI3oVpQ7r"
```

---

## 2. List your assistants

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl https://api.vindy.ai/v1/assistants \
  -H "Authorization: Bearer $VINDY_API_KEY"
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
const response = await fetch("https://api.vindy.ai/v1/assistants", {
  headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` },
});
const body = await response.json();
console.log(body.data);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

response = requests.get(
    "https://api.vindy.ai/v1/assistants",
    headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
)
print(response.json()["data"])
```

</TabItem>
</Tabs>

You'll get your assistants in a single list. Note the `assistant_id` (a string UUID) — you need it in the next step:

```json
{
  "data": [
    {
      "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "assistant_name": "Vindy - Asistan",
      "assistant_language": "tr-TR",
      "assistant_created_at": "2026-06-08T10:29:55+00:00",
      "assistant_variables": ["first_name", "appointment_time"],
      "structured_outputs": [
        {
          "id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
          "name": "Vindy - Asistan",
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "required": ["arama_sonucu", "genel_memnuniyet_puani"],
            "properties": {
              "arama_sonucu": {
                "type": "string",
                "title": "Call result",
                "description": "How the conversation ended.",
                "enum": ["tamamlandi", "yarim_kaldi", "ulasilamadi", "belirsiz"]
              },
              "genel_memnuniyet_puani": {
                "type": "integer",
                "title": "Overall satisfaction",
                "description": "Satisfaction score from 1 to 5."
              },
              "geri_arama_talebi": { "type": "boolean", "title": "Callback requested" },
              "ilgilenilen_urunler": {
                "type": "array",
                "title": "Interested products",
                "description": "Distinct products the customer showed interest in.",
                "items": { "type": "string" },
                "uniqueItems": true
              },
              "siparisler": {
                "type": "array",
                "title": "Orders",
                "description": "Orders placed during the call, one object per order.",
                "items": {
                  "type": "object",
                  "properties": {
                    "urun": { "type": "string", "description": "Product name." },
                    "miktar": { "type": "integer", "description": "Quantity ordered." }
                  },
                  "required": ["urun", "miktar"]
                }
              }
            }
          }
        }
      ]
    }
  ],
  "total": 1
}
```

---

## 3. List your calls

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "limit": 50}'
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
const response = await fetch("https://api.vindy.ai/v1/calls/list", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ assistant_id: "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", limit: 50 }),
});
const body = await response.json();
console.log(body.data);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

response = requests.post(
    "https://api.vindy.ai/v1/calls/list",
    headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    json={"assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "limit": 50},
)
print(response.json()["data"])
```

</TabItem>
</Tabs>

Each call includes the transcript, AI-extracted structured data, and — when available — a recording URL (valid about 24 hours by default):

```json
{
  "data": [
    {
      "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "completed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905551112233",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T10:30:00+00:00",
      "call_ended_at": "2026-05-15T10:31:27+00:00",
      "call_created_at": "2026-05-15T10:29:55+00:00",
      "call_duration_seconds": 87,
      "call_end_reason": "completed",
      "call_transcript": "[10:30:00] Asistan: Hi, this is Vindy, your AI assistant, calling about your recent order. Do you have a moment for a short satisfaction survey?\n[10:30:07] Müşteri: Sure, go ahead.\n[10:30:11] Asistan: Thank you. On a scale of 1 to 5, how satisfied were you with your overall experience?\n[10:30:18] Müşteri: I'd say a four.\n[10:30:23] Asistan: Glad to hear it. Is there anything about your order you weren't happy with?\n[10:30:29] Müşteri: No, everything was fine.\n[10:30:34] Asistan: Great. Would you like a representative to call you back about anything?\n[10:30:40] Müşteri: No, that won't be necessary.\n[10:30:45] Asistan: Thank you so much for your time — have a great day!\n[10:30:50] Müşteri: You too, thanks.",
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
        "url": "https://...",
        "expires_at": "2026-05-16T10:31:27+00:00"
      }
    },
    {
      "call_id": "019fb39a-2e5f-7c14-9a8b-1d3c5e7f9a20",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "failed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905554445566",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T11:02:10+00:00",
      "call_ended_at": "2026-05-15T11:02:16+00:00",
      "call_created_at": "2026-05-15T11:01:58+00:00",
      "call_duration_seconds": 0,
      "call_end_reason": "User Busy",
      "call_transcript": null,
      "call_structured_data": null,
      "call_metadata": { "order_id": "ORD-4822" },
      "call_variables": { "first_name": "Deniz" },
      "call_recording": {
        "available": false
      }
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0…",
    "has_more": true,
    "limit": 50
  }
}
```

`call_transcript` is a single string; each turn within it is separated by a newline (`\n`). JSON escapes those newlines, so the value above appears on one line. Rendered with real line breaks, the first call's transcript reads:

```text
[10:30:00] Asistan: Hi, this is Vindy, your AI assistant, calling about your recent order. Do you have a moment for a short satisfaction survey?
[10:30:07] Müşteri: Sure, go ahead.
[10:30:11] Asistan: Thank you. On a scale of 1 to 5, how satisfied were you with your overall experience?
[10:30:18] Müşteri: I'd say a four.
[10:30:23] Asistan: Glad to hear it. Is there anything about your order you weren't happy with?
[10:30:29] Müşteri: No, everything was fine.
[10:30:34] Asistan: Great. Would you like a representative to call you back about anything?
[10:30:40] Müşteri: No, that won't be necessary.
[10:30:45] Asistan: Thank you so much for your time — have a great day!
[10:30:50] Müşteri: You too, thanks.
```

---

## 4. Download a recording

If `call_recording.available` is `true`, the `url` field is ready to use — issue a plain GET against it (no auth header needed — the signature is in the URL):

```bash
curl -o call-recording.ogg "https://...presigned-url..."
```

The URL is valid for about 24 hours (86400 seconds) by default, but the lifetime is configurable. Don't store it — generate a fresh one when needed with [`GET /v1/calls/:callId/recording-url`](api-reference/get-recording-url.md).

---

## Next steps

- [Authentication](authentication.md) — key format, security rules, 401 errors
- [Filtering & Pagination](api-reference/list-calls/filtering-pagination.md) — cursor, limit, and date filters for calls
- [Response Format](concepts/response-envelopes.md) — the error envelope shape
- [Incremental sync guide](guides/incremental-sync.md) — keeping your database up to date
- [Glossary](glossary.md) — plain-language definitions of terms like inbound, outbound, and bulk call
