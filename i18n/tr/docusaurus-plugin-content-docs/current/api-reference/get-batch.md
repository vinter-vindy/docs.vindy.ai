---
title: Toplu Aramayı Getir
sidebar_label: Toplu Aramayı Getir
sidebar_position: 7.8
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/calls/batches/:batchId`

Tek bir **toplu aramanın** ([`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `batch_call_id`) özetini, nihai durumu ve çağrılarının durum bazında dökümüyle birlikte döndürür.

Gövde, [`batch-ended` webhook'unun](webhooks.md#batch-ended) `data` alanında ilettiği `BatchCallSummary` nesnesinin **birebir aynısıdır**; bu endpoint onun **pull (çekme)** karşılığıdır. Bir toplu arama sonlandığında anlık bildirim için webhook'u, aynı özeti istediğiniz an çekmek için (bir toplu aramanın ilerleyişini yoklamak ya da sonradan mutabakat yapmak için) bu endpoint'i kullanın.

Bir toplu aramanın tek tek **çağrılarını** sayfalamak için [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md); **toplu aramalarınızı** listelemek için [`POST /v1/calls/batches/list`](list-batches.md) endpoint'ini kullanın.

---

## İstek

```http
GET https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer <api-key>
```

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `batchId` | string | Toplu aramanın kimliğidir; [`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `batch_call_id` değeridir. |

## Yanıt (200 OK)

```json
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
}
```

## Yanıt alanları

| Alan | Tür | Açıklama |
|---|---|---|
| `batch_call_id` | string | Toplu aramayı tanımlar; yolda gönderdiğiniz `batchId` değeridir. |
| `status` | string | Toplu aramanın durumudur: `active` (hâlâ çalışıyor), `completed` (tüm çağrılar sonlanmış bir duruma ulaştı) ya da `cancelled` (toplu arama iptal edildi) değerlerinden birini alır. |
| `total_count` | int | Toplu aramadaki toplam çağrı sayısıdır. |
| `counts` | object | Toplu aramanın çağrılarının durum bazında dökümüdür; üyeleri aşağıda listelenir. |
| `created_at` | ISO 8601 (UTC) | Toplu aramanın oluşturulma zamanını gösterir; `+00:00` ofset'li ISO 8601 biçiminde döner. |

**`counts`**

| Alan | Tür | Açıklama |
|---|---|---|
| `completed` | int | Başarıyla tamamlanan çağrıların sayısını verir. |
| `failed` | int | Başarısızlıkla sonlanan (cevapsız, meşgul, hata vb.) çağrıların sayısını verir. |
| `cancelled` | int | Aranmadan önce kuyruktan iptal edilen çağrılardır. Bunların her biri ayrıca `call_status: "cancelled"` ile kendi [`call-ended`](webhooks.md#call-ended)'ini üretir; bu sayı yalnızca toplamdır. |
| `pending` | int | Henüz başlamamış çağrılardır; `pending` ve `scheduled` çağrıların ikisini de kapsar. Toplu arama `completed` olduğunda `0` olur. |
| `processing` | int | Hâlâ devam eden çağrılardır (`in_progress` durumu). Toplu arama `completed` olduğunda `0` olur. |

:::note `batch-ended` webhook'uyla aynı nesne
Bu, [`batch-ended` webhook'unun](webhooks.md#batch-ended) `data` payload'ının tam olarak aynısıdır. Webhook bunu ek olarak `event_type`, `delivery_id` ve üst düzey bir `batch_call_id` ile sarmalar; bu endpoint ise onları atlar (`batchId` zaten elinizde). `counts` değerleri toplu aramanın çağrılarıyla tutarlıdır: `completed + failed + cancelled + pending + processing == total_count`.
:::

:::tip Toplu aramayı bitişe kadar yoklama
`status` `completed` (veya `cancelled`) olana kadar bu endpoint'i yoklayın. `active` iken `pending` + `processing`, bitmesi kalan çağrıları sayar. Çağrı bazında sonuçlar için [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) endpoint'ini sayfalayın.
:::

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | İsteğin kimlik doğrulaması başarısız oldu. |
| `404` | `RESOURCE_NOT_FOUND` | Toplu arama bulunamadı ya da başka bir şirkete aittir. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::note Varlık bilgisi sızdırılmaz
Başka bir şirkete ait bir `batchId`, var olmayan bir kimlikle aynı `404 RESOURCE_NOT_FOUND` yanıtını döndürür; bu, [`GET /v1/calls/:callId`](get-call.md) ile aynı kuraldır. Bkz. [Çoklu kiracılık](../concepts/multi-tenancy.md).
:::

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer $VINDY_API_KEY"
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function getBatch(batchId) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/batches/${batchId}`,
    { headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` } },
  );

  if (response.status === 404) {
    return null; // toplu arama bulunamadı veya sizin şirketinizde değil
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  return response.json();
}

const batch = await getBatch("84213f7a-58cc-4372-a567-0e02b2c3d479");
console.log(batch?.status, batch?.counts);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def get_batch(batch_call_id):
    response = requests.get(
        f"https://api.vindy.ai/v1/calls/batches/{batch_call_id}",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )
    if response.status_code == 404:
        return None  # toplu arama bulunamadı veya sizin şirketinizde değil
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")
    return response.json()

batch = get_batch("84213f7a-58cc-4372-a567-0e02b2c3d479")
if batch:
    print(batch["status"], batch["counts"])
```

</TabItem>
</Tabs>

:::note İlgili
Toplu aramalarınızı [`POST /v1/calls/batches/list`](list-batches.md) ile listeleyin; bir toplu aramanın çağrılarını [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile sayfalayın; aynı özeti size iletilmiş hâliyle [`batch-ended` webhook'uyla](webhooks.md#batch-ended) alın.
:::
