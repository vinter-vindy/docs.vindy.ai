---
title: Tek Bir Çağrıyı Getir
sidebar_label: Tek Bir Çağrıyı Getir
sidebar_position: 5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/calls/:callId`

Tek bir çağrıyı kalıcı `call_id` değeriyle döndürür. Yanıt, [`POST /v1/calls/list`](list-calls/index.md) içindeki bir çağrı nesnesiyle **birebir aynıdır** — transcript, yapısal veri, metadata ve (hazırsa) güncel bir ses kaydı bağlantısı dahil.

Elinizde bir `call_id` olduğunda — [Çağrıları Listele](list-calls/index.md), bir [webhook](webhooks.md) ya da kendi kayıtlarınızdan — çağrıyı talep anında çekmek için kullanın. Webhook'tan sonra tam nesne zaten elinizdedir; bu endpoint'i sonradan çağırmanın asıl nedeni, süresi dolmuş bir ses kaydı bağlantısını tazelemektir. Ses kaydı bağlantıları uzun ömürlüdür (~24 saat) ve her istekte taze üretilir; bu yüzden daha önce aldığınız bir bağlantı çoğu zaman hâlâ çalışır — ancak bir çağrıyı, o bağlantının üretilmesinden ~24 saatten fazla süre sonra çekiyorsanız, taze bir tane almak için buradan getirin.

:::info Görünürlük
**Sonlanmış** çağrılar — durum `completed` veya `failed` — aşağıdaki tam nesneyi döndürür. **Kendi oluşturduğunuz bir giden çağrıyı** — `call_id` değeri [`POST /v1/calls`](create-call.md) tarafından döndürülen ya da [bir toplu aramanın çağrılarını listeleyerek](get-batch-calls.md) elde edilen — yaşam döngüsünün **herhangi** bir anında çekebilirsiniz. Hâlâ kuyruktayken `call_status` değeri `pending`, `scheduled`, `in_progress` veya `cancelled` olan minimal bir nesne döner; konuşma ve ses kaydı alanları `null`'dır — bunlar çağrı sonlanmış bir duruma ulaştığında dolar. Hâlâ devam eden gelen çağrılar ve tarayıcı (WebRTC) çağrıları hiçbir zaman dönmez; bunlar `404` yanıtı verir.
:::

---

## İstek

```http
GET https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f
Authorization: Bearer <api-key>
```

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `callId` | string | Çağrının kalıcı dize kimliği — [`POST /v1/calls`](create-call.md) (tekil çağrı), [`POST /v1/calls/list`](list-calls/index.md), [bir toplu aramanın çağrılarını listeleme](get-batch-calls.md) veya bir [webhook olayından](webhooks.md) alınır. |

## Yanıt (200 OK)

[`POST /v1/calls/list`](list-calls/index.md) yanıtındaki `data[]` öğesiyle aynı yapı:

```json
{
  "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "call_status": "completed",
  "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "call_assistant_name": "Vindy - Asistan",
  "call_phone_number": "+905551112233",
  "call_bound_type": "outbound",
  "call_started_at": "2026-06-08T10:30:00+00:00",
  "call_ended_at": "2026-06-08T10:31:27+00:00",
  "call_created_at": "2026-06-08T10:29:55+00:00",
  "call_duration_seconds": 87,
  "call_end_reason": "completed",
  "call_transcript": "[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy; son siparişinizle ilgili arıyorum. Kısa bir memnuniyet anketi için birkaç dakikanız var mı?\n[10:30:07] Müşteri: Tabii, buyurun.\n[10:30:11] Asistan: Genel deneyiminizden memnuniyetinizi 1 ile 5 arasında nasıl puanlarsınız?\n[10:30:18] Müşteri: 4 diyebilirim.",
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
    "expires_at": "2026-06-09T10:31:27+00:00"
  }
}
```

Kuyrukta bekleyen bir giden çağrı, tamamlanana kadar bu minimal yapıyı döndürür:

```json
{
  "call_id": "0f1e2d3c-4b5a-7c88-9d0e-1f2a3b4c5d6e",
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "call_status": "scheduled",
  "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "call_assistant_name": "Vindy - Asistan",
  "call_phone_number": "+905551112233",
  "call_bound_type": "outbound",
  "call_started_at": null,
  "call_ended_at": null,
  "call_created_at": "2026-06-08T10:29:55+00:00",
  "call_duration_seconds": null,
  "call_end_reason": null,
  "call_transcript": null,
  "call_structured_data": null,
  "call_metadata": { "order_id": "ORD-4821" },
  "call_variables": { "first_name": "Elif" },
  "call_recording": { "available": false }
}
```

Kuyruktayken, hiç aranmadan iptal edilen bir çağrı ise `call_status: "cancelled"` ve `call_end_reason: "cancelled"` ile döner — yine konuşma veya ses kaydı yoktur:

```json
{
  "call_id": "6b1f0a9d-3c2e-7a45-8b1c-9d0e1f2a3b4c",
  "batch_call_id": null,
  "call_status": "cancelled",
  "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "call_assistant_name": "Vindy - Asistan",
  "call_phone_number": "+905551112233",
  "call_bound_type": "outbound",
  "call_started_at": null,
  "call_ended_at": null,
  "call_created_at": "2026-06-08T10:29:55+00:00",
  "call_duration_seconds": null,
  "call_end_reason": "cancelled",
  "call_transcript": null,
  "call_structured_data": null,
  "call_metadata": null,
  "call_variables": { "first_name": "Elif" },
  "call_recording": { "available": false }
}
```

:::note Asistan adı okuma anında çözümlenir
`call_assistant_name`, çağrıyı çektiğinizde çözümlenir; bu yüzden kuyruktaki veya iptal edilmiş çağrılarda bile bulunur. Yalnızca asistan artık çözümlenemediğinde (örneğin silinmişse) `null` döner.
:::

## Yanıt alanları

Çağrı nesnesi, bir [Çağrıları Listele](list-calls/index.md#yanıt-alanları) öğesiyle **aynı alanlara** sahiptir. Burada özellikle belirtilmesi gereken birkaç alan:

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string | Çağrının kalıcı dize kimliği — yolda gönderdiğiniz değerin aynısı. |
| `batch_call_id` | string \| null | Bu çağrının ait olduğu toplu arama — [`POST /v1/calls/bulk`](bulk-create-calls.md)'ın döndürdüğü `batch_call_id` ile aynı. Bir toplu aramanın çağrılarını gruplamak için kullanın (örn. `call-ended` webhook'larını işlerken). Çağrı bir toplu aramaya ait değilse `null`: [`POST /v1/calls`](create-call.md) ile açılan tekil çağrı veya herhangi bir inbound çağrı. |
| `call_status` | string | Sonlanmış bir çağrı için `completed` veya `failed`. Hâlâ kuyrukta veya devam ederken çekilen bir giden çağrı için ise bu, kuyruk durumudur: `pending`, `scheduled`, `in_progress` veya `cancelled`. Fiziksel bir çağrı asla `cancelled` olmaz — iptal edilen kuyruktaki bir çağrı hiçbir zaman fiziksel bir çağrıya dönüşmez. `call_status` `cancelled` olduğunda `call_end_reason` `"cancelled"` dizesidir; `pending`, `scheduled` veya `in_progress` için `null`'dır. |
| `call_metadata` | object \| null | [`POST /v1/calls/bulk`](bulk-create-calls.md) ile gönderdiğiniz metadata; aynen geri döner. Çağrı metadata ile oluşturulmadıysa `null` olur. |
| `call_variables` | object \| null | Bu çağrı için gönderilen şablon değişkenleri, aynen geri döner — çağrıyı oluştururken `variables` olarak gönderdiğiniz nesne. Gönderilmediyse (ör. inbound çağrılar) `null`. |

Tüm zaman damgası alanları — `call_started_at`, `call_ended_at`, `call_created_at` ve `call_recording.expires_at` — **UTC**'dir; ISO 8601 `+00:00` biçiminde (ör. `2026-06-08T10:30:00+00:00`). Gerçek bir ISO-8601 ayrıştırıcıyla çözümleyin, `Z` son eki varsaymayın. Bkz. [Yanıt Biçimi → Tarih ve saatler](../concepts/response-envelopes.md#timestamps).

Diğer tüm alanlar — `call_transcript`, `call_structured_data`, `call_recording`, serbest biçimli `call_end_reason` dizesi — ve `call_recording.available: false`'ın ne anlama geldiği için tam [Çağrıları Listele alan referansına](list-calls/index.md#yanıt-alanları) bakın.

:::tip Güncel ses kaydı bağlantısı
Buradaki `call_recording.url`, istek anında taze üretilir ve ~24 saat geçerlidir — saklamayın; gerektiğinde [`GET /v1/calls/:callId/recording-url`](get-recording-url.md) ile yeniden üretin.
:::

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Kimlik doğrulama hataları. |
| `404` | `RESOURCE_NOT_FOUND` | Çağrı bulunamadı, hâlâ devam eden bir gelen çağrı, bir tarayıcı (WebRTC) çağrısı veya başka bir şirkete ait. (Kendi oluşturduğunuz bir giden çağrı, kuyruktayken bile `200` döner — yukarıdaki Görünürlük'e bakın.) |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::note Varlık bilgisi sızdırılmaz
Başka bir şirkete ait bir `call_id`, var olmayan bir kimlikle aynı `404 RESOURCE_NOT_FOUND` yanıtını döndürür — bkz. [Çoklu kiracılık](../concepts/multi-tenancy.md).
:::

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -H "Authorization: Bearer $VINDY_API_KEY" \
  https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function getCall(callId) {
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/${callId}`,
    { headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` } },
  );

  if (response.status === 404) {
    return null; // bulunamadı, henüz sonlanmadı, WebRTC veya sizin şirketinizde değil
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  return response.json();
}

const call = await getCall("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f");
console.log(call?.call_status, call?.call_metadata);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def get_call(call_id):
    response = requests.get(
        f"https://api.vindy.ai/v1/calls/{call_id}",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )

    if response.status_code == 404:
        return None  # bulunamadı, henüz sonlanmadı, WebRTC veya sizin şirketinizde değil
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")
    return response.json()

call = get_call("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f")
if call:
    print(call["call_status"], call.get("call_metadata"))
```

</TabItem>
</Tabs>
