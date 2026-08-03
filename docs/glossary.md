---
title: Glossary
sidebar_label: Glossary
sidebar_position: 9
---

# Glossary

| Term | Definition |
|---|---|
| **API Key** | Customer credential in `<keyId>.<secret>` format |
| **keyId** | The portion of the API key before the dot (UUID) |
| **Plain Key** | Full API key string — only visible at creation |
| **Cursor** | Opaque base64 value for pagination |
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
