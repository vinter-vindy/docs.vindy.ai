---
title: Asistanları Listele
sidebar_label: Asistanları Listele
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/assistants`

Şirketinizin asistanlarını **tek bir liste** hâlinde döndürür. Her öğe asistanın temel bilgilerini ve varsa o asistana bağlı **yapısal çıktı (structured output) şemasını** taşır.

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
                "description": "Görüşmenin nasıl sonuçlandığı.",
                "enum": ["tamamlandi", "yarim_kaldi", "ulasilamadi", "belirsiz"]
              },
              "genel_memnuniyet_puani": {
                "type": "integer",
                "title": "Genel memnuniyet",
                "description": "1-5 arası memnuniyet puanı."
              },
              "geri_arama_talebi": { "type": "boolean", "title": "Geri arama talebi" },
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

## Yanıt alanları

**Üst düzey**

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Asistan öğeleri. |
| `total` | int | `data` dizisinin uzunluğu. |

**Asistan öğesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `assistant_id` | string (UUID) | Kalıcı asistan kimliği. Bu asistanın çağrılarını filtrelemek için [`POST /v1/calls/list`](list-calls/index.md) isteğinde, toplu giden çağrı başlatırken de `assistant_id` olarak [`POST /v1/calls/bulk`](bulk-create-calls.md) isteğinde kullanılır. |
| `assistant_name` | string | Görünen ad. |
| `assistant_language` | string | Dil kodu (örneğin `tr`, `en`). |
| `assistant_created_at` | ISO 8601 (UTC) | Oluşturulma zamanı, `+00:00` offset biçiminde. |
| `assistant_variables` | array of string | Bu asistanın beklediği **şablon değişken adları** — prompt ve karşılama (greeting) metnindeki `{{…}}` yer tutucularından türetilir (sıralı, tekilleştirilmiş). Çağrı yaparken bu değerleri [`POST /v1/calls`](create-call.md) veya [`POST /v1/calls/bulk`](bulk-create-calls.md) ile `variables` üzerinden gönderin. Asistan hiç değişken kullanmıyorsa boştur (`[]`). |
| `structured_outputs` | array | Bu asistana bağlı yapısal çıktı şeması. Asistanın şeması yoksa boştur (`[]`); varsa `id` değeri `assistant_id` değerine eşit olan **tek** bir giriş bulunur. |

**StructuredOutput nesnesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `id` | string (UUID) | Yapısal çıktının kalıcı kimliği — `assistant_id` değerine eşittir. Bir çağrının çıkarılan değerleri, [`POST /v1/calls/list`](list-calls/index.md) yanıtındaki `call_structured_data` içinde bu `id` altında döner; böylece her birini şemasıyla eşleştirebilirsiniz. |
| `name` | string | Görünen ad (asistanın adını yansıtır). |
| `schema` | object | Yapısal çıktının, asistan için tanımlandığı haliyle aynen dönen **JSON Schema**'sı. Bkz. aşağıdaki [Yapısal çıktı şeması](#structured-output-schema). |

### Yapısal çıktı şeması {#structured-output-schema}

`schema` alanı, yapay zekânın çıkardığı verinin yapısını tanımlayan ve asistan için tanımlandığı haliyle aynen dönen standart bir **JSON Schema**'dır. Kökü bir nesnedir; göreceğiniz üyeler şunlardır:

| Üye | Tür | Açıklama |
|---|---|---|
| `type` | string | Şema kökü için her zaman `"object"`. |
| `properties` | object | Alan adı → o alanın alt şeması eşlemesi (aşağıya bakın). Şemanın çekirdeği budur. |
| `required` | array of string | *(opsiyonel)* Her zaman bulunan alan adları. Hiçbir alan zorunlu değilse atlanır. |
| `additionalProperties` | bool | *(opsiyonel)* Genelde `false`; listelenenler dışında alan yok demektir. |

**Alan-başına yapı.** `properties` altındaki her giriş kendisi standart bir JSON Schema alt şemasıdır. Sık görülen anahtarlar:

| Anahtar | Tür | Açıklama |
|---|---|---|
| `type` | string | **Her zaman bulunur.** `string`, `integer`, `number`, `boolean`, `array` veya `object`'ten biri (iç içe bir nesne kendi `properties`'ini taşır). |
| `title` | string | *(opsiyonel)* Alanın okunabilir etiketi. |
| `description` | string | *(opsiyonel)* Alanın neyi yakaladığı. |
| `enum` | array | *(opsiyonel)* Seçim alanları için izin verilen değerler. |
| `items` | object | *(opsiyonel)* `array` türleri için — her elemanın izlediği alt şema. |
| `uniqueItems` | bool | *(opsiyonel)* `array` türleri için — elemanların benzersiz olması gerekip gerekmediği. |

Opsiyonel anahtarlar **ayarlanmadığında atlanır, asla `null` olarak bulunmaz** — örneğin etiketi olmayan bir alanın `title` anahtarı hiç yer almaz (enjekte edilen bir `null` şemayı geçersiz kılardı). Savunmacı okuyun: `title` yoksa alanın anahtar adına geri dönün ve `description`, `enum` veya `items`'ın var olduğunu varsaymayın.

Bunu opak bir JSON Schema olarak ele alın: alanları öğrenmek için `properties`'i okuyun ve yalnızca `type`/`properties` bulunacağını varsaymayın.

## Hatalar

| Durum | Kod |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notlar

- Asistanlar oluşturulma zamanına göre sıralanır.
- Liste, kendi şirketinizin asistanlarını **ve Vindy tarafından sizinle paylaşılan asistanları** birlikte içerir — paylaşılan asistanlar burada kendi asistanlarınız gibi davranır: [Çağrıları Listele](list-calls/index.md)'de onların çağrılarını filtreleyebilir, [Toplu Arama Oluştur](bulk-create-calls.md) ile onlarla giden çağrı başlatabilirsiniz.
- Yapısal çıktı şeması olmayan bir asistan `structured_outputs: []` döndürür.
- `assistant_variables`, bu asistanla arama yaparken hangi `variables` anahtarlarını göndereceğinizi söyler. Asistan hiç değişken kullanmıyorsa `variables`'ı tümüyle atlayabilirsiniz.
- Çıkarılan değerler, [Çağrıları Listele](list-calls/index.md) yanıtındaki `call_structured_data` içinde yapısal çıktının `id` değeri altında döner; böylece bir çağrının verisini buradaki şemayla eşleştirebilirsiniz.

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
