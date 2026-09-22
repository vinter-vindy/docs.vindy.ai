---
title: Toplu Aramayı İptal Et
sidebar_label: Toplu Aramayı İptal Et
sidebar_position: 7
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/batches/:batchId/cancel`

[`POST /v1/calls/bulk`](bulk-create-calls.md) ile oluşturulan bir toplu aramadaki tüm **kuyruktaki** çağrıları iptal eder. Yalnızca hâlâ kuyrukta bekleyen (`pending` veya `scheduled`) çağrılar iptal edilir; halihazırda aranmakta olan veya bitmiş çağrılara dokunulmaz.

`batchId`, bulk yanıtında dönen `batch_call_id` değeridir.

---

## İstek

```http
POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/cancel
Authorization: Bearer <api-key>
```

İstek gövdesi yoktur.

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `batchId` | string | Toplu aramanın kimliği — [`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `batch_call_id`. |

## Yanıt (200 OK)

Toplu arama özetini ve ayrıca `cancelled_now` değerini — bu isteğin az önce iptal ettiği kuyruktaki çağrı sayısını — döndürür.

```json
{
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "status": "cancelled",
  "total_count": 200,
  "counts": {
    "completed": 120,
    "failed": 8,
    "cancelled": 72,
    "pending": 0,
    "processing": 0
  },
  "created_at": "2026-06-09T23:39:20+00:00",
  "cancelled_now": 37
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `batch_call_id` | string | İptal edilen toplu aramanın kimliği (istekte gönderdiğiniz `batchId`). |
| `status` | string | Toplu aramanın iptal sonrası durumu. |
| `total_count` | int | Toplu aramadaki toplam çağrı sayısı. |
| `counts` | object | Durum bazında döküm; her değer bir tam sayıdır: `completed`, `failed`, `cancelled`, `pending`, `processing`. (`pending` = scheduled + pending, `processing` = in_progress.) |
| `created_at` | ISO string | Toplu aramanın oluşturulduğu an (UTC, `+00:00`). |
| `cancelled_now` | int | Bu isteğin az önce iptal ettiği kuyruktaki çağrı sayısı. |

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Kimlik doğrulama hataları. |
| `404` | `RESOURCE_NOT_FOUND` | Toplu arama bulunamadı veya sizin şirketinize ait değil. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::note Yalnızca kuyruktaki çağrılar etkilenir
Bu endpoint, henüz başlamamış çağrıları durdurur. Halihazırda devam eden çağrılar tamamlanana kadar sürer, bitmiş çağrılar değişmez. Dönen `cancelled_now`, bu istekle tam olarak kaç çağrının durdurulduğunu belirtir. Aynı toplu arama üzerinde tekrar çağırırsanız güncel özet `cancelled_now: 0` ile döner.
:::

:::note Bir toplu aramayı iptal etmek tek bir `batch-ended` webhook'u üretir
Bir webhook aboneliğiniz varsa, bir toplu aramayı iptal etmek `status: "cancelled"` ile tek bir [`batch-ended`](webhooks.md#batch-ended) olayı üretir. Bunun durdurduğu bireysel çağrılar tek tek `call-ended` ile **raporlanmaz** — hepsi o tek olaya toplanır; bu, büyük toplu aramalarda olay yağmurunu önler. Bunun yerine tekli bir çağrıyı iptal edip çağrı başına [`call-ended`](webhooks.md#call-ended) (`call_status: "cancelled"` ile) almak için [`POST /v1/calls/:callId/cancel`](cancel-call.md) kullanın.
:::

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/cancel \
  -H "Authorization: Bearer $VINDY_API_KEY"
# → { "batch_call_id": "84213f7a-...", "status": "cancelled", "cancelled_now": 37, ... }
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function cancelBatch(batchId) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/batches/${batchId}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` },
    },
  );

  if (response.status === 404) {
    return null; // toplu arama bulunamadı veya sizin şirketinizde değil
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  const summary = await response.json();
  console.log(`${summary.cancelled_now} kuyruktaki çağrı iptal edildi`);
  return summary;
}

await cancelBatch("84213f7a-58cc-4372-a567-0e02b2c3d479");
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def cancel_batch(batch_call_id):
    response = requests.post(
        f"https://api.vindy.ai/v1/calls/batches/{batch_call_id}/cancel",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )

    if response.status_code == 404:
        return None  # toplu arama bulunamadı veya sizin şirketinizde değil
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")

    summary = response.json()
    print(f"{summary['cancelled_now']} kuyruktaki çağrı iptal edildi")
    return summary

cancel_batch("84213f7a-58cc-4372-a567-0e02b2c3d479")
```

</TabItem>
</Tabs>
