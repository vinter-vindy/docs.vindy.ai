---
title: Yanıt Formatı
sidebar_label: Yanıt Formatı
sidebar_position: 1
---

# Yanıt Formatı

Tüm Vindy API yanıtları JSON'dur (`application/json`) ve küçük, öngörülebilir bir yapı kümesine uyar. Bir kez öğrendiğinizde her endpoint tanıdık gelir.

Çoğu liste yanıtı bir sayfalama nesnesiyle sarmalanır — bkz. [Filtreleme ve Sayfalama](../api-reference/list-calls/filtering-pagination.md#paginated). Tek istisna, sayfalama nesnesi yerine `{ data, total }` döndüren [`GET /v1/assistants`](../api-reference/list-assistants.md) endpoint'idir.

---

## Hata formatı {#error-envelope}

Her hata yanıtı aynı **minimal** yapıya sahiptir: insan-okunabilir bir `message` alanı ve her zaman makine-okunabilir bir `code` taşıyan bir `extensions` nesnesi.

```json
{
  "message": "API key is invalid, expired, or has been revoked.",
  "extensions": {
    "code": "INVALID_API_KEY"
  }
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `message` | string | İnsan-okunabilir açıklama. Her zaman bulunur. |
| `extensions` | object | Her zaman bulunur. Her zaman `code` taşır; bazı hatalarda ek ayrıntı ekler (aşağıya bakın). |
| `extensions.code` | string | Makine-okunabilir hata kodu — bkz. [Hata Kodları kataloğu](../errors.md). Her zaman bulunur. |

Üst düzeyde `statusCode`, `timestamp`, `path`, `requestId` veya `code` alanları **yoktur**. HTTP durum satırı durumu taşır; kodu ise `extensions.code` taşır.

:::note Beklenmeyen 5xx
İyi tanımlanmış hatalar her zaman yukarıdaki zarfa uyar. Beklenmeyen bir sunucu hatası (`500`) ise uymayabilir — framework'ün varsayılan `{ "detail": "Internal Server Error" }` yanıtına düşebilir. `HTTP_500` diye bir kod yoktur. Kalıcı bir `5xx` ile karşılaşırsanız yeniden deneyin, ardından bildirin.
:::

---

## `extensions` içindeki ek ayrıntı

Hataya bağlı olarak `extensions`, `code` alanının yanında ek makine-okunabilir alanlar taşır:

| Hata (kod / durum) | `extensions` içindeki ek alanlar |
|---|---|
| `VALIDATION_FAILED` (400) | `validation_errors` — bir obje dizisi |
| `INVALID_PHONE_NUMBER`, `INVALID_METADATA` (400, `POST /v1/calls/bulk` içinden) | `index` — `calls` içindeki hatalı öğenin 0-tabanlı indeksi |
| `RATE_LIMITED` (429) | `retry_after` (saniye), `limit` |

### Doğrulama hataları

`VALIDATION_FAILED` durumunda `extensions.validation_errors` bir **obje dizisidir** — doğrulamayı geçemeyen her alan için bir giriş:

```json
{
  "message": "Request validation failed.",
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
| `field` | string | Geçersiz girdinin konumu (örneğin `body.calls`). |
| `message` | string | Bu alanda neyin hatalı olduğu. |
| `type` | string | Doğrulama hatasının türü. |

### Öğe bazlı hatalar (toplu istek)

Toplu bir istek belirli bir çağrıda başarısız olduğunda, `extensions.index` alanı `calls` dizisindeki hatalı öğeyi (0-tabanlı) gösterir:

```json
{
  "message": "Invalid phone number.",
  "extensions": {
    "code": "INVALID_PHONE_NUMBER",
    "index": 2
  }
}
```

### Hız limiti

`RATE_LIMITED` durumunda `extensions`, ne kadar beklemeniz gerektiğini ve dakika başına limiti bildirir (aynı değerler `Retry-After` ve `X-RateLimit-Limit` header'ları olarak da gönderilir):

```json
{
  "message": "Rate limit exceeded.",
  "extensions": {
    "code": "RATE_LIMITED",
    "retry_after": 60,
    "limit": 60
  }
}
```

**Her** başarılı (2xx) yanıt da `X-RateLimit-Limit` ve `X-RateLimit-Remaining` header'larını taşır; böylece limite takılmadan önce kalan kotanızı takip edebilirsiniz.

---

## Bir hatayı bildirme

Belirtebileceğiniz bir request ID yoktur. Bir sorunu bildirirken; HTTP metodunu ve URL'yi, istek ve yanıt gövdelerini ve isteğin yaklaşık zamanını ekleyin — ve paylaşmadan önce **API anahtarınızı maskeleyin**.
