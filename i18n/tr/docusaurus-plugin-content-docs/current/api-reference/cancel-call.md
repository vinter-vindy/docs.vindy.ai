---
title: Tek Bir Çağrıyı İptal Et
sidebar_label: Tek Bir Çağrıyı İptal Et
sidebar_position: 6
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/:callId/cancel`

Hâlâ `pending` ya da `scheduled` durumunda olan, yani henüz aranmamış ve kuyrukta bekleyen tek bir **giden çağrıyı** iptal eder. Yalnızca kendi şirketinizin çağrılarını iptal edebilirsiniz.

Çağrı bir kez dağıtıldıktan (aranmaya başlandıktan) veya bittikten sonra artık iptal edilemez.

:::note `callId` nereden gelir
Yol, bir **giden kuyruk çağrısının** `call_id` değerini alır. Bir `call_id`'yi [`POST /v1/calls`](create-call.md) (tekil çağrı) yanıtından, bir toplu aramanın çağrılarını [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile listeleyerek ya da [`POST /v1/calls/list`](list-calls/index.md) yanıtından alırsınız. Ayrıca kendi `metadata`'nızla eşleştirerek de bir kuyruk çağrısını bulabilirsiniz. Yalnızca hâlâ kuyrukta bekleyen çağrılar iptal edilebilir; bir toplu aramadaki kalan tüm çağrıları tek seferde iptal etmek için [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) kullanın.
:::

---

## İstek

```http
POST https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f/cancel
Authorization: Bearer <api-key>
```

İstek gövdesi yoktur.

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `callId` | string | İptal etmek istediğiniz, kuyrukta bekleyen çağrının `call_id` değerini buraya yazarsınız. |

## Yanıt (200 OK)

```json
{ "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f", "status": "cancelled" }
```

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string | İptal edilen çağrının kimliğini verir; gönderdiğiniz `callId` değeridir. |
| `status` | string | İşlem başarılı olduğunda her zaman `cancelled` döner. |

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | İsteğin kimlik doğrulaması başarısız oldu. |
| `404` | `RESOURCE_NOT_FOUND` | Böyle bir çağrı yok ya da başka bir şirkete aittir. |
| `409` | `ERR_CALL_NOT_CANCELLABLE` | Çağrı iptal edilemez: kuyrukta bekleyen bir giden çağrı değildir. Ya zaten dağıtılmış/bitmiştir, ya tam siz iptal ederken çağrı aranmaya başlamıştır ya da **gelen/çoktan başlamış bir çağrıdır** (bunlar asla iptal edilemez). |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::note İptalin artık mümkün olmadığı durum
Kuyruktaki bir çağrı, beklemeden aranma durumuna hızla geçer. `409 ERR_CALL_NOT_CANCELLABLE` alırsanız, çağrı kuyruktan çıkmış ve API üzerinden durdurulamaz hâle gelmiş demektir. Çağrı sonlandığında sonucunu [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md) veya bir [webhook olayı](webhooks.md) ile görürsünüz.
:::

:::note İptal edilen bir çağrı `call-ended` webhook'u üretir
Bir webhook aboneliğiniz varsa, tekli bir kuyruk çağrısını iptal etmek `call_status: "cancelled"` ve minimal bir gövdeyle (transcript veya kayıt yok) bir [`call-ended`](webhooks.md#call-ended) olayı üretir; iptali eşzamansız olarak böyle doğrularsınız. Bütün bir toplu aramayı iptal etmek ise durdurulan **her kuyruk çağrısı için bir `call-ended`** (her biri `call_status: "cancelled"` ve `call_metadata`'nız geri yansıtılmış) **artı** en son gelen tek bir [`batch-ended`](webhooks.md#batch-ended) üretir. Toplama (roll-up) yoktur.
:::

:::tip Bütün bir toplu aramayı iptal etme
Aynı anda çok sayıda kuyruktaki çağrıyı (örneğin bir toplu aramadaki kalan tüm çağrıları) iptal etmek için, her çağrıyı tek tek iptal etmek yerine toplu arama isteğinizden gelen `batch_call_id` ile [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) endpoint'ini kullanın.
:::

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f/cancel \
  -H "Authorization: Bearer $VINDY_API_KEY"
# → { "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f", "status": "cancelled" }
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

await cancelCall("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f");
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

cancel_call("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f")
```

</TabItem>
</Tabs>
