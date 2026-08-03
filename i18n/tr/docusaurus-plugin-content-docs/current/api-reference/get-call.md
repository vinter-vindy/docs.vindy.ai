---
title: Tek Bir Çağrıyı Getir
sidebar_label: Tek Bir Çağrıyı Getir
sidebar_position: 5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/calls/:callId`

Tek bir çağrıyı kalıcı `call_id` değeriyle döndürür. Yanıt, [`POST /v1/calls/list`](list-calls/index.md) içindeki bir çağrı nesnesiyle **birebir aynıdır** — transcript, yapısal veri, metadata ve (hazırsa) güncel bir ses kaydı bağlantısı dahil.

Elinizde bir `call_id` olduğunda — [Çağrıları Listele](list-calls/index.md), bir [webhook](webhooks.md) ya da kendi kayıtlarınızdan — çağrıyı talep anında çekmek için kullanın. Webhook'tan sonra tam nesne zaten elinizdedir; bu endpoint'i sonradan çağırmanın asıl nedeni, süresi dolmuş bir ses kaydı bağlantısını tazelemektir. Ses kaydı bağlantıları uzun ömürlüdür (~24 saat); yalnızca bir bağlantıyı bu pencerenin ötesinde kullanmaya çalıştığınızda süresi dolar.

:::info Görünürlük
**Sonlanmış** çağrılar — durum `completed` veya `failed` — aşağıdaki tam nesneyi döndürür. Ayrıca **kendi oluşturduğunuz bir giden çağrının** `call_id` değerini (bulk `calls[]` yanıtından) verdiğinizde, çağrıyı yaşam döngüsünün **herhangi** bir anında çekebilirsiniz: hâlâ kuyruktayken `call_status` değeri `pending`, `scheduled`, `in_progress` veya `cancelled` olan minimal bir nesne döner; konuşma ve ses kaydı alanları `null`'dır — bunlar çağrı sonlanmış bir duruma ulaştığında dolar. Hâlâ devam eden gelen çağrılar ve tarayıcı (WebRTC) çağrıları hiçbir zaman dönmez; bunlar `404` yanıtı verir.
:::

---

## İstek

```http
GET https://api.vindy.ai/v1/calls/sess_a1b2c3d4e5f6
Authorization: Bearer <api-key>
```

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `callId` | string | Çağrının kalıcı dize kimliği — [`POST /v1/calls/list`](list-calls/index.md) yanıtından, [`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `calls[]` dizisinden veya bir [webhook olayından](webhooks.md) alınır. |

## Yanıt (200 OK)

[`POST /v1/calls/list`](list-calls/index.md) yanıtındaki `data[]` öğesiyle aynı yapı:

```json
{
  "call_id": "sess_a1b2c3d4e5f6",
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
  "call_transcript": "[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy. Müşteri memnuniyeti anketimiz kapsamında size birkaç kısa soru sormak istiyorum — şu an uygun musunuz?\n[10:30:07] Müşteri: Evet, müsaitim.\n[10:30:11] Asistan: Teşekkürler. Öncelikle yaşınızı öğrenebilir miyim?\n[10:30:16] Müşteri: Otuz iki.",
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
    "expires_at": "2026-06-08T10:35:00+00:00"
  }
}
```

Kuyrukta bekleyen bir giden çağrı, tamamlanana kadar bu minimal yapıyı döndürür:

```json
{
  "call_id": "0f1e2d3c-4b5a-7c88-9d0e-1f2a3b4c5d6e",
  "call_status": "scheduled",
  "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "call_assistant_name": null,
  "call_phone_number": "+905551112233",
  "call_bound_type": "outbound",
  "call_started_at": null,
  "call_ended_at": null,
  "call_created_at": "2026-06-08T10:29:55+00:00",
  "call_duration_seconds": null,
  "call_end_reason": null,
  "call_transcript": null,
  "call_structured_data": null,
  "call_metadata": { "crm_contact_id": "CNT-90412" },
  "call_variables": { "first_name": "Batu" },
  "call_recording": { "available": false }
}
```

## Yanıt alanları

Çağrı nesnesi, bir [Çağrıları Listele](list-calls/index.md#yanıt-alanları) öğesiyle **aynı alanlara** sahiptir. Burada özellikle belirtilmesi gereken birkaç alan:

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string | Çağrının kalıcı dize kimliği — yolda gönderdiğiniz değerin aynısı. |
| `call_status` | string | Sonlanmış bir çağrı için `completed` veya `failed`. Hâlâ kuyrukta veya devam ederken çekilen bir giden çağrı için ise bu, kuyruk durumudur: `pending`, `scheduled`, `in_progress` veya `cancelled`. Fiziksel bir çağrı asla `cancelled` olmaz — iptal edilen kuyruktaki bir çağrı hiçbir zaman fiziksel bir çağrıya dönüşmez. |
| `call_metadata` | object \| null | [`POST /v1/calls/bulk`](bulk-create-calls.md) ile gönderdiğiniz metadata; aynen geri döner. Çağrı metadata ile oluşturulmadıysa `null` olur. |
| `call_variables` | obje \| null | Bu çağrı için gönderilen şablon değişkenleri, aynen geri döner — çağrıyı oluştururken `variables` olarak gönderdiğiniz obje. Gönderilmediyse (ör. inbound çağrılar) `null`. |

Diğer tüm alanlar — `call_transcript`, `call_structured_data`, `call_recording`, serbest biçimli `call_end_reason` string'i ve `call_recording.available: false` ne anlama geldiği — için tam [Çağrıları Listele alan referansına](list-calls/index.md#yanıt-alanları) bakabilirsiniz.

:::tip Güncel ses kaydı bağlantısı
Buradaki `call_recording.url`, **istek anında** üretilir ve yaklaşık **24 saat** geçerlidir (varsayılan 86400s, yapılandırılabilir). Bağlantıyı kalıcı olarak saklamayın — bir webhook payload'undaki ses kaydı bağlantısını ~24 saatten geç işlerseniz süresi dolar; o zaman güncelini almak için bu endpoint'i çağırın ve indirin.
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
  https://api.vindy.ai/v1/calls/sess_a1b2c3d4e5f6
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

const call = await getCall("sess_a1b2c3d4e5f6");
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

call = get_call("sess_a1b2c3d4e5f6")
if call:
    print(call["call_status"], call.get("call_metadata"))
```

</TabItem>
</Tabs>
