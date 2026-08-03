---
title: Telefon Numaralarını Listele
sidebar_label: Telefon Numaralarını Listele
sidebar_position: 1.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/phone-numbers`

Şirketinize kayıtlı **arayan hatlarını** — giden bir toplu aramanın kendisinden yapılabileceği telefon numaralarını — döndürür. Birini seçip [`POST /v1/calls/bulk`](bulk-create-calls.md) ile çağrı başlatırken arayan olarak `phone_number_id` değerini gönderin.

Yalnızca **giden arama için kullanılabilir** (provisioned ve aramaya hazır) numaralar döner. Hesabınızda bulunan ama henüz provisioned olmamış bir numara burada görünmez.

---

## İstek

```http
GET https://api.vindy.ai/v1/phone-numbers
Authorization: Bearer <api-key>
```

Sorgu parametresi yoktur. Yanıt **sayfalanmaz** — kullanılabilir tüm arayan hatları tek çağrıda döner (en fazla 1000).

## Yanıt (200 OK)

```json
{
  "data": [
    {
      "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
      "phone_number": "+902323323389",
      "label": "3389"
    }
  ],
  "total": 1
}
```

## Yanıt alanları

**Üst düzey**

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Telefon numarası öğeleri. |
| `total` | int | `data` dizisinin uzunluğu. |

**Telefon numarası öğesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `phone_number_id` | string | Arayan hattın kalıcı, opak kimliği. [`POST /v1/calls/bulk`](bulk-create-calls.md) ile toplu giden çağrı başlatırken `phone_number_id` olarak gönderin. |
| `phone_number` | string | Hattın E.164 biçimi (örneğin `+902323323389`). |
| `label` | string \| null | Hat için okunabilir bir ad; ayarlanmamışsa `null`. |

## Hatalar

| Durum | Kod |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notlar

:::info Inbound ataması, outbound'u kısıtlamaz
Bir telefon numarası, bir asistana **gelen (inbound)** yönlendirme için atanmış olabilir (böylece o numaraya gelen çağrılar o asistana ulaşır). Bu atamanın **giden (outbound) aramaya hiçbir etkisi yoktur**: burada dönen **herhangi bir** numara, **herhangi bir** asistanınızla yapılan bir toplu aramada arayan olarak kullanılabilir. Arayan hattı ve asistanı birbirinden bağımsız seçin.
:::

- Yalnızca giden arama için kullanılabilir (provisioned ve hazır) numaralar döner. Beklediğiniz bir hat listede yoksa, henüz giden arama için provisioned edilmemiştir.
- `phone_number_id`, [`POST /v1/calls/bulk`](bulk-create-calls.md) isteğinin **zorunlu** `phone_number_id` alanında beklediği değerdir. Bilinmeyen veya şirketinize ait olmayan bir `phone_number_id`, orada `404 PHONE_NUMBER_NOT_FOUND` ile reddedilir; var olan ama giden arama için hazır olmayan bir hat ise `400 PHONE_NUMBER_NOT_USABLE` ile.
- `phone_number_id` değerini opak bir string olarak ele alın — ayrıştırmayın ve numarayı ondan türetmeyin; numarayı `phone_number` alanından okuyun.

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl https://api.vindy.ai/v1/phone-numbers \
  -H "Authorization: Bearer $VINDY_API_KEY"
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
const response = await fetch("https://api.vindy.ai/v1/phone-numbers", {
  headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` },
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(`${error.extensions?.code}: ${error.message}`);
}

const { data, total } = await response.json();
console.log(`${total} telefon numarası`);

for (const line of data) {
  console.log(`${line.phone_number_id}: ${line.phone_number} (${line.label ?? "etiket yok"})`);
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

response = requests.get(
    "https://api.vindy.ai/v1/phone-numbers",
    headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
)
if not response.ok:
    error = response.json()
    raise RuntimeError(f"{error.get('extensions', {}).get('code')}: {error.get('message')}")

body = response.json()
print(f"{body['total']} telefon numarası")

for line in body["data"]:
    print(f"{line['phone_number_id']}: {line['phone_number']} ({line['label'] or 'etiket yok'})")
```

</TabItem>
</Tabs>
