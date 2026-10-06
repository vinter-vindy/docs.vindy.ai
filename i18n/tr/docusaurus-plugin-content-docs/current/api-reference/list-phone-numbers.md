---
title: Telefon Numaralarını Listele
sidebar_label: Telefon Numaralarını Listele
sidebar_position: 1.5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/phone-numbers`

Bu uç, şirketinize kayıtlı olan ve giden aramalarda kullanabileceğiniz telefon numaralarını döndürür. Her biri, Vindy sizin adınıza birini aradığında karşı tarafın telefonunda görünen numaradır; dokümanın genelinde bu numaralara **arayan numara** diyoruz.

Tekil ([`POST /v1/calls`](create-call.md)) ya da toplu ([`POST /v1/calls/bulk`](bulk-create-calls.md)) bir giden arama başlatırken, bu listeden bir numara seçer ve onun `phone_number_id` değerini göndererek o aramanın arayan numarasını belirlersiniz.

Listede yalnızca **giden aramaya hazır** numaralar yer alır. Şirketinizde kayıtlı olsa bile henüz giden aramaya hazırlanmamış bir numara burada görünmez.

---

## İstek

```http
GET https://api.vindy.ai/v1/phone-numbers
Authorization: Bearer <api-key>
```

Bu uç hiçbir sorgu parametresi almaz ve yanıt **sayfalanmaz**; kullanılabilir tüm arayan numaraları, en fazla 1000 tanesini tek çağrıda döndürür.

## Yanıt (200 OK)

```json
{
  "data": [
    {
      "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
      "phone_number": "+902323323389"
    },
    {
      "phone_number_id": "d7c4a1b2-9e3f-4a5b-8c6d-0e1f2a3b4c5d",
      "phone_number": "+902123320000"
    }
  ],
  "total": 2
}
```

## Yanıt alanları

**Üst düzey**

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Şirketinizin arayan numaralarını, numara başına bir nesne olarak listeler. |
| `total` | int | `data` dizisinde kaç öğe bulunduğunu belirtir. |

**Telefon numarası öğesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `phone_number_id` | string | Arayan numaranın kalıcı kimliğidir (içeriğini çözmeyin; anlamı olmayan opak bir değerdir). Tekil ([`POST /v1/calls`](create-call.md)) ya da toplu ([`POST /v1/calls/bulk`](bulk-create-calls.md)) bir giden çağrı başlatırken `phone_number_id` olarak gönderirsiniz. |
| `phone_number` | string | Numaranın kendisidir; uluslararası E.164 biçiminde döner (örneğin `+902323323389`) ve aranan kişinin telefonunda görünecek numara budur. |

## Hatalar

| Durum | Kod |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notlar

:::info Gelen (inbound) atama, giden (outbound) aramayı kısıtlamaz
Bir numara, bir asistana **gelen (inbound) çağrılar** için atanmış olabilir; böyle bir atamada o numarayı arayanlar o asistana bağlanır. Ancak bu atama, **giden (outbound) aramaları etkilemez.** Bu listedeki **herhangi bir** numarayı, **herhangi bir** asistanla yaptığınız giden aramada (tekil ya da toplu) arayan numara olarak kullanabilirsiniz. Kısacası arayan numara ile asistanı birbirinden bağımsız seçersiniz.
:::

- Numaralar en yeniden en eskiye sıralanır.
- Listede yalnızca giden aramaya hazır numaralar yer alır. Beklediğiniz bir numara listede yoksa, henüz giden aramaya hazır hâle getirilmemiştir.
- `phone_number_id`, hem [`POST /v1/calls`](create-call.md) hem de [`POST /v1/calls/bulk`](bulk-create-calls.md) isteğinin **zorunlu** `phone_number_id` alanında beklediği değerdir. Bilinmeyen ya da şirketinize ait olmayan bir `phone_number_id` orada `404 PHONE_NUMBER_NOT_FOUND` ile reddedilir; var olan ama giden aramaya hazır olmayan bir numara ise `400 PHONE_NUMBER_NOT_USABLE` ile geri çevrilir.

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
  console.log(`${line.phone_number_id}: ${line.phone_number}`);
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
    print(f"{line['phone_number_id']}: {line['phone_number']}")
```

</TabItem>
</Tabs>
