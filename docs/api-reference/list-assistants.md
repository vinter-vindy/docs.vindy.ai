---
title: List Assistants
sidebar_label: List Assistants
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/assistants`

This endpoint returns every assistant in your company as a **single list**. Each item gives you the assistant's core details and, when one exists, the **structured output schema** attached to that assistant.

---

## Request

```http
GET https://api.vindy.ai/v1/assistants
Authorization: Bearer <api-key>
```

This endpoint takes no query parameters, and the response is **not paginated**: it returns every assistant in a single call, up to a maximum of 1000.

## Response (200 OK)

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
            },
            "additionalProperties": false
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
| `data` | array | Lists your company's assistants, one object per assistant. |
| `total` | int | Tells you how many items `data` holds. |

**Assistant item**

| Field | Type | Description |
|---|---|---|
| `assistant_id` | string (UUID) | Identifies the assistant with a stable ID. Use it in [`POST /v1/calls/list`](list-calls/index.md) to filter that assistant's calls, and as the `assistant_id` when launching a batch of outbound calls with [`POST /v1/calls/bulk`](bulk-create-calls.md). |
| `assistant_name` | string | Gives the assistant's display name. |
| `assistant_language` | string | Gives the assistant's language code, such as `tr-TR` or `en-US`. |
| `assistant_created_at` | ISO 8601 (UTC) | Marks when the assistant was created, as an ISO 8601 UTC timestamp with a `+00:00` offset. |
| `assistant_variables` | array of string | Lists the **template variable names** this assistant expects. Vindy derives them from the `{{…}}` placeholders in its prompt and greeting, preserving their order and removing duplicates. Send values for these via `variables` when placing calls with [`POST /v1/calls`](create-call.md) or [`POST /v1/calls/bulk`](bulk-create-calls.md). The list is empty (`[]`) when the assistant uses no variables. |
| `structured_outputs` | array | Carries the structured output schema attached to this assistant. It is empty (`[]`) when the assistant has none; otherwise it holds exactly **one** entry, whose `id` equals `assistant_id`. |

**StructuredOutput object**

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Identifies the schema with a stable ID. It equals `assistant_id`, and you use it to match a call's extracted data back to the schema that produced it. |
| `name` | string | Gives the schema's display name, which mirrors the assistant's name. |
| `schema` | object | Holds the schema itself, returned exactly as it was set up for the assistant. [How to read it](#the-structured-output-schema) is right below. |

### The structured output schema {#the-structured-output-schema}

Some assistants are set up to pull a few structured facts out of every call: how the call ended, a satisfaction score, whether the customer asked for a callback. When an assistant works this way, its `structured_outputs` entry carries a `schema`, returned exactly as it was set up. The `schema` tells you which fields that data will have, and what type each one is.

The easiest way to picture a `schema` is as a **blank form**. It lists the questions, but it never holds the answers. The answers arrive later, one set per call: once a call finishes, its filled-in values come back as `call_structured_data` on [List Calls](list-calls/index.md). So the `schema` here is the empty form, and `call_structured_data` there is a single filled-in copy.

The root of a schema is always an object, and its most important key is `properties`: the map from each field's name to a short description of that field. Everything below is about reading those field descriptions.

**A field in the schema becomes a key in the data.** Take the three plain fields from the schema above:

```json
"arama_sonucu": {
  "type": "string",
  "enum": ["tamamlandi", "yarim_kaldi", "ulasilamadi", "belirsiz"]
},
"genel_memnuniyet_puani": { "type": "integer" },
"geri_arama_talebi": { "type": "boolean" }
```

`arama_sonucu` is text that can only be one of four fixed values (that is what `enum` means), `genel_memnuniyet_puani` is a whole number, and `geri_arama_talebi` is true or false. When a call finishes, those three come back filled in:

```json
"arama_sonucu": "tamamlandi",
"genel_memnuniyet_puani": 4,
"geri_arama_talebi": false
```

Every field name in the schema turns into a key in the call's data, and each value follows the `type` the schema declared. That is the whole idea.

**A field can be a list or a record, not just one value.** When a field's `type` is `array`, an `items` entry describes what each element looks like. The schema above does this twice:

```json
"ilgilenilen_urunler": {
  "type": "array",
  "items": { "type": "string" },
  "uniqueItems": true
},
"siparisler": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "urun": { "type": "string" },
      "miktar": { "type": "integer" }
    }
  }
}
```

`ilgilenilen_urunler` is a list of text values, because its `items` is a single string; `uniqueItems: true` means the same value never appears twice. `siparisler` goes one level deeper: its `items` is an object with its own fields, so each element is a complete little record. Filled in by a real call, the two look like this:

```json
"ilgilenilen_urunler": ["urun_a", "urun_b"],
"siparisler": [
  { "urun": "Ürün A", "miktar": 2 },
  { "urun": "Ürün B", "miktar": 1 }
]
```

Because a field can nest like this — a record inside a list, or more fields inside a record — don't assume the schema is a flat list of simple values. Follow `items` into arrays and `properties` into objects, one step at a time.

**The complete result for one call.** Here is the full `call_structured_data` that the assistant above returns once a call finishes, with all five fields filled in together:

```json
{
  "arama_sonucu": "tamamlandi",
  "genel_memnuniyet_puani": 4,
  "geri_arama_talebi": false,
  "ilgilenilen_urunler": ["urun_a", "urun_b"],
  "siparisler": [
    { "urun": "Ürün A", "miktar": 2 },
    { "urun": "Ürün B", "miktar": 1 }
  ]
}
```

Each key matches what the schema promised: `arama_sonucu` is the fixed choice, `genel_memnuniyet_puani` the satisfaction number, `geri_arama_talebi` the true/false flag, `ilgilenilen_urunler` the de-duplicated list, and `siparisler` the list of records.

**The keys you'll see on a field.** Each field description uses a small set of keys. `type` is always there; the rest appear only when they apply:

| Key | What it tells you | Example |
|---|---|---|
| `type` | Gives the field's value kind — `string`, `integer`, `number`, `boolean`, `array`, or `object`. It is **always present**. | `"type": "integer"` |
| `title` | Gives a human-readable label for the field. | `"title": "Overall satisfaction"` |
| `description` | Explains what the field captures. | `"description": "Score from 1 to 5."` |
| `enum` | Lists the fixed set of allowed values, for a choice field. | `"enum": ["tamamlandi", "belirsiz"]` |
| `items` | Describes the shape of each element, for an `array`. | `"items": { "type": "string" }` |
| `uniqueItems` | For an `array`, `true` means no duplicates. | `"uniqueItems": true` |

An optional key is simply left out when it doesn't apply; it is never set to `null`. So read defensively: when a field has no `title`, fall back to its key name, and don't assume `description`, `enum`, or `items` are present.

**`required` and `additionalProperties`.** Next to `properties`, the root of a schema can carry two more keys:

- `required` lists the fields the assistant always fills in, so you can count on them in every call's `call_structured_data`. In the example, `arama_sonucu` and `genel_memnuniyet_puani` are required; the rest can be missing on some calls. When nothing is required, the `required` key is left out entirely — you will never see `"required": []` or `"required": null`. Many assistants have no required fields, so treat its absence as normal.
- `additionalProperties` is usually `false`, which simply means a call's data won't contain fields beyond the ones the schema lists.

**Where the values come from.** The `schema` never holds values itself; it is only the form. The values always come from a real call, and the same schema produces different data every time. To read them, call [List Calls](list-calls/index.md). The `call_structured_data` it returns is a **flat object**: its keys are exactly the field names from the schema's `properties`, and you read each value directly from its key, never from under a wrapper such as the structured output's `id`. Any value may be `null` when the assistant couldn't capture that field, so treat every value as possibly null. When you read the **schema** itself, treat it as a standard JSON Schema object: take the field list from `properties`, and don't assume the schema's root holds only `type` and `properties`, since it can also carry keys like `required` and `additionalProperties`.

## Errors

| Status | Code |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notes

- Assistants are ordered by creation time, from oldest to newest.
- The list includes both your company's own assistants **and any assistants shared with you by Vindy**. Shared assistants behave like your own here: you can filter their calls in [List Calls](list-calls/index.md) and launch outbound batches with them in [Bulk Create Calls](bulk-create-calls.md).
- An assistant with no structured output schema returns `structured_outputs: []`.
- `assistant_variables` tells you which `variables` keys to send when calling with this assistant. If it uses none, you can omit `variables` entirely.
- Extracted values come back as a **flat** `call_structured_data` object on [List Calls](list-calls/index.md); it is **not** wrapped under the structured output's `id`, so use the `id` to line a call's data up with the schema here.

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
