---
title: Glossary
sidebar_label: Glossary
sidebar_position: 9
---

# Glossary

| Term | Definition |
|---|---|
| **API Key** | Company credential in `<keyId>.<secret>` format |
| **keyId** | The portion of the API key before the dot (UUID) |
| **Plain Key** | Full API key string — only visible at creation |
| **Cursor** | Opaque base64url token for pagination |
| **Presigned URL** | Temporary, signed download URL — valid about 24 hours / 86400s by default, configurable |
| **structured_output** | JSON Schema template for AI-extracted data from a call |
| **Call** | A phone call record handled by a Vindy assistant — identified by a string `call_id` |
| **call_id** | Stable, opaque string that identifies a single call — unchanged across its whole lifetime (queued → in progress → terminal). Treat it as opaque; do not parse it |
| **Assistant** | An AI voice assistant defined in Vindy — its `assistant_id` is a string (UUID) |
| **Company** | A tenant in Vindy — each customer is a company |
| **Half-open interval** | `[from, to)` — left-inclusive, right-exclusive range |
| **E.164** | International phone number format (e.g., `+905551112233`) |
| **Idempotent** | Safe to repeat — running the same request twice has the same effect as once |
| **Upsert** | Insert-or-update — write a row if new, update it if it already exists |
| **Inbound call** | A call that **comes in** — the customer calls you. |
| **Outbound call** | A call that **goes out** — the assistant calls the customer. |
| **Bulk call** | Dialing many numbers in a single request, one after another. Each bulk call creates a **campaign**. |
| **Campaign (batch)** | The group that represents a whole bulk call — identified by `batch_call_id`. |
| **Webhook** | A notification Vindy sends to your URL automatically when an event happens (e.g. a call ends) — the event comes to you instead of you polling for it. |
| **Queue** | Outbound calls that haven't been dialed yet and are waiting their turn. |
| **Terminal state** | A call's final, no-longer-changing state — `completed`, `failed`, or `cancelled`. |
| **WebRTC (browser call)** | A call made directly through a web browser instead of a phone line. These calls do not appear in the API. |
| **Assistant variables** | Values that fill the `{{name}}` placeholders in the assistant's script (e.g. `first_name`). |
