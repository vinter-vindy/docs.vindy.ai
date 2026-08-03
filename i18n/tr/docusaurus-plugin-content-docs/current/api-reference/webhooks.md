---
title: Webhook'lar
sidebar_label: Webhooks
sidebar_position: 9
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Webhook'lar (Olay Teslimatı)

Vindy, hesabınız için tanımlı webhook URL'sine **HTTP POST** ile olaylar gönderir; böylece sürekli [`POST /v1/calls/list`](list-calls/index.md) ile sorgulamak yerine neredeyse anlık olarak tepki verebilirsiniz. **İki olay tipi** vardır:

| `event_type` | Ne zaman tetiklenir | `data` nedir |
|---|---|---|
| [`call-ended`](#call-ended) | Bir **fiziksel çağrı** sonlanmış bir duruma ulaştığında — `completed` veya `failed` — **veya** [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile **tekli** bir kuyruk çağrısı iptal edildiğinde (`call_status: cancelled`, minimal gövde). | Tam çağrı nesnesi (veya `null`). |
| [`batch-ended`](#batch-ended) | Bir **toplu arama** `completed` olduğunda — içindeki her çağrı sonlanmış bir duruma ulaştığında — **veya** [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) ile bir toplu arama iptal edildiğinde (`status: cancelled`). Bir kez gönderilir. | Durum bazında dökümü olan bir toplu arama özeti (veya `null`). |

İkisi de aynı teslimat semantiğini paylaşır (yeniden denemeler, en az bir kez teslimat) — bkz. [Davranış](#behavior).

---

## Kurulum

:::info Webhook kurulumu henüz self-servis değil
Webhook endpoint'leri **Vindy ekibi tarafından** ayarlanır. Etkinleştirmek için bizimle iletişime geçin ve şunları verin:

- **URL** — herkese açık bir `https://` endpoint'i olmalıdır (düz `http`, özel, loopback ve bulut-metadata adresleri reddedilir).
- **Özel header'lar (opsiyonel)** — serbest biçimli bir HTTP header map'i; her teslimatta **aynen** gönderilir. İsteği kendi tarafınızda doğrulamak için kullanın, örn. `{"X-API-Key": "<sizin-secret>"}` veya `{"Authorization": "Bearer <sizin-token>"}`. Vindy'nin kendi kanonik header'ları (`Content-Type`, `User-Agent`, `X-Vindy-*`) her zaman önceliklidir ve ezilemez.
- **Olaylar** — hangi olayları almak istediğiniz: `call.ended`, `campaign.ended` ya da her ikisi.
:::

## İstek header'ları

Vindy, her iki olay tipi için de her teslimatta aynı header setini gönderir:

| Header | Değer | Not |
|---|---|---|
| `Content-Type` | `application/json` | |
| `User-Agent` | `Vindy-Webhooks/1.0` | Vindy'nin teslimat aracısını tanımlar. |
| `X-Vindy-Event` | `call.ended` \| `campaign.ended` | Dahili olay adı — **noktalıdır** ve gövdedeki tireli `event_type`'tan bilinçli olarak farklıdır. `call.ended`, gövdedeki `call-ended`'e; `campaign.ended`, gövdedeki `batch-ended`'e karşılık gelir. Hangisini isterseniz onunla yönlendirin. |
| `X-Vindy-Delivery-Id` | `<uuid>` | Bu teslimatın kalıcı kimliği — aynı olayın **her yeniden deneme adımında değişmez**. İdempotency / tekrar ayıklama anahtarı olarak kullanın. Gövdede de `delivery_id` olarak yer alır. |
| _özel header'lar_ | tanımlandığı gibi | Kaydettiğiniz her özel header — aynen gönderilir. Vindy'nin yukarıdaki kanonik header'ları her zaman kazanır ve ezilemez. |

## `call-ended` olayı {#call-ended}

:::caution İptal edilen bir çağrı `call-ended`'i ne zaman tetikler, ne zaman tetiklemez
`call-ended`, gerçek bir çağrı sonlanmış bir duruma ulaştığında (`completed` veya `failed`) **ve ayrıca** [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile **tekli** bir kuyruk çağrısını iptal ettiğinizde tetiklenir — bu teslimat `call_status: "cancelled"` ve **minimal** bir gövde taşır (transcript, yapısal veri ve kayıt alanları `null`). İstisna: bir **toplu iptalin** ([`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md)) parçası olarak durdurulan çağrılar tek tek `call-ended` **tetiklemez** — bunun yerine tek bir [`batch-ended`](#batch-ended) olayına toplanır (büyük toplu aramalarda olay yağmurunu önlemek için).
:::

Vindy, JSON gövdeli bir HTTP `POST` gönderir. Gövde, `data`'yı saran bir **üst düzey nesnedir** (`event_type`, `delivery_id`, `call_id`). `data`, **tam çağrı nesnesidir** — [`GET /v1/calls/:callId`](get-call.md) ve [`POST /v1/calls/list`](list-calls/index.md) içindeki her öğeyle birebir aynı yapı.

```http
POST <sizin-webhook-url>
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
  "call_id": "sess_9f2c8a10b3d4",
  "data": {
    "call_id": "sess_9f2c8a10b3d4",
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
      "age": 32,
      "overall_satisfaction": 4,
      "support_speed": 5,
      "would_recommend": true
    },
    "call_metadata": { "crm_contact_id": "CNT-90412" },
    "call_variables": { "first_name": "Batu" },
    "call_recording": {
      "available": true,
      "url": "https://your-bucket.s3.eu-central-1.amazonaws.com/call-records/...wav?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=86400&X-Amz-Signature=...",
      "expires_at": "2026-06-09T10:31:27+00:00"
    }
  }
}
```

`data.call_transcript` tek bir metin dizesidir; içindeki her konuşma sırası bir satır sonu (`\n`) ile ayrılır. JSON satır sonlarını kaçışlı yazdığı için yukarıdaki değer tek satırda görünür. Gerçek satır sonlarıyla görüntülendiğinde yukarıdaki transcript şöyledir:

```text
[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy. Müşteri memnuniyeti anketimiz kapsamında size birkaç kısa soru sormak istiyorum — şu an uygun musunuz?
[10:30:07] Müşteri: Evet, müsaitim.
[10:30:11] Asistan: Teşekkürler. Öncelikle yaşınızı öğrenebilir miyim?
[10:30:16] Müşteri: Otuz iki.
```

### Üst düzey alanlar

| Alan | Tür | Açıklama |
|---|---|---|
| `event_type` | string | Bu olay için `call-ended`. |
| `delivery_id` | string (UUID) | Bu teslimatın kalıcı kimliği. Aynı olayın her yeniden deneme adımında değişmez; bu nedenle tekrarları bu değerle ayıklayabilirsiniz (ayrıca `X-Vindy-Delivery-Id` header'ı olarak da gönderilir). |
| `call_id` | string \| null | Çağrının kalıcı kimliği (bir string). **Outbound** bir çağrı için [`POST /v1/calls/bulk`](bulk-create-calls.md) yanıtındaki `calls[]` içinde aldığınız kimliktir; **inbound** bir çağrı için çağrının kendi kimliğidir. Çağrının tüm yaşamı boyunca ve teslimat yeniden denemeleri arasında değişmez. `data`'yı ayrıştırmadan tekrarları ayıklayıp yönlendirebilmeniz için üst seviyede de yer alır. Çağrının kimliği yoksa (nadir) `null`. |
| `data` | object \| null | Tam çağrı nesnesi — tüm alanlar aşağıda. Kaynak kayıt projekte edilemezse `null`. |

### `data` — çağrı nesnesi

`data`, [`GET /v1/calls/:callId`](get-call.md)'in döndürdüğü nesnenin aynısıdır:

| Alan | Tür | Açıklama |
|---|---|---|
| `call_id` | string | Kalıcı çağrı kimliği (üst düzeydeki `call_id` ile aynı değer). |
| `call_status` | string | `completed` \| `failed` \| `cancelled`. `cancelled` yalnızca bu çağrıyı **tekli** bir kuyruk çağrısı olarak iptal ettiğinizde görünür — o teslimat minimal bir gövde taşır ([yukarıya](#a-cancelled-single-call) bakın). Fiziksel çağrılar yalnızca `completed` veya `failed` olur. |
| `call_assistant_id` | string (UUID) \| null | Çağrıyı yürüten asistan. Bilinmiyorsa `null`. |
| `call_assistant_name` | string \| null | İnsan-okur asistan adı. |
| `call_phone_number` | string \| null | Aranan veya arayan telefon numarası (mümkün olduğunda E.164 formatında). Bilinmiyorsa `null`. |
| `call_bound_type` | string \| null | `inbound` \| `outbound` \| `null`. |
| `call_started_at` | ISO 8601 (UTC) \| null | Çağrının fiilen başladığı an — **UTC** cinsinden, `+00:00` offset'iyle yazılmış bir ISO-8601 zaman damgası. Garantili bir `Z` son eki veya sabit milisaniye hassasiyeti **yoktur**; bu yüzden gerçek bir ISO-8601 ayrıştırıcıyla çözümleyin ve görüntülemek için kendi yerel saat diliminize çevirin. Çağrı hiç bağlanmadıysa `null`. |
| `call_ended_at` | ISO 8601 (UTC) \| null | Çağrının sona erdiği an, aynı ISO-8601 UTC formatında. Çağrı hiç bağlanmadıysa `null`. |
| `call_created_at` | ISO 8601 (UTC) | Çağrı kaydının sistemimizde oluşturulduğu an, aynı ISO-8601 UTC formatında. |
| `call_duration_seconds` | int \| null | Saniye cinsinden çağrı süresi. |
| `call_end_reason` | string \| null | Çağrının sona erme ham nedeni — serbest biçimli bir string, eşlenmeden döner, bkz. [Bitiş nedenleri](list-calls/index.md#end-reasons). Opak kabul edin, bilinmeyen değerlerde hata vermeyin. |
| `call_transcript` | string \| null | Düz metin transcript. Her satır `[HH:MM:SS] Asistan:` (asistan, `Asistan`) veya `[HH:MM:SS] Müşteri:` (arayan, `Müşteri`) biçimindedir — Türkçe rol etiketleri, önlerinde UTC `HH:MM:SS` zaman damgasıyla — ve satırlar `\n` ile ayrılır. Çok kısa veya başarısız çağrılarda boş ya da `null` olabilir. |
| `call_structured_data` | object \| null | AI tarafından çıkarılan veri; asistanınızın yapısal çıktı şemasının özellikleriyle anahtarlanan düz (flat) bir nesne olarak döner. Bir çıktı kimliğiyle anahtarlanmaz ve `name`/`result` sarmalayıcısı yoktur. Asistanın yapısal çıktı şeması yoksa ya da hiçbir şey çıkarılamadığında `null` — bkz. [Yapısal veri şekilleri](list-calls/index.md#structured-data-shapes). |
| `call_metadata` | object \| null | [`POST /v1/calls/bulk`](bulk-create-calls.md) ile gönderdiğiniz opak metadata; korelasyon için aynen geri döner. Çağrı metadata ile oluşturulmadıysa `null`. |
| `call_variables` | obje \| null | Bu çağrı için gönderilen şablon değişkenleri, aynen geri döner — çağrıyı oluştururken `variables` olarak gönderdiğiniz obje. Gönderilmediyse (ör. inbound çağrılar) `null`. |
| `call_recording` | object | Kayıt durumu + URL — alanlar aşağıda. |

**`data.call_recording`**

| Alan | Tür | Açıklama |
|---|---|---|
| `available` | bool | Bu çağrı için indirilebilir bir ses kaydının mevcut olup olmadığı. |
| `url` | string \| yok | Uzun ömürlü (~24 saat) presigned indirme URL'si. **Yalnızca** `available: true` iken bulunur. |
| `expires_at` | ISO string \| yok | URL'nin geçerliliğini yitireceği an (UTC, `+00:00`). **Yalnızca** `available: true` iken bulunur. |

:::warning Ses kaydı URL'si uzun ömürlüdür ve gönderim anında üretilir
`data.call_recording.url`, **webhook'un gönderildiği andan itibaren** yaklaşık **24 saat** geçerlidir (varsayılan 86400 saniye, yapılandırılabilir). Bu süre normal işlemeyi ve yeniden denemeleri (retry'lar ~1 saat içinde tamamlanır) rahatça aşar. Yalnızca bir webhook'u ~24 saatten daha geç işlerseniz URL'nin süresi dolar; o zaman güncelini [`GET /v1/calls/:callId`](get-call.md) ile alın. URL'yi kalıcı olarak saklamayın — bunun yerine `call_id` değerini saklayıp ihtiyaç oldukça taze bir çağrı çekin. `available` `false` ise çağrı için kalıcı bir kayıt yoktur — [ne anlama geldiğine](list-calls/index.md#recording-not-available) bakın.
:::

### İptal edilen tekli bir çağrı {#a-cancelled-single-call}

[`POST /v1/calls/:callId/cancel`](cancel-call.md) ile **tekli** bir kuyruk çağrısını iptal ettiğinizde yine bir `call-ended` olayı tetiklenir — ancak `call_status: "cancelled"` ve **minimal** bir `data` nesnesiyle: çağrı hiç gerçekleşmediğinden konuşma, yapısal veri ve zaman alanları `null`, `call_end_reason` `"cancelled"`, `call_recording.available` ise `false` olur. Korelasyon yapabilmeniz için `call_metadata` yine aynen geri döner. Bir **toplu iptalin** parçası olarak durdurulan çağrılar bunu tek tek göndermez — bkz. [`batch-ended`](#batch-ended).

```json
{
  "event_type": "call-ended",
  "delivery_id": "1c2d3e4f-5a6b-7c88-9d0e-1f2a3b4c5d6e",
  "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b",
  "data": {
    "call_id": "7b910f3a-2c4d-4e8b-a1f2-9c3d5e6f7a8b",
    "call_status": "cancelled",
    "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
    "call_assistant_name": null,
    "call_phone_number": "+905551112233",
    "call_bound_type": "outbound",
    "call_started_at": null,
    "call_ended_at": null,
    "call_created_at": "2026-06-08T10:29:55+00:00",
    "call_duration_seconds": null,
    "call_end_reason": "cancelled",
    "call_transcript": null,
    "call_structured_data": null,
    "call_metadata": { "crm_contact_id": "CNT-90412" },
    "call_variables": { "first_name": "Batu" },
    "call_recording": { "available": false }
  }
}
```

## `batch-ended` olayı {#batch-ended}

[`POST /v1/calls/bulk`](bulk-create-calls.md) ile oluşturulan bir toplu arama `completed` durumuna ulaştığında (**içindeki her çağrı sonlanmış bir duruma ulaştığında**) **veya** [`POST /v1/calls/batches/:batchId/cancel`](cancel-batch.md) ile bir toplu arama iptal edildiğinde (`status: cancelled`), **bir kez** tetiklenir. Bir toplu aramadaki tüm çağrıların bittiğini bu sayede anlarsınız; sonuç için `counts` dökümünü kullanın, ardından çağrıları [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile çekin.

:::caution İptaller webhook'lara nasıl yansır
Bir toplu aramayı iptal etmek **tek** bir `batch-ended` olayı gönderir (`status: "cancelled"`). Bir toplu iptalin durdurduğu çağrılar tek tek `call-ended` **üretmez** — bunlar o tek `batch-ended` olayına toplanır (bu, büyük toplu iptallerde olay yağmurunu önler). Bunun yerine [`POST /v1/calls/:callId/cancel`](cancel-call.md) ile **tekli** bir çağrıyı iptal ederseniz, o çağrı `call_status: "cancelled"` ile kendi [`call-ended`](#call-ended) olayını üretir.
:::

Üst düzey nesne, `call-ended`'den farklıdır: üst seviyede `call_id` **değil** `batch_call_id` taşır ve `data`, bir çağrı nesnesi değil bir **toplu arama özetidir**.

```json
{
  "event_type": "batch-ended",
  "delivery_id": "0a61f9bd-2e77-4c8a-9d31-6b0f5a2c1e84",
  "batch_call_id": "842f7c19-3b6d-4e02-a5c8-9f1d2e3a4b50",
  "data": {
    "batch_call_id": "842f7c19-3b6d-4e02-a5c8-9f1d2e3a4b50",
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
| `event_type` | string | Bu olay için `batch-ended`. |
| `delivery_id` | string (UUID) | Bu teslimatın kalıcı kimliği — her yeniden deneme adımında değişmez. Tekrarları bu değerle veya `batch_call_id` ile ayıklayın. |
| `batch_call_id` | string | Toplu aramanın kimliği — kolaylık için üst seviyede de tekrarlanır. Tekrarları ayıklamak ve toplu aramanın çağrılarını [`POST /v1/calls/batches/:batchId/calls`](get-batch-calls.md) ile çekmek için kullanın. |
| `data` | object \| null | Toplu arama özeti — alanlar aşağıda. Kaynak kayıt projekte edilemezse `null`. |

### `data` — toplu arama özeti

| Alan | Tür | Açıklama |
|---|---|---|
| `batch_call_id` | string | Toplu aramanın kimliği (üst düzeydeki `batch_call_id` ile aynı değer). |
| `status` | string | Toplu aramanın nihai durumu — `completed` ya da toplu arama iptal edildiğinde `cancelled`. |
| `total_count` | int | Toplu aramadaki toplam çağrı sayısı. |
| `counts` | object | Toplu aramanın çağrılarının durum bazında dökümü. |
| `created_at` | ISO string | Toplu aramanın oluşturulduğu an (UTC, `+00:00`). |

**`data.counts`**

| Alan | Tür | Açıklama |
|---|---|---|
| `completed` | int | Başarıyla tamamlanan çağrılar. |
| `failed` | int | Başarısız biten çağrılar. |
| `cancelled` | int | Aranmadan önce kuyruktan iptal edilen çağrılar. Bir **toplu** iptalin parçası olarak durdurulan çağrılar burada özetlenir ve tek tek `call-ended` **üretmez**; **tekli** bir çağrı iptali ise `call_status: "cancelled"` ile kendi [`call-ended`](#call-ended) olayını üretir. |
| `pending` | int | Henüz başlamamış çağrılar. Tamamlanmış bir toplu aramada `0`. |
| `processing` | int | Hâlâ devam eden çağrılar. Tamamlanmış bir toplu aramada `0`. |

:::note `call-ended` ile aynı teslimat semantiği
`batch-ended`, tıpkı `call-ended` gibi teslim edilir — ~15 saniye içinde `2xx` dönün, artan beklemelerle yeniden denenir, en az bir kez teslim edilir (`delivery_id` veya `batch_call_id` ile tekrarları ayıklayın), sıra garantisi yoktur ve aynı header'lar kullanılır. Bkz. [Davranış](#behavior).
:::

## Davranış {#behavior}

- **`2xx` dönün** — yaklaşık 15 saniye içinde. `2xx` dışı bir yanıt veya zaman aşımı, başarısız teslimat olarak değerlendirilir ve Vindy yeniden dener.
- **Yeniden denemeler** — başarısız teslimatlar, artan beklemelerle (yaklaşık `30sn → 2dk → 10dk → 1sa`, yaklaşık ±%20 rastgele jitter ile) ve toplamda yaklaşık 5 denemeyle tekrarlanır; ardından teslimat "dead" (ölü) olarak işaretlenir.
- **En az bir kez teslimat (at-least-once)** — olumsuz ağ koşullarında aynı olay birden çok kez gelebilir. **Tekrarları ayıklayın:** `delivery_id` üzerinden (yeniden denemelerde değişmez; ayrıca `X-Vindy-Delivery-Id` header'ında bulunur) — ya da `call-ended` için `call_id`, `batch-ended` için `batch_call_id` üzerinden.
- **Sıra garantisi yok** — olaylar, çağrıların sona erme sırasından farklı bir sırada gelebilir.
- **Yalnızca herkese açık HTTPS** — webhook endpoint'i herkese açık bir `https` URL'si olmalıdır; özel, loopback ve bulut-metadata adresleri reddedilir (SSRF koruması).
- **Ses kaydı bağlantısının güncelliği** — `data.call_recording.url`, gönderim anında üretilmiş ~24 saat geçerli bir bağlantıdır; normal işleme ve yeniden denemeleri rahatça aşar. Yalnızca bir olayı ~24 saatten geç işlerseniz bağlantının süresi dolar; o zaman güncelini [`GET /v1/calls/:callId`](get-call.md) ile alın.
- **PII** — payload telefon numarası ve transcript içerebilir; bu nedenle endpoint'iniz `https` olmalıdır.

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
