---
title: Asistanları Listele
sidebar_label: Asistanları Listele
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/assistants`

Şirketinizin asistanlarını **tek bir liste** hâlinde döndürür. Her öğe bir `type` alanı (şu an her zaman `"assistant"`) ve varsa o asistana bağlı **structured output şemasını** taşır.

---

## İstek

```http
GET https://api.vindy.ai/v1/assistants
Authorization: Bearer <api-key>
```

Sorgu parametresi yoktur. Yanıt **sayfalanmaz** — tüm asistanlar tek çağrıda döner (en fazla 1000).

## Yanıt (200 OK)

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

## Yanıt alanları

**Üst düzey**

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Asistan öğeleri. |
| `total` | int | `data` dizisinin uzunluğu. |

**Asistan öğesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `type` | string | Tür ayırt edici (discriminator) — şu an her zaman `"assistant"`. |
| `assistant_id` | string (UUID) | Kalıcı asistan kimliği. Bu asistanın çağrılarını filtrelemek için [`POST /v1/calls/list`](list-calls/index.md) isteğinde, toplu giden çağrı başlatırken de `assistant_id` olarak [`POST /v1/calls/bulk`](bulk-create-calls.md) isteğinde kullanılır. |
| `assistant_name` | string | Görünen ad. |
| `assistant_language` | string | Dil kodu (örneğin `tr`, `en`). |
| `assistant_created_at` | ISO 8601 (UTC) | Oluşturulma zamanı, `+00:00` offset biçiminde. |
| `assistant_variables` | array of string | Bu asistanın beklediği **şablon değişken adları** — prompt ve karşılama (greeting) metnindeki `{{…}}` yer tutucularından türetilir (sıralı, tekilleştirilmiş). Çağrı yaparken bu değerleri [`POST /v1/calls`](create-call.md) veya [`POST /v1/calls/bulk`](bulk-create-calls.md) ile `variables` üzerinden gönderin. Asistan hiç değişken kullanmıyorsa boştur (`[]`). |
| `structured_outputs` | array | Bu asistana bağlı structured output şeması. Asistanın şeması yoksa boştur (`[]`); varsa `id` değeri asistanın `id` değerine eşit olan **tek** bir giriş bulunur. |

**StructuredOutput nesnesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `id` | string (UUID) | Structured output'un kalıcı kimliği — asistanın `id` değerine eşittir. Bir çağrının çıkarılan değerleri, [`POST /v1/calls/list`](list-calls/index.md) yanıtındaki `call_structured_data` içinde bu `id` altında döner; böylece her birini şemasıyla eşleştirebilirsiniz. |
| `name` | string | Görünen ad (asistanın adını yansıtır). |
| `schema` | object | Structured output'un **JSON Schema**'sı — yapay zekânın çıkardığı verinin yapısını tanımlar ve asistan için tanımlandığı haliyle aynen döner. Çekirdeği, her alan adını türüyle eşleyen bir `properties` nesnesidir. `properties` yanında herhangi bir standart JSON Schema anahtarı taşıyabilir — sık görülenler: `additionalProperties` (genelde `false`; listelenenler dışında alan yok demektir) ve `required` (her zaman bulunan alanlar), ayrıca seçim alanları için `enum`/`uniqueItems`. Bunu opak bir JSON Schema olarak ele alın: alanları öğrenmek için `properties`'i okuyun ve yalnızca `type`/`properties` bulunacağını varsaymayın. |

## Hatalar

| Durum | Kod |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notlar

- Asistanlar oluşturulma zamanına göre sıralanır.
- Liste, kendi organizasyonunuzun asistanlarını **ve Vindy tarafından sizinle paylaşılan asistanları** birlikte içerir — paylaşılan asistanlar burada kendi asistanlarınız gibi davranır: [Çağrıları Listele](list-calls/index.md)'de onların çağrılarını filtreleyebilir, [Toplu Çağrı Oluştur](bulk-create-calls.md) ile onlarla giden çağrı başlatabilirsiniz.
- Structured output şeması olmayan bir asistan `structured_outputs: []` döndürür.
- `assistant_variables`, bu asistanla arama yaparken hangi `variables` anahtarlarını göndereceğinizi söyler. Asistan hiç değişken kullanmıyorsa `variables`'ı tümüyle atlayabilirsiniz.
- Çıkarılan değerler, [Çağrıları Listele](list-calls/index.md) yanıtındaki `call_structured_data` içinde structured output'un `id` değeri altında döner; böylece bir çağrının verisini buradaki şemayla eşleştirebilirsiniz.

## Örnekler

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
console.log(`${total} asistan`);

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
print(f"{body['total']} asistan")

for assistant in body["data"]:
    print(f"{assistant['assistant_id']}: {assistant['assistant_name']}")
```

</TabItem>
</Tabs>
