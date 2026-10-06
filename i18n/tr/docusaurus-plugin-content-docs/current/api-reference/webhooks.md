---
title: Webhook'lar
sidebar_label: Webhook'lar
sidebar_position: 9
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Webhook'lar (Olay Teslimatı)

Vindy, önemli bir olay gerçekleştiğinde şirketiniz için tanımlı webhook adresine bir **HTTP POST** gönderir. Böylece [`POST /v1/calls/list`](list-calls/index.md)'i sürekli sorgulamak yerine olaylara neredeyse anında tepki verebilirsiniz. **Üç olay tipi** vardır:

| `event_type` | Ne zaman tetiklenir | `data` nedir |
|---|---|---|
| [`call-ended`](#call-ended) | Bir **fiziksel çağrı** sonlanmış bir duruma (`completed` veya `failed`) ulaştığında **veya** kuyrukta bekleyen bir çağrı iptal edildiğinde; ister tek başına (Vindy panelinden ya da [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile) ister bir [toplu iptalin](cancel-batch.md) parçası olarak (`call_status: cancelled`, minimal gövde). | Tam çağrı nesnesi (veya `null`). |
| [`recording-ready`](#recording-ready) | Bir çağrının **ses kaydı** kalıcı depolamaya aktarılıp indirilebilir hâle geldiğinde. O çağrının `call-ended`'inden **sonra**, **aynı `call_id`** ile tetiklenir. Yalnızca kayıt gerçekten hazır olduğunda tetiklenir (başarısız veya hiç olmayan kayıt için asla). | **Yalın** bir gövdedir: `call_id`, `batch_call_id`, `call_duration_seconds`, gönderdiğiniz `call_metadata` ve hazır bir `call_recording` (`available: true` + indirme `url`'i) taşır. Tam çağrı nesnesi değildir. |
| [`batch-ended`](#batch-ended) | Bir **toplu arama** `completed` olduğunda (içindeki her çağrı sonlanmış bir duruma ulaştığında) **veya** bir toplu arama iptal edildiğinde (Vindy panelinden ya da [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) ile) (`status: cancelled`). Bir kez gönderilir. | Durum bazında dökümü olan bir toplu arama özeti (veya `null`). |

Üçü de aynı teslimat kurallarına tabidir (yeniden deneme, en az bir kez teslimat); bkz. [Davranış](#behavior).

---

## Kurulum

Bir webhook aboneliği üç bilgiden oluşur: olayların gönderileceği URL, opsiyonel özel header'lar ve almak istediğiniz olaylar.

- **URL** — olayların gönderileceği adres. Herkese açık bir `https://` adresi olmalıdır (düz `http`, özel/yerel ağ, loopback ve bulut-metadata adresleri güvenlik nedeniyle reddedilir).
- **Özel header'lar (opsiyonel)** — webhook endpoint'iniz için kaydettiğiniz özel HTTP header'lar; **her teslimatta her zaman aynı şekilde** gönderilir. İsteğin gerçekten Vindy'den geldiğini kendi tarafınızda doğrulamak için kullanın (örn. `{"X-API-Key": "<sizin-gizli-anahtarınız>"}`). Vindy'nin kendi standart header'ları (`Content-Type`, `User-Agent`, `X-Vindy-*`) her zaman önceliklidir ve ezilemez.
- **Olaylar** — almak istediğiniz olaylar (herhangi bir kombinasyon): `call.ended`, `recording.ready` ve `campaign.ended` (batch-ended olayı).

:::info Kurulum henüz self-servis değil
Webhook endpoint'leri **Vindy ekibi tarafından** ayarlanır; bunun için henüz self-servis bir ekran yok. Webhook'ları etkinleştirmek için yukarıdaki üç bilgiyle (URL, varsa özel header'lar ve almak istediğiniz olaylar) bizimle iletişime geçin; aboneliği hesabınız için biz tanımlarız. İleride bunları (URL, header'lar veya olay seti) değiştirmek de şimdilik bizim üzerimizden yapılır.
:::

:::note Kimlik doğrulama: değişmez (statik) bir yöntem kullanın
Vindy, webhook gönderirken **önce bir token alıp sürekli kimlik doğrulayan** akışları (OAuth token-exchange, süreli/dönen token vb.) **desteklemez**. İsteği doğrulamak için **değişmez (statik) bir güvenlik yöntemi** ayarlayın. Örneğin sabit bir API anahtarını özel bir header'da (`X-API-Key`) gönderin. Kaydettiğiniz header'lar her teslimatta aynen tekrarlanır; bu yüzden dönen bir değer değil, sabit bir sır kullanın.
:::

## İstek header'ları

Vindy, olay tipinden bağımsız olarak her teslimatta aynı header'ları gönderir:

| Header | Değer | Not |
|---|---|---|
| `Content-Type` | `application/json` | Gövde her zaman JSON'dur. |
| `User-Agent` | `Vindy-Webhooks/1.0` | İsteği gönderenin Vindy'nin webhook teslim sistemi olduğunu belirtir; değeri her teslimatta aynıdır. |
| `X-Vindy-Event` | `call.ended` \| `recording.ready` \| `campaign.ended` | Teslim edilen olayın türünü bildirir. Olay adı bu header'da **noktalı** yazılır; bu, gövdedeki **tireli** `event_type` değerinden bilinçli olarak farklıdır (`call.ended` ↔ `call-ended`, `recording.ready` ↔ `recording-ready`, `campaign.ended` ↔ `batch-ended`). Gelen isteği türüne göre yönlendirirken ister bu header'ı ister gövdedeki `event_type`'ı kullanabilirsiniz. |
| `X-Vindy-Delivery-Id` | `<uuid>` | Bu teslimatın benzersiz kimliğidir ve aynı olay yeniden denense bile değişmez. Aynı olayı birden çok kez alırsanız, yinelenenleri ayıklamak (idempotency) için bu değeri kullanın. Aynı değer gövdede `delivery_id` olarak da bulunur. |
| _özel header'lar_ | tanımlandığı gibi | Webhook'unuz için kaydettiğiniz özel header'lar her teslimatta aynen gönderilir. Bir özel header, yukarıdaki standart Vindy header'larından biriyle çakışırsa her zaman Vindy'nin değeri geçerli olur; bu header'lar geçersiz kılınamaz. |

## `call-ended` olayı {#call-ended}

:::caution İptal edilen kuyruk çağrısı da `call-ended` üretir
`call-ended` olayı iki durumda tetiklenir:

1. **Gerçek bir çağrı sonlandığında:** çağrı `completed` ya da `failed` gibi sonlanmış bir duruma ulaşır.
2. **Kuyrukta bekleyen bir çağrı iptal edildiğinde:** bu iptal ister tek bir çağrıyı kapsasın (Vindy panelinden ya da [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile) ister bir [toplu iptalin](cancel-batch.md) parçası olsun.

İptal edilen **her** kuyruk çağrısı **kendi** `call-ended` olayını üretir: `call_status` `"cancelled"` olur ve gövde minimaldir (transcript, yapısal veri ve kayıt alanları `null` gelir). `call_metadata` ile `call_variables` aynen geri döndüğü için her olayı ilgili çağrıyla birebir eşleştirebilirsiniz. Ayrıntı için bkz. [iptaller webhook'lara nasıl yansır](#batch-ended).
:::

Vindy, JSON gövdeli bir HTTP `POST` gönderir. Gövde üst düzeyde `event_type`, `delivery_id` ve `call_id` taşır; asıl içerik ise `data` alanındadır. `data`, **tam çağrı nesnesidir**; [`GET /v1/calls/:callId`](get-call.md) ve [`POST /v1/calls/list`](list-calls/index.md) yanıtlarındaki çağrı nesnesiyle birebir aynı yapıdadır.

```http
POST webhook-url
Content-Type: application/json
User-Agent: Vindy-Webhooks/1.0
X-Vindy-Event: call.ended
X-Vindy-Delivery-Id: 0190aa00-1c5a-7000-8000-abc123def456
<sizin özel header'larınız, örn. X-API-Key: ...>
```

```json
{
  "event_type": "call-ended",
  "delivery_id": "0190aa00-1c5a-7000-8000-abc123def456",
  "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
  "data": {
    "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
    "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
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
      "arama_sonucu": "tamamlandi",
      "genel_memnuniyet_puani": 4,
      "geri_arama_talebi": false,
      "ilgilenilen_urunler": null
    },
    "call_metadata": { "order_id": "ORD-4821" },
    "call_variables": { "first_name": "Elif" },
    "call_recording": {
      "available": true,
      "url": "https://your-bucket.s3.eu-central-1.amazonaws.com/call-records/...ogg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=86400&X-Amz-Signature=...",
      "expires_at": "2026-06-09T10:31:27+00:00"
    }
  }
}
```

`data.call_transcript` tek bir metin dizesidir; içindeki konuşma sıraları satır sonlarıyla (`\n`) ayrılır, bu yüzden yukarıdaki kaçışlı değer tek satırda görünür. Transcript biçimi ve gerçek satır sonlarıyla görüntülenmiş bir örnek için bkz. [Çağrıları Listele](list-calls/index.md).

:::note Alan sırası ve kodlama
Teslim ettiğimiz JSON'da alanlar bu sayfadaki örneklerle **aynı sırayı** izler: istek `event_type` ve `delivery_id` ile başlar, `data`'nın ilk alanı ise `call_id`'dir. ASCII olmayan karakterler ham UTF-8 olarak gönderilir (`\u` ile kaçışlanmaz). Yine de alan sırasının garanti olduğunu varsaymayın; alanlara her zaman **adlarıyla** erişin.
:::

### Üst düzey alanlar

| Alan | Tür | Açıklama |
|---|---|---|
| `event_type` | string | Bu olay için `call-ended` değerini taşır. |
| `delivery_id` | string (UUID) | Bu teslimatın kimliğidir. Yeniden denemelerde aynı kaldığı için, aynı olay birden çok kez gelirse bununla tekilleştirin. `X-Vindy-Delivery-Id` header'ında da bulunur. |
| `call_id` | string \| null | Çağrıyı tanımlayan kalıcı kimliktir; çağrının tüm yaşamı boyunca (kuyrukta → devam ederken → sonlanmış) aynı kalır. `data.call_id` ile aynıdır ve diğer tüm API yanıtlarındaki (ör. [`POST /v1/calls/list`](list-calls/index.md), [`GET /v1/calls/:callId`](get-call.md)) `call_id` ile eşleşir; çağrıyı kendi kayıtlarınızla bununla eşleştirirsiniz. `data`'yı açmadan tekilleştirip yönlendirebilmeniz için üst seviyede de yer alır. Kimlik yoksa (nadir) `null` olur. |
| `data` | object \| null | Tam çağrı nesnesidir; tüm alanlar aşağıda listelenir. Nadir durumlarda kaynak kayda ulaşılamazsa `null` döner. |

### `data` — çağrı nesnesi

`data`, [`GET /v1/calls/:callId`](get-call.md)'in döndürdüğü nesnenin aynısıdır:

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string | Çağrının kalıcı kimliğidir; üst düzeydeki `call_id` ile aynı değeri taşır. |
| `batch_call_id` | string \| null | Bu çağrının ait olduğu toplu aramayı tanımlar; [`POST /v1/calls/bulk`](bulk-create-calls.md)'ın döndürdüğü `batch_call_id` ile aynıdır. Bir toplu aramanın `call-ended` olaylarını gruplamak için kullanırsınız. Çağrı bir toplu aramaya ait değilse `null` olur; bu durum, [`POST /v1/calls`](create-call.md) ile açılan tekil çağrılarda ve herhangi bir gelen (inbound) çağrıda görülür. |
| `call_status` | string | Çağrının durumunu verir; `completed`, `failed` ya da `cancelled` değerlerinden biridir. `cancelled`, kuyrukta bekleyen bir çağrı iptal edildiğinde görünür (ister tek başına ister bir [toplu iptalin](cancel-batch.md) parçası olarak) ve o teslimat minimal bir gövde taşır ([aşağıya](#a-cancelled-single-call) bakın). Fiziksel çağrılar yalnızca `completed` veya `failed` olur. |
| `call_assistant_id` | string (UUID) \| null | Bu çağrıyı yürüten asistanı tanımlar; [`GET /v1/assistants`](list-assistants.md) yanıtındaki `assistant_id` ile eşleşir. Bilinmiyorsa `null` olur. |
| `call_assistant_name` | string \| null | Çağrıyı yürüten asistanın görünen adını verir; panelde gördüğünüz adla aynıdır. Bilinmiyorsa `null` olur. |
| `call_phone_number` | string \| null | Bu çağrıdaki karşı tarafın numarasını taşır: giden çağrıda aranan numara, gelen çağrıda ise arayanın numarasıdır (mümkün olduğunda E.164 biçiminde). Bilinmiyorsa `null` olur. |
| `call_bound_type` | string \| null | Çağrının yönünü belirtir: müşteri sizi aradıysa `inbound`, asistan müşteriyi aradıysa `outbound` olur. Yön bilinmiyorsa `null` döner. |
| `call_started_at` | ISO 8601 (UTC) \| null | Çağrının fiilen başladığı anı gösterir; **UTC** cinsinden, `+00:00` offset'iyle yazılmış bir ISO 8601 zaman damgasıdır. Garantili bir `Z` son eki veya sabit milisaniye hassasiyeti **yoktur**; bu yüzden gerçek bir ISO 8601 ayrıştırıcıyla çözümleyin ve görüntülemek için kendi yerel saat diliminize çevirin. Çağrı karşı tarafa herhangi bir nedenle bağlanamadıysa (örneğin sistem hatası, çağrının cevaplanmaması ya da hattın meşgul olması) `null` olur. |
| `call_ended_at` | ISO 8601 (UTC) \| null | Çağrının sona erdiği anı gösterir; aynı ISO 8601 UTC biçimindedir. Çağrı karşı tarafa hiç bağlanamadıysa `null` olur. |
| `call_created_at` | ISO 8601 (UTC) | Çağrı kaydının sistemimizde oluşturulduğu anı gösterir, aynı ISO-8601 UTC biçimindedir. |
| `call_duration_seconds` | int \| null | Çağrının saniye cinsinden ne kadar sürdüğünü verir. Çağrı karşı tarafa hiç bağlanamadıysa (örneğin cevapsız kalan bir `failed` çağrı) `null` döner. |
| `call_end_reason` | string \| null | Çağrının sona ermesinin ham nedenini verir; serbest biçimli bir string'tir ve eşlenmeden döner. Bkz. [Bitiş nedenleri](list-calls/index.md#end-reasons). Opak kabul edin, bilinmeyen değerlerde hata vermeyin. |
| `call_transcript` | string \| null | Görüşmenin düz metin dökümünü taşır. Her satırın başında UTC `HH:MM:SS` zaman damgası, ardından Türkçe bir rol etiketi bulunur: asistan için `[HH:MM:SS] Asistan:`, arayan için `[HH:MM:SS] Müşteri:`. Satırlar birbirinden `\n` ile ayrılır. Çok kısa veya başarısız çağrılarda boş ya da `null` olabilir. |
| `call_structured_data` | object \| null | Yapay zekânın görüşmeden çıkardığı yapısal veriyi taşır; anahtarları asistanınızın yapısal çıktı şemasındaki alan adları olan düz (flat) bir nesnedir. Asistanın şeması yoksa, görüşmeden hiçbir veri çıkarılamadıysa ya da saklanan veri ayrıştırılamadıysa `null` olur; nesne dolu gelse bile içindeki tek tek alanlar `null` olabilir. Ayrıntı için bkz. [Yapısal veri şekilleri](list-calls/index.md#structured-data-shapes). |
| `call_metadata` | object \| null | [`POST /v1/calls`](create-call.md) veya [`POST /v1/calls/bulk`](bulk-create-calls.md) ile gönderdiğiniz opak metadata'yı, kendi kayıtlarınızla eşleştirebilmeniz için aynen geri döndürür. Çağrı metadata ile oluşturulmadıysa `null` olur. |
| `call_variables` | object \| null | Bu çağrı için gönderilen şablon değişkenlerini taşır; çağrıyı oluştururken `variables` olarak gönderdiğiniz nesne aynen geri döner. Hiç gönderilmediyse (örneğin inbound çağrılar) `null` olur. |
| `call_recording` | object | Çağrının ses kaydının hazır olup olmadığını, hazırsa nereden indirileceğini belirten bir nesnedir. Alanları aşağıda listelenir. |

**`data.call_recording`**

| Alan | Tür | Açıklama |
|---|---|---|
| `available` | bool | Bu çağrı için indirilebilir bir ses kaydının bulunup bulunmadığını belirtir. |
| `url` | string \| yok | Uzun ömürlü (yaklaşık 24 saat), presigned bir indirme URL'si verir. **Yalnızca** `available: true` iken bulunur. |
| `expires_at` | ISO string \| yok | URL'nin geçerliliğini yitireceği anı gösterir (UTC, `+00:00`). **Yalnızca** `available: true` iken bulunur. |

:::info Ses kaydı URL'si uzun ömürlüdür ve gönderim anında üretilir
`data.call_recording.url`, **webhook'un gönderildiği andan itibaren** yaklaşık **24 saat** geçerlidir; bu süre normal işlemeyi ve yeniden denemeleri rahatça aşar. URL'yi kalıcı olarak saklamayın; `call_id` değerini saklayıp ihtiyaç oldukça yeni bir URL çekin. Tüm kurallar için bkz. [Ses Kaydı Bağlantısı Al](get-recording-url.md).

Bir **`call-ended`** teslimatında `available` **geçici olarak** `false` olabilir; çağrı sonlanmıştır ama ses kaydı hâlâ kalıcı depolamaya aktarılıyordur (özellikle yapısal çıktı şeması olmayan asistanlarda, `call-ended` çağrı sonlanır sonlanmaz tetiklenir). Kayıt indirilebilir olunca Vindy ayrı bir [`recording-ready`](#recording-ready) olayı gönderir (`available: true` + yeni `url`). Yani `call-ended`'deki `available: false`'ı **"henüz hazır değil"** diye okuyun, **"hiçbir zaman olmayacak"** diye değil; [`recording-ready`](#recording-ready)'yi bekleyin ya da [`GET /v1/calls/:callId/recording-url`](get-recording-url.md)'i tekrar çağırın (kayıt hâlâ işlenirken `409`, hiç olmayacaksa `404` döner).
:::

### İptal edilen belirli bir çağrı {#a-cancelled-single-call}

Kuyrukta bekleyen bir çağrı iptal edildiğinde (ister tek başına, Vindy panelinden ya da [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile; ister bir [toplu iptalin](cancel-batch.md) parçası olarak) **o çağrıya özel** bir `call-ended` olayı tetiklenir; bu olay `call_status: "cancelled"` ve **minimal** bir `data` nesnesi taşır. Çağrı hiç gerçekleşmediğinden konuşma, yapısal veri ve zaman alanları `null`, `call_end_reason` `"cancelled"`, `call_recording.available` ise `false` olur. Birebir korelasyon yapabilmeniz için `call_metadata` ve `call_variables` yine aynen geri döner. Bir toplu aramayı iptal ettiğinizde de durdurulan her kuyruk çağrısı için ayrı bir `call-ended` üretilir: örneğin kuyrukta bekleyen 100 çağrıyı iptal eden bir toplu iptal, 100 ayrı `call-ended` olayı gönderir. Bunların tümü gönderildikten sonra, en sonda tek bir [`batch-ended`](#batch-ended) olayı gelir.

```json
{
  "event_type": "call-ended",
  "delivery_id": "1c2d3e4f-5a6b-7c88-9d0e-1f2a3b4c5d6e",
  "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b",
  "data": {
    "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b",
    "batch_call_id": null,
    "call_status": "cancelled",
    "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "call_assistant_name": "Vindy - Asistan",
    "call_phone_number": "+905551112233",
    "call_bound_type": "outbound",
    "call_started_at": null,
    "call_ended_at": null,
    "call_created_at": "2026-06-08T10:29:55+00:00",
    "call_duration_seconds": null,
    "call_end_reason": "cancelled",
    "call_transcript": null,
    "call_structured_data": null,
    "call_metadata": { "order_id": "ORD-4821" },
    "call_variables": { "first_name": "Elif" },
    "call_recording": { "available": false }
  }
}
```

## `recording-ready` olayı {#recording-ready}

Bir çağrının **ses kaydı** kalıcı depolamaya aktarılıp indirilebilir hâle geldiğinde tetiklenir ve her zaman o çağrının [`call-ended`](#call-ended) olayından **sonra** gelir. Bu olay, kaydı tekrar tekrar sorgulamanın (polling) yerine geçer: kayıt hazır olur olmaz Vindy size bildirir, böylece bir zamanlayıcı ya da yeniden-deneme döngüsü kurmanıza gerek kalmaz.

Bir çağrının kaydına güvenilir biçimde ulaşmak istiyorsanız bu olayı dinleyin. `call-ended` olayı, kayıt henüz aktarılırken `call_recording.available: false` ile gelebilir; özellikle **yapısal çıktı şeması olmayan** asistanlarda `call-ended`, çağrı biter bitmez (kayıt daha yüklenmeden) gönderilir. `recording-ready` tam da bu aradaki boşluğu kapatır: kayıt gerçekten indirilebilir olduğunda ayrı bir bildirim yollar.

- **Yalnızca kayıt gerçekten hazır olduğunda** tetiklenir. Kaydı hiç üretilmemiş ya da aktarımı kalıcı olarak başarısız olmuş bir çağrı için **asla** gelmez; dolayısıyla bir çağrı için bu olayı hiç almıyorsanız, o çağrının indirilebilir bir kaydı yok demektir.
- O çağrının `call-ended`'i ve [`GET /v1/calls/:callId`](get-call.md) ile **aynı `call_id`**'yi taşır; eşleştirmeyi her zaman `call_id` üzerinden yapın.
- **Her zaman o çağrının `call-ended`'inden sonra teslim edilir.** Vindy, `recording-ready`'yi o çağrının `call-ended`'i endpoint'inize ulaşana kadar bekletir; böylece sıra garanti edilir. Yine de teslimat **en az bir kez** ilkesiyle çalışır, yani aynı olay birden çok kez gelebilir. Tek istisna şudur: o çağrının `call-ended`'i tüm denemelere rağmen teslim edilemezse Vindy artık beklemez ve `recording-ready`'yi tek başına gönderir. Bu yüzden tekrarları `delivery_id` ile ayıklayın, eşleştirmeyi `call_id` ile yapın.
- **`batch-ended` ile bağlantılı değildir.** Bir toplu aramadaki bir çağrının `recording-ready`'si, o toplu aramanın [`batch-ended`](#batch-ended) olayından **sonra** gelebilir. Ses kayıtları paralel işlenir ve her biri kendi hızında tamamlanır; bu yüzden toplu arama "tamamlanmış" sayılsa (yani tüm çağrı sonuçları elinizde olsa) bile bazı kayıtlar hâlâ aktarılıyor olabilir. Bu **beklenen** bir durumdur; kaçırılmış ya da gecikmiş bir olay değildir. `batch-ended`'i aldıktan sonra da `recording-ready` almayı sürdürün.

Bu olayın gövdesi **yalın ve yalnızca kayda odaklıdır**; `call-ended`'teki tam çağrı nesnesini bilinçli olarak **tekrarlamaz**. Üst düzey istek alanları aynıdır (`event_type`, `delivery_id`, `call_id`). `data` ise bu olaya özgü bilgiyi, bir de olayı herhangi bir ek sorgu yapmadan kendi kayıtlarınızla eşleştirmenize yetecek alanları taşır: `call_id`, `batch_call_id`, gönderdiğiniz `call_metadata`, `call_duration_seconds` ve yeni bir `call_recording` bloğu. `batch_call_id` ile `call_metadata`, o çağrının `call-ended`'indekiyle **birebir aynıdır** ve ikisi de `null` olabilir (ayrıntı için aşağıdaki alanlara bakın). Çağrıya dair diğer her şeye (transcript, yapısal veri, maliyet) ise ortak `call_id` üzerinden ulaşırsınız: ya bu olaydan **önce** gelen `call-ended`'ten ya da [`GET /v1/calls/:callId`](get-call.md)'den.

| `data` alanı | Tip | Açıklama |
|---|---|---|
| `call_id` | string | Kaydın ait olduğu çağrıyı tanımlar; o çağrının [`call-ended`](#call-ended)'i ve [`GET /v1/calls/:callId`](get-call.md) ile **birebir aynıdır**. Bununla eşleştirin. |
| `batch_call_id` | string \| null | Bu çağrının ait olduğu toplu aramayı tanımlar; o çağrının [`call-ended`](#call-ended)'iyle **birebir aynıdır**. Çağrı bir toplu aramaya ait değilse `null` olur; bu durum, [`POST /v1/calls`](create-call.md) ile açılan tekil çağrılarda ve herhangi bir gelen (inbound) çağrıda görülür. |
| `call_duration_seconds` | integer \| null | Çağrının saniye cinsinden ne kadar sürdüğünü verir. |
| `call_metadata` | object \| null | [`POST /v1/calls/bulk`](bulk-create-calls.md) veya [`POST /v1/calls`](create-call.md) ile gönderdiğiniz opak metadata'dır; aynen geri döner ve o çağrının [`call-ended`](#call-ended)'iyle **birebir aynıdır**, böylece kaydı kendi kayıtlarınızla eşleştirebilirsiniz. Çağrı metadata ile oluşturulmadıysa `null` olur. |
| `call_recording.available` | boolean | Bu olayda her zaman `true` döner. |
| `call_recording.url` | string | Ses dosyası için süreli, **presigned** bir indirme URL'i verir. |
| `call_recording.expires_at` | string (ISO 8601) | `url`'in çalışmayı bırakacağı anı gösterir. O ana kadar indirin ya da [`GET /v1/calls/:callId/recording-url`](get-recording-url.md) ile yeniden isteyin. |

```http
POST webhook-url
Content-Type: application/json
User-Agent: Vindy-Webhooks/1.0
X-Vindy-Event: recording.ready
X-Vindy-Delivery-Id: 0190aa00-1c5a-7000-8000-abc987654321
<sizin özel header'larınız, örn. X-API-Key: ...>
```

```json
{
  "event_type": "recording-ready",
  "delivery_id": "0190aa00-1c5a-7000-8000-abc987654321",
  "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
  "data": {
    "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
    "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
    "call_duration_seconds": 87,
    "call_metadata": { "order_id": "ORD-4821" },
    "call_recording": {
      "available": true,
      "url": "https://your-bucket.s3.eu-central-1.amazonaws.com/call-records/...ogg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=86400&X-Amz-Signature=...",
      "expires_at": "2026-06-09T10:31:27+00:00"
    }
  }
}
```

Teslimat semantiği diğer tüm olaylarla aynıdır (~15 sn içinde `2xx`, en az bir kez, `delivery_id` ile tekrar ayıklama, artan beklemelerle yeniden deneme); bkz. [Davranış](#behavior).

## `batch-ended` olayı {#batch-ended}

[`POST /v1/calls/bulk`](bulk-create-calls.md) ile oluşturduğunuz bir toplu arama, yaşam döngüsünde `batch-ended`'i **yalnızca bir kez** üretir. Bu olay iki durumda gelir: toplu arama **tamamlandığında** (`status: completed` — içindeki her çağrı aranıp sonlanmış bir duruma ulaştığında) ya da **iptal edildiğinde** (`status: cancelled` — Vindy panelinden veya [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) ile). Her iki durumda da olay, toplu aramanın **tamamen sonuçlandığı** anlamına gelir. Genel tabloyu `counts` dökümünden okuyabilir, çağrıların tek tek sonuçlarını ise [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile çekebilirsiniz. Vindy bu olayı toplu aramanın **her** `call-ended`'inden **sonra** teslim eder; böylece aynı zamanda güvenilir bir "tüm çağrılar elimde" sinyali işlevi görür (aşağıdaki garantiye bakın).

Aşağıdaki `data` payload'ı, [`GET /v1/calls/batches/:batchId`](get-batch.md) (tek toplu arama) veya [`POST /v1/calls/batches/list`](list-batches.md) (tüm toplu aramalarınız) uçlarından istediğiniz an çekebileceğiniz **aynı `BatchCallSummary`**'dir; bu olay onun push (itme) karşılığıdır.

:::caution İptaller webhook'lara nasıl yansır
Bir toplu aramayı iptal ettiğinizde Vindy iki tür olay üretir:

- Durdurulan **her kuyruk çağrısı için ayrı bir `call-ended`** (her biri `call_status: "cancelled"`, minimal gövde ve aynen geri dönen `call_metadata`/`call_variables` ile).
- Tüm bu olayların ardından, `status: "cancelled"` taşıyan **tek bir `batch-ended`**.

İptal edilen her çağrı, tıpkı tek bir çağrının iptalinde olduğu gibi **tek tek** raporlanır; böylece her birini `call_metadata`'sı üzerinden kendi kayıtlarınızla eşleştirebilirsiniz. Toplu bir **özet (roll-up) yoktur** ve sizin çıkarım yapmanız gereken hiçbir şey yoktur. İptalden **etkilenmeyen** çağrılar (iptal anına dek çoktan tamamlanmış ya da aranırken bitmiş olanlar) her zamanki gibi kendi `call-ended`'lerini üretir. `batch-ended` ise, her zaman olduğu gibi, iptal edilenler dâhil tüm bu `call-ended`'lerden **sonra** en son gelir. Tek bir çağrıyı tek başına iptal etmek de birebir aynı şekilde davranır: o çağrı `call_status: "cancelled"` ile kendi [`call-ended`](#call-ended) olayını üretir.
:::

:::tip `batch-ended`, batch'in her `call-ended`'inden sonra gelir
Vindy, bir toplu aramanın `batch-ended`'ini, o toplu aramanın **her** `call-ended`'i adresinize ulaşana kadar bekletir. Dolayısıyla `batch-ended` elinize geçtiğinde toplu aramanın bütün çağrılarını çoktan almış olursunuz; bu olayı "her şey tamam" sinyali kabul edip kendi tarafınızı kapatabilirsiniz. Aynı kural iptal edilen toplu aramalar için de geçerlidir: durdurulan her kuyruk çağrısı kendi `call-ended`'ini (`call_status: "cancelled"`) üretir ve `batch-ended` onları da bekler; yani yine kesinlikle en son gelir (bkz. [iptaller webhook'lara nasıl yansır](#batch-ended)).

Bu durum çağrıların büyük çoğunluğunda geçerlidir; ancak **mutlak bir garanti değildir**. Nadiren bir `call-ended` hiç gelmeyebilir ya da çok seyrek olarak kendi `batch-ended`'inden **sonra** ulaşabilir. Bu yüzden işleyiciniz şu üç duruma hazırlıklı olmalıdır:

- **Tekrarları ayıklayın.** Teslimat **en az bir kez** ilkesiyle çalıştığı için aynı `call-ended` (hatta `batch-ended`'in kendisi) birden çok kez gelebilir; her zaman `delivery_id` ile tekilleştirin.
- **Kalıcı olarak teslim edilemeyen bir `call-ended`.** Bir çağrının `call-ended`'i tüm yeniden denemelere rağmen iletilemezse (örneğin adresiniz saatlerce kapalı kalır ve Vindy [vazgeçerse](#behavior)), Vindy artık onu beklemez; bu durumda `batch-ended`, o çağrı eksikken gelebilir.
- **Çok nadir geciken bir `call-ended`.** Çok seyrek olarak geçici bir iç aksaklık tek bir `call-ended`'i geciktirir ve o olay `batch-ended`'den biraz **sonra** ulaşır.

Son iki durumda da çözüm aynıdır: **`batch-ended`'den sonra da `call-ended` almayı sürdürün** ve eksiksiz, nihai liste için tek doğru kaynak olarak [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ucunu kullanın.

`recording-ready` bu sıralama garantisinin **dışındadır**. Bir çağrının [`recording-ready`](#recording-ready)'si, toplu aramanın `batch-ended`'inden **sonra** bile gelebilir ve bu **beklenen** bir durumdur: ses kayıtları paralel işlenir ve her biri kendi hızında tamamlanır; bu yüzden toplu arama "tamamlanmış" (tüm çağrı sonuçları teslim edilmiş) olsa bile bazı kayıtlar hâlâ aktarılıyor olabilir. `batch-ended`'den sonra gelen bir `recording-ready`'yi olağan karşılayın, kaçırılmış bir teslimat sanmayın. Bu garanti yalnızca `call-ended`'i, yani çağrı başına sonucu kapsar; kayıt sinyalini kapsamaz.
:::

Üst düzey yapı bir noktada `call-ended`'den ayrılır: üst düzeyde `call_id` yerine `batch_call_id` taşır ve `data`, bir çağrı nesnesi değil bir **toplu arama özetidir**.

```json
{
  "event_type": "batch-ended",
  "delivery_id": "0a61f9bd-2e77-4c8a-9d31-6b0f5a2c1e84",
  "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
  "data": {
    "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
    "status": "completed",
    "total_count": 200,
    "counts": {
      "completed": 180,
      "failed": 12,
      "cancelled": 8,
      "pending": 0,
      "processing": 0
    },
    "created_at": "2026-06-09T23:39:20+00:00"
  }
}
```

### Üst düzey alanlar

| Alan | Tür | Açıklama |
|---|---|---|
| `event_type` | string | Bu olay için `batch-ended` değerini taşır. |
| `delivery_id` | string (UUID) | Bu teslimatın kalıcı kimliğidir; her yeniden deneme adımında değişmez. Tekrarları bu değerle veya `batch_call_id` ile ayıklayın. |
| `batch_call_id` | string | Toplu aramanın kimliğidir; kolaylık için üst seviyede de tekrarlanır. Tekrarları ayıklamak ve toplu aramanın çağrılarını [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile çekmek için kullanın. |
| `data` | object \| null | Toplu arama özetidir; alanlar aşağıda listelenir. Nadir durumlarda kaynak kayda ulaşılamazsa `null` döner. |

### `data` — toplu arama özeti

| Alan | Tür | Açıklama |
|---|---|---|
| `batch_call_id` | string | Toplu aramayı tanımlar; üst düzeydeki `batch_call_id` ile aynı değeri taşır. |
| `status` | string | Toplu aramanın nihai durumudur: `completed`, ya da toplu arama iptal edildiğinde `cancelled` olur. |
| `total_count` | int | Toplu aramadaki toplam çağrı sayısını verir. |
| `counts` | object | Toplu aramanın çağrılarını durum bazında ayrıştırır; üyeleri aşağıda listelenir. |
| `created_at` | ISO string | Toplu aramanın oluşturulduğu anı gösterir (UTC, `+00:00`). |

**`data.counts`**

| Alan | Tür | Açıklama |
|---|---|---|
| `completed` | int | Başarıyla tamamlanan çağrıların sayısını verir. |
| `failed` | int | Başarısız biten çağrıların sayısını verir. |
| `cancelled` | int | Aranmadan önce kuyruktan iptal edilen çağrılardır. Bunların her biri ayrıca `call_status: "cancelled"` ile kendi [`call-ended`](#call-ended)'ini üretir; bu sayı yalnızca toplamdır. Bkz. [iptallerin webhook'lara nasıl yansıdığı](#batch-ended). |
| `pending` | int | Henüz başlamamış çağrılardır; `pending` ve `scheduled` çağrıların ikisini de kapsar. `batch-ended` teslim edildiğinde daima `0` olur. |
| `processing` | int | Hâlâ devam eden çağrılardır (`in_progress` durumu). `batch-ended` teslim edildiğinde daima `0` olur; olay, toplu aramadaki her çağrı bitene kadar (hiçbiri hâlâ aranmıyorken) bekletilir, dolayısıyla teslim edilen bir `batch-ended` her zaman sonuçlanmış, nihai bir döküm raporlar. |

:::note `call-ended` ile aynı teslimat semantiği
`batch-ended`, tıpkı `call-ended` gibi teslim edilir: ~15 saniye içinde `2xx` dönün, artan beklemelerle yeniden denenir, en az bir kez teslim edilir (`delivery_id` veya `batch_call_id` ile tekrarları ayıklayın) ve aynı header'lar kullanılır. Tek fark sıralamadadır: `batch-ended` daima batch'inin **her** `call-ended`'inden **sonra** teslim edilir (yukarıdaki garanti). (Bir çağrının `recording-ready`'si de kendi `call-ended`'inden sonra teslim edilir; bunun dışında olaylar arasında sıra garantisi yoktur.) Bkz. [Davranış](#behavior).
:::

## Bir toplu aramayı kendi tarafınızda sonuçlandırma — önerilen durum takibi {#reconcile-batch}

Bir toplu aramadaki **her** çağrı, ister `completed` ister `failed` ister `cancelled` olsun (toplu iptalin durdurduğu kuyruk çağrıları dâhil), kendi [`call-ended`](#call-ended) olayını üretir. `batch-ended` ise bunların **tümünden sonra** teslim edilir (yukarıdaki sıralama garantisi). Dolayısıyla entegrasyonunuzu baştan sona olaylarla yürütebilir ve her çağrıyı benzersiz bir kimlikle kendi kayıtlarınıza eşleyebilirsiniz; API'yi yalnızca bir kesinti yedeği olarak tutarsınız. Çıkarım yapmanız gereken hiçbir şey yoktur: toplu iptal, çağrıları tek bir özete indirmez (roll-up yapmaz).

**Gönderdiğiniz her çağrı için kendi tarafınızda bir satır tutun** ve bu satırı benzersiz bir kimlikle eşleştirin. Bu kimlik için en iyisi, `metadata` içine koyduğunuz bir alandır (önerilir; iptal edilenler dâhil her `call-ended`'de ve API yanıtlarında aynen geri döner); alternatif olarak `call_phone_number`'ı da kullanabilirsiniz. Her satır şu yolu izler: `queued` → `completed` / `failed` / `cancelled`.

1. **Her `call-ended` geldiğinde:** o çağrının satırını doğrudan `call_status` alanındaki terminal duruma (`completed` / `failed` / `cancelled`) güncelleyin. İhtiyacınız olan **tek** durum geçişi budur. Eşleştirmeyi `metadata` kimliği üzerinden yaparsınız; böylece olayın hangi çağrıya ait olduğunu (iptal edilenler dâhil) her zaman kesin bilirsiniz. Tekrarları `delivery_id` ile ayıklayın.

2. **`batch-ended` geldiğinde:** toplu arama tamamen sonuçlanmıştır ve tüm `call-ended` olayları çoktan elinize ulaşmıştır. Bu olayı yalnızca "her şey tamam" sinyali olarak kullanın: toplu aramayı kendi tarafınızda kapatın ve özet için `counts`'u okuyun. Normal akışta **hiçbir satır hâlâ `queued` olmamalıdır**; çünkü her çağrı kendi `call-ended`'ini zaten almıştır.

`batch-ended`'deki `status: "cancelled"`, **toplu aramanın** (yani eylemin) iptal edildiği anlamına gelir; her çağrının iptal edildiği anlamına gelmez. İptalden önce çoktan çalışmış çağrılar `counts.completed` / `counts.failed` altında sayılmaya devam eder ve iptal edilen her çağrı kendi `call-ended`'iyle ayrı ayrı raporlanır.

:::tip Tek kesinti boşluğu
Tek istisna, tüm yeniden denemelere rağmen **teslim edilemeyen** bir `call-ended`'tir (adresiniz, Vindy'nin [vazgeçeceği](#behavior) kadar uzun süre kapalı kalırsa oluşur). Vindy böyle bir olayı artık beklemediği için, `batch-ended` geldiğinde o çağrının satırı sizde hâlâ `queued` görünebilir. Bunu saptamak çok kolaydır: `batch-ended`'den sonra hâlâ `queued` kalan her satır. Yalnızca bu satırları, kesin kaynak olan [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ucuyla mutabakata bağlarsınız. Sağlıklı çalışan bir adres bu durumla **hiç** karşılaşmaz ve toplu aramayı **sıfır** ek API çağrısıyla sonuçlandırır.
:::

:::caution Kendi eşzamanlılığını yönet
Teslimat en az bir kez yapılır ve işleyicileriniz paralel çalışabilir. Bu yüzden durum güncellemelerinizi tekrara karşı güvenli yazın ve kayıtları `metadata` kimliğiniz üzerinden eşleştirin: aynı `call-ended`'i iki kez işlemek hiçbir şeyi değiştirmemeli (`delivery_id` ile tekilleştirin) ve zaten terminal durumdaki bir satırı aynı duruma yeniden set etmek zararsız olmalıdır. İptal edilenler dâhil her çağrı kendi `call-ended`'iyle geldiği için, `batch-ended` sonrasında eksik satırları topluca tamamlamanıza (bir "süpürme" adımına) hiç gerek kalmaz; dolayısıyla böyle bir toplu tamamlama ile geç gelen bir çağrı arasında yarış durumu da oluşmaz.
:::

## Davranış {#behavior}

- **`2xx` dönün** — yaklaşık 15 saniye içinde. `2xx` dışı bir yanıt veya zaman aşımı, başarısız teslimat olarak değerlendirilir ve Vindy yeniden dener.
- **Yeniden denemeler** — başarısız teslimatlar, artan beklemelerle (yaklaşık `30sn → 2dk → 10dk → 1sa`, yaklaşık ±%20 rastgele jitter ile) ve toplamda yaklaşık 5 denemeyle tekrarlanır; ardından Vindy o teslimat için yeniden denemeyi bırakır.
- **En az bir kez teslimat (at-least-once)** — olumsuz ağ koşullarında aynı olay birden çok kez gelebilir. Tekrarları şu değerlerden biriyle ayıklayın: `delivery_id` (yeniden denemelerde değişmez; ayrıca `X-Vindy-Delivery-Id` header'ında bulunur), `call-ended` için `call_id` ya da `batch-ended` için `batch_call_id`.
- **Genel bir sıra garantisi yoktur.** Olaylar, çağrıların sona erme sırasından farklı bir sırada gelebilir; bu yüzden eşleştirmeyi varış sırasına göre değil, `call_id` / `batch_call_id` üzerinden yapın. Bunun **iki istisnası** vardır: (1) bir toplu aramanın `batch-ended`'i, o toplu aramanın **her** `call-ended`'inden **sonra** teslim edilir ("toplu arama tamamlandı" garantisi; bkz. [`batch-ended`](#batch-ended)); (2) bir çağrının `recording-ready`'si, o çağrının `call-ended`'inden **sonra** teslim edilir (çağrı bazında garanti; bkz. [`recording-ready`](#recording-ready)). Bu iki garantide de tekrar-ayıklama yine geçerlidir; tek boşluk, kalıcı olarak teslim edilemeyen bir `call-ended`'tir — bu durumda [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile mutabakat yapın.
- **Yalnızca herkese açık HTTPS** — webhook endpoint'i herkese açık bir `https` URL'si olmalıdır; özel, loopback ve bulut-metadata adresleri reddedilir (SSRF koruması).
- **Ses kaydı bağlantısının güncelliği** — `data.call_recording.url`, gönderim anında üretilmiş ~24 saat geçerli bir bağlantıdır. Kalıcı olarak saklamayın; gerektiğinde yeni bir bağlantı çekin; bkz. [Ses Kaydı Bağlantısı Al](get-recording-url.md).
- **Kişisel veri (PII)** — payload telefon numarası ve transcript içerebilir; bu veriyi yürürlükteki mevzuata uygun şekilde işleyin ve saklayın.

:::tip Hızlı onaylayın, sonra işleyin
Olayı güvenli biçimde kaydeder kaydetmez `2xx` dönün; ardından ağır işleri (ses kaydı indirme, sistemlerinizi güncelleme) eşzamansız (asenkron) olarak yapın. Bu, ~15 saniyelik pencerede kalmanızı sağlar ve gereksiz yeniden denemeleri önler.
:::

## Bir teslimatı işleme

Sağlam bir işleyici, kaydettiğiniz özel auth header'ını (opsiyonel olarak) kontrol eder, hızlıca onay verir, `delivery_id` üzerinden tekrarları ayıklar ve gerektiğinde güncel bir ses kaydı bağlantısı çeker.

<Tabs groupId="lang">
<TabItem value="node" label="Node.js (Express)">

```javascript
import express from "express";

const app = express();
const seen = new Set(); // üretimde bunu bir DB / unique constraint ile destekleyin

app.post("/vindy/webhook", express.json(), async (req, res) => {
  // 1. (Opsiyonel) Vindy'ye kaydettiğiniz özel header ile kimlik doğrulaması yapın
  if (req.get("X-API-Key") !== process.env.VINDY_WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }

  // 2. Kalıcı teslimat kimliği üzerinden tekrarları ayıklayın (en az bir kez teslimat)
  const deliveryId = req.get("X-Vindy-Delivery-Id") ?? req.body.delivery_id;
  if (seen.has(deliveryId)) return res.sendStatus(200);
  seen.add(deliveryId);

  // 3. Hızlı onaylayın, sonra eşzamansız işleyin
  res.sendStatus(200);

  // 4. Ses kaydı bağlantısı ~24 saat geçerlidir — gerekirse sonradan güncel çağrıyı çekin
  void processEvent(req.body);
});

app.listen(3000);
```

</TabItem>
<TabItem value="python" label="Python (Flask)">

```python
import os
from flask import Flask, request, abort

app = Flask(__name__)
seen = set()  # üretimde bunu bir DB / unique constraint ile destekleyin

@app.post("/vindy/webhook")
def vindy_webhook():
    # 1. (Opsiyonel) Vindy'ye kaydettiğiniz özel header ile kimlik doğrulaması yapın
    if request.headers.get("X-API-Key") != os.environ["VINDY_WEBHOOK_SECRET"]:
        abort(401)

    body = request.get_json()

    # 2. Kalıcı teslimat kimliği üzerinden tekrarları ayıklayın (en az bir kez teslimat)
    delivery_id = request.headers.get("X-Vindy-Delivery-Id") or body["delivery_id"]
    if delivery_id in seen:
        return "", 200
    seen.add(delivery_id)

    # 3. Eşzamansız işleme için kuyruğa alın, sonra hızlı onaylayın.
    #    Ses kaydı bağlantısı ~24 saat geçerlidir — gerekirse sonradan güncel çağrıyı çekin.
    enqueue_processing(body)
    return "", 200
```

</TabItem>
</Tabs>

:::note İlgili
Webhook'lar [`POST /v1/calls/list`](list-calls/index.md) endpoint'ini tamamlar, ancak onun yerini almaz. Sorgulamaya (polling) dayalı bir mutabakat deseni için [Artımlı Senkronizasyon kılavuzuna](../guides/incremental-sync.md) bakabilirsiniz.
:::
