---
title: Çağrıları Listele
sidebar_label: Çağrıları Listele
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/list`

Şirketinizin çağrılarını döndürür; her çağrı kendi dökümü (transcript), structured output'larınızın çıkardığı veriler, eklediğiniz metadata ve hazır olduğunda bir ses kaydı bağlantısıyla birlikte gelir. Sonuçlar opak bir cursor ile sayfa sayfa gelir ve asistan, kampanya, yön ve bir gün aralığıyla daraltılabilir.

:::info Yarım veri döndürülmez
Yalnızca **size gösterilmeye hazır** çağrılar döndürülür. Bir çağrının hazır sayılması için:

- **Sonlanmış** bir duruma ulaşmış olması — `completed` veya `failed` — ve
- Varsa, ses kaydı aktarımının sonuçlanmış olması (başarıyla ya da kalıcı olarak başarısız biçimde)

gerekir. Hâlâ devam eden çağrılar bu listede **hiçbir zaman** yer almaz; tarayıcı (WebRTC) çağrıları ise API'de hiç görünmez. Bu davranış, senkronizasyon mantığınızın idempotent çalışmasını sağlar.
:::

Bir çağrı **sona erdikten kısa süre sonra** müsait hâle gelir — ses kaydı kalıcı depolamaya aktarıldığında. Bu genellikle birkaç saniye, uzun kayıtlarda zaman zaman birkaç dakika sürer. Bir çağrı hazır olana dek ne bu listede ne de `call-ended` webhook'unda görünür; bu yüzden az önce biten bir çağrı, hemen ardından attığınız istekte henüz yer almayabilir.

:::tip Pull ve push aynı sinyali paylaşır
Bu endpoint, [`call-ended` webhook'unun](../webhooks.md) **pull** karşılığıdır: bir çağrı, hazır hâle geldiği anda hem burada görünür hem de o webhook'u tetikler. Anlık teslim için webhook'u; istediğiniz anda çekmek veya kaçırmış olabileceklerinizi tamamlamak için bu endpoint'i kullanın.
:::

---

## İstek

```http
POST https://api.vindy.ai/v1/calls/list
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "date_from": "2026-05-01",
  "date_to": "2026-05-31",
  "limit": 50,
  "cursor": null
}
```

## Gövde parametreleri

Tüm alanlar **isteğe bağlıdır** — şirketinizin sonlanmış tüm çağrıları arasında gezinmek için boş bir gövde gönderin.

| Alan | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `assistant_id` | string (UUID) | — | Yalnızca bu asistanın yürüttüğü çağrılar. [`GET /v1/assistants`](../list-assistants.md) yanıtından alınır. |
| `campaign_id` | string (UUID) | — | Yalnızca bu kampanyanın çağrıları — [`POST /v1/calls/bulk`](../bulk-create-calls.md) yanıtında dönen `batch_call_id`. |
| `call_bound_type` | string | — | `inbound` veya `outbound`. Başka bir değer (veya boş bırakmak) yön filtresi uygulamaz. |
| `date_from` | string (`YYYY-MM-DD`) | — | Bu günden itibaren çağrıları dahil eder. Bkz. [Filtreleme ve Sayfalama](filtering-pagination.md). |
| `date_to` | string (`YYYY-MM-DD`) | — | Bu gün dahil olacak şekilde çağrıları dahil eder. Bkz. [Filtreleme ve Sayfalama](filtering-pagination.md). |
| `limit` | int | `50` | Bu sayfadaki en fazla kayıt sayısı. Aralık: 1–200. |
| `cursor` | string | — | Önceki yanıttaki `next_cursor` değerinden alınan opak cursor. İlk istekte gönderilmez. |

**Filtreleri birleştirme.** `assistant_id`, `campaign_id`, `call_bound_type` ve tarih aralığı bağımsızdır — herhangi bir alt kümesini gönderin, birlikte çalışırlar (mantıksal VE). Şirketinizin tüm sonlanmış çağrılarını taramak için hepsini boş bırakın.

**Doğrulama kuralları:**

- `date_from`'un `date_to`'dan sonra olması → 400 (`DATE_RANGE_INVALID`).
- `limit`'in 1–200 dışında olması → 400 (`VALIDATION_FAILED`).
- Tarih davranışı ve kabul edilen biçimler için [Filtreleme ve Sayfalama](filtering-pagination.md) sayfasına bakabilirsiniz.

## Sayfalama ve filtreleme

Sonucu iki bağımsız mekanizma şekillendirir ve bu ikisi sorunsuz biçimde birlikte çalışır:

- **Filtreler** (`assistant_id`, `campaign_id`, `call_bound_type`, `date_from` / `date_to`) *hangi* çağrıların kapsama gireceğini belirler. Tümü isteğe bağlıdır.
- **Cursor** (`cursor` / `limit`) bu kapsamın *içinde*, **en yeniden en eskiye** sayfa sayfa ilerler.

İkisini ayrı ayrı da, birlikte de kullanabilirsiniz. Filtre ve cursor olmadan, tüm çağrılarınız arasında **en yeniden en eskiye** gezinirsiniz: ilk istek en yeni `limit` kadar çağrıyı (varsayılan 50) döndürür, geriye kayıt kalmayana dek devam edersiniz. Filtre eklediğinizde de aynı şekilde, yalnızca o kapsam içinde gezinirsiniz. Her durumda kural aynıdır: filtrelerinizi ilk istekte gönderin; sonraki her istekte aldığınız `next_cursor` değerini — **değiştirmeden** — geri gönderin ve `assistant_id`, `campaign_id`, `call_bound_type`, `date_from`, `date_to`, `limit` değerlerini olduğu gibi koruyun. Cursor, konumunuzu *o belirli sorgunun içinde* kodlar; bu yüzden gezinme sırasında bir filtreyi değiştirmek anlamsız sonuçlar üretir. `has_more` `false` olduğunda (bu noktada `next_cursor` da `null` olur) iş tamamlanmıştır.

Parametrelerin tam referansı, kabul edilen tarih biçimleri ve hazır reçeteler **[Filtreleme ve Sayfalama](filtering-pagination.md)** sayfasındadır.

## Yanıt (200 OK)

```json
{
  "data": [
    {
      "call_id": "sess_5f3a9c2b1e7d",
      "call_status": "completed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905551112233",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T10:30:00+00:00",
      "call_ended_at": "2026-05-15T10:31:27+00:00",
      "call_created_at": "2026-05-15T10:29:55+00:00",
      "call_duration_seconds": 87,
      "call_end_reason": "completed",
      "call_transcript": "[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy. Müşteri memnuniyeti anketimiz kapsamında size birkaç kısa soru sormak istiyorum — şu an uygun musunuz?\n[10:30:07] Müşteri: Evet, müsaitim.\n[10:30:11] Asistan: Teşekkürler. Öncelikle yaşınızı öğrenebilir miyim?\n[10:30:16] Müşteri: Otuz iki.\n[10:30:21] Asistan: Aldığınız hizmetten genel memnuniyetinizi 1 ile 5 arasında nasıl puanlarsınız?\n[10:30:29] Müşteri: 4 diyebilirim.\n[10:30:34] Asistan: Peki talebinizin ne kadar hızlı çözüldüğünü 1 ile 5 arasında nasıl değerlendirirsiniz?\n[10:30:42] Müşteri: 5.\n[10:30:47] Asistan: Hizmetimizi bir arkadaşınıza veya iş arkadaşınıza tavsiye eder misiniz?\n[10:30:53] Müşteri: Evet, ederim.\n[10:30:58] Asistan: Çok teşekkür ederiz, görüşleriniz bizim için çok değerli. İyi günler dilerim!\n[10:31:05] Müşteri: Rica ederim, size de.",
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
        "url": "https://...",
        "expires_at": "2026-05-15T10:36:27+00:00"
      }
    },
    {
      "call_id": "sess_6a4b0d3c2f81",
      "call_status": "completed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905554445566",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T11:02:10+00:00",
      "call_ended_at": "2026-05-15T11:02:20+00:00",
      "call_created_at": "2026-05-15T11:01:58+00:00",
      "call_duration_seconds": 10,
      "call_end_reason": "user_hangup",
      "call_transcript": "[11:02:10] Asistan: Merhaba, ben Vindy; müşteri memnuniyeti anketi için arıyorum. Şu an uygun musunuz?\n[11:02:16] Müşteri: Pardon, yanlış numara.",
      "call_structured_data": null,
      "call_metadata": null,
      "call_variables": { "first_name": "Batu" },
      "call_recording": {
        "available": false
      }
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0xNVQxMTowMjoxMCswMDowMCIsImkiOiJzZXNzXzZhNGIwZDNjMmY4MSJ9",
    "has_more": true,
    "limit": 50
  }
}
```

`call_transcript` tek bir metin dizesidir; içindeki her konuşma sırası bir satır sonu (`\n`) ile ayrılır. JSON satır sonlarını kaçışlı yazdığı için yukarıdaki değer tek satırda görünür. Gerçek satır sonlarıyla görüntülendiğinde ilk çağrının transcript'i şöyledir:

```text
[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy. Müşteri memnuniyeti anketimiz kapsamında size birkaç kısa soru sormak istiyorum — şu an uygun musunuz?
[10:30:07] Müşteri: Evet, müsaitim.
[10:30:11] Asistan: Teşekkürler. Öncelikle yaşınızı öğrenebilir miyim?
[10:30:16] Müşteri: Otuz iki.
[10:30:21] Asistan: Aldığınız hizmetten genel memnuniyetinizi 1 ile 5 arasında nasıl puanlarsınız?
[10:30:29] Müşteri: 4 diyebilirim.
[10:30:34] Asistan: Peki talebinizin ne kadar hızlı çözüldüğünü 1 ile 5 arasında nasıl değerlendirirsiniz?
[10:30:42] Müşteri: 5.
[10:30:47] Asistan: Hizmetimizi bir arkadaşınıza veya iş arkadaşınıza tavsiye eder misiniz?
[10:30:53] Müşteri: Evet, ederim.
[10:30:58] Asistan: Çok teşekkür ederiz, görüşleriniz bizim için çok değerli. İyi günler dilerim!
[10:31:05] Müşteri: Rica ederim, size de.
```

:::note Başarısız çağrılar da listede döner
Liste yalnızca başarılı görüşmeleri değil; `completed` çağrıların yanı sıra `failed` çağrıları da döndürür. Hiç bağlanmamış bir çağrının (örneğin cevapsız bir `failed`) konuşması veya ses kaydı olmaz; bu yüzden zaman temelli alanları `null` olur ve `call_recording.available` `false` döner. Kodunuz bu `null` değerlere dayanıklı olmalıdır:

```json
{
  "call_id": "sess_7b5c1e4d3a09",
  "call_status": "failed",
  "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
  "call_assistant_name": "Vindy - Asistan",
  "call_phone_number": "+905557778899",
  "call_bound_type": "outbound",
  "call_started_at": null,
  "call_ended_at": null,
  "call_created_at": "2026-05-15T11:05:00+00:00",
  "call_duration_seconds": null,
  "call_end_reason": "no_answer",
  "call_transcript": null,
  "call_structured_data": null,
  "call_metadata": { "crm_contact_id": "CNT-90418" },
  "call_variables": { "first_name": "Batu" },
  "call_recording": { "available": false }
}
```
:::

## Yanıt alanları

**Üst düzey**

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Bu sayfadaki çağrılar. |
| `pagination` | object | Standart [sayfalama nesnesi](filtering-pagination.md#paginated). |

**Call nesnesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string | Çağrının sistemimizdeki kalıcı ve benzersiz kimliği. Bir endpoint `:callId` aldığı her yerde kullanılır — örneğin bu çağrıyı getirmek için [`GET /v1/calls/:callId`](../get-call.md) veya güncel bir kayıt bağlantısı için [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md) — ayrıca çağrıyı [`call-ended` webhook](../webhooks.md) içeriğiyle eşleştirmek için. |
| `call_status` | string | `completed` \| `failed`. Devam eden ve kuyrukta iptal edilen çağrılar bu listeye hiç ulaşmaz. |
| `call_assistant_id` | string (UUID) \| null | Çağrıyı yöneten asistan. |
| `call_assistant_name` | string \| null | Asistanın görünen adı. |
| `call_phone_number` | string \| null | Aranan veya arayan numara (mevcut olduğunda E.164 biçiminde). Numara yoksa `null` (örneğin numarasını gizleyen bir gelen arayan). |
| `call_bound_type` | string \| null | `inbound` \| `outbound` \| `null` |
| `call_started_at` | ISO 8601 (UTC) \| null | Çağrının fiilen başladığı an, `+00:00` offset biçiminde (örn. `2026-05-15T10:30:00+00:00`). Gerçek bir ISO-8601 ayrıştırıcıyla çözümleyin — `Z` son eki veya sabit milisaniye hassasiyeti varsaymayın. Çağrı hiç bağlanmadıysa `null`. |
| `call_ended_at` | ISO 8601 (UTC) \| null | Çağrının sona erdiği an, aynı biçimde. Çağrı hiç bağlanmadıysa `null`. |
| `call_created_at` | ISO 8601 (UTC) | Çağrı kaydını oluşturduğumuz an, aynı biçimde. |
| `call_duration_seconds` | int \| null | Çağrı süresi (saniye). |
| `call_end_reason` | string \| null | Serbest biçimli bir string — çağrının sona erme ham nedeni, eşlenmeden döner. Bkz. [Bitiş nedenleri](#end-reasons). |
| `call_transcript` | string \| null | Görüşmenin düz metin dökümü. Her satır `[HH:MM:SS] Asistan:` (asistan, `Asistan`) veya `[HH:MM:SS] Müşteri:` (arayan, `Müşteri`) biçimindedir — Türkçe rol etiketleri, önlerinde UTC `HH:MM:SS` zaman damgasıyla — ve satırlar `\n` ile ayrılır. Çok kısa veya başarısız çağrılarda boş ya da null olabilir. |
| `call_structured_data` | object \| null | Yapay zekânın çıkardığı veri; asistanınızın yapısal çıktı şemasının özellikleriyle anahtarlanan düz (flat) bir nesne olarak döner — bkz. [Yapısal veri şekilleri](#structured-data-shapes). Asistanın yapısal çıktı şeması yoksa, hiçbir şey çıkarılamadığında (veya saklanan veri ayrıştırılamadığında) `null`. |
| `call_metadata` | object \| null | Çağrıyı [`POST /v1/calls/bulk`](../bulk-create-calls.md) ile oluştururken eklediğiniz metadata; korelasyon için size aynen geri döner. Çağrı metadata olmadan oluşturulduysa `null`. Kurallar için bkz. [Metadata](../bulk-create-calls.md#metadata). |
| `call_variables` | obje \| null | Bu çağrı için gönderilen şablon değişkenleri, aynen geri döner — çağrıyı oluştururken `variables` olarak gönderdiğiniz obje. Gönderilmediyse (ör. inbound çağrılar) `null`. |
| `call_recording` | object | Ses kaydı durumu ve bağlantısı (aşağıda). |

**`call_recording` nesnesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `available` | bool | Bu çağrı için indirilebilir bir ses kaydının mevcut olup olmadığı. |
| `url` | string \| yok | İmzalı (presigned) bağlantı; **~24 saat** geçerli (varsayılan 86400s, yapılandırılabilir). Yalnızca `available: true` olduğunda bulunur. **Kalıcı olarak saklamayın** — gerektiğinde [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md) ile taze bir tane alın. |
| `expires_at` | ISO 8601 (UTC) \| yok | Bağlantının geçerliliğini yitireceği an. Yalnızca `available: true` olduğunda bulunur. |

### `call_recording.available: false` ne anlama gelir? {#recording-not-available}

Bu durum **kalıcıdır (terminal)**; yeniden denemek sonucu değiştirmez. Bir çağrı bu listede görünüyorsa, ses kaydı durumu kesinleşmiş demektir. Bu endpoint, ses kaydı aktarımı hâlâ süren çağrıları zaten döndürmez. `available: false` aşağıdaki durumlardan birini ifade eder:

- Çağrı için herhangi bir ses kaydı üretilmemiştir (örneğin hiç ses alınamadan biten çok kısa veya başarısız bir çağrı).
- Ses kaydının kalıcı depolamaya aktarımı **kalıcı olarak başarısız olmuştur**.

Taze bir bağlantı için [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md) endpoint'ini çağırın: `404 RECORDING_NOT_AVAILABLE` hiç kayıt olmadığını doğrular, `409 RECORDING_NOT_READY` ise henüz indirilebilir olmadığını belirtir. Kaydın var olması gerektiğini düşünüyorsanız Vindy ekibiyle iletişime geçin.

:::note Panelle olası farklılık
Vindy yönetim paneli, ses kayıtlarını başka kaynaklardan (örneğin geçici bir sağlayıcı bağlantısından) gösterebilir. API ise güvenlik gereği yalnızca kalıcı depolamaya yazılmış kayıtları sunar. Bir kaydın panelde görünüp API üzerinden görünmemesi beklenen bir durumdur; **müşteri tarafı için bağlayıcı olan, API yanıtıdır**.
:::

### Yapısal veri şekilleri {#structured-data-shapes}

`call_structured_data`, yapay zekânın **asistanınızın yapısal çıktı şemasına** göre çıkardığı veridir; anahtarları şemanızın özellikleri (örn. `age`, `would_recommend`) olan **düz (flat) bir nesne** olarak döner. Bir çıktı kimliğiyle anahtarlanmaz ve `name`/`result` sarmalayıcısı **yoktur**. Değerleri, şemanızın tanımladığı biçimde skaler değerler, iç içe nesneler ve diziler (nesne dizileri dahil) tutabilir. Asistanın yapısal çıktı şeması yoksa, hiçbir şey çıkarılamadığında ya da saklanan veri ayrıştırılamadığında `null` olur. Örneğin bir *Order Summary* şeması şöyle dönebilir:

```json
{
  "call_structured_data": {
    "customer_name": "Jane Doe",
    "callback_requested": false,
    "orders": [
      { "product": "Wireless Keyboard", "quantity": 2, "in_stock": true },
      { "product": "USB-C Cable", "quantity": 5, "in_stock": false }
    ],
    "shipping": {
      "city": "Istanbul",
      "methods": ["standard", "express"]
    }
  }
}
```

Nesnenin anahtarları ve şekli, asistanınız için tanımladığınız yapısal çıktı şemasını birebir yansıtır ([`GET /v1/assistants`](../list-assistants.md) yanıtında döner); böylece alan alan ayrıştırabilirsiniz.

## Çağrı bitiş nedenleri {#end-reasons}

`call_end_reason` **serbest biçimli bir string'tir** — çağrının sona erme ham nedeni, eşlenmeden döner. **Opak bir string olarak ele alın; sabit bir enum'a güvenmeyin.** Sık karşılaşılan değerler:

| Değer | Açıklama |
|---|---|
| `completed` | Çağrı normal biçimde tamamlandı. |
| `user_hangup` | Müşteri (son kullanıcı) görüşmeyi kapattı. |
| `no_answer` | Giden çağrı: çağrı hiç yanıtlanmadı. |
| `busy` | Giden çağrı: hat meşguldü veya çağrı reddedildi. |
| `silence_timeout` | Uzun bir sessizliğin ardından çağrı sonlandırıldı. |
| `end_call_phrase` | Tanımlı bir görüşme-bitirme ifadesi algılandı. |
| `idle_limit` | Hiçbir etkinlik olmadan geçen bir süre sonrası çağrı sonlandırıldı. |
| `max_duration` | Azami çağrı süresine ulaşıldı. |
| `end_call_tool` | Asistan, görüşme-bitirme aracıyla çağrıyı sonlandırdı. |
| `error` | Çağrı, hattaki bir hata (sağlayıcı, model vb.) nedeniyle sona erdi. |

Başka değerler de görülebilir; bunlara **ham sağlayıcı/SIP durum metni** (örn. `User Busy`, `486`) da dahildir ve yeni sağlayıcılar ile bileşenler eklendikçe küme genişler. Bilinen değerlerden oluşan sabit bir liste tutuyorsanız, **tanımadığınız bir nedenle karşılaştığınızda hata fırlatmamalısınız**; değeri log'layıp işleme devam edin.

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` aralık dışı; hatalı biçimli gövde vb. |
| `400` | `DATE_RANGE_INVALID` | `date_from`, `date_to`'dan sonra |
| `400` | `INVALID_DATE_FORMAT` | Tarih düz bir `YYYY-MM-DD` değeri değil |
| `400` | `INVALID_CURSOR` | Cursor boş veya çözümlenemiyor |
| `400` | `MALFORMED_CURSOR` | Cursor içeriği beklenen yapıda değil |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Kimlik doğrulama hataları |
| `429` | `RATE_LIMITED` | Dakikalık hız limiti aşıldı |

## Örnekler

### Tüm sayfalarda gezinme

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# İlk istek (cursor yok)
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":50}'

# Yanıt: { "data": [50 çağrı], "pagination": { "next_cursor": "X", "has_more": true } }

# Sonraki istek (next_cursor değerini kullanın)
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":50,"cursor":"X"}'

# has_more: false döndüğünde durun
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
async function listAllCalls(assistantId) {
  const calls = [];
  let cursor = undefined;

  do {
    const response = await fetch("https://api.vindy.ai/v1/calls/list", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ assistant_id: assistantId, limit: 50, cursor }),
    });

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

