---
title: Toplu Arama Oluştur
sidebar_label: Toplu Arama Oluştur
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/bulk`

Verdiğiniz telefon numaralarına, bir asistan kullanarak giden çağrı oluşturur (tek istekte 1–1000 numara).

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
  "scheduled_at": "2026-06-10T09:00:00+03:00",
  "calling_window": { "timezone": "Europe/Istanbul", "start": "09:00", "end": "18:00", "days": [1, 2, 3, 4, 5] },
  "calls": [
    { "phone_number": "+905551112233", "variables": { "first_name": "Elif" }, "metadata": { "order": { "id": "ORD-4821", "items": [{ "sku": "A", "qty": 2 }] }, "tags": ["vip"], "priority": 1 } },
    { "phone_number": "+905551112244", "variables": { "first_name": "Mehmet" }, "metadata": { "order_id": "ORD-4822" } }
  ]
}
```

## Gövde parametreleri

| Alan | Tür | Zorunlu | Açıklama |
|---|---|---|---|
| `assistant_id` | string (UUID) | evet | Çağrıları yapacak asistan. [`GET /v1/assistants`](list-assistants.md) yanıtından alınır. |
| `phone_number_id` | string | evet | Çağrıların yapılacağı **arayan hattı** (giden arayan/CLI). [`GET /v1/phone-numbers`](list-phone-numbers.md) yanıtındaki numaralardan biri olmalı — yani şirketinize ait ve giden arama için provisioned. Kullanılabilir herhangi bir numara, herhangi bir asistanla çalışır; bir inbound ataması bunu kısıtlamaz. |
| `variables` | object | hayır | **Ortak** şablon değişkenleri; **her** çağrıya taban olarak uygulanır — asistanın `{{yer_tutucu}}` ifadelerine yerleştirilir. Her `calls[].variables` bunları çağrı başına ezer. Bkz. [Değişkenler](#variables). |
| `calls` | array | evet | Aranacak hedefler (1–1000). |
| `calls[].phone_number` | string | evet | Aranacak numara. Bkz. aşağıdaki [Telefon numaraları](#phone-numbers). |
| `calls[].variables` | object | hayır | Bu numaraya özel **çağrı-başı** şablon değişkenleri (örneğin `{ "first_name": "Ahmet" }`). İstek düzeyindeki `variables` üzerine birleştirilir (çağrı-başı değer kazanır). Bkz. [Değişkenler](#variables). |
| `calls[].metadata` | object | hayır | İsteğe bağlı anahtar-değer nesnesi (bkz. [Metadata](#metadata) limitleri). Aynen geri döner. |
| `scheduled_at` | ISO 8601 datetime | hayır | Verilirse, toplu arama hemen değil bu **ileri** zamanda başlatılmak üzere kuyruğa alınır. **Timezone offset'li** bir ISO 8601 tarih-saat gönderin — bkz. [Zamanlama](#scheduled-at). |
| `calling_window` | object \| null | hayır | Tüm toplu arama için isteğe bağlı **mesai (business-hours) penceresi** — çağrılar yalnız pencere içinde çevrilir; pencere dışında sıraya düşenler reddedilmez, **ertelenir**. Verilmezse platformun varsayılan mesai penceresi uygulanır. Bkz. [Arama penceresi](#calling-window). |

### Telefon numaraları {#phone-numbers}

Numaralar tam uluslararası **E.164** biçiminde verilmelidir: baştan `+`, sonra ülke kodu, sonra numara. Yaygın ayraçlar — boşluk, tire ve parantez — tolere edilip temizlenir; bu nedenle `+90 555 111 22 33` da kabul edilir.

| Gönderdiğiniz | Sonuç |
|---|---|
| `+905551112233` | `+905551112233` — kabul |
| `+90 555 111 22 33` | `+905551112233` — ayraçlar temizlenir |
| `+441632960000` | `+441632960000` — kabul |
| `05551112233` | **Reddedilir** — `400 INVALID_PHONE_NUMBER` (baştan `+` yok) |
| `5551112233` | **Reddedilir** — baştan `+` yok |
| `905551112233` | **Reddedilir** — baştan `+` yok |

**Hiçbir ülkeye özel normalizasyon yoktur** — baştan `+` olmayan numara **`400 INVALID_PHONE_NUMBER`** ile reddedilir (toplu istekte hatalı dizi konumu `extensions.index` içindedir). Her numarayı tam E.164 (`+` + ülke kodu + numara) verin.

Kabul edilen numaralar normalize edilmiş biçimde saklanır ve aranır; bu değeri daha sonra liste, tekil çağrı ve webhook yanıtlarında `call_phone_number` olarak görürsünüz.

### Metadata {#metadata}

`metadata`, tamamen **size ait** olan serbest biçimli bir anahtar-değer nesnesidir. Vindy onu opak bir veri olarak ele alır: içeriğini **asla okumaz, ayrıştırmaz, doğrulamaz veya ona göre bir işlem yapmaz** ve bir çağrının nasıl başlatıldığına, yönlendirildiğine veya işlendiğine **hiçbir etkisi yoktur**. Onu yalnızca saklar ve o çağrının her görünümünde size olduğu gibi geri döndürür — [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md) ve [webhook olaylarında](webhooks.md).

Tek görevi **sizin tarafınızda eşleştirmedir**. Bir çağrıyı kendi verinizle ilişkilendirmek için sistemlerinizin ihtiyaç duyduğu kimlikleri ekleyin — bir CRM kişi kimliği, sipariş numarası, kampanya etiketi, kendi istek kimliğiniz vb. Sonuç geri geldiğinde aynı anahtarları `call_metadata` içinden okur ve sonucu doğrudan kendi CRM'inize, veritabanınıza veya iş akışınıza yönlendirirsiniz — ayrıca bir telefon-numarası–kayıt eşleme tablosu tutmanıza gerek kalmaz.

**Yapılandırılmış** metadata gönderebilirsiniz — yalnızca düz anahtar-değer çiftleri değil. Değerler skaler olabilir *veya* iç içe nesne ve dizi olabilir; böylece kendi kayıtlarınızın şeklini birebir yansıtabilirsiniz. Tek kısıtlama yapısaldır; böylece Vindy veriyi güvenilir biçimde saklayıp geri döndürebilir:

| Limit | Değer |
|---|---|
| Değer tipleri | `string`, `number`, `boolean`, `null` ve iç içe nesne ile dizi |
| Nesne başına en fazla anahtar | 50 (üst düzey ve her iç içe nesne) |
| En fazla anahtar uzunluğu | 40 |
| En fazla string değer uzunluğu | 500 |
| En fazla iç içe derinlik | 5 |
| En fazla toplam giriş | 200 (tüm skalerler ve kapsayıcılar birlikte) |
| En fazla serileştirilmiş boyut | 32 KB (JSON, UTF-8) |

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

Bir asistanın hangi adları beklediği [`GET /v1/assistants`](list-assistants.md) yanıtındaki `assistant_variables` içinde listelenir (prompt ve karşılama metnindeki `{{…}}` ifadelerinden türetilir). Vermediğiniz bir yer tutucu **boş** olarak render edilir — hiçbir `{{…}}` sese sızmaz. Anahtar ve uzunluk limitleri `metadata` ile aynıdır (≤50 anahtar, anahtar ≤40, değer ≤500), ancak — `metadata`'nın aksine — variables yalnızca **skalerdir**: iç içe nesne veya dizi yoktur:

| Limit | Değer |
|---|---|
| En fazla anahtar | 50 |
| En fazla anahtar uzunluğu | 40 |
| En fazla değer uzunluğu | 500 |
| Değer tipleri | `string`, `number`, `boolean` (sayılar/boolean'lar string'e çevrilir) |
| İç içe nesne / dizi / `null` | İzin verilmez |

`metadata`'nın aksine — burada boş anahtar tolere edilir — bir `variables` **anahtarı boş olamaz**: 1–40 karakter olmalıdır. Boş anahtar reddedilir.

Bir ihlal **`400 INVALID_VARIABLES`** döndürür; çağrı-başı bir `variables` için hatalı dizi konumu `extensions.index` içindedir (istek düzeyindeki bir ihlal `index: -1` bildirir).

### `scheduled_at` ile zamanlama {#scheduled-at}

Varsayılan olarak tüm toplu arama hemen kuyruğa alınır. İleri bir zamanda başlatmak için `scheduled_at`'i **timezone offset içeren bir ISO 8601 / RFC 3339 tarih-saat** olarak gönderin (tüm toplu aramaya uygulanır):

| Biçim | Örnek | Ne zaman tetiklenir |
|---|---|---|
| Sayısal offset (önerilen) | `2026-06-10T09:00:00+03:00` | İstanbul'da 09:00 (UTC+3) |
| UTC (`Z`) | `2026-06-10T06:00:00Z` | 06:00 UTC = 09:00 İstanbul |

**Offset'i her zaman ekleyin.** Offset'siz (naive) bir değer (ör. `2026-06-10T09:00:00`) yerel saat değil **UTC** kabul edilir — yani tahmin ettiğinizden 3 saat sonra, İstanbul'da 12:00'de tetiklenir. İstanbul'da 09:00 için `2026-06-10T09:00:00+03:00` gönderin.

- Zamanlar **UTC** olarak saklanır ve karşılaştırılır; API'nin diğer yerlerindeki zaman damgaları UTC (`+00:00`) döner.
- **Gelecek-zaman doğrulaması yok:** geçmiş bir zaman, toplu aramayı bir sonraki dağıtım döngüsünde (≈hemen) başlatılmak üzere kuyruğa alır. Hemen başlatmak için `scheduled_at`'i hiç göndermeyin.
- Geçerli bir ISO 8601 tarih-saat olmayan değer (ör. `10.06.2026`, `now`) **`400 VALIDATION_FAILED`** ile reddedilir.

### Arama penceresi {#calling-window}

`calling_window`, toplu aramanın çağrılarının çevrilebileceği saatleri kısıtlar (mesai saatleri). **Tüm toplu aramaya** uygulanır. Pencere dışında sıraya düşen çağrılar **reddedilmez — bir sonraki açılışa ertelenir**; böylece toplu arama yalnız izinli saatlerde çevrilir.

```json
{
  "timezone": "Europe/Istanbul",
  "start": "09:00",
  "end": "18:00",
  "days": [1, 2, 3, 4, 5]
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `timezone` | string | IANA timezone adı (ör. `Europe/Istanbul`). Pencere saatleri bu dilimde yorumlanır. Verilmezse `Europe/Istanbul` varsayılır. |
| `start` | string | Açılış saati, `HH:MM` (24 saat). |
| `end` | string | Kapanış saati, `HH:MM`. `start`'tan **sonra** olmalı — gece-aşan (yarım geceyi geçen) pencere desteklenmez. |
| `days` | array | Pencerenin aktif olduğu **haftanın günleri**, ISO numaralandırma **1 = Pazartesi … 7 = Pazar**; boş olmayan bir `1..7` alt kümesi. |

- **Takvim tarihi değil, haftalık tekrarlayan kural.** `days` haftanın günleridir, yani pencere her hafta tekrarlanır.
- **Tüm toplu arama.** İstekteki her çağrı aynı pencereye uyar.
- **`scheduled_at` de kırpılır.** Geçerli (fiilî) başlangıç, `scheduled_at` ile şu anki zamandan büyük olanıdır; sonra pencere içine taşınır — `scheduled_at` pencere dışına düşerse çevirme ondan sonraki ilk açılışta başlar.
- **Verilmezse veya `null` → platform varsayılanı.** `calling_window` göndermezseniz (ya da `null` gönderirseniz) platformun varsayılan mesai penceresi uygulanır — şu an **hafta içi (Pzt–Cuma) 09:00–18:00 Europe/Istanbul** (`days: [1, 2, 3, 4, 5]`), platform tarafından `CALLING_WINDOW_DEFAULT_*` ile ayarlanabilir. **Uygulanan** pencere yanıttaki `calling_window` alanında geri döner; böylece ne kullanıldığını her zaman görebilirsiniz.

Geçersiz bir `calling_window` (bozuk timezone, `start ≥ end`, boş veya aralık-dışı `days`, ya da bozuk `HH:MM`) **`400 INVALID_CALLING_WINDOW`** ile reddedilir:

```json
{
  "message": "calling_window is invalid. Provide { timezone: IANA name, start: 'HH:MM', end: 'HH:MM' (start before end, same day), days: non-empty list of ISO weekdays 1-7 (Mon=1..Sun=7) }.",
  "extensions": { "code": "INVALID_CALLING_WINDOW" }
}
```

## Yanıt (201 Created)

```json
{
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "accepted": 2,
  "calling_window": { "timezone": "Europe/Istanbul", "start": "09:00", "end": "18:00", "days": [1, 2, 3, 4, 5] }
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `batch_call_id` | string (UUID) | Oluşturulan toplu aramanın kimliği. **Her zaman gelir** — `/v1/calls/bulk` tek numara için bile toplu arama oluşturur. Toplu aramayı daha sonra [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) ile iptal etmek veya çağrılarını [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile listelemek için **saklayın**. Toplu arama olmadan tekil çağrı için [`POST /v1/calls`](create-call.md) kullanın. |
| `accepted` | int | Kuyruğa alınan çağrı sayısı. |
| `calling_window` | object | Bu toplu aramaya **uygulanan** arama penceresi — gönderdiğiniz normalize pencere ya da göndermediyseniz platform varsayılanı. **Her zaman gelir.** Bkz. [Arama penceresi](#calling-window). |

:::info Sonuçları eşleştirme — per-call id dönmez
Tasarım gereği bulk yanıtı **yalnızca** `batch_call_id` ve `accepted` döndürür — kuyruğa alınan her çağrı için ayrı bir `call_id` **listelemez** (her toplu aramada 1000'e kadar id döndürmek gereksiz yüktür). Sonuçları iki yoldan eşleştirirsiniz:

- **`metadata` ile** (önerilen): her çağrıya kendi tanımlayıcınızı (ör. `crm_contact_id`) ekleyin. Her sonuç — [`POST /v1/calls/list`](list-calls/index.md) ve [`call-ended` webhook'u](webhooks.md) ile — bunu `call_metadata` olarak geri yansıtır; böylece bizim `call_id`'mize ihtiyaç duymadan her sonucu yönlendirirsiniz.
- **Toplu aramanın çağrılarını listeleyerek**: toplu aramayı [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile sayfalayın; bu endpoint her çağrıyı (kendi `call_id`'si, numarası ve güncel durumuyla) döndürür.

id'yi hemen geri almak istediğiniz tekil bir çağrı için ise tekil endpoint [`POST /v1/calls`](create-call.md) kullanın — o, çağrının `call_id`'sini döndürür.
:::

Çağrılar kuyruğa alınır ve arka planda yürütülür. Sonuçlar (transcript, ses kaydı, yapısal veri) her çağrı tamamlandıkça erişilebilir hâle gelir.

:::tip Toplu aramanın ilerleyişini takip edin
Bir `batch_call_id` döndüyse (çok çağrılı bir toplu arama), çağrılarını tamamlandıkça [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile sayfalayın. **Tüm** toplu aramanın ne zaman bittiğini — durum bazında bir dökümle birlikte — öğrenmek için [`batch-ended` webhook'unu](webhooks.md#batch-ended) dinleyin.
:::

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `calls` boş veya 1000'den fazla, hatalı biçimli gövde, eksik `phone_number_id` vb. |
| `400` | `INVALID_PHONE_NUMBER` | Bir `calls[i].phone_number` normalize edilemedi. Hatalı indeks `extensions.index` içindedir. |
| `400` | `INVALID_VARIABLES` | Bir `variables` nesnesi limitleri aşıyor veya geçersiz bir değer tipi kullanıyor. Çağrı-başı bir değer için hatalı indeks `extensions.index` içindedir; istek düzeyindeki bir ihlal `index: -1` bildirir. |
| `400` | `INVALID_METADATA` | Bir çağrının metadata'sı limitleri aşıyor veya geçersiz bir değer tipi kullanıyor. Hatalı indeks `extensions.index` içindedir. |
| `400` | `PHONE_NUMBER_NOT_USABLE` | `phone_number_id` hattı mevcut ama giden arama için hazır değil (provisioned değil). |
| `400` | `INVALID_CALLING_WINDOW` | `calling_window` geçersiz — bozuk timezone, `start ≥ end`, boş/aralık-dışı `days` veya bozuk `HH:MM`. |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Kimlik doğrulama hataları. |
| `404` | `ASSISTANT_NOT_FOUND` | Asistan bulunamadı, sizin şirketinize ait değil veya arama için uygun değil. |
| `404` | `PHONE_NUMBER_NOT_FOUND` | `phone_number_id` bilinmiyor, hatalı biçimli veya şirketinize ait değil. [`GET /v1/phone-numbers`](list-phone-numbers.md) yanıtından birini seçin. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::caution Atomik istek
İstekteki **herhangi bir** numara veya metadata geçersizse **hiçbir çağrı oluşturulmaz** — tüm istek reddedilir. Hatalı kaydı düzeltip (bkz. `extensions.index`) yeniden gönderin.
:::

:::warning Bizim tarafımızda dedup yok
Eşzamanlı veya tekrarlanan istekleri engelleyen sunucu tarafında bir kilit yoktur — aynı isteği ikinci kez göndermek yalnızca **ikinci bir toplu arama** oluşturur ve herkesi yeniden arar. Yalnızca önceki isteğin başarısız olduğundan eminken tekrar deneyin ve kendi tarafınızda tekilleştirin. Bkz. [SSS](../faq.md#is-it-safe-to-retry-requests).
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
      { "phone_number": "+905551112233", "metadata": { "order_id": "ORD-4821" } },
      { "phone_number": "+905551112244", "metadata": { "order_id": "ORD-4822" } }
    ]
  }'
# → { "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479", "accepted": 2, "calling_window": { "timezone": "Europe/Istanbul", "start": "09:00", "end": "18:00", "days": [1, 2, 3, 4, 5] } }
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

  const { batch_call_id, accepted } = await response.json();
  console.log(`Batch ${batch_call_id}, ${accepted} çağrı kuyruğa alındı`);
  return batch_call_id; // her zaman gelir — toplu aramayı sonra iptal etmek için saklayın
}

await createBulkCalls(
  "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "2a80da64-32dc-4837-b880-e6dc9ccd632d",
  [
    { phone_number: "+905551112233", metadata: { order_id: "ORD-4821" } },
    { phone_number: "+905551112244", metadata: { order_id: "ORD-4822" } },
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
    return body["batch_call_id"]  # her zaman gelir — toplu aramayı sonra iptal etmek için saklayın

create_bulk_calls(
    "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "2a80da64-32dc-4837-b880-e6dc9ccd632d",
    [
        {"phone_number": "+905551112233", "metadata": {"order_id": "ORD-4821"}},
        {"phone_number": "+905551112244", "metadata": {"order_id": "ORD-4822"}},
    ],
)
```

</TabItem>
</Tabs>
