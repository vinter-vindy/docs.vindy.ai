---
title: PII and Phone Numbers
sidebar_label: PII & Phone Numbers
sidebar_position: 5
---

# PII and Phone Numbers

The Vindy API returns call data **as-is** — it is your responsibility to handle it lawfully on your side.

---

## What contains personal data?

| Field | Content |
|---|---|
| `call_phone_number` | Holds the other party's phone number, returned raw: the number dialed on an outbound call, or the caller's number on an inbound one, typically in **E.164 format** (for example `+905551112233`). **It is not masked.** |
| `call_transcript` | Carries the full transcript of the conversation. Because the customer speaks freely, it can contain names, addresses, ID numbers, and other personal details. |
| `call_structured_data` | Holds the structured data your assistant extracted from the call. It contains only the fields you defined, so you control what personal data ends up in it. |
| `call_variables` | Echoes back, verbatim, the template variables you sent — for example `{"first_name": "..."}`. **They are not masked.** |
| `call_metadata` | Echoes back your opaque metadata verbatim. **It is not masked.** |

---

## GDPR / KVKK

This data may include personally identifiable information (PII). Store and process it on your side **in compliance with applicable laws** (KVKK in Turkey, GDPR in the EU).

Retention, deletion, and anonymization policies for data you copy into your own systems are **your responsibility**. Practical advice:

- Only sync the fields you actually need.
- Apply your own retention policy to transcripts and recordings you download.
- Recording download URLs are valid for about 24 hours by default; store the downloaded audio file, not the URL, and generate a fresh one on demand — see [Get a Recording URL](../api-reference/get-recording-url.md).
- If you forward recordings to your own users, generate a fresh download URL per user instead of sharing one — see [recording retrieval](../guides/recording-retrieval.md).
