---
title: Çağrı Oluştur
sidebar_label: Çağrı Oluştur
sidebar_position: 5.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls`

**Tek** bir giden çağrı başlatır. [`POST /v1/calls/bulk`](bulk-create-calls.md)'ın aksine **toplu arama oluşturmaz** — `batch_call_id` dönmez. Tekil çağrılar için bunu; aynı anda çok çağrı için bulk'u kullanın.

Çağrı kuyruğa alınır ve asenkron dağıtılır (istekte senkron arama yapılmaz).

---

## İstek

```http
POST https://api.vindy.ai/v1/calls
Authorization: Bearer <api-key>
Content-Type: application/json
```

```json
{
  "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  "phone_number": "+905551112233",
  "variables": { "first_name": "Elif", "appointment_time": "14:30" },
  "metadata": { "order_id": "ORD-4821" },
  "scheduled_at": "2026-06-10T09:00:00+03:00"
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `assistant_id` | string (UUID) | **Zorunlu.** Çağrıyı yürütecek asistan. [`GET /v1/assistants`](list-assistants.md)'ten. |
| `phone_number_id` | string (UUID) | **Zorunlu.** Çağrının yapılacağı arayan (caller) hat. [`GET /v1/phone-numbers`](list-phone-numbers.md)'in döndürdüğü (şirketinize ait, outbound'a hazır) hatlardan biri olmalı. |
| `phone_number` | string | **Zorunlu.** Aranacak numara, tam uluslararası **E.164** biçiminde (ör. `+905551112233`). Bkz. aşağıdaki [Telefon numaraları](#phone-numbers). |
| `variables` | object \| null | Opsiyonel **şablon değişkenleri**. Asistanın prompt ve karşılama (greeting) metnindeki `{{yer_tutucu}}` ifadelerini bu çağrı için doldurur — `ad → değer` JSON objesi (çok anahtar olabilir). `metadata`'dan farklı olarak (olduğu gibi geri döndürülür, çağrıyı etkilemez), **variables asistanın söylediğini değiştirir**. Değerler string/number/boolean olabilir (string'e çevrilir); ≤50 anahtar, anahtar ≤40, değer ≤500, iç içe yok. Bir asistanın beklediği adlar [`GET /v1/assistants`](list-assistants.md) yanıtındaki `assistant_variables` alanında listelenir. |
| `metadata` | object \| null | Opsiyonel opak obje; çağrıda aynen geri döner. Değerler `string`/`number`/`boolean`/`null` **artı iç içe nesne ve dizi** olabilir (nesne başına ≤50 anahtar; anahtar ≤40, string değer ≤500; en fazla iç içe derinlik 5; ≤200 toplam giriş; ≤32 KB serileştirilmiş). Çağrıyı **etkilemez**. |
| `scheduled_at` | ISO 8601 datetime \| null | Opsiyonel ileri tarih. Boşsa kapasite oldukça dağıtılır. **Timezone offset'li** bir ISO 8601 tarih-saat gönderin — bkz. [Zamanlama](#scheduled-at). |

### Telefon numaraları {#phone-numbers}

Numarayı tam uluslararası **E.164** biçiminde verin: baştan `+`, sonra ülke kodu, sonra numara (ör. `+905551112233`). Yaygın ayraçlar — boşluk, tire ve parantez — tolere edilip temizlenir; bu nedenle `+90 555 111 22 33` da kabul edilir.

**Hiçbir ülkeye özel normalizasyon yoktur** — baştan `+` olmayan numara **`400 INVALID_PHONE_NUMBER`** ile reddedilir. Numarayı tam E.164 (`+` + ülke kodu + numara) verin; normalize edilmiş biçimde saklanır ve aranır, yanıtta `phone_number` olarak döner.

### `scheduled_at` ile zamanlama {#scheduled-at}

Varsayılan olarak çağrı hemen kuyruğa alınır. İleri bir zamana ertelemek için `scheduled_at`'i **timezone offset içeren bir ISO 8601 / RFC 3339 tarih-saat** olarak gönderin:

| Biçim | Örnek | Ne zaman tetiklenir |
|---|---|---|
| Sayısal offset (önerilen) | `2026-06-10T09:00:00+03:00` | İstanbul'da 09:00 (UTC+3) |
| UTC (`Z`) | `2026-06-10T06:00:00Z` | 06:00 UTC = 09:00 İstanbul |

**Offset'i her zaman ekleyin.** Offset'siz (naive) bir değer (ör. `2026-06-10T09:00:00`) yerel saat değil **UTC** kabul edilir — yani tahmin ettiğinizden 3 saat sonra, İstanbul'da 12:00'de tetiklenir. İstanbul'da 09:00 için `2026-06-10T09:00:00+03:00` gönderin.

- Zamanlar **UTC** olarak saklanır ve karşılaştırılır; API'nin diğer yerlerindeki zaman damgaları UTC (`+00:00`) döner.
- **Gelecek-zaman doğrulaması yok:** geçmiş bir zaman, çağrıyı bir sonraki dağıtım döngüsünde (≈hemen) başlatılmak üzere kuyruğa alır. Hemen aramak için `scheduled_at`'i hiç göndermeyin.
- Geçerli bir ISO 8601 tarih-saat olmayan değer (ör. `10.06.2026`, `now`) **`400 VALIDATION_FAILED`** ile reddedilir.

## Yanıt (201 Created)

```json
{
  "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
  "phone_number": "+905551112233"
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string (UUID) | Bu çağrının kalıcı kimliği. [`GET /v1/calls/:callId`](get-call.md) ile sorgulayın, (kuyruktayken) [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile iptal edin. |
| `phone_number` | string | Aranacak normalize E.164 numara. |

## Hatalar

| Durum | Kod |
|---|---|
| `400` | `VALIDATION_FAILED` (zorunlu alan eksik), `INVALID_PHONE_NUMBER`, `INVALID_VARIABLES`, `INVALID_METADATA`, `PHONE_NUMBER_NOT_USABLE` |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `404` | `ASSISTANT_NOT_FOUND`, `PHONE_NUMBER_NOT_FOUND` |
| `429` | `RATE_LIMITED` |

`PHONE_NUMBER_NOT_FOUND`: `phone_number_id` bilinmiyor, bozuk ya da şirketinizde değil; `PHONE_NUMBER_NOT_USABLE`: hat var ama outbound'a hazır değil.

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    "phone_number": "+905551112233"
  }'
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
const res = await fetch("https://api.vindy.ai/v1/calls", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    assistant_id: "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    phone_number_id: "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    phone_number: "+905551112233",
  }),
});
const { call_id } = await res.json();
console.log(call_id);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os, requests

res = requests.post(
    "https://api.vindy.ai/v1/calls",
    headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    json={
        "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
        "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
        "phone_number": "+905551112233",
    },
)
print(res.json()["call_id"])
```

</TabItem>
</Tabs>