const calls = await listAllCalls("8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01");
console.log(`${calls.length} çağrı`);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def list_all_calls(assistant_id):
    calls = []
    cursor = None

    while True:
        payload = {"assistant_id": assistant_id, "limit": 50}
        if cursor:
            payload["cursor"] = cursor

        response = requests.post(
            "https://api.vindy.ai/v1/calls/list",
            headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
            json=payload,
        )
        if not response.ok:
            error = response.json()
            raise RuntimeError(f"{error.get('extensions', {}).get('code')}: {error.get('message')}")

        body = response.json()
        calls.extend(body["data"])
        cursor = body["pagination"]["next_cursor"]
        if not cursor:
            break

    return calls

calls = list_all_calls("8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01")
print(f"{len(calls)} çağrı")
```

</TabItem>
</Tabs>

### Kampanyaya göre filtreleme

```bash
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"campaign_id":"84213f7a-58cc-4372-a567-0e02b2c3d479","limit":50}'
```

### Tarih aralığı — tek gün

```bash
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "date_from": "2026-05-23",
    "date_to": "2026-05-23"
  }'
```

`date_from` ve `date_to`, **Europe/Istanbul** dilimine göre yorumlanan, iki ucu da dahil tam günlerdir; böylece **23 Mayıs gününün tamamı** kapsama dâhil olur. Bkz. [tarih anlamı](filtering-pagination.md#range-semantics).

### Tarih aralığı — bir takvim ayı

```bash
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "date_from": "2026-05-01",
    "date_to": "2026-05-31"
  }'
```

Düzenli senkronizasyon örnekleri için [artımlı senkronizasyon rehberine](../../guides/incremental-sync.md) bakabilirsiniz.
