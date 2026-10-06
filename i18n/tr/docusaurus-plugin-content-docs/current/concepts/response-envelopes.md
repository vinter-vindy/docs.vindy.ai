---
title: Yanıt Formatı
sidebar_label: Yanıt Formatı
sidebar_position: 1
---

# Yanıt Formatı

Tüm Vindy API yanıtları JSON (`application/json`) biçimindedir ve hepsi birkaç belirli biçimden birini kullanır. Bu biçimleri bir kez öğrendiğinizde tüm yanıtları aynı mantıkla okursunuz.

:::note Bilinmeyen istek alanları yok sayılır
Bir istek gövdesinde, ucun tanımadığı herhangi bir alan **yok sayılır**; asla hata vermez. Yani fazladan ya da yanlış yazılmış *opsiyonel* bir alan hiçbir şey yapmaz. Tek istisna şudur: **zorunlu** bir alanı yanlış yazarsanız (örneğin `phone_number_id`), gerçek alan artık eksik kalır ve istek `VALIDATION_FAILED` ile başarısız olur. Yalnızca belgelenen alanları gönderin ve zorunlu olanları birebir doğru yazın.
:::

**Liste yanıtları** iki biçimde gelir:

- **Sayfalanan listeler** (çoğu liste) `{ data, pagination }` biçimindedir. Bunları bir cursor ile sayfa sayfa okursunuz; bkz. [Filtreleme ve Sayfalama](../api-reference/list-calls/filtering-pagination.md#paginated).
- **Tam listeler** ([`GET /v1/assistants`](../api-reference/list-assistants.md) ve [`GET /v1/phone-numbers`](../api-reference/list-phone-numbers.md)) her şeyi tek seferde döndürür. Sayfalama cursor'ı yerine `{ data, total }` verirler; buradaki `total`, öğe sayısıdır.

---

## Tarih ve saatler {#timestamps}

**API'nin döndürdüğü zaman damgaları** her zaman UTC'dir; ISO 8601 biçiminde, `+00:00` ofsetiyle yazılır. Örneğin: `2026-05-15T10:30:00+00:00`. Bu değerleri gerçek bir tarih-saat kütüphanesiyle çözümleyin; değerin `Z` ile bittiğini ya da kesirli saniyenin hep aynı uzunlukta olduğunu varsaymayın. Bu kural, her yanıttaki tüm tarih-saat alanları için geçerlidir: `call_started_at`, `call_ended_at`, `call_created_at`, bir kaydın `expires_at` değeri ve [webhook](../api-reference/webhooks.md) içeriklerindeki zaman damgaları.

**Sizin gönderdiğiniz tarihler** iki türdür:

- `date_from` ve `date_to` ([`POST /v1/calls/list`](../api-reference/list-calls/filtering-pagination.md#range-semantics) ucunda) yalnızca tarihtir; `YYYY-MM-DD` biçiminde, saat ve saat dilimi içermeden yazılır. Vindy bunları **Europe/Istanbul** saat dilimine göre tam gün olarak okur.
- `scheduled_at` ([`POST /v1/calls`](../api-reference/create-call.md#scheduled-at) ve [`POST /v1/calls/bulk`](../api-reference/bulk-create-calls.md#scheduled-at) uçlarında) tam bir tarih-saattir. Her zaman bir saat dilimi ofseti ekleyin; örneğin `2026-06-10T09:00:00+03:00`. Ofset koymazsanız Vindy saati UTC olarak okur.

---

## Hata formatı {#error-envelope}

Her hata yanıtı aynı biçimdedir. İnsanın okuyabileceği bir `message` alanı ile bir `extensions` nesnesinden oluşur; `extensions` nesnesi de her zaman makinenin okuyabileceği bir `code` değeri taşır.

```json
{
  "message": "Invalid, expired, or revoked API key.",
  "extensions": {
    "code": "INVALID_API_KEY"
  }
}
```

Kodunuzda `message` metnine değil `extensions.code` değerine göre dallanın; `message` zamanla değişebilir. HTTP durum satırı durumu, `extensions.code` ise hatanın tam türünü söyler.

| Alan | Tür | Açıklama |
|---|---|---|
| `message` | string | Hatanın insan tarafından okunabilen açıklamasını taşır. Her zaman bulunur. |
| `extensions` | object | Hatanın makine tarafından okunabilen ayrıntısını taşır. Her zaman bulunur ve her zaman `code` içerir; bazı hatalar buna ek alanlar da ekler (aşağıda listelenir). |
| `extensions.code` | string | Makine tarafından okunabilen hata kodunu taşır; ayrıntılar için bkz. [Hata Kodları kataloğu](../errors.md). Her zaman bulunur. |

Yanıtın üst düzeyinde `statusCode`, `timestamp`, `path`, `requestId` veya `code` alanı yoktur.

:::note Beklenmeyen sunucu hataları
Tanımlı hatalar her zaman yukarıdaki biçimi kullanır. Beklenmeyen bir sunucu hatası (HTTP 500) kullanmayabilir: `extensions.code` içermeyen, framework'ün varsayılan gövdesini (`{ "detail": "Internal Server Error" }`) döndürebilir. `HTTP_500` diye bir kod yoktur. Bir 500 sürekli tekrarlanıyorsa önce yeniden deneyin, sonra bize bildirin.
:::

---

## `extensions` içindeki ek alanlar

Hataya göre `extensions`, `code` yanında birkaç alan daha taşır:

| Hata (kod / durum) | Ek alanlar |
|---|---|
| `VALIDATION_FAILED` (400) | `validation_errors` — nesne listesi |
| `INVALID_PHONE_NUMBER`, `INVALID_METADATA`, `INVALID_VARIABLES` (400) | `index` — hangi kaydın hatalı olduğu (aşağıda) |
| `RATE_LIMITED` (429) | `retry_after` (saniye), `limit` |

### Doğrulama hataları

Bir istek doğrulamadan geçemezse `extensions.validation_errors`, geçemeyen her alan için bir nesne listeler:

```json
{
  "message": "Invalid request.",
  "extensions": {
    "code": "VALIDATION_FAILED",
    "validation_errors": [
      { "field": "body.calls", "message": "Field required", "type": "missing" }
    ]
  }
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `field` | string | Sorunun hangi alanda olduğunu gösterir (örneğin `body.calls`). |
| `message` | string | O alanda neyin hatalı olduğunu açıklar. |
| `type` | string | Doğrulama hatasının türünü belirtir. |

### Toplu istekte hangi kayıt hatalı

Toplu (bulk) bir istekte `extensions.index`, `calls` dizisindeki hangi çağrının hataya yol açtığını söyler (0'dan sayılır):

```json
{
  "message": "Invalid phone number.",
  "extensions": {
    "code": "INVALID_PHONE_NUMBER",
    "index": 2
  }
}
```

Tekil bir [`POST /v1/calls`](../api-reference/create-call.md) isteğinde `INVALID_METADATA` ve `INVALID_VARIABLES` `index: 0` taşır; `INVALID_PHONE_NUMBER` ise `index` taşımaz. Tüm batch için ortak olan, istek düzeyindeki bir `variables` hatası `index: -1` bildirir.

### Hız limiti

Limiti aştığınızda `extensions`, ne kadar beklemeniz gerektiğini ve dakikalık limitinizi söyler. Aynı iki değer `Retry-After` ve `X-RateLimit-Limit` header'larında da gelir.

```json
{
  "message": "Rate limit exceeded. Please try again later.",
  "extensions": {
    "code": "RATE_LIMITED",
    "retry_after": 60,
    "limit": 300
  }
}
```

Başarılı (2xx) yanıtlarda normalde `X-RateLimit-Limit` ve `X-RateLimit-Remaining` header'larını da alırsınız; böylece limite dayanmadan kalan kotanızı görebilirsiniz. Nadiren, bir iç sorun sırasında hız limiti atlanır ve bu header'lar gelmeyebilir.

---

## Bir hatayı bildirme

Belirtebileceğiniz bir istek kimliği (request ID) yoktur. Bir sorunu bildirirken HTTP metodunu ve URL'yi, istek ve yanıt gövdelerini ve isteği yaklaşık ne zaman gönderdiğinizi ekleyin. Paylaşmadan önce **API anahtarınızı maskeleyin**.
