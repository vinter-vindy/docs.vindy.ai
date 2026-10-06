---
title: Çağrıları Listele
sidebar_label: Çağrıları Listele
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `POST /v1/calls/list`

Bu uç, şirketinizin çağrılarını döndürür; her çağrı kendi dökümü (transcript), yapay zekânın yapısal çıktı (structured output) şemanıza göre çıkardığı veriler, eklediğiniz metadata ve hazır olduğunda bir ses kaydı bağlantısıyla birlikte gelir. Sonuçlar opak bir cursor ile sayfa sayfa gelir. Listeyi asistana, yöne ve bir gün aralığına göre daraltabilirsiniz.

:::info Yalnızca sonlanmış çağrılar döndürülür
Yalnızca **size gösterilmeye hazır** çağrılar döndürülür. Bir çağrının hazır sayılması için:

- **Sonlanmış** bir duruma (`completed` ya da `failed`) ulaşmış olması ve
- `completed` ise **çağrı sonrası analizinin tamamlanmış** olması (böylece veriyi okuduğunuzda `call_structured_data` artık nihaidir; `failed` bir çağrıda analiz edilecek görüşme olmadığından, çağrı sonlanır sonlanmaz görünür) gerekir.

Hâlâ devam eden çağrılar bu listede **hiçbir zaman** yer almaz; tarayıcı (WebRTC) çağrıları ise API'de hiç görünmez. Bu davranış sayesinde senkronizasyonu tekrar tekrar çalıştırmanız güvenlidir (aynı kaydı iki kez işlemezsiniz).

Ses **kaydı**, çağrıdan bağımsız olarak **asenkron** işlenir; bu nedenle kaydın hazır olması, çağrının sonlanması ya da burada listelenmesi için **hiçbir zaman ön koşul değildir**. Çağrı, kaydı hâlâ hazırlanıyor olsa bile sonlandığı anda listede görünür: bir isteğinizde `call_recording.available` alanını `false` görürken, birkaç saniye sonra aynı isteği yinelediğinizde `true` görebilirsiniz. Bkz. [Kayıt alma](../../guides/recording-retrieval.md).
:::

