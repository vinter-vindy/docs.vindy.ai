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
| `batchId` | string | Toplu aramanın kimliğidir; [`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `batch_call_id` değeridir. |

## Yanıt (200 OK)

Toplu arama özetini, ayrıca bu isteğin az önce iptal ettiği kuyruktaki çağrı sayısını veren `cancelled_now` değerini döndürür.

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
| `batch_call_id` | string | İptal edilen toplu aramayı tanımlar; istekte gönderdiğiniz `batchId` değeridir. |
| `status` | string | Toplu aramanın iptal işleminden sonraki durumudur. Hâlâ çalışan bir toplu aramada `cancelled` olur; çoktan `completed` olmuş bir toplu arama ise `completed` kalır. |
| `total_count` | int | Toplu aramadaki toplam çağrı sayısını verir. |
| `counts` | object | Toplu aramanın çağrılarını durum bazında ayrıştırır; her değer bir tam sayıdır: `completed`, `failed`, `cancelled`, `pending`, `processing`. (`pending` = scheduled + pending, `processing` = in_progress.) |
| `created_at` | ISO string | Toplu aramanın oluşturulduğu anı gösterir (UTC, `+00:00`). |
| `cancelled_now` | int | Bu isteğin az önce iptal ettiği kuyruktaki çağrı sayısını verir. |

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | İsteğin kimlik doğrulaması başarısız oldu. |
| `404` | `RESOURCE_NOT_FOUND` | Toplu arama bulunamadı ya da başka bir şirkete aittir. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::note Yalnızca kuyruktaki çağrılar etkilenir
Bu endpoint, henüz başlamamış çağrıları durdurur. Halihazırda devam eden çağrılar tamamlanana kadar sürer, bitmiş çağrılar değişmez. Dönen `cancelled_now`, bu istekle tam olarak kaç çağrının durdurulduğunu belirtir. Aynı toplu arama üzerinde tekrar çağırırsanız güncel özet `cancelled_now: 0` ile döner.
:::

:::note Bir toplu aramayı iptal etmek çağrı başına `call-ended` artı tek bir `batch-ended` üretir
Bir webhook aboneliğiniz varsa, bir toplu aramayı iptal etmek durdurulan **her** kuyruk çağrısı için birer [`call-ended`](webhooks.md#call-ended) (her biri `call_status: "cancelled"`, minimal gövde ve birebir eşleştirebilmeniz için aynen geri dönen `call_metadata`/`call_variables` ile), **artı** `status: "cancelled"` taşıyan tek bir [`batch-ended`](webhooks.md#batch-ended) üretir. `batch-ended`, bu `call-ended`'lerin hepsinden sonra, her zaman **en son** gelir. Tekli bir çağrıyı [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile iptal etmek de o çağrı için aynı şekilde davranır. Bkz. [iptaller webhook'lara nasıl yansır](webhooks.md#batch-ended).
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
