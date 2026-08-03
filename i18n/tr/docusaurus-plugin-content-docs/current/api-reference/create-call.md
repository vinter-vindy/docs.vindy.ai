---
title: Çağrı Oluştur
sidebar_label: Çağrı Oluştur
sidebar_position: 5.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls`

**Tek** bir giden çağrı başlatır. [`POST /v1/calls/bulk`](bulk-create-calls.md)'ın aksine **toplu arama (kampanya) oluşturmaz** — `batch_call_id` dönmez. Tekil çağrılar için bunu; aynı anda çok çağrı için bulk'u kullanın.

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
  "assistant_id": "8f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b",
  "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  "phone_number": "05551112233",
  "variables": { "first_name": "Ahmet", "appointment_time": "14:30" },
  "metadata": { "crm_contact_id": "CNT-90412" },
  "scheduled_at": "2026-08-01T09:00:00Z"
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `assistant_id` | string (UUID) | **Zorunlu.** Çağrıyı yürütecek asistan. [`GET /v1/assistants`](list-assistants.md)'ten. |
| `phone_number_id` | string (UUID) | **Zorunlu.** Çağrının yapılacağı arayan (caller) hat. [`GET /v1/phone-numbers`](list-phone-numbers.md)'in döndürdüğü (organizasyonunuza ait, outbound'a hazır) hatlardan biri olmalı. |
| `phone_number` | string | **Zorunlu.** Aranacak numara — E.164 (`+90…`) veya TR yerel (`05…`), `+90…`'a normalize edilir. |
| `variables` | object \| null | Opsiyonel **şablon değişkenleri**. Asistanın prompt ve greeting'indeki `{{yer_tutucu}}` ifadelerini bu çağrı için doldurur — `ad → değer` JSON objesi (çok anahtar olabilir). `metadata`'dan farklı olarak (echo-back, çağrıyı etkilemez), **variables asistanın söylediğini değiştirir**. Değerler string/number/boolean olabilir (string'e çevrilir); ≤50 anahtar, anahtar ≤40, değer ≤500, iç içe yok. Bir asistanın beklediği adlar [`GET /v1/assistants`](list-assistants.md) → `assistant_variables`'ta listelenir. |
| `metadata` | object \| null | Opsiyonel opak obje; çağrıda aynen geri döner (≤50 anahtar; anahtar ≤40, değer ≤500; string/number/boolean; iç içe yok). Çağrıyı **etkilemez**. |
| `scheduled_at` | ISO 8601 \| null | Opsiyonel ileri tarih. Boşsa kapasite oldukça dağıtılır. |

## Yanıt (201 Created)

```json
{
  "call_id": "019fb38d-2620-7882-8530-1266cedfcfc8",
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

`PHONE_NUMBER_NOT_FOUND`: `phone_number_id` bilinmiyor, bozuk ya da organizasyonunuzda değil; `PHONE_NUMBER_NOT_USABLE`: hat var ama outbound'a hazır değil.

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b",
    "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    "phone_number": "05551112233"
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
    assistant_id: "8f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b",
    phone_number_id: "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    phone_number: "05551112233",
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
        "assistant_id": "8f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b",
        "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
        "phone_number": "05551112233",
    },
)
print(res.json()["call_id"])
```

</TabItem>
</Tabs>
