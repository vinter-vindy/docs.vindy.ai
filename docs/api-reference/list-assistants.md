---
title: List Assistants
sidebar_label: List Assistants
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/assistants`

Returns your company's assistants in a **single list**. Each item carries a `type` field (currently always `"assistant"`) and the **structured output schema** attached to that assistant, if any.

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
      "type": "assistant",
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
            "properties": {
              "age": { "type": "integer" },
              "overall_satisfaction": { "type": "integer" },
              "support_speed": { "type": "integer" },
              "would_recommend": { "type": "boolean" }
            },
            "additionalProperties": false,
            "required": ["overall_satisfaction", "would_recommend"]
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
| `type` | string | Discriminator — currently always `"assistant"`. |
| `assistant_id` | string (UUID) | Stable assistant ID. Use it in [`POST /v1/calls/list`](list-calls/index.md) to filter that assistant's calls, and as the `assistant_id` when launching a batch of outbound calls with [`POST /v1/calls/bulk`](bulk-create-calls.md). |
| `assistant_name` | string | Display name. |
| `assistant_language` | string | Language code (e.g. `tr`, `en`). |
| `assistant_created_at` | ISO 8601 (UTC) | Creation timestamp, in `+00:00` offset form. |
| `assistant_variables` | array of string | The **template variable names** this assistant expects — derived from the `{{…}}` placeholders in its prompt and greeting (ordered, deduplicated). Send values for these via `variables` when placing calls with [`POST /v1/calls`](create-call.md) or [`POST /v1/calls/bulk`](bulk-create-calls.md). Empty (`[]`) when the assistant uses no variables. |
| `structured_outputs` | array | The structured output schema attached to this assistant. Empty (`[]`) when the assistant has none; otherwise exactly **one** entry, whose `id` equals the assistant's `id`. |

**StructuredOutput object**

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Stable id of the structured output — equal to the assistant's `id`. A call's extracted values come back under this `id` in `call_structured_data` on [`POST /v1/calls/list`](list-calls/index.md), so you can line each one up with its schema. |
| `name` | string | Display name (mirrors the assistant's name). |
| `schema` | object | The structured output's **JSON Schema** — it describes the shape of the data the AI extracts, and is returned verbatim as it was defined for the assistant. Its core is an object whose `properties` map each field name to its type. Alongside `properties` it may carry any standard JSON Schema keywords — commonly `additionalProperties` (usually `false`, meaning no fields beyond the ones listed) and `required` (the fields that are always present), plus `enum`/`uniqueItems` for choice fields. Treat it as an opaque JSON Schema: read `properties` to know the fields, and don't hard-code an expectation that only `type`/`properties` are present. |

## Errors

| Status | Code |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notes

- Assistants are ordered by creation time.
- The list includes both your organization's own assistants **and any assistants shared with you by Vindy** — shared assistants behave like your own here: you can filter their calls in [List Calls](list-calls/index.md) and launch outbound batches with them in [Bulk Create Calls](bulk-create-calls.md).
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
