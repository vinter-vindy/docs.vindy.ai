---
title: Toplu Aramanın Çağrılarını Listele
sidebar_label: Toplu Aramanın Çağrıları
sidebar_position: 8
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/batches/:batchId/calls`

Tek bir toplu aramaya — [`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `batch_call_id` değerine — ait çağrıları cursor tabanlı sayfalama ile döndürür. Her çağrı nesnesi, [`POST /v1/calls/list`](list-calls/index.md) içindeki bir öğeyle **aynı yapıdadır**.

Bu uç, toplu aramadaki **her çağrıyı** döndürür — hangi aşamada olursa olsun, yalnızca bitenleri değil. Henüz aranmamış çağrılar kuyruk `call_status`'üyle (`pending`, `scheduled`, `in_progress` ya da `cancelled`) ve `null` konuşma/kayıt/zaman alanlarıyla; biten çağrılar ise tam nesneyle (`completed` veya `failed`) görünür. Böylece bu ucu yoklayarak (poll) bir toplu aramanın sıradan bitişe ilerleyişini izleyebilirsiniz.

Çağrıları Listele gibi bu da küçük bir JSON gövdesiyle yapılan bir `POST` isteğidir: cursor opak olduğundan query string yerine gövdede taşınır. Çağrıları Listele'den farklı olarak **tarih filtresi almaz** — tek bir toplu aramayla sınırlıdır ve kendi cursor'una sahiptir. Çağrılar tamamlandıkça sonuçları sayfalamak ya da toplu arama bittikten sonra tüm kümeyi çekmek için kullanın.

:::info Çağrıları Listele ile aynı görünürlük kuralı
Çağrılar, [`POST /v1/calls/list`](list-calls/index.md) ile aynı sırada ve aynı görünürlükle döner: **en yeniden başlayarak** ve yalnızca **sonlanmış çağrılar** (durum `completed` veya `failed`). Devam eden çağrılar nesne olarak dönmez — sonlanmış bir duruma ulaştıklarında burada görünürler. Tarayıcı (WebRTC) çağrıları hiçbir zaman dönmez.
:::

---

## İstek

