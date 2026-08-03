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
| `call_phone_number` | Raw phone number, typically in **E.164 format** (e.g., `+905551112233`). **Not masked.** |
| `call_transcript` | The customer's conversation — may include personal information. |
| `call_structured_data` | Structured data your assistant extracted — whatever fields you configured. |

---

## GDPR / KVKK

This data may include personally identifiable information (PII). Store and process it on your side **in compliance with applicable laws** (KVKK in Turkey, GDPR in the EU).

Retention, deletion, and anonymization policies for data you copy into your own systems are **your responsibility**. Practical advice:

- Only sync the fields you actually need.
- Apply your own retention policy to transcripts and recordings you download.
- Recording download URLs are valid for about 24 hours (86400 seconds) by default, and configurable. Store the downloaded audio file, not the URL.
- If you forward recordings to your own users, generate a fresh download URL per user instead of sharing one — see [recording retrieval](../guides/recording-retrieval.md).
