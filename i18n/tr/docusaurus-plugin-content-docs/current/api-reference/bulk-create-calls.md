---
title: Toplu Arama Oluştur
sidebar_label: Toplu Arama Oluştur
sidebar_position: 3
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/bulk`

Bu uç, verdiğiniz telefon numaralarına tek bir asistan kullanarak giden çağrı oluşturur (tek istekte 1–1000 numara).

Her çağrıya isteğe bağlı bir `metadata` nesnesi ekleyebilirsiniz. Vindy bu veriyi işlemez; [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md) ve [webhook olaylarındaki](webhooks.md) her çağrı nesnesinde **olduğu gibi geri döndürür**. Böylece bir çağrıyı kendi sisteminizdeki bir kayıtla (CRM kişisi, sipariş, destek kaydı) ilişkilendirirsiniz. Ayrıntılar ve limitler için bkz. [Metadata](#metadata).

Her çağrı `variables` de taşıyabilir. Bunlar, asistanın konuşmasını kişiselleştiren değerlerdir: asistanın metninde `{{first_name}}` gibi bir yer tutucu geçtiğinde, Vindy çağrı başlamadan önce onun yerine sizin gönderdiğiniz değeri (örneğin müşterinin adını) koyar. Yani `metadata` çağrıya hiç dokunmazken, `variables` doğrudan **asistanın ne söyleyeceğini** değiştirir. Herkes için aynı olan değerleri bir kez istek düzeyinde, her kişiye özel olanları ise o çağrının içinde gönderin. Bkz. [Değişkenler](#variables).

Çağrıların yapılacağı **arayan numarayı** `phone_number_id` ile siz seçersiniz. Bu, [`GET /v1/phone-numbers`](list-phone-numbers.md) yanıtındaki numaralardan biridir ve Vindy sizin adınıza birini aradığında karşı tarafın telefonunda görünen numaradır.

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
| `assistant_id` | string (UUID) | evet | Çağrıları hangi yapay zeka asistanının yürüteceğini bu alanda belirtirsiniz; müşteriyle görüşmeyi o asistan gerçekleştirir. Asistanın kimliğini [`GET /v1/assistants`](list-assistants.md) listesinden alırsınız. |
| `phone_number_id` | string | evet | Vindy müşteriyi aradığında müşterinin telefonunda görünecek numarayı bu alanda belirtirsiniz. Bu numarayı [`GET /v1/phone-numbers`](list-phone-numbers.md) listesinde yer alan numaralar arasından seçersiniz. |
| `variables` | object | hayır | Tüm çağrılarda ortak kullanmak istediğiniz şablon değerlerini bu alana yazarsınız (örneğin `{ "company": "Vindy" }`); Vindy bu değerleri, asistanın metnindeki `{{…}}` yer tutucularının yerine yerleştirir. Bir kişiye özel `calls[].variables` alanı gönderirseniz, oradaki değer buradaki ortak değerin üzerine yazılır. Ayrıntılar için bkz. [Değişkenler](#variables). |
| `calls` | array | evet | Aranacak kişileri bu listede sıralarsınız. Her öğe tek bir kişiyi tanımlar: o kişinin telefon numarasını ve eğer göndermek isterseniz yalnız ona özel `variables` alanı ile `metadata` alanını taşır. Bir istekte 1 ile 1000 arası kişi gönderebilirsiniz. |
| `calls[].phone_number` | string | evet | O kişinin aranacak numarasını tam uluslararası **E.164** biçiminde bu alana yazarsınız (örneğin `+905551112233`). Ayrıntılar için bkz. aşağıdaki [Telefon numaraları](#phone-numbers). |
| `calls[].variables` | object | hayır | Yalnızca bu kişiye özel şablon değerlerini bu alanda gönderirsiniz (örneğin `{ "first_name": "Ahmet" }`). Vindy bu değerleri, istek düzeyindeki ortak `variables` alanıyla birleştirir; aynı anahtar her ikisinde de bulunuyorsa çağrıya özel olan değer geçerli olur. Ayrıntılar için bkz. [Değişkenler](#variables). |
| `calls[].metadata` | object | hayır | Bu çağrıya kendinize ait verileri iliştirmek için bu alanı kullanırsınız (örneğin `{ "order_id": "ORD-4821" }`). Vindy bu veriyi hiçbir şekilde okumaz; sonuçla birlikte size olduğu gibi geri döndürür, böylece çağrıyı kendi kaydınızla eşleştirebilirsiniz. Sınırlar için bkz. [Metadata](#metadata). |
| `scheduled_at` | ISO 8601 datetime | hayır | Toplu aramayı hemen değil de ileri bir tarihte başlatmak isterseniz bu alanı kullanırsınız. Değeri, saat dilimi offset'i içeren bir ISO 8601 tarih-saat biçiminde gönderirsiniz. Ayrıntılar için bkz. [Zamanlama](#scheduled-at). |
| `calling_window` | object \| null | hayır | Müşterileri yalnız uygun saatlerde aramak için bir zaman aralığı belirlersiniz (örneğin hafta içi 09:00–18:00); böylece kimse gece ya da hafta sonu aranmaz. Bu aralığın dışına denk gelen çağrılar iptal edilmez, aralık yeniden açıldığında yapılır. Boş bırakırsanız Vindy hazır bir varsayılan aralık kullanır. Bkz. [Arama penceresi](#calling-window). |

### Telefon numaraları {#phone-numbers}

Numaralar tam uluslararası **E.164** biçiminde verilmelidir: baştan bir `+`, sonra ülke kodu, sonra abone numarası. Yaygın ayraçlar (boşluk, tire, parantez ve nokta) tolere edilip temizlenir; bu yüzden `+90 555 111 22 33` de kabul edilir. `+`'dan sonra toplam 8 ile 15 arası hane bulunmalıdır; daha kısa ya da daha uzun olan reddedilir.

| Gönderdiğiniz | Sonuç |
|---|---|
| `+905551112233` | `+905551112233` — kabul |
| `+90 555 111 22 33` | `+905551112233` — ayraçlar temizlenir |
| `+441632960000` | `+441632960000` — kabul |
| `+12` | **Reddedilir** — 8 haneden az |
| `05551112233` | **Reddedilir** — `400 INVALID_PHONE_NUMBER` (baştan `+` yok) |
| `5551112233` | **Reddedilir** — baştan `+` yok |
| `905551112233` | **Reddedilir** — baştan `+` yok |

**Hiçbir ülkeye özel normalizasyon yoktur.** Baştan `+` olmayan bir numara **`400 INVALID_PHONE_NUMBER`** ile reddedilir (toplu istekte hatalı dizi konumu `extensions.index` içindedir). Her numarayı tam E.164 (`+` + ülke kodu + numara) biçiminde verin.

Kabul edilen numaralar normalize edilmiş biçimde saklanır ve aranır; bu değeri daha sonra liste, tekil çağrı ve webhook yanıtlarında `call_phone_number` olarak görürsünüz.

### Metadata {#metadata}

`metadata`, tamamen **size ait** olan serbest biçimli bir anahtar-değer nesnesidir. Vindy onu opak bir veri olarak ele alır: içeriğini **asla okumaz, ayrıştırmaz, doğrulamaz ya da ona göre işlem yapmaz** ve bir çağrının nasıl başlatıldığına, yönlendirildiğine veya işlendiğine **hiçbir etkisi yoktur**. Vindy onu yalnızca saklar ve o çağrının her görünümünde size değiştirmeden geri döndürür. Onu [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md) ve [webhook olaylarında](webhooks.md) görürsünüz.

Tek görevi **sizin tarafınızda eşleştirmedir**. Bir çağrıyı kendi verinizle ilişkilendirmek için sistemlerinizin ihtiyaç duyduğu kimlikleri ekleyin: bir CRM kişi kimliği, bir sipariş numarası, bir kampanya etiketi ya da kendi istek kimliğiniz. Sonuç geri geldiğinde aynı anahtarları `call_metadata` içinden okur ve sonucu doğrudan kendi CRM'inize, veritabanınıza veya iş akışınıza yönlendirirsiniz. Ayrıca bir telefon-numarası–kayıt eşleme tablosu tutmanıza hiç gerek kalmaz.

Yalnızca düz anahtar-değer çiftleri değil, **yapılandırılmış** metadata da gönderebilirsiniz. Değerler skaler olabilir ya da iç içe nesne ve dizi olabilir; böylece kendi kayıtlarınızın şeklini birebir yansıtırsınız. Tek kısıtlama yapısaldır; bu sayede Vindy veriyi güvenilir biçimde saklayıp geri döndürür:

| Limit | Değer | Örnek |
|---|---|---|
| Değer tipleri | `string`, `number`, `boolean`, `null` ve iç içe nesne/dizi | `{ "orderId": "ORD-4821", "qty": 2, "paid": true, "note": null, "items": ["a", "b"] }` geçerlidir |
| Nesne başına en fazla anahtar | 50 (üst düzey ve her iç içe nesne) | 51 anahtarlı bir nesne reddedilir |
| En fazla anahtar uzunluğu | 40 | `crm_contact_id` (14 karakter) uygundur; 41 karakterlik bir anahtar reddedilir |
| En fazla string değer uzunluğu | 500 | 600 karakterlik bir string değer reddedilir |
| En fazla iç içe derinlik | 5 | `{ "a": { "b": { "c": { "d": 1 } } } }` sınırdadır; bir düzey daha derini reddedilir |
| En fazla toplam giriş | 200 (tüm skalerler ve kapsayıcılar birlikte) | nesne genelinde 250 değer reddedilir |
| En fazla serileştirilmiş boyut | 32 KB (JSON, UTF-8) | 40 KB'a serileşen bir yük reddedilir |

:::caution Kendi anahtarlarınız için kullanın, PII koymayın
Vindy `metadata`'yı asla yorumlamadığı için burası **sizin** eşleştirme anahtarlarınızın doğru yeridir (örneğin `crm_contact_id`, `orderId`, `campaign`). Kişisel veriler (ad, telefon, kimlik numarası) için **uygun değildir**; onları kendi sistemlerinizde tutun ve buraya yalnızca anahtarla referans verin.
:::

### Değişkenler {#variables}

`variables`, asistanın **çağrı sırasında** kullandığı **şablon değerleridir**. Asistanın prompt'unda ya da karşılama (greeting) metninde bir `{{name}}` yer tutucusu nerede geçerse, Vindy çağrı başlamadan önce `name` için gönderdiğiniz değeri oraya yerleştirir. Böylece `"Merhaba {{first_name}}, {{appointment_time}} için bir hatırlatmadır"` gibi bir karşılama her çağrı için kişiselleştirilir.

Bu, `metadata`'nın tam tersidir: `metadata` opaktır ve **çağrıyı asla etkilemez**, oysa `variables` **asistanın söylediğini değiştirir**. Asistanın söylemesi gereken her şey için `metadata` değil `variables` gönderin.

Değişkenler iki düzeyde gelir ve Vindy bunları her çağrı için birleştirir. İstek düzeyindeki bir `variables` nesnesi her çağrıya ortak bir taban kurar; her `calls[].variables` ise bu tabana ekler ya da onu tek bir çağrı için ezer. Örneğin şu istekte:

```json
{
  "variables": { "company": "Vindy", "agent_name": "Ada" },
  "calls": [
    { "phone_number": "+905551112233", "variables": { "first_name": "Elif", "agent_name": "Mert" } }
  ]
}
```

ilk çağrı `{ "company": "Vindy", "first_name": "Elif", "agent_name": "Mert" }` birleşik kümesiyle yapılır: `company` ortak tabandan gelir, `first_name` çağrı tarafından eklenir, `agent_name` ise iki düzeyde de gönderildiği için çağrı-başı değer (`"Mert"`) kazanır.

| Düzey | Alan | Kapsamı |
|---|---|---|
| İstek | `variables` | Her çağrı (ortak taban — örneğin `{ "company": "Vindy" }`). |
| Çağrı başına | `calls[].variables` | Yalnız o çağrı (örneğin `{ "first_name": "Ahmet" }`); istek düzeyindeki tabanı ezer. |

Bir asistanın hangi adları beklediği, [`GET /v1/assistants`](list-assistants.md) yanıtındaki `assistant_variables` içinde listelenir (prompt ve karşılama metnindeki `{{…}}` ifadelerinden türetilir). Vermediğiniz bir yer tutucu **boş** bırakılır; hiçbir `{{…}}` sese sızmaz. Anahtar ve uzunluk limitleri `metadata` ile aynıdır (≤50 anahtar, anahtar ≤40, değer ≤500). Ama `metadata`'nın aksine variables yalnızca **skalerdir**; iç içe nesne ya da dizi içermez:

| Limit | Değer | Örnek |
|---|---|---|
| En fazla anahtar | 50 | 51 anahtarlı bir nesne reddedilir |
| En fazla anahtar uzunluğu | 40 | `first_name` uygundur; 41 karakterlik bir anahtar reddedilir |
| En fazla değer uzunluğu | 500 | 600 karakterlik bir değer reddedilir |
| Değer tipleri | `string`, `number`, `boolean` (sayılar/boolean'lar string'e çevrilir) | `{ "count": 3 }` sese `3` olarak geçer; `{ "paid": true }` ise `true` olarak |
| İç içe nesne / dizi / `null` | İzin verilmez | `{ "order": { "id": 1 } }` ve `{ "note": null }` reddedilir |

`metadata`'da boş anahtar tolere edilir; `variables`'ta ise bir **anahtar boş olamaz**. Anahtar 1–40 karakter olmalıdır ve boş anahtar reddedilir.

Bir ihlal **`400 INVALID_VARIABLES`** döndürür. Çağrı-başı bir `variables` için hatalı dizi konumu `extensions.index` içindedir; istek düzeyindeki bir ihlal ise `index: -1` bildirir.

### `scheduled_at` ile zamanlama {#scheduled-at}

Varsayılan olarak tüm toplu arama hemen kuyruğa alınır. İleri bir zamanda başlatmak için `scheduled_at`'i **timezone offset içeren bir ISO 8601 / RFC 3339 tarih-saat** olarak gönderin (değer tüm toplu aramaya uygulanır):

| Biçim | Örnek | Ne zaman tetiklenir |
|---|---|---|
| Sayısal offset (önerilen) | `2026-06-10T09:00:00+03:00` | İstanbul'da 09:00 (UTC+3) |
| UTC (`Z`) | `2026-06-10T06:00:00Z` | 06:00 UTC = İstanbul'da 09:00 |

**Offset'i her zaman ekleyin.** Offset'siz (naive) bir değer, örneğin `2026-06-10T09:00:00`, yerel saat değil **UTC** kabul edilir; yani tahmin ettiğinizden üç saat sonra, İstanbul'da 12:00'de tetiklenir. İstanbul'da 09:00 için `2026-06-10T09:00:00+03:00` gönderin.

- Zamanlar **UTC** olarak saklanır ve karşılaştırılır; API'nin diğer yerlerindeki zaman damgaları da UTC (`+00:00`) döner.
- **Gelecek-zaman doğrulaması yoktur.** Geçmiş bir zaman, toplu aramayı bir sonraki dağıtım döngüsünde başlatılmak üzere kuyruğa alır. Olabildiğince erken başlatmak için `scheduled_at`'i hiç göndermeyin.
- **Arama penceresi yine de geçerlidir.** İster bir zaman belirtin ister `scheduled_at`'i boş bırakın, çevirme arama penceresine tabidir; pencere göndermediğinizde platform varsayılanı uygulanır. Başlangıç anı pencerenin dışına düşen bir toplu arama, pencere bir sonraki açılışına kadar bekler. Bkz. [Arama penceresi](#calling-window).
- Geçerli bir ISO 8601 tarih-saat olmayan bir değer (örneğin `10.06.2026`, `now`) **`400 VALIDATION_FAILED`** ile reddedilir.

### Arama penceresi {#calling-window}

Çoğu zaman müşterileri yalnız belirli saatlerde aramak istersiniz; örneğin yalnız hafta içi mesai saatlerinde, gece ya da hafta sonu değil. `calling_window` tam bunu sağlar: toplu aramanın yalnız sizin izin verdiğiniz saatlerde çevrilmesini güvence altına alır. Bu saatlerin dışına denk gelen çağrılar iptal edilmez; pencere bir sonraki kez açıldığında sırayla yapılır. Pencere, toplu aramadaki tüm çağrılara uygulanır.

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
| `timezone` | string | IANA timezone adını belirtir (örneğin `Europe/Istanbul`); pencere saatleri bu dilimde yorumlanır. Verilmezse `Europe/Istanbul` varsayılır. |
| `start` | string | Açılış saatini belirler, `HH:MM` (24 saat) biçiminde. |
| `end` | string | Kapanış saatini belirler, `HH:MM` biçiminde. `start`'tan **sonra** olmalıdır; gece-aşan (yarı geceyi geçen) pencere desteklenmez. |
| `days` | array | Pencerenin aktif olduğu **haftanın günlerini** listeler; ISO numaralandırma kullanır (**1 = Pazartesi … 7 = Pazar**) ve boş olmayan bir `1..7` alt kümesi gönderirsiniz. |

- **Takvim tarihi değil, haftalık tekrarlayan kuraldır.** `days` haftanın günleridir, yani pencere her hafta tekrarlanır.
- **Tüm toplu aramaya uygulanır.** İstekteki her çağrı aynı pencereye uyar.
- **`scheduled_at` de pencereye göre ayarlanır.** Çevirme, `scheduled_at` (göndermediyseniz şu an) anından başlar ve pencereye hizalanır. O an pencerenin dışına düşerse, pencere bir sonraki açılışına kadar bekler.
- **Verilmezse ya da `null` ise platform varsayılanı uygulanır.** `calling_window` göndermezseniz (ya da `null` gönderirseniz) platformun varsayılan mesai penceresi uygulanır. Bu varsayılan şu an **hafta içi (Pzt–Cuma) 09:00–18:00 Europe/Istanbul**'dur (`days: [1, 2, 3, 4, 5]`) ve platform bunu `CALLING_WINDOW_DEFAULT_*` ile değiştirebilir. Fiilen **uygulanan** pencere, yanıttaki `calling_window` alanında geri döner; böylece ne kullanıldığını her zaman görürsünüz.

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
| `batch_call_id` | string (UUID) | Oluşturulan toplu aramanın kimliği. **Her zaman gelir**, çünkü `/v1/calls/bulk` tek numara için bile bir toplu arama oluşturur. Toplu aramayı daha sonra [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) ile iptal etmek ya da çağrılarını [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile listelemek için bu değeri **saklayın**. Toplu aramaya bağlı olmayan tekil bir çağrı için [`POST /v1/calls`](create-call.md) kullanın. |
| `accepted` | int | Kuyruğa alınan çağrı sayısını verir. |
| `calling_window` | object | Bu toplu aramaya **uygulanan** arama penceresini yansıtır. Bu, gönderdiğiniz normalize pencere ya da göndermediyseniz platform varsayılanıdır; **her zaman gelir**. Bkz. [Arama penceresi](#calling-window). |

:::info Sonuçları eşleştirme — çağrı başına id dönmez
Tasarım gereği bulk yanıtı bir `batch_call_id` ile bir sayı döndürür ama **çağrı başına `call_id` döndürmez**; her toplu aramada 1000'e kadar id döndürmek gereksiz bir yük olurdu. Sonuçları iki yoldan eşleştirirsiniz:

- **`metadata` ile** (önerilen): her çağrıya kendi tanımlayıcınızı (örneğin `crm_contact_id`) ekleyin. Her sonuç bunu `call_metadata` olarak, hem [`POST /v1/calls/list`](list-calls/index.md) üzerinden hem de [`call-ended` webhook'uyla](webhooks.md) geri yansıtır. Böylece bizim `call_id`'mize hiç ihtiyaç duymadan her sonucu yönlendirirsiniz.
- **Toplu aramanın çağrılarını listeleyerek**: toplu aramayı [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile sayfalayın; bu endpoint her çağrıyı, kendi `call_id`'si, numarası ve güncel durumuyla döndürür.

Bir çağrının id'sini hemen geri almak istediğiniz tekil durumlar için ise tekil endpoint [`POST /v1/calls`](create-call.md) kullanın; o, çağrının `call_id`'sini döndürür.
:::

Çağrılar kuyruğa alınır ve arka planda yürütülür. Sonuçlar (transcript, ses kaydı, yapısal veri) her çağrı tamamlandıkça erişilebilir hâle gelir.

:::tip Toplu aramanın ilerleyişini takip edin
`/v1/calls/bulk` her zaman bir `batch_call_id` döndürdüğü için, toplu aramanın çağrılarını tamamlandıkça [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile sayfalayabilirsiniz. **Tüm** toplu aramanın ne zaman bittiğini, durum bazında bir dökümle birlikte öğrenmek için [`batch-ended` webhook'unu](webhooks.md#batch-ended) dinleyin.
:::

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `calls` boş ya da 1000'den fazla, gövde hatalı biçimli, `phone_number_id` eksik ya da benzeri bir doğrulama başarısız oldu. |
| `400` | `INVALID_PHONE_NUMBER` | Bir `calls[i].phone_number` normalize edilemedi. Hatalı indeks `extensions.index` içindedir. |
| `400` | `INVALID_VARIABLES` | Bir `variables` nesnesi limitleri aşıyor ya da geçersiz bir değer tipi kullanıyor. Çağrı-başı bir değer için hatalı indeks `extensions.index` içindedir; istek düzeyindeki bir ihlal `index: -1` bildirir. |
| `400` | `INVALID_METADATA` | Bir çağrının metadata'sı limitleri aşıyor ya da geçersiz bir değer tipi kullanıyor. Hatalı indeks `extensions.index` içindedir. |
| `400` | `PHONE_NUMBER_NOT_USABLE` | `phone_number_id` numarası mevcut ama giden arama için henüz hazırlanmamış. |
| `400` | `INVALID_CALLING_WINDOW` | `calling_window` geçersizdir: bozuk timezone, `start ≥ end`, boş/aralık-dışı `days` ya da bozuk `HH:MM`. |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | İsteğin kimlik doğrulaması başarısız oldu. |
| `404` | `ASSISTANT_NOT_FOUND` | Asistan bulunamadı ya da şirketinize ait değildir. |
| `404` | `PHONE_NUMBER_NOT_FOUND` | `phone_number_id` bilinmiyor, hatalı biçimli ya da şirketinize ait değil. [`GET /v1/phone-numbers`](list-phone-numbers.md) yanıtından birini seçin. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

:::caution Atomik istek
İstekteki **herhangi bir** numara, metadata ya da değişken geçersizse **hiçbir çağrı oluşturulmaz**; tüm istek reddedilir. Hatalı kaydı düzeltip (bkz. `extensions.index`) yeniden gönderin.
:::

:::warning Sunucu tarafında tekilleştirme yok
Eşzamanlı ya da tekrarlanan istekleri engelleyen bir sunucu kilidi yoktur. Aynı isteği ikinci kez göndermek yalnızca **ikinci bir toplu arama** oluşturur ve herkesi yeniden arar. Yalnızca önceki isteğin başarısız olduğundan eminken tekrar deneyin ve kendi tarafınızda tekilleştirin. Bkz. [SSS](../faq.md#is-it-safe-to-retry-requests).
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
      phone_number_id: phoneNumberId, // GET /v1/phone-numbers'tan gelen arayan numara
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
        # phone_number_id, GET /v1/phone-numbers'tan gelen arayan numaradır
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