```http
POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/calls
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "limit": 100,
  "cursor": null
}
```

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `batchId` | string | Toplu aramanın kimliği — [`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `batch_call_id`. |

## Gövde parametreleri

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `limit` | int | hayır | `50` | Bu sayfadaki azami öğe sayısı. Aralık: 1–200. |
| `cursor` | string | hayır | — | Önceki bir `next_cursor` değerinden gelen opak cursor. İlk istekte göndermeyin. |

Gövde opsiyoneldir — ilk sayfayı varsayılan limitle almak için `{}` (veya boş) gönderebilirsiniz.

## Yanıt (200 OK)

```json
{
  "batch_call_id": "842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f",
  "status": "completed",
  "data": [
    {
      "call_id": "sess_a1b2c3d4e5f6",
      "call_status": "completed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905551112233",
      "call_bound_type": "outbound",
      "call_started_at": "2026-06-09T23:40:10+00:00",
      "call_ended_at": "2026-06-09T23:41:37+00:00",
      "call_created_at": "2026-06-09T23:39:20+00:00",
      "call_duration_seconds": 87,
      "call_end_reason": "completed",
      "call_transcript": "[23:40:10] Asistan: Merhaba, ben yapay zeka asistanı Vindy. Müşteri memnuniyeti anketimiz kapsamında size birkaç kısa soru sormak istiyorum — şu an uygun musunuz?\n[23:40:16] Müşteri: Evet, müsaitim.",
      "call_structured_data": {
        "age": 32,
        "overall_satisfaction": 4,
        "support_speed": 5,
        "would_recommend": true
      },
      "call_metadata": { "crm_contact_id": "CNT-90412" },
      "call_variables": { "first_name": "Batu" },
      "call_recording": {
        "available": true,
        "url": "https://...?X-Amz-...",
        "expires_at": "2026-06-09T23:46:40+00:00"
      }
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0Ijoi...",
    "has_more": true,
    "limit": 100
  }
}
```

## Yanıt alanları

**Üst düzey**

| Alan | Tür | Açıklama |
|---|---|---|
| `batch_call_id` | string | Sorguladığınız toplu arama (yolda gönderdiğiniz `batchId`). |
| `status` | string | Toplu aramanın güncel durumu — `active`, `completed` veya `cancelled`. |
| `data` | array | Bu sayfadaki çağrı nesneleri — bir [Çağrıları Listele](list-calls/index.md#yanıt-alanları) öğesiyle **aynı yapı**. |
| `pagination` | object | Standart [sayfalama nesnesi](list-calls/filtering-pagination.md#paginated). |

**Çağrı nesnesi**

`data` içindeki her öğe, bir [Çağrıları Listele](list-calls/index.md#yanıt-alanları) öğesiyle **aynı alanlara** sahiptir — `call_id` (bir dize), `call_status` (`completed` veya `failed`), `call_transcript`, `call_structured_data`, `call_metadata`, `call_recording`, serbest biçimli `call_end_reason` dizesi ve diğerleri. Bu alanları burada yeniden okumak yerine tam [Çağrıları Listele alan referansına](list-calls/index.md#yanıt-alanları) bakabilirsiniz.

:::note Cursor opaktır — aynı `batchId` ile sayfalayın
`cursor` opaktır: onu oluşturmayın veya değiştirmeyin. Sonraki sayfayı almak için **aynı `batchId` ile** gövdede `cursor` olarak geri gönderin ve sayfalar arasında `limit` değerini aynı tutun. `has_more` `false` olduğunda durun (o noktada `next_cursor` `null` olur). Bu cursor, [`POST /v1/calls/list`](list-calls/index.md) tarafından kullanılan cursor'dan bağımsızdır.
:::

:::note Burada tarih filtresi yok
Bu endpoint `date_from` / `date_to` almaz — tek bir toplu aramayla sınırlıdır. Tarih aralığı filtreleme yalnızca [`POST /v1/calls/list`](list-calls/index.md) endpoint'inde bulunur. Bkz. [Filtreleme ve Sayfalama](list-calls/filtering-pagination.md).
:::

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` 1–200 aralığının dışında ya da gövdede beklenmeyen bir alan var. |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Kimlik doğrulama hataları. |
| `404` | `RESOURCE_NOT_FOUND` | Toplu arama bulunamadı veya başka bir şirkete ait. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::note Varlık bilgisi sızdırılmaz
Başka bir şirkete ait bir `batchId`, var olmayan bir kimlikle aynı `404 RESOURCE_NOT_FOUND` yanıtını döndürür — [`GET /v1/calls/:callId`](get-call.md) ile aynı kural. Bkz. [Çoklu kiracılık](../concepts/multi-tenancy.md).
:::

:::tip Toplu aramanın tamamının ne zaman bittiğini öğrenmek
Toplu arama **kendi kendine bittiğinde** `status` alanı `completed` olur — tüm çağrılar sonlanmış bir duruma ulaşmıştır. Durum bazında döküm için [`batch-ended` webhook'unu](webhooks.md#batch-ended) kullanın veya buradaki `status` alanını `completed` olana kadar sorgulayın.

Toplu aramayı [iptal ederseniz](cancel-batch.md) `status` hemen `cancelled` olur (hâlihazırda devam eden çağrılar tamamlanana kadar sürer). Toplu aramayı iptal etmek, `status: "cancelled"` ile tek bir [`batch-ended` webhook'u](webhooks.md#batch-ended) gönderir; toplu aramanın bireysel çağrıları tek tek `call-ended` ile **raporlanmaz**, bu yüzden bunları bu endpoint üzerinden sayfalayarak veya özetteki `counts.cancelled` ile mutabakata getirin.
:::

## Örnekler

### Tek sayfa çekme

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function getBatchCalls(batchId, cursor) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/batches/${batchId}/calls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 100, cursor }),
    },
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

const page = await getBatchCalls("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f");
console.log(page?.status, page?.data.length);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def get_batch_calls(batch_call_id, cursor=None):
    payload = {"limit": 100}
    if cursor:
        payload["cursor"] = cursor

    response = requests.post(
        f"https://api.vindy.ai/v1/calls/batches/{batch_call_id}/calls",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
        json=payload,
    )

    if response.status_code == 404:
        return None  # toplu arama bulunamadı veya sizin şirketinizde değil
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")
    return response.json()

page = get_batch_calls("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f")
if page:
    print(page["status"], len(page["data"]))
```

</TabItem>
</Tabs>

### Tüm sayfaları gezme

`next_cursor` değerini — aynı `batchId` ile — `cursor` olarak geri gönderin; `has_more` `false` olana kadar devam edin.

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# İlk istek (cursor yok)
curl -X POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# Yanıt: { "status": "...", "data": [100 çağrı], "pagination": { "next_cursor": "X", "has_more": true } }

# Sonraki istek (next_cursor kullanın)
curl -X POST https://api.vindy.ai/v1/calls/batches/842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100, "cursor": "X"}'

# has_more: false olduğunda durun
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function listAllBatchCalls(batchId) {
  const calls = [];
  let cursor = undefined;

  do {
    const response = await fetch(
      `https://api.vindy.ai/v1/calls/batches/${batchId}/calls`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: 100, cursor }),
      },
    );

    if (response.status === 404) {
      return null; // toplu arama bulunamadı veya sizin şirketinizde değil
    }
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${error.extensions?.code}: ${error.message}`);
    }

    const body = await response.json();
    calls.push(...body.data);
    cursor = body.pagination.next_cursor;
  } while (cursor);

  return calls;
}

const calls = await listAllBatchCalls("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f");
console.log(`${calls?.length ?? 0} çağrı`);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def list_all_batch_calls(batch_call_id):
    calls = []
    cursor = None

    while True:
        payload = {"limit": 100}
        if cursor:
            payload["cursor"] = cursor

        response = requests.post(
            f"https://api.vindy.ai/v1/calls/batches/{batch_call_id}/calls",
            headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
            json=payload,
        )

        if response.status_code == 404:
            return None  # toplu arama bulunamadı veya sizin şirketinizde değil
        if not response.ok:
            error = response.json()
            code = error.get("extensions", {}).get("code")
            raise RuntimeError(f"{code}: {error.get('message')}")

        body = response.json()
        calls.extend(body["data"])
        cursor = body["pagination"]["next_cursor"]
        if not cursor:
            break

    return calls

calls = list_all_batch_calls("842f1e9a-3b7c-4d21-9e08-1a2b3c4d5e6f")
print(f"{len(calls) if calls else 0} çağrı")
```

</TabItem>
</Tabs>

:::note İlgili
Bu endpoint, [`POST /v1/calls/bulk`](bulk-create-calls.md) ile oluşturulan bir toplu aramanın çağrıları arasında sayfalama yapar. Kuyruktaki çağrıları durdurmak için bkz. [Toplu Çağrıyı İptal Et](cancel-batch.md). Toplu aramanın tamamı bittiğinde haberdar olmak için bkz. [`batch-ended` webhook'u](webhooks.md#batch-ended).
:::