Bir çağrı, **sona erdikten kısa süre sonra** erişilebilir hâle gelir; bu çoğunlukla birkaç saniye sürer, ancak çağrı sonrası analizin uzadığı durumlarda birkaç dakikayı bulabilir. Bu yüzden yeni sonlanmış bir çağrı, hemen ardından gönderdiğiniz istekte henüz görünmeyebilir.

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
  "status": "completed",
  "date_from": "2026-05-01",
  "date_to": "2026-05-31",
  "limit": 50,
  "cursor": null
}
```

## Gövde parametreleri

Tüm alanlar **isteğe bağlıdır**. Şirketinizin sonlanmış tüm çağrıları arasında gezinmek için boş bir gövde gönderebilirsiniz.

| Alan | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `assistant_id` | string (UUID) | — | Yalnızca bu asistanın yürüttüğü çağrıları getirmek için gönderirsiniz; kimliğini [`GET /v1/assistants`](../list-assistants.md) yanıtından alırsınız. Boş bırakırsanız her asistanın çağrısı gelir. |
| `call_bound_type` | string | — | Çağrıları yönüne göre daraltmak için `inbound` ya da `outbound` gönderirsiniz. Başka bir değer ya da alanı boş bırakmak yön filtresi uygulamaz. |
| `status` | string | — | Sayfayı yalnızca belirli bir `call_status`'e sahip çağrılarla daraltmak için bunu gönderirsiniz. Burada anlamlı değerler `completed` ve `failed`'dir; dört kuyruk durumu kabul edilir ama **boş sayfa** döndürür (aşağıdaki nota bakın). Filtre istemiyorsanız alanı atlarsınız. Geçersiz değer → `400 VALIDATION_FAILED`. |
| `date_from` | string (`YYYY-MM-DD`) | — | Listeyi, belirtilen gün ve sonrasında geçen çağrılarla daraltır; belirtilen gün de aralığa dahildir. Günler, Europe/Istanbul saatine göre takvim günü olarak yorumlanır. En baştan taramak için alanı boş bırakırsınız. Bkz. [Filtreleme ve Sayfalama](filtering-pagination.md). |
| `date_to` | string (`YYYY-MM-DD`) | — | Listeyi, belirtilen gün ve öncesinde geçen çağrılarla daraltır; belirtilen gün de aralığa dahildir. Günler yine Europe/Istanbul saatine göre yorumlanır. Şimdiye kadarki tüm çağrıları kapsamak için alanı boş bırakırsınız; `date_from`'u `date_to`'dan sonraya verirseniz istek reddedilir. Bkz. [Filtreleme ve Sayfalama](filtering-pagination.md). |
| `limit` | int | `200` | Sayfa başına en çok kaç çağrının döneceğini belirler (1–500). Alanı atlarsanız ya da `null` gönderirseniz varsayılan değer olan 200 kullanılır. |
| `cursor` | string | — | Bir önceki sayfadan dönen opak `next_cursor` değerini, sonraki sayfayı almak için buraya geri gönderirsiniz. İlk istekte göndermezsiniz. |

**Her `call_status` ne anlama gelir:**

- `completed` — çağrı bağlandı ve başarıyla tamamlandı.
- `failed` — çağrı yapıldı ama başarılı olmadı (cevap yok, meşgul, reddedildi ya da hata).
- `cancelled` — aranmadan önce kuyruktan iptal edildi.
- `pending` — kuyrukta, sırasını bekliyor.
- `scheduled` — gelecekteki bir `scheduled_at` zamanı için kuyrukta, henüz vakti gelmedi.
- `in_progress` — şu anda aranıyor ya da görüşme sürüyor.

Bu listede yalnızca `completed` ve `failed` görünür; diğer dördü kuyruk durumudur ve aşağıdaki notta ele alınır.

:::note Bekleyen, süren ve iptal çağrıları nerede görünür?
Bu liste **yalnızca sonlanmış** çağrıları (`completed` ve `failed`) döndürür. Henüz kuyrukta bekleyen, ileri bir tarihe planlanmış, hâlâ süren ya da aranmadan iptal edilmiş bir çağrı bu listede yer almaz; bu durumlardan birini `status` filtresinde isteseniz bile yanıt boş bir sayfa olur. Bu çağrılara şu iki uçtan ulaşırsınız:

- **Tek bir çağrı için:** o çağrıyı kimliğiyle [`GET /v1/calls/:callId`](../get-call.md) ile çekin; bu uç çağrıyı `pending`, `scheduled`, `in_progress` ve `cancelled` dahil **her durumda** döndürür.
- **Bütün bir toplu arama için:** toplu aramayı [`POST /v1/calls/batches/:batchId/calls`](../get-batch-calls.md) ile listeleyin; bu uç bir toplu aramanın yalnızca sonlanmış çağrılarını değil, **her durumdaki** çağrılarını döndürür.

`status` filtresi bu üç uçta ortaktır; bu nedenle altı değerin tamamını kabul eder. Ancak bu listede yalnızca `completed` ve `failed` bir sonuçla eşleşir; kalan dört kuyruk durumu boş bir sayfa döndürür.
:::

**Filtreleri birleştirme.** `assistant_id`, `call_bound_type`, `status` ve tarih aralığı birbirinden bağımsız filtrelerdir. Bunlardan dilediğinizi tek başına ya da birlikte gönderebilirsiniz; yanıtta, gönderdiğiniz filtrelerin **hepsini birden** sağlayan çağrılar döner (VE mantığı). Şirketinizin tüm sonlanmış çağrılarını baştan sona taramak için hiçbirini göndermeyin.

**Doğrulama kuralları:**

- `date_from`'un `date_to`'dan sonra olması → 400 (`DATE_RANGE_INVALID`).
- `limit`'in 1–500 dışında olması → 400 (`VALIDATION_FAILED`).
- `status`'ün `completed`, `failed`, `cancelled`, `pending`, `scheduled`, `in_progress` dışında bir değer olması → 400 (`VALIDATION_FAILED`).
- Tarih davranışı ve kabul edilen biçimler için [Filtreleme ve Sayfalama](filtering-pagination.md) sayfasına bakabilirsiniz.

## Sayfalama ve filtreleme

Sonucunuzu iki bağımsız mekanizma şekillendirir; bu ikisi birlikte sorunsuz çalışır.

- **Filtreler** (`assistant_id`, `call_bound_type`, `status`, `date_from` / `date_to`) *hangi* çağrıların kapsama gireceğini belirler. Tümü isteğe bağlıdır.
- **Cursor** (`cursor` / `limit`) bu kapsamın *içinde*, en yeniden en eskiye, sayfa sayfa ilerler.

İkisini ister ayrı ayrı ister birlikte kullanabilirsiniz. Hiç filtre ve cursor göndermezseniz, tüm çağrılarınız arasında en yeniden en eskiye gezinirsiniz. İlk istek en yeni `limit` kadar çağrıyı (varsayılan 200) döndürür; geriye kayıt kalmayana dek devam edersiniz. Filtre eklediğinizde kapsam daralır; o kapsam içinde de aynı şekilde sayfalarsınız.

Sayfalama kuralı her zaman aynıdır. Filtrelerinizi ilk istekte gönderin. Sonraki her istekte, aldığınız `next_cursor` değerini değiştirmeden geri gönderin ve `assistant_id`, `call_bound_type`, `status`, `date_from`, `date_to` değerlerini olduğu gibi koruyun. Sayfalar arasında yalnızca `limit` değişebilir. Bir cursor, konumunuzu tek bir sorgunun içinde tuttuğu için yalnız onu üreten endpoint ve filtreler için geçerlidir. Bir filtreyi değiştirip (ya da cursor'ı başka bir endpoint'e gönderip) cursor'ı yine de kullanırsanız istek `400 MALFORMED_CURSOR` ile reddedilir; bu durumda cursor'ı bırakıp yeni bir gezinme başlatmalısınız. `has_more` `false` olduğunda iş tamamlanır; bu noktada `next_cursor` da `null` olur.

Adım adım gezinme anlatımı, parametrelerin tam referansı, kabul edilen tarih biçimleri ve hazır reçeteler **[Filtreleme ve Sayfalama](filtering-pagination.md)** sayfasındadır.

## Yanıt (200 OK)

```json
{
  "data": [
    {
      "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
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
      "call_transcript": "[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy; son siparişinizle ilgili arıyorum. Kısa bir memnuniyet anketi için birkaç dakikanız var mı?\n[10:30:07] Müşteri: Tabii, buyurun.\n[10:30:11] Asistan: Teşekkürler. Genel deneyiminizden memnuniyetinizi 1 ile 5 arasında nasıl puanlarsınız?\n[10:30:18] Müşteri: 4 diyebilirim.\n[10:30:23] Asistan: Duyduğuma sevindim. Siparişinizle ilgili memnun kalmadığınız bir konu oldu mu?\n[10:30:29] Müşteri: Hayır, her şey yolundaydı.\n[10:30:34] Asistan: Harika. Herhangi bir konuda sizi bir temsilcimizin araması gerekir mi?\n[10:30:40] Müşteri: Hayır, gerek yok.\n[10:30:45] Asistan: Zaman ayırdığınız için çok teşekkür ederim, iyi günler dilerim!\n[10:30:50] Müşteri: Size de, teşekkürler.",
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
        "url": "https://...",
        "expires_at": "2026-05-16T10:31:27+00:00"
      }
    },
    {
      "call_id": "019fb39a-2e5f-7c14-9a8b-1d3c5e7f9a20",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "failed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905554445566",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T11:02:10+00:00",
      "call_ended_at": "2026-05-15T11:02:16+00:00",
      "call_created_at": "2026-05-15T11:01:58+00:00",
      "call_duration_seconds": 0,
      "call_end_reason": "User Busy",
      "call_transcript": null,
      "call_structured_data": null,
      "call_metadata": { "order_id": "ORD-4822" },
      "call_variables": { "first_name": "Deniz" },
      "call_recording": {
        "available": false
      }
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0…",
    "has_more": true,
    "limit": 50
  }
}
```

`pagination.next_cursor` **opak** bir token'dır; sonraki sayfayı almak için olduğu gibi geri gönderin, çözmeyin (bkz. [Filtreleme ve Sayfalama](filtering-pagination.md#cursors)).

`call_transcript` tek bir metin dizesidir; içindeki her konuşmacı değişimi bir satır sonu (`\n`) ile ayrılır. JSON satır sonlarını kaçışlı yazdığı için yukarıdaki değer tek satırda görünür. Gerçek satır sonlarıyla görüntülendiğinde ilk çağrının transcript'i şöyledir:

```text
[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy; son siparişinizle ilgili arıyorum. Kısa bir memnuniyet anketi için birkaç dakikanız var mı?
[10:30:07] Müşteri: Tabii, buyurun.
[10:30:11] Asistan: Teşekkürler. Genel deneyiminizden memnuniyetinizi 1 ile 5 arasında nasıl puanlarsınız?
[10:30:18] Müşteri: 4 diyebilirim.
[10:30:23] Asistan: Duyduğuma sevindim. Siparişinizle ilgili memnun kalmadığınız bir konu oldu mu?
[10:30:29] Müşteri: Hayır, her şey yolundaydı.
[10:30:34] Asistan: Harika. Herhangi bir konuda sizi bir temsilcimizin araması gerekir mi?
[10:30:40] Müşteri: Hayır, gerek yok.
[10:30:45] Asistan: Zaman ayırdığınız için çok teşekkür ederim, iyi günler dilerim!
[10:30:50] Müşteri: Size de, teşekkürler.
```

:::note Başarısız çağrılar da listede döner
Liste yalnızca başarılı görüşmeleri değil; `completed` çağrıların yanı sıra `failed` çağrıları da döndürür. Hiç bağlanmamış bir çağrının (örneğin cevapsız bir `failed`) konuşması veya ses kaydı olmaz; bu yüzden zaman temelli alanları `null` olur ve `call_recording.available` `false` döner. Kodunuz bu `null` değerlere dayanıklı olmalıdır.

`date_from` / `date_to` filtrelerinin, çağrının **başlangıç zamanına** (hiç bağlanmamış bir çağrı içinse **oluşturulma zamanına**) göre süzdüğünü unutmayın; böylece `no_answer` / `failed` çağrılar da tarih filtreli sonuçlara **dahil edilir**.

```json
{
  "call_id": "019fb3a4-8b6d-7f33-a2e1-4c9f0b2d6e18",
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
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
  "call_metadata": { "order_id": "ORD-4823" },
  "call_variables": { "first_name": "Selin" },
  "call_recording": { "available": false }
}
```
:::

## Yanıt alanları

**Üst düzey**

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Bu sayfadaki çağrıları içerir. |
| `pagination` | object | Sonraki sayfaya geçmek için kullandığınız standart [sayfalama nesnesini](filtering-pagination.md#paginated) taşır. |

**Call nesnesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string | Çağrıyı sistemimizde kalıcı ve benzersiz olarak tanımlayan kimliktir. Bir endpoint `:callId` beklediği her yerde bunu kullanırsınız: örneğin bu çağrıyı getirmek için [`GET /v1/calls/:callId`](../get-call.md), güncel bir kayıt bağlantısı için [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md). Çağrıyı [`call-ended` webhook](../webhooks.md) içeriğiyle eşleştirmek için de bunu kullanırsınız. |
| `batch_call_id` | string \| null | Bu çağrının ait olduğu toplu aramayı tanımlar ve [`POST /v1/calls/bulk`](../bulk-create-calls.md)'ın döndürdüğü `batch_call_id` ile aynıdır; bir toplu aramanın çağrılarını gruplamak için (örneğin `call-ended` webhook'larını işlerken) kullanırsınız. Çağrı bir toplu aramaya ait değilse `null` olur; bu durum, [`POST /v1/calls`](../create-call.md) ile açılan tekil çağrılarda ve herhangi bir gelen (inbound) çağrıda görülür. |
| `call_status` | string | Çağrının sonlanmış durumunu verir; `completed` ya da `failed` olur. Hâlâ devam eden veya kuyruktayken iptal edilmiş bir çağrı bu listeye hiç ulaşmaz. |
| `call_assistant_id` | string (UUID) | Bu çağrıyı yürüten asistanı tanımlar ve [`GET /v1/assistants`](../list-assistants.md) yanıtındaki `assistant_id` ile eşleşir. |
| `call_assistant_name` | string \| null | Bu asistanın görünen adını verir. Adın çözülemediği nadir durumlarda `null` olabilir. |
| `call_phone_number` | string \| null | Çağrıdaki karşı tarafın numarasını taşır: giden çağrıda aranan numara, gelen çağrıda ise arayanın numarasıdır (mevcut olduğunda E.164 biçiminde). Numaranın bulunmadığı durumlarda (örneğin numarasını gizleyen bir gelen arayan) `null` olur. |
| `call_bound_type` | `inbound` \| `outbound` | Çağrının yönünü belirtir: müşteri sizi aradıysa `inbound`, asistan müşteriyi aradıysa `outbound` olur. Bu alan asla `null` olmaz. |
| `call_started_at` | ISO 8601 (UTC) \| null | Çağrının fiilen başladığı anı gösterir; `+00:00` offset biçiminde yazılır (örneğin `2026-05-15T10:30:00+00:00`). Gerçek bir ISO-8601 ayrıştırıcıyla çözümleyin; `Z` son eki ya da sabit milisaniye hassasiyeti varsaymayın. Çağrı hiç bağlanmadıysa `null` olur. |
| `call_ended_at` | ISO 8601 (UTC) \| null | Çağrının sona erdiği anı gösterir, aynı biçimde yazılır. Çağrı hiç bağlanmadıysa `null` olur. |
| `call_created_at` | ISO 8601 (UTC) | Çağrı kaydını sistemimizde oluşturduğumuz anı gösterir, aynı biçimde yazılır. |
| `call_duration_seconds` | int \| null | Çağrının saniye cinsinden ne kadar sürdüğünü verir. Çağrı hiç bağlanmadıysa (örneğin cevapsız bir `failed` çağrı) `null` döner. |
| `call_end_reason` | string \| null | Çağrının sona ermesinin ham nedenini verir; serbest biçimli bir string olarak, eşlenmeden döner. Bkz. [Bitiş nedenleri](#end-reasons). |
| `call_transcript` | string \| null | Görüşmenin düz metin dökümünü taşır. Her satırın başında UTC `HH:MM:SS` zaman damgası, ardından Türkçe bir rol etiketi bulunur: asistan için `[HH:MM:SS] Asistan:`, arayan için `[HH:MM:SS] Müşteri:`. Satırlar birbirinden `\n` ile ayrılır. Çok kısa veya başarısız çağrılarda boş ya da `null` olabilir. |
| `call_structured_data` | object \| null | Yapay zekânın çıkardığı veriyi taşır; asistanınızın yapısal çıktı şemasının özellikleriyle anahtarlanan, düz (flat) bir nesne olarak döner (bkz. [Yapısal veri şekilleri](#structured-data-shapes)). Asistanın yapısal çıktı şeması yoksa, hiçbir şey çıkarılamadığında ya da saklanan veri ayrıştırılamadığında `null` olur. Nesnenin kendisi gelse bile, ilgili alan çıkarılamadığında *içindeki* tekil değerler `null` olabilir; bu yüzden her alanı kullanmadan önce kontrol edin. |
| `call_metadata` | object \| null | Çağrıyı oluştururken eklediğiniz metadata'yı, kendi kayıtlarınızla eşleştirebilmeniz için size aynen geri döndürür. Çağrı metadata olmadan oluşturulduysa `null` olur. Kurallar için bkz. [Metadata](../bulk-create-calls.md#metadata). |
| `call_variables` | object \| null | Bu çağrı için gönderilen şablon değişkenlerini taşır; çağrıyı oluştururken `variables` olarak gönderdiğiniz nesne aynen geri döner. Hiç gönderilmediyse (örneğin inbound çağrılar) `null` olur. |
| `call_recording` | object | Çağrının ses kaydının hazır olup olmadığını, hazırsa nereden indirileceğini belirten bir nesnedir. Alanları aşağıda listelenir. |

**`call_recording` nesnesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `available` | bool | Bu çağrı için indirilebilir bir ses kaydının bulunup bulunmadığını belirtir. |
| `url` | string \| yok | Yaklaşık **24 saat** geçerli, imzalı (presigned) bir indirme bağlantısı verir (varsayılan 86400s, yapılandırılabilir). Yalnızca `available: true` olduğunda bulunur. **Kalıcı olarak saklamayın**; gerektiğinde [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md) ile yeni bir tane alın. |
| `expires_at` | ISO 8601 (UTC) \| yok | Bağlantının geçerliliğini yitireceği anı gösterir. Yalnızca `available: true` olduğunda bulunur. |

### `call_recording.available: false` ne anlama gelir? {#recording-not-available}

`available: false`, iki farklı nedenden olabilir; biri geçici, biri kalıcıdır:

- **Henüz hazır değil (geçici).** Çağrı sonlanmıştır ama ses kaydı hâlâ kalıcı depolamaya aktarılıyordur; bu durum, çağrı biter bitmez ilk anlarda normaldir (bir çağrı, kaydından **bağımsız** olarak, sonlanır sonlanmaz bu listede görünür). Kısa süre sonra hazır olur: biraz sonra tekrar çekin ya da kayıt hazır olduğu an tetiklenen [`recording-ready` webhook'una](../webhooks.md#recording-ready) abone olun.
- **Hiç olmayacak (kalıcı).** Çağrı için hiç ses kaydı üretilmemiştir (örn. hiç ses alınamadan biten çok kısa veya başarısız bir çağrı) ya da kalıcı depolamaya aktarım **kalıcı olarak başarısız olmuştur**. Yeniden denemek işe yaramaz.

İkisini ayırmak için [`GET /v1/calls/:callId/recording-url`](../get-recording-url.md) endpoint'ini çağırın: `409 RECORDING_NOT_READY` hâlâ işleniyor demektir (geçici; birazdan tekrar deneyin), `404 RECORDING_NOT_AVAILABLE` ise hiç kayıt olmayacağını doğrular (kalıcı). Kaydın var olması gerektiğini düşündüğünüz hâlde sürekli `404` alıyorsanız Vindy ekibiyle iletişime geçin.

:::note Panelle olası farklılık
Vindy yönetim paneli, ses kayıtlarını başka kaynaklardan (örneğin geçici bir sağlayıcı bağlantısından) gösterebilir. API ise güvenlik gereği yalnızca kalıcı depolamaya yazılmış kayıtları sunar. Bir kaydın panelde görünüp API üzerinden görünmemesi beklenen bir durumdur; **müşteri tarafı için bağlayıcı olan, API yanıtıdır**.
:::

### Yapısal veri şekilleri {#structured-data-shapes}

`call_structured_data`, yapay zekânın **asistanınızın yapısal çıktı şemasına** göre çıkardığı veridir; anahtarları şemanızın özellikleri (örn. `age`, `would_recommend`) olan **düz (flat) bir nesne** olarak döner. Bir çıktı kimliğiyle anahtarlanmaz ve `name`/`result` sarmalayıcısı **yoktur**. Değerleri, şemanızın tanımladığı biçimde skaler değerler, iç içe nesneler ve diziler (nesne dizileri dahil) tutabilir. Asistanın yapısal çıktı şeması yoksa, hiçbir şey çıkarılamadığında ya da saklanan veri ayrıştırılamadığında `null` olur. Bunun ötesinde, nesnenin kendisi bulunsa bile **tekil alanlar `null` dönebilir**; bu, asistanın şemanızı çalıştırdığı ama o belirli değeri çıkaramadığı anlamına gelir. Bu yüzden her alanı kullanmadan önce kontrol edin. Örneğin bir *Order Summary* şeması şöyle dönebilir:

```json
{
  "call_structured_data": {
    "customer_name": "Jane Doe",
    "callback_requested": false,
    "coupon_code": null,
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

`call_status` (`completed` / `failed`) çağrının **türetilmiş özetidir**; `call_end_reason` ise sona ermenin **belirli ham nedenidir**, eşlenmeden döner. Normal bir görüşmeye hiç ulaşmayan bir giden çağrı **`call_status: failed`** ile ve `no_answer`, `busy` ya da `rejected` gibi bir nedenle döner. **`call_end_reason`'ı opak bir string olarak ele alın; sabit bir enum'a güvenmeyin.** Sık karşılaşılan değerler:

| Değer | Açıklama |
|---|---|
| `completed` | Çağrı normal biçimde tamamlandı. (`call_status: completed`.) |
| `user_hangup` | Müşteri (son kullanıcı) görüşmeyi kapattı. (`call_status: completed`.) |
| `no_answer` | Giden çağrı: çağrı hiç yanıtlanmadı (çalma zaman aşımı dahil). (`call_status: failed`.) |
| `busy` | Giden çağrı: hat meşguldü. (`call_status: failed`.) |
| `rejected` | Giden çağrı: aranan kişi çağrıyı reddetti. (`call_status: failed`.) |
| `error` | Çağrı, hattaki bir hata (sağlayıcı, model vb.) nedeniyle sona erdi. (`call_status: failed`.) |
| `silence_timeout` | Uzun bir sessizliğin ardından çağrı sonlandırıldı. |
| `end_call_phrase` | Tanımlı bir görüşme-bitirme ifadesi algılandı. |
| `idle_limit` | Hiçbir etkinlik olmadan geçen bir süre sonrası çağrı sonlandırıldı. |
| `max_duration` | Azami çağrı süresine ulaşıldı. |
| `end_call_tool` | Asistan, görüşme-bitirme aracıyla çağrıyı sonlandırdı. |

Başka değerler de görülebilir; bunlara **ham sağlayıcı/SIP durum metni** (örn. `User Busy`, `486`) da dahildir ve yeni sağlayıcılar ile bileşenler eklendikçe küme genişler. Özellikle yanıtlanmayan, meşgul ya da reddedilen bir giden çağrı, çoğu kez yukarıdaki düzgün `no_answer` / `busy` / `rejected` etiketi yerine bu ham sağlayıcı metnini taşır; bu yüzden o üç değeri garanti edilmiş sabitler değil, temsili kategoriler olarak görün. Bilinen değerlerden oluşan sabit bir liste tutuyorsanız, **tanımadığınız bir nedenle karşılaştığınızda hata fırlatmamalısınız**; değeri log'layıp işleme devam edin. Belirli neden yerine başarılı/başarısız (pass/fail) özetine ihtiyacınız olduğunda `call_end_reason`'ı değil `call_status`'ü okuyun.

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `400` | `VALIDATION_FAILED` | `limit` aralık dışı; hatalı biçimli gövde vb. |
| `400` | `DATE_RANGE_INVALID` | `date_from`, `date_to`'dan sonra |
| `400` | `INVALID_DATE_FORMAT` | Tarih düz bir `YYYY-MM-DD` değeri değil |
| `400` | `INVALID_CURSOR` | Cursor boş veya çözümlenemiyor |
| `400` | `MALFORMED_CURSOR` | Cursor çözümlenemiyor ya da farklı bir endpoint/filtre içindir |
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Kimlik doğrulama hataları |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` başlığındaki saniye kadar bekleyip tekrar deneyin. |

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

### Bir toplu aramanın çağrılarını listeleme

Bu endpoint toplu aramaya göre filtrelemez. Belirli bir toplu aramanın çağrıları arasında sayfa sayfa gezinmek için özel [`POST /v1/calls/batches/:batchId/calls`](../get-batch-calls.md) endpoint'ini kullanın; o endpoint, toplu aramanın henüz aranmamış, devam eden ve iptal edilmiş çağrılarını da içerir.

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
