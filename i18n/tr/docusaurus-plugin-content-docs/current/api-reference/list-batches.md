---
title: Toplu Aramaları Listele
sidebar_label: Toplu Aramaları Listele
sidebar_position: 7.7
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/batches/list`

Şirketinizin [`POST /v1/calls/bulk`](bulk-create-calls.md) ile oluşturduğunuz **toplu aramalarını**, en yeniden başlayarak ve cursor tabanlı sayfalamayla döndürür. Her öğe, [`GET /v1/calls/batches/:batchId`](get-batch.md) ve [`batch-ended` webhook'unun](webhooks.md#batch-ended) döndürdüğü `BatchCallSummary` ile aynı yapıdadır; yani bir toplu aramanın durumunu ve durum bazında `counts` dökümünü taşır.

[Çağrıları Listele](list-calls/index.md) gibi bu da küçük bir JSON gövdesiyle yapılan bir `POST` isteğidir; cursor opak olduğu için gövdede taşınır. Listeyi tek bir asistana göre daraltabilirsiniz.

---

## İstek

```http
POST https://api.vindy.ai/v1/calls/batches/list
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "limit": 50,
  "cursor": null
}
```

## Gövde parametreleri

Her alan **opsiyoneldir**; şirketinizin tüm toplu aramalarını sayfalamak için boş gövde gönderebilirsiniz.

| Alan | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `assistant_id` | string (UUID) | — | Listeyi tek bir asistana ait toplu aramalarla daraltmak için o asistanın kimliğini ([`GET /v1/assistants`](list-assistants.md) yanıtından) gönderirsiniz. Boş bırakırsanız tüm toplu aramalar listelenir. Bilinmeyen veya bozuk bir kimlik hata değil, boş bir sayfa döndürür. |
| `limit` | int | `200` | Bu sayfada kaç toplu arama alacağınızı belirlersiniz (1–500). Varsayılanı (200) kullanmak için alanı atlar ya da `null` gönderirsiniz. |
| `cursor` | string | — | Bir önceki sayfadan dönen opak `next_cursor` değerini, sonraki sayfayı almak için buraya geri gönderirsiniz. İlk istekte göndermezsiniz. |

Gövde opsiyoneldir; ilk sayfayı varsayılan limitle almak için `{}` (ya da hiçbir şey) gönderebilirsiniz.

## Yanıt (200 OK)

```json
{
  "data": [
    {
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "status": "completed",
      "total_count": 200,
      "counts": {
        "completed": 180,
        "failed": 12,
        "cancelled": 8,
        "pending": 0,
        "processing": 0
      },
      "created_at": "2026-06-09T23:39:20+00:00"
    },
    {
      "batch_call_id": "7c1a9e42-3b8d-4f6a-9c05-2e1d0b3a4f57",
      "status": "active",
      "total_count": 500,
      "counts": {
        "completed": 210,
        "failed": 18,
        "cancelled": 0,
        "pending": 260,
        "processing": 12
      },
      "created_at": "2026-06-10T08:15:00+00:00"
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0Ijoi...",
    "has_more": true,
    "limit": 50
  }
}
```

## Yanıt alanları

**Üst düzey**

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Bu sayfadaki toplu arama özetleridir; [`GET /v1/calls/batches/:batchId`](get-batch.md#yanıt-alanları) ile **aynı yapıdadır**. En yeniden başlayarak (oluşturulma zamanına göre) sıralanır. |
| `pagination` | object | Standart [sayfalama nesnesidir](list-calls/filtering-pagination.md#paginated); üyeleri aşağıda listelenir. |

**`pagination`**

| Alan | Tür | Açıklama |
|---|---|---|
| `next_cursor` | string \| null | Sonraki sayfanın opak cursor'ını taşır. `has_more` `false` olduğunda `null` olur. |
| `has_more` | boolean | Bu sayfadan sonra başka sayfa kalıp kalmadığını belirtir. |
| `limit` | int | Bu yanıta uygulanan sayfa boyutunu verir. |

**Toplu arama özeti** — her öğe [Toplu Aramayı Getir](get-batch.md#yanıt-alanları) ile aynı alanlara sahiptir: `batch_call_id`, `status` (`active` \| `completed` \| `cancelled`), `total_count`, `counts` (`completed`, `failed`, `cancelled`, `pending`, `processing`) ve `created_at`.

:::note Cursor opaktır — sayfalarken filtreyi değiştirmeyin
`cursor` opaktır; onu oluşturmayın veya değiştirmeyin. Sonraki sayfayı almak için **aynı `assistant_id` ile** `cursor` olarak geri gönderin. Bu cursor hem bu endpoint'e hem de bu filtreye özeldir. Başka bir endpoint'ten gelen bir cursor'ı ya da `assistant_id`'yi değiştirdikten sonra eski cursor'ı yeniden kullanmak `400 MALFORMED_CURSOR` ile reddedilir; bunun yerine yeni bir gezinme başlatın. `limit` sayfalar arasında değişebilir. `has_more` `false` olduğunda durun (o noktada `next_cursor` `null` olur).
:::

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` 1–500 aralığının dışında ya da bir gövde alanı geçersiz tipte. Bilinmeyen/fazla alanlar **yok sayılır**, reddedilmez. |
| `400` | `INVALID_CURSOR` | Cursor boş veya çözümlenemiyor. |
| `400` | `MALFORMED_CURSOR` | Cursor çözümlenemiyor ya da farklı bir endpoint veya filtre için üretilmiş. |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | İsteğin kimlik doğrulaması başarısız oldu. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

## Örnekler

### Tüm sayfaları gezme

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# İlk istek (cursor yok)
curl -X POST https://api.vindy.ai/v1/calls/batches/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50}'

# Yanıt: { "data": [50 toplu arama], "pagination": { "next_cursor": "X", "has_more": true } }

# Sonraki istek (next_cursor kullanın)
curl -X POST https://api.vindy.ai/v1/calls/batches/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "cursor": "X"}'

# has_more: false olduğunda durun
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function listAllBatches(assistantId) {
  const batches = [];
  let cursor = undefined;

  do {
    const response = await fetch("https://api.vindy.ai/v1/calls/batches/list", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assistant_id: assistantId, limit: 50, cursor }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${error.extensions?.code}: ${error.message}`);
    }

    const body = await response.json();
    batches.push(...body.data);
    cursor = body.pagination.next_cursor;
  } while (cursor);

  return batches;
}

const batches = await listAllBatches("8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01");
console.log(`${batches.length} toplu arama`);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def list_all_batches(assistant_id=None):
    batches = []
    cursor = None

    while True:
        payload = {"limit": 50}
        if assistant_id:
            payload["assistant_id"] = assistant_id
        if cursor:
            payload["cursor"] = cursor

        response = requests.post(
            "https://api.vindy.ai/v1/calls/batches/list",
            headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
            json=payload,
        )
        if not response.ok:
            error = response.json()
            code = error.get("extensions", {}).get("code")
            raise RuntimeError(f"{code}: {error.get('message')}")

        body = response.json()
        batches.extend(body["data"])
        cursor = body["pagination"]["next_cursor"]
        if not cursor:
            break

    return batches

batches = list_all_batches("8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01")
print(f"{len(batches)} toplu arama")
```

</TabItem>
</Tabs>

:::note İlgili
Tek bir toplu aramanın özetini [`GET /v1/calls/batches/:batchId`](get-batch.md) ile alın; bir toplu aramanın çağrılarını [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile sayfalayın; toplu arama oluşturmak için [`POST /v1/calls/bulk`](bulk-create-calls.md) kullanın.
:::
