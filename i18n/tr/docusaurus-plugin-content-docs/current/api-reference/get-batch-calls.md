---
title: Toplu Aramanın Çağrılarını Listele
sidebar_label: Toplu Aramanın Çağrıları
sidebar_position: 8
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/batches/:batchId/calls`

Tek bir toplu aramaya ([`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `batch_call_id`) ait çağrıları cursor tabanlı sayfalama ile döndürür. Her çağrı nesnesi, [`POST /v1/calls/list`](list-calls/index.md) içindeki bir öğeyle **aynı yapıdadır**.

Bu endpoint, toplu aramadaki **her çağrıyı** (yalnızca bitenleri değil) hangi aşamada olursa olsun döndürür; böylece bu endpoint'i yoklayarak (poll) bir toplu aramanın tamamlanmaya doğru ilerleyişini izleyebilirsiniz.

Çağrıları Listele gibi bu da küçük bir JSON gövdesiyle yapılan bir `POST` isteğidir: cursor opak olduğundan query string yerine gövdede taşınır. Çağrıları Listele'den farklı olarak **tarih filtresi almaz**; tek bir toplu aramayla sınırlıdır ve kendi cursor'una sahiptir. Çağrılar tamamlandıkça sonuçları sayfalamak ya da toplu arama bittikten sonra tüm kümeyi çekmek için bu endpoint'i kullanırsınız.

:::info Çağrıları Listele'den daha geniş görünürlük
[`POST /v1/calls/list`](list-calls/index.md) yalnızca **sonlanmış** çağrıları (`completed` veya `failed`) döndürürken, bu endpoint toplu aramadaki **her çağrıyı, hangi aşamada olursa olsun** döndürür. Kuyruktaki ve devam eden çağrılar kuyruk `call_status`'üyle (`pending`, `scheduled`, `in_progress` ya da `cancelled`) ve `null` konuşma/kayıt/zaman alanlarıyla; sonlanmış çağrılar ise tam nesneyle döner. Sonuçlar **en yeniden başlayarak** (oluşturulma zamanına göre) sıralanır. Bir toplu aramayı tamamlanana kadar yoklayabilmenizi (poll) sağlayan da budur.
:::

---

## İstek

