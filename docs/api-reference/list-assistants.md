---
title: List Assistants
sidebar_label: List Assistants
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/assistants`

Returns your company's assistants in a **single list**. Each item carries the assistant's basic details and the **structured output schema** attached to that assistant, if any.

---

## Request

```http
GET https://api.vindy.ai/v1/assistants
Authorization: Bearer <api-key>
```

No query parameters. The response is **not paginated** — every assistant is returned in one call (up to 1000).

## Response (200 OK)

```json
{
  "data": [
    {
      "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "assistant_name": "Vindy - Asistan",
      "assistant_language": "tr",
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
                "title": "Arama sonucu",
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
                "items": { "type": "string" }
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

## Response fields

**Top-level**

| Field | Type | Description |
|---|---|---|
| `data` | array | Assistant items. |
| `total` | int | Size of the `data` array. |

**Assistant item**

| Field | Type | Description |
|---|---|---|
| `assistant_id` | string (UUID) | Stable assistant ID. Use it in [`POST /v1/calls/list`](list-calls/index.md) to filter that assistant's calls, and as the `assistant_id` when launching a batch of outbound calls with [`POST /v1/calls/bulk`](bulk-create-calls.md). |
| `assistant_name` | string | Display name. |
| `assistant_language` | string | Language code (e.g. `tr`, `en`). |
| `assistant_created_at` | ISO 8601 (UTC) | Creation timestamp, in `+00:00` offset form. |
| `assistant_variables` | array of string | The **template variable names** this assistant expects — derived from the `{{…}}` placeholders in its prompt and greeting (ordered, de-duplicated). Send values for these via `variables` when placing calls with [`POST /v1/calls`](create-call.md) or [`POST /v1/calls/bulk`](bulk-create-calls.md). Empty (`[]`) when the assistant uses no variables. |
| `structured_outputs` | array | The structured output schema attached to this assistant. Empty (`[]`) when the assistant has none; otherwise exactly **one** entry, whose `id` equals `assistant_id`. |

**StructuredOutput object**

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Stable ID of the structured output — equal to `assistant_id`. A call's extracted values come back under this `id` in `call_structured_data` on [`POST /v1/calls/list`](list-calls/index.md), so you can line each one up with its schema. |
| `name` | string | Display name (mirrors the assistant's name). |
| `schema` | object | The structured output schema — a standard **JSON Schema**, returned verbatim as defined for the assistant. See [The structured output schema](#the-structured-output-schema) below. |

### The structured output schema {#the-structured-output-schema}

The `schema` field is a standard **JSON Schema** that describes the shape of the data the AI extracts, returned verbatim as it was defined for the assistant. Its root is an object; the members you'll see are:

| Member | Type | Description |
|---|---|---|
| `type` | string | Always `"object"` for the schema root. |
| `properties` | object | Map of field name → its per-property sub-schema (see below). This is the core of the schema. |
| `required` | array of string | *(optional)* The field names that are always present. Omitted when nothing is marked required. |
| `additionalProperties` | bool | *(optional)* Usually `false`, meaning no fields beyond the ones listed. |

**Per-property shape.** Each entry under `properties` is itself a standard JSON Schema sub-schema. The common keys are:

| Key | Type | Description |
|---|---|---|
| `type` | string | **Always present.** One of `string`, `integer`, `number`, `boolean`, `array`, or `object` (a nested object carries its own `properties`). |
| `title` | string | *(optional)* Human-readable label for the field. |
| `description` | string | *(optional)* What the field captures. |
| `enum` | array | *(optional)* The allowed values, for choice fields. |
| `items` | object | *(optional)* For `array` types — the sub-schema each element follows. |
| `uniqueItems` | bool | *(optional)* For `array` types — whether elements must be distinct. |

The optional keys are **omitted when unset, never present as `null`** — for example, a property with no label simply has no `title` key (an injected `null` would make the schema invalid). Read defensively: fall back to the property's key name when `title` is absent, and don't assume `description`, `enum`, or `items` exist.

Treat it as an opaque JSON Schema: read `properties` to know the fields, and don't hard-code an expectation that only `type`/`properties` are present.

## Errors

| Status | Code |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notes

- Assistants are ordered by creation time.
- The list includes both your company's own assistants **and any assistants shared with you by Vindy** — shared assistants behave like your own here: you can filter their calls in [List Calls](list-calls/index.md) and launch outbound batches with them in [Bulk Create Calls](bulk-create-calls.md).
- An assistant with no structured output schema returns `structured_outputs: []`.
- `assistant_variables` tells you which `variables` keys to send when calling with this assistant. If it uses none, you can omit `variables` entirely.
- Extracted values come back under the structured output's `id` in `call_structured_data` on [List Calls](list-calls/index.md), so you can line a call's data up with its schema here.

## Examples

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

if (!response.ok) {
  const error = await response.json();
  throw new Error(`${error.extensions?.code}: ${error.message}`);
}

const { data, total } = await response.json();
console.log(`${total} assistants`);

for (const assistant of data) {
  console.log(`${assistant.assistant_id}: ${assistant.assistant_name}`);
}
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
if not response.ok:
    error = response.json()
    raise RuntimeError(f"{error.get('extensions', {}).get('code')}: {error.get('message')}")

body = response.json()
print(f"{body['total']} assistants")

for assistant in body["data"]:
    print(f"{assistant['assistant_id']}: {assistant['assistant_name']}")
```

</TabItem>
</Tabs>
