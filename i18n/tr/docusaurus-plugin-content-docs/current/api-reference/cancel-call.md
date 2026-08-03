---
title: Tek Bir Çağrıyı İptal Et
sidebar_label: Tek Bir Çağrıyı İptal Et
sidebar_position: 6
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/:callId/cancel`

Kuyrukta bekleyen tek bir **giden çağrıyı** iptal eder — hâlâ `pending` veya `scheduled` durumunda olan ve henüz aranmamış bir çağrıyı. Yalnızca kendi şirketinizin çağrılarını iptal edebilirsiniz.

Bir çağrı yalnızca hâlâ kuyrukta beklerken iptal edilebilir. Görev bir kez dağıtıldıktan (aranmaya başlandıktan) veya bittikten sonra artık iptal edilemez.

:::note `callId` nereden gelir
Yol, bir **giden kuyruk çağrısının** `call_id` değerini alır — [`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `calls[]` dizisinde dönen kimliklerden biridir. Yalnızca hâlâ kuyrukta bekleyen çağrılar iptal edilebilir; bir batch'teki kalan tüm çağrıları tek seferde iptal etmek için [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) kullanın.
:::

---

## İstek

```http
POST https://api.vindy.ai/v1/calls/7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b/cancel
Authorization: Bearer <api-key>
```

İstek gövdesi yoktur.

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `callId` | string | İptal edilecek kuyruktaki çağrının `call_id` değeri (bulk `calls[]` yanıtından). |

## Yanıt (200 OK)

```json
{ "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b", "status": "cancelled" }
```

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string | İptal edilen çağrının kimliği (gönderdiğiniz `callId`). |
| `status` | string | Başarıda daima `cancelled`. |

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Kimlik doğrulama hataları. |
| `404` | `RESOURCE_NOT_FOUND` | Böyle bir çağrı yok veya başka bir şirkete ait. |
| `409` | `ERR_CALL_NOT_CANCELLABLE` | Çağrı iptal edilemez: kuyrukta bekleyen bir giden çağrı değildir. Ya zaten dağıtılmış veya bitmiş, bir yarış koşulu oluşmuş ya da bir **gelen / çoktan başlamış çağrıdır** (bunlar asla iptal edilemez). |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::note İptalin artık mümkün olmadığı durum
Kuyruktaki bir çağrı, beklemeden aranma durumuna hızla geçer. `409 ERR_CALL_NOT_CANCELLABLE` alırsanız, çağrı kuyruktan çıkmış ve API üzerinden durdurulamaz hâle gelmiş demektir. Çağrı sonlandığında sonucunu [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md) veya bir [webhook olayı](webhooks.md) ile görürsünüz.
:::

:::note İptal edilen bir çağrı `call-ended` webhook'u üretir
Bir webhook aboneliğiniz varsa, tekli bir kuyruk çağrısını iptal etmek `call_status: "cancelled"` ve minimal bir gövdeyle (transcript veya kayıt yok) bir [`call-ended`](webhooks.md#call-ended) olayı üretir — iptali eşzamansız olarak böyle doğrularsınız. Bütün bir toplu aramayı iptal etmek ise bunun yerine çağrı başına `call-ended` değil, **tek** bir [`batch-ended`](webhooks.md#batch-ended) olayı üretir.
:::

:::tip Bütün bir batch'i iptal etme
Aynı anda çok sayıda kuyruktaki çağrıyı — örneğin bir toplu aramadaki kalan tüm çağrıları — iptal etmek için, her çağrıyı tek tek iptal etmek yerine bulk isteğinizden gelen `batch_call_id` ile [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) endpoint'ini kullanın.
:::

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b/cancel \
  -H "Authorization: Bearer $VINDY_API_KEY"
# → { "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b", "status": "cancelled" }
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function cancelCall(callId) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/${callId}/cancel`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    if (error.extensions?.code === "ERR_CALL_NOT_CANCELLABLE") {
      return false; // çok geç — çağrı kuyruktan çıktı
    }
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  const { status } = await response.json();
  return status === "cancelled";
}

await cancelCall("7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b");
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def cancel_call(call_id):
    response = requests.post(
        f"https://api.vindy.ai/v1/calls/{call_id}/cancel",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )

    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        if code == "ERR_CALL_NOT_CANCELLABLE":
            return False  # çok geç — çağrı kuyruktan çıktı
        raise RuntimeError(f"{code}: {error.get('message')}")

    return response.json()["status"] == "cancelled"

cancel_call("7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b")
```

</TabItem>
</Tabs>