```http
POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/calls
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "status": "completed",
  "limit": 100,
  "cursor": null
}
```

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `batchId` | string | Toplu aramanın kimliğidir; [`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `batch_call_id` değeridir. |

## Gövde parametreleri

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|---|
| `limit` | int | hayır | `200` | Bu sayfada kaç çağrı alacağınızı belirlersiniz (1–500). Varsayılanı (200) kullanmak için alanı atlar ya da `null` gönderirsiniz. |
| `cursor` | string | hayır | — | Bir önceki sayfadan dönen opak `next_cursor` değerini, sonraki sayfayı almak için buraya geri gönderirsiniz. İlk istekte göndermezsiniz. |
| `status` | string | hayır | — | Sayfayı yalnızca belirli bir `call_status`'e sahip çağrılarla daraltmak için bunu gönderirsiniz. Bu endpoint bir toplu aramanın çağrılarını **her** aşamada döndürdüğü için altı değerin hepsi geçerlidir: `completed`, `failed`, `cancelled`, `pending`, `scheduled`, `in_progress`. Filtre, çağrının görüntülenen `call_status`'üne göre çalışır. Aranıp da başarısız olan bir çağrı, kuyruktan çıkmış olsa bile `completed` değil `failed`'dir. Filtre uygulanmasını istemezseniz alanı atlarsınız. Geçersiz değer → `400 VALIDATION_FAILED`. |

Gövde opsiyoneldir; ilk sayfayı varsayılan limitle almak için `{}` (ya da hiçbir şey) gönderebilirsiniz.

:::note Status'e göre filtreleme
`status` sayfayı tek bir `call_status`'e daraltır; cursor buna bağlanır, bu yüzden sayfalarken `status`'ü değiştirmeyin (her filtre gibi onu değiştirmek de yeni bir gezinme gerektirir; aşağıdaki cursor notuna bakın). Her status için kaç öğe bekleyeceğinizi [toplu arama özetindeki](get-batch.md) `counts` söyler.

Her `call_status` değeri şu anlama gelir:

- `completed` — çağrı bağlandı ve başarıyla tamamlandı.
- `failed` — çağrı yapıldı ama başarılı olmadı (cevap yok, meşgul, reddedildi veya hata).
- `cancelled` — çağrı, aranmadan önce kuyruktan iptal edildi.
- `pending` — kuyrukta, aranma sırasını bekliyor.
- `scheduled` — gelecekteki bir `scheduled_at` zamanı için kuyrukta, henüz zamanı gelmedi.
- `in_progress` — şu anda aranıyor ya da görüşme sürüyor.
:::

## Yanıt (200 OK)

```json
{
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "status": "completed",
  "calling_window": { "timezone": "Europe/Istanbul", "start": "09:00", "end": "18:00", "days": [1, 2, 3, 4, 5] },
  "data": [
    {
      "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
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
        "arama_sonucu": "tamamlandi",
        "genel_memnuniyet_puani": 4,
        "geri_arama_talebi": false,
        "ilgilenilen_urunler": null
      },
      "call_metadata": { "order_id": "ORD-4821" },
      "call_variables": { "first_name": "Elif" },
      "call_recording": {
        "available": true,
        "url": "https://...?X-Amz-...",
        "expires_at": "2026-06-10T23:41:37+00:00"
      }
    },
    {
      "call_id": "01a0c8d0-5f2b-7a41-bc03-1e2d3c4b5a69",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "failed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905553334455",
      "call_bound_type": "outbound",
      "call_started_at": "2026-06-09T23:40:10+00:00",
      "call_ended_at": "2026-06-09T23:40:16+00:00",
      "call_created_at": "2026-06-09T23:39:20+00:00",
      "call_duration_seconds": 0,
      "call_end_reason": "User Busy",
      "call_transcript": null,
      "call_structured_data": null,
      "call_metadata": { "order_id": "ORD-4822" },
      "call_variables": { "first_name": "Deniz" },
      "call_recording": { "available": false }
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
| `batch_call_id` | string | Sorguladığınız toplu aramayı tanımlar; yolda gönderdiğiniz `batchId` değeridir. |
| `status` | string | Toplu aramanın güncel durumudur: `active`, `completed` ya da `cancelled` değerlerinden biridir. |
| `calling_window` | object | Bu toplu aramaya uygulanan arama penceresidir. Arama pencereleri özelliğinden önce oluşturulmuş toplu aramalarda veya sayfada hiç çağrı olmadığında `null` döner. |
| `data` | array | Bu sayfadaki çağrı nesneleridir; bir [Çağrıları Listele](list-calls/index.md#yanıt-alanları) öğesiyle **aynı yapıdadır**. |
| `pagination` | object | Standart [sayfalama nesnesidir](list-calls/filtering-pagination.md#paginated); üyeleri aşağıda listelenir. |

**`pagination`**

| Alan | Tür | Açıklama |
|---|---|---|
| `next_cursor` | string \| null | Sonraki sayfanın opak cursor'ını taşır. `has_more` `false` olduğunda `null` olur. |
| `has_more` | boolean | Bu sayfadan sonra başka sayfa kalıp kalmadığını belirtir. |
| `limit` | int | Bu yanıta uygulanan sayfa boyutunu verir. |

**Çağrı nesnesi**

`data` içindeki her öğe, bir [Çağrıları Listele](list-calls/index.md#yanıt-alanları) öğesiyle **aynı alanlara** sahiptir: `call_id` (bir dize), `call_status` (sonlanmış çağrılar için `completed` veya `failed`, henüz bitmemiş çağrılar için `pending`/`scheduled`/`in_progress`/`cancelled` gibi bir kuyruk durumu), `call_transcript`, `call_structured_data`, `call_metadata`, `call_recording`, serbest biçimli `call_end_reason` dizesi ve diğerleri. Kuyruktaki ve devam eden çağrılar sonlanana dek konuşma/kayıt/zaman alanları için `null` taşır. Bu alanları burada yeniden okumak yerine tam [Çağrıları Listele alan referansına](list-calls/index.md#yanıt-alanları) bakabilirsiniz.

:::note Cursor opaktır — aynı `batchId` ile sayfalayın
`cursor` opaktır; onu oluşturmayın veya değiştirmeyin. Sonraki sayfayı almak için **aynı `batchId` ile** gövdede `cursor` olarak geri gönderin. `has_more` `false` olduğunda durun (o noktada `next_cursor` `null` olur). Bu cursor bu endpoint'e, bu toplu aramaya **ve** kullandığınız `status` filtresine özeldir. [`POST /v1/calls/list`](list-calls/index.md) cursor'ını, başka bir toplu aramanın cursor'ını ya da `status` filtresini değiştirdikten sonra eski cursor'ı burada kullanırsanız `400 MALFORMED_CURSOR` ile reddedilir; bunun yerine yeni bir gezinme başlatırsınız.
:::

:::note Burada tarih filtresi yok
Bu endpoint `date_from` / `date_to` almaz; tek bir toplu aramayla sınırlıdır. Tarih aralığı filtreleme yalnızca [`POST /v1/calls/list`](list-calls/index.md) endpoint'inde bulunur. Bkz. [Filtreleme ve Sayfalama](list-calls/filtering-pagination.md).
:::

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` 1–500 aralığının dışında ya da bir gövde alanı geçersiz tipte. Bilinmeyen/fazla alanlar **yok sayılır**, reddedilmez. |
| `400` | `INVALID_CURSOR` | Cursor boş veya çözümlenemiyor. |
| `400` | `MALFORMED_CURSOR` | Cursor çözümlenemiyor ya da farklı bir endpoint, toplu arama veya `status` filtresi için üretilmiş. |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | İsteğin kimlik doğrulaması başarısız oldu. |
| `404` | `RESOURCE_NOT_FOUND` | Toplu arama bulunamadı ya da başka bir şirkete aittir. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::note Varlık bilgisi sızdırılmaz
Başka bir şirkete ait bir `batchId`, var olmayan bir kimlikle aynı `404 RESOURCE_NOT_FOUND` yanıtını döndürür; bu, [`GET /v1/calls/:callId`](get-call.md) ile aynı kuraldır. Bkz. [Çoklu kiracılık](../concepts/multi-tenancy.md).
:::

:::tip Toplu aramanın tamamının ne zaman bittiğini öğrenmek
Toplu arama **kendi kendine bittiğinde** `status` alanı `completed` olur; tüm çağrılar sonlanmış bir duruma ulaşmıştır. Durum bazında döküm için [`batch-ended` webhook'unu](webhooks.md#batch-ended) kullanın veya buradaki `status` alanını `completed` olana kadar sorgulayın.

Toplu aramayı [iptal ederseniz](cancel-batch.md) `status` hemen `cancelled` olur (hâlihazırda devam eden çağrılar tamamlanana kadar sürer). Toplu aramayı iptal etmek, durdurulan her kuyruk çağrısı için birer [`call-ended` webhook'u](webhooks.md#call-ended) (her biri `call_status: "cancelled"`, `call_metadata`'nız aynen geri dönmüş olarak) artı en sonda gelen `status: "cancelled"` taşıyan tek bir [`batch-ended` webhook'u](webhooks.md#batch-ended) üretir. İptal edilen her çağrıyı burada da görebilirsiniz (`status: "cancelled"` ile filtreleyin) ya da özetteki `counts.cancelled` değerini okuyabilirsiniz.
:::

## Örnekler

### Tek sayfa çekme

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/calls \
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

const page = await getBatchCalls("84213f7a-58cc-4372-a567-0e02b2c3d479");
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

page = get_batch_calls("84213f7a-58cc-4372-a567-0e02b2c3d479")
if page:
    print(page["status"], len(page["data"]))
```

</TabItem>
</Tabs>

### Tüm sayfaları gezme

`next_cursor` değerini (aynı `batchId` ile) `cursor` olarak geri gönderin; `has_more` `false` olana kadar devam edin.

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# İlk istek (cursor yok)
curl -X POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# Yanıt: { "status": "...", "data": [100 çağrı], "pagination": { "next_cursor": "X", "has_more": true } }

# Sonraki istek (next_cursor kullanın)
curl -X POST https://api.vindy.ai/v1/calls/batches/84213f7a-58cc-4372-a567-0e02b2c3d479/calls \
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

const calls = await listAllBatchCalls("84213f7a-58cc-4372-a567-0e02b2c3d479");
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

calls = list_all_batch_calls("84213f7a-58cc-4372-a567-0e02b2c3d479")
print(f"{len(calls) if calls else 0} çağrı")
```

</TabItem>
</Tabs>

:::note İlgili
Bu endpoint, [`POST /v1/calls/bulk`](bulk-create-calls.md) ile oluşturulan bir toplu aramanın çağrıları arasında sayfalama yapar. Kuyruktaki çağrıları durdurmak için bkz. [Toplu Aramayı İptal Et](cancel-batch.md). Toplu aramanın tamamı bittiğinde haberdar olmak için bkz. [`batch-ended` webhook'u](webhooks.md#batch-ended).
:::
