---
title: Toplu Çağrı Oluştur
sidebar_label: Toplu Çağrı Oluştur
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/bulk`

Verdiğiniz telefon numaralarına, bir asistan kullanarak giden çağrı oluşturur (tek istekte 1–200 numara).

Her çağrıya isteğe bağlı bir `metadata` nesnesi ekleyebilirsiniz: Vindy bu veriyi işlemez ve [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md) ile [webhook olaylarındaki](webhooks.md) her çağrı nesnesinde **olduğu gibi geri döndürür**. Böylece bir çağrıyı kendi sisteminizdeki bir kayıtla (CRM kişisi, sipariş, destek kaydı) ilişkilendirebilirsiniz. Ayrıntılar ve limitler için bkz. [Metadata](#metadata).

Her çağrı ayrıca `variables` de taşıyabilir — asistanın prompt'undaki ve karşılama (greeting) metnindeki `{{yer_tutucu}}` ifadelerini dolduran **şablon değerleri** (örneğin kişinin adı). `metadata`'nın aksine, variables **asistanın söylediğini değiştirir**. Bunları çağrı başına ve/veya her çağrı için ortak olan değerler için istek düzeyinde bir kez verin. Bkz. [Değişkenler](#variables).

Çağrıların yapılacağı **arayan hattı** `phone_number_id` ile siz seçersiniz — [`GET /v1/phone-numbers`](list-phone-numbers.md) yanıtındaki numaralardan biri.

---

## İstek

```http
POST https://api.vindy.ai/v1/calls/bulk
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  "variables": { "company": "Vindy" },
  "calls": [
    { "phone_number": "+905551112233", "variables": { "first_name": "Ahmet" }, "metadata": { "crm_contact_id": "CNT-90412" } },
    { "phone_number": "05554445566", "variables": { "first_name": "Ayşe" }, "metadata": { "crm_contact_id": "CNT-90413" } }
  ]
}
```

## Gövde parametreleri

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| `assistant_id` | string (UUID) | evet | Çağrıları yapacak asistan. [`GET /v1/assistants`](list-assistants.md) yanıtından alınır. |
| `phone_number_id` | string | evet | Çağrıların yapılacağı **arayan hattı** (giden arayan/CLI). [`GET /v1/phone-numbers`](list-phone-numbers.md) yanıtındaki numaralardan biri olmalı — yani şirketinize ait ve giden arama için provisioned. Kullanılabilir herhangi bir numara, herhangi bir asistanla çalışır; bir inbound ataması bunu kısıtlamaz. |
| `variables` | object | hayır | **Ortak** şablon değişkenleri; **her** çağrıya taban olarak uygulanır — asistanın `{{yer_tutucu}}` ifadelerine yerleştirilir. Her `calls[].variables` bunları çağrı başına ezer. Bkz. [Değişkenler](#variables). |
| `calls` | array | evet | Aranacak hedefler (1–200). |
| `calls[].phone_number` | string | evet | Aranacak numara. Bkz. aşağıdaki [Telefon numaraları](#phone-numbers). |
| `calls[].variables` | object | hayır | Bu numaraya özel **çağrı-başı** şablon değişkenleri (örneğin `{ "first_name": "Ahmet" }`). İstek düzeyindeki `variables` üzerine birleştirilir (çağrı-başı değer kazanır). Bkz. [Değişkenler](#variables). |
| `calls[].metadata` | object | hayır | İsteğe bağlı anahtar-değer nesnesi (bkz. [Metadata](#metadata) limitleri). Aynen geri döner. |
| `scheduled_at` | ISO 8601 datetime | hayır | Verilirse, toplu arama hemen değil bu **ileri** zamanda başlatılmak üzere kuyruğa alınır. Offset ekleyin, örneğin `2026-06-10T09:00:00+03:00`. |

### Telefon numaraları {#phone-numbers}

Numaralar aranmadan önce E.164 biçimine normalize edilir. Yaygın ayraçlar — boşluk, tire ve parantez — tolere edilip temizlenir; bu nedenle `+90 555 111 22 33` ve `0555-111-2233` gibi numaralar da kabul edilir.

| Gönderdiğiniz | Normalize edilir |
|---|---|
| `+905551112233` | `+905551112233` |
| `905551112233` | `+905551112233` |
| `05551112233` | `+905551112233` |
| `5551112233` | `+905551112233` |
| `00905551112233` | `+905551112233` |
| `+441632960000` | `+441632960000` |

Türkiye biçimleri — baştaki `0`, `90`/`0090` ülke öneki veya 10 haneli düz bir numara — `+90…` biçimine normalize edilir. `+` ile uluslararası biçimde (8–15 hane) yazılmış bir numara **olduğu gibi** korunur. Normalize edilemeyen her şey **`400 INVALID_PHONE_NUMBER`** ile reddedilir ve hatalı dizi konumu `extensions.index` içinde döner.

Kabul edilen numaralar normalize edilmiş biçimde saklanır ve aranır; bu değeri daha sonra liste, tekil çağrı ve webhook yanıtlarında `call_phone_number` olarak görürsünüz.

### Metadata {#metadata}

`metadata`, tamamen **size ait** olan serbest biçimli bir anahtar-değer nesnesidir. Vindy onu opak bir veri olarak ele alır: içeriğini **asla okumaz, ayrıştırmaz, doğrulamaz veya ona göre bir işlem yapmaz** ve bir çağrının nasıl başlatıldığına, yönlendirildiğine veya işlendiğine **hiçbir etkisi yoktur**. Onu yalnızca saklar ve o çağrının her görünümünde size olduğu gibi geri döndürürüz — [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md) ve [webhook olaylarında](webhooks.md).

Tek görevi **sizin tarafınızda eşleştirmedir**. Bir çağrıyı kendi verinizle ilişkilendirmek için sistemlerinizin ihtiyaç duyduğu kimlikleri ekleyin — bir CRM kişi kimliği, sipariş numarası, kampanya etiketi, kendi istek kimliğiniz vb. Sonuç geri geldiğinde aynı anahtarları `call_metadata` içinden okur ve sonucu doğrudan kendi CRM'inize, veritabanınıza veya iş akışınıza yönlendirirsiniz — ayrıca bir telefon-numarası–kayıt eşleme tablosu tutmanıza gerek kalmaz.

Tek kısıtlama yapısaldır; böylece veriyi güvenilir biçimde saklayıp geri döndürebiliriz:

| Limit | Değer |
|---|---|
| En fazla anahtar | 50 |
| En fazla anahtar uzunluğu | 40 |
| En fazla değer uzunluğu | 500 |
| Değer tipleri | `string`, `number`, `boolean` |
| İç içe nesne / dizi / `null` | İzin verilmez |

:::caution Kendi anahtarlarınız için kullanın — ve PII koymayın
Vindy `metadata`'yı asla yorumlamadığı için, burası **sizin** eşleştirme anahtarlarınızın doğru yeridir (örneğin `crm_contact_id`, `orderId`, `campaign`). Kişisel veriler (ad, telefon, kimlik no) için **uygun değildir** — onları kendi sistemlerinizde saklayın ve buradan yalnızca anahtarla referans verin.
:::

### Değişkenler {#variables}

`variables`, asistanın **çağrı sırasında** kullandığı **şablon değerleridir**. Asistanın prompt'unda veya karşılama (greeting) metninde nerede bir `{{name}}` yer tutucusu varsa, Vindy çağrı başlamadan önce `name` için gönderdiğiniz değeri yerine koyar — böylece `"Merhaba {{first_name}}, {{appointment_time}} için bir hatırlatmadır"` gibi bir karşılama her çağrı için kişiselleştirilir.

Bu, `metadata`'nın tam tersidir: `metadata` opaktır ve **çağrıyı asla etkilemez**, oysa `variables` **asistanın söylediğini değiştirir**. Asistanın söylemesi gereken her şey için `metadata` değil `variables` gönderin.

Çağrı başına birleştirilen iki düzey vardır (anahtar çakışmalarında çağrı-başı değer kazanır):

| Düzey | Alan | Kapsamı |
|---|---|---|
| İstek | `variables` | Her çağrı (ortak taban — örneğin `{ "company": "Vindy" }`). |
| Çağrı başına | `calls[].variables` | Yalnız o çağrı (örneğin `{ "first_name": "Ahmet" }`); istek düzeyindeki tabanı ezer. |

Bir asistanın hangi adları beklediği [`GET /v1/assistants`](list-assistants.md) yanıtındaki `assistant_variables` içinde listelenir (prompt ve karşılama metnindeki `{{…}}` ifadelerinden türetilir). Vermediğiniz bir yer tutucu **boş** olarak render edilir — hiçbir `{{…}}` sese sızmaz. Yapısal limitler `metadata` ile aynıdır:

| Limit | Değer |
|---|---|
| En fazla anahtar | 50 |
| En fazla anahtar uzunluğu | 40 |
| En fazla değer uzunluğu | 500 |
| Değer tipleri | `string`, `number`, `boolean` (sayılar/boolean'lar string'e çevrilir) |
| İç içe nesne / dizi / `null` | İzin verilmez |

Bir ihlal **`400 INVALID_VARIABLES`** döndürür; çağrı-başı bir `variables` için hatalı dizi konumu `extensions.index` içindedir (istek düzeyindeki bir ihlal `index: -1` bildirir).

## Yanıt (201 Created)

```json
{
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "accepted": 2,
  "calls": [
    { "call_id": "0f1e2d3c-4b5a-7c88-9d0e-1f2a3b4c5d6e", "phone_number": "+905551112233" },
    { "call_id": "1a2b3c4d-5e6f-7a99-8b0c-2d3e4f5a6b7c", "phone_number": "+905554445566" }
  ]
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `batch_call_id` | string (UUID) | Oluşturulan toplu aramanın (kampanya) kimliği. **Her zaman gelir** — `/v1/calls/bulk` tek numara için bile toplu arama oluşturur. Toplu aramayı daha sonra [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) ile iptal etmek veya çağrılarını [`POST /v1/calls/list`](list-calls/index.md) içinde `campaign_id` ile filtrelemek için **saklayın**. Toplu arama olmadan tekil çağrı için [`POST /v1/calls`](create-call.md) kullanın. |
| `accepted` | int | Kuyruğa alınan çağrı sayısı. |
| `calls` | array | İstek sırasında, kuyruğa alınan her çağrı için bir giriş — her biri `{ call_id, phone_number }`. `call_id`, o çağrının kalıcı kimliğidir: çağrıyı [`GET /v1/calls/:callId`](get-call.md) ile çekmek, [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile iptal etmek veya gelen webhook'larla eşleştirmek için kullanın. `phone_number`, normalize edilmiş E.164 numarasıdır. |

:::info Sonuçları eşleştirme
Kuyruğa alınan her çağrı, istek sırasında `calls[]` içinde dönen kendi `call_id` değerini alır. Bu değerleri — `metadata` ile eşleyerek — saklayın; böylece her çağrıyı tek tek çekebilir, iptal edebilir veya eşleştirebilirsiniz. Sonuçlar ayrıca çağrılar tamamlandıkça [`POST /v1/calls/list`](list-calls/index.md) ve [webhook olaylarıyla](webhooks.md) gelir; bunlar gönderdiğiniz `metadata` değerini yansıtır.
:::

Çağrılar kuyruğa alınır ve arka planda yürütülür. Sonuçlar (transcript, ses kaydı, yapısal veri) her çağrı tamamlandıkça erişilebilir hâle gelir.

:::tip Toplu aramanın ilerleyişini takip edin
Bir `batch_call_id` döndüyse (çok çağrılı bir batch), çağrılarını tamamlandıkça [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile sayfalayın. **Tüm** toplu aramanın ne zaman bittiğini — durum bazında bir dökümle birlikte — öğrenmek için [`batch-ended` webhook'unu](webhooks.md#batch-ended) dinleyin.
:::

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `calls` boş veya 200'den fazla, hatalı biçimli gövde, eksik `phone_number_id` vb. |
| `400` | `INVALID_PHONE_NUMBER` | Bir `calls[i].phone_number` normalize edilemedi. Hatalı indeks `extensions.index` içindedir. |
| `400` | `INVALID_VARIABLES` | Bir `variables` nesnesi limitleri aşıyor veya geçersiz bir değer tipi kullanıyor. Çağrı-başı bir değer için hatalı indeks `extensions.index` içindedir; istek düzeyindeki bir ihlal `index: -1` bildirir. |
| `400` | `INVALID_METADATA` | Bir çağrının metadata'sı limitleri aşıyor veya geçersiz bir değer tipi kullanıyor. Hatalı indeks `extensions.index` içindedir. |
| `400` | `PHONE_NUMBER_NOT_USABLE` | `phone_number_id` hattı mevcut ama giden arama için hazır değil (provisioned değil). |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Kimlik doğrulama hataları. |
| `404` | `ASSISTANT_NOT_FOUND` | Asistan bulunamadı, sizin şirketinize ait değil veya arama için uygun değil. |
| `404` | `PHONE_NUMBER_NOT_FOUND` | `phone_number_id` bilinmiyor, hatalı biçimli veya şirketinize ait değil. [`GET /v1/phone-numbers`](list-phone-numbers.md) yanıtından birini seçin. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::caution Atomik istek
İstekteki **herhangi bir** numara veya metadata geçersizse **hiçbir çağrı oluşturulmaz** — tüm istek reddedilir. Hatalı kaydı düzeltip (bkz. `extensions.index`) yeniden gönderin.
:::

:::warning Bizim tarafımızda dedup yok
Eşzamanlı veya tekrarlanan istekleri engelleyen sunucu tarafında bir kilit yoktur — aynı isteği ikinci kez göndermek yalnızca **ikinci bir batch** oluşturur ve herkesi yeniden arar. Yalnızca önceki isteğin başarısız olduğundan eminken tekrar deneyin ve kendi tarafınızda tekilleştirin. Bkz. [SSS](../faq.md#is-it-safe-to-retry-requests).
:::

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/bulk \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "phone_number_id": "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    "calls": [
      { "phone_number": "+905551112233", "metadata": { "crm_contact_id": "CNT-90412" } },
      { "phone_number": "05554445566", "metadata": { "crm_contact_id": "CNT-90413" } }
    ]
  }'
# → { "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479", "accepted": 2, "calls": [ ... ] }
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function createBulkCalls(assistantId, phoneNumberId, targets) {
  const response = await fetch("https://api.vindy.ai/v1/calls/bulk", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistant_id: assistantId,
      phone_number_id: phoneNumberId, // GET /v1/phone-numbers'tan arayan hattı
      calls: targets,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    // INVALID_PHONE_NUMBER / INVALID_METADATA, extensions.index taşır
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  const { batch_call_id, accepted, calls } = await response.json();
  console.log(`Batch ${batch_call_id}, ${accepted} çağrı kuyruğa alındı`);
  console.log(calls.map((c) => c.call_id)); // kuyruğa alınan her çağrı için bir kalıcı call_id
  return batch_call_id; // her zaman gelir — batch'i sonra iptal etmek için saklayın
}

await createBulkCalls(
  "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  [
    { phone_number: "+905551112233", metadata: { crm_contact_id: "CNT-90412" } },
    { phone_number: "05554445566", metadata: { crm_contact_id: "CNT-90413" } },
  ],
);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def create_bulk_calls(assistant_id, phone_number_id, targets):
    response = requests.post(
        "https://api.vindy.ai/v1/calls/bulk",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
        # phone_number_id, GET /v1/phone-numbers'tan gelen arayan hattıdır
        json={"assistant_id": assistant_id, "phone_number_id": phone_number_id, "calls": targets},
    )

    if not response.ok:
        error = response.json()
        # INVALID_PHONE_NUMBER / INVALID_METADATA, extensions.index taşır
        raise RuntimeError(f"{error.get('extensions', {}).get('code')}: {error.get('message')}")

    body = response.json()
    print(f"Batch {body['batch_call_id']}, {body['accepted']} çağrı kuyruğa alındı")
    print([c["call_id"] for c in body["calls"]])  # kuyruğa alınan her çağrı için bir kalıcı call_id
    return body["batch_call_id"]  # her zaman gelir — batch'i sonra iptal etmek için saklayın

create_bulk_calls(
    "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    [
        {"phone_number": "+905551112233", "metadata": {"crm_contact_id": "CNT-90412"}},
        {"phone_number": "05554445566", "metadata": {"crm_contact_id": "CNT-90413"}},
    ],
)
```

</TabItem>
</Tabs>
