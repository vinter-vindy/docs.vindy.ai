---
title: Hata Kodları
sidebar_label: Hata Kodları
sidebar_position: 6
---

# Hata Kodları

Her hata, makine-okunabilir bir kodu `extensions.code` içinde taşır. Kendi `switch/case` mantığınızda, zamanla değişebilen insan-okunabilir `message` alanını değil bu kodu kullanın. Üst düzeyde `code` diye bir alan **yoktur** — kodu her zaman `extensions.code` içinden okuyun.

Tüm hata yanıtları aynı JSON yapısını paylaşır; bkz. [hata formatı](concepts/response-envelopes.md#error-envelope).

---

## Katalog

| Kod | Durum | Açıklama | Ne yapmalı? |
|---|---|---|---|
| `MISSING_AUTH_HEADER` | 401 | `Authorization` header'ı eksik. | Header'ı ekleyin. |
| `INVALID_AUTH_FORMAT` | 401 | Header `Bearer <api-key>` biçiminde değil. | Biçimi düzeltin. |
| `INVALID_API_KEY` | 401 | API anahtarı geçersiz, süresi dolmuş veya iptal edilmiş. | Yeni bir anahtar oluşturun. |
| `RESOURCE_NOT_FOUND` | 404 | Kaynak bulunamadı veya sizin şirketinize ait değil — bir çağrı, bir batch ya da bir çağrı görevi. | Kimliği doğrulayın. Başka bir şirketin kaynağı için var olup olmadığını dahi anlayamazsınız. |
| `VALIDATION_FAILED` | 400 | Gövde veya yol parametresi doğrulaması başarısız. | `extensions.validation_errors` doğrultusunda düzeltin (aşağıya bakın). |
| `RATE_LIMITED` | 429 | Dakikalık hız limiti aşıldı. | `Retry-After` saniye (varsayılan 60) kadar bekleyip tekrar deneyin. |
| `INVALID_DATE_FORMAT` | 400 | `date_from` / `date_to` bir `YYYY-MM-DD` tarihi değil. | Yalnızca tarih kullanın. Bkz. [Filtreleme ve Sayfalama](api-reference/list-calls/filtering-pagination.md). |
| `DATE_RANGE_INVALID` | 400 | `date_from`, `date_to`'dan sonra. | Aralığı düzeltin. |
| `INVALID_CURSOR` | 400 | Cursor boş veya çözümlenemedi. | Önceki bir yanıttan alınan güncel bir cursor kullanın. |
| `MALFORMED_CURSOR` | 400 | Cursor içeriği beklenen yapıda değil. | Cursor'u değiştirmeyin; döndürüldüğü biçimde kullanın. |
| `INVALID_PHONE_NUMBER` | 400 | Bir `calls[i].phone_number` normalize edilemedi. | Numarayı düzeltin; hatalı indeks `extensions.index` içindedir. Bkz. [Toplu Çağrı Oluştur](api-reference/bulk-create-calls.md#phone-numbers). |
| `INVALID_METADATA` | 400 | Bir çağrının metadata'sı limitleri aşıyor veya geçersiz bir değer tipi kullanıyor. | Limitlere uyun; hatalı indeks `extensions.index` içindedir. Bkz. [Toplu Çağrı Oluştur](api-reference/bulk-create-calls.md#metadata). |
| `INVALID_VARIABLES` | 400 | Bir `variables` nesnesi limitleri ihlal ediyor (≤50 anahtar; anahtar ≤40; değer ≤500; string/number/boolean, nesting yok). | Çağrı-başı bir değer için hatalı indeks `extensions.index` içindedir; istek düzeyindeki bir ihlal `index: -1` bildirir. |
| `ASSISTANT_NOT_FOUND` | 404 | Asistan bulunamadı, sizin şirketinize ait değil veya arama için uygun değil. | `assistant_id` değerini doğrulayın. |
| `PHONE_NUMBER_NOT_FOUND` | 404 | `POST /v1/calls/bulk` isteğindeki `phone_number_id` bilinmiyor, hatalı biçimli veya şirketinize ait değil. | [`GET /v1/phone-numbers`](api-reference/list-phone-numbers.md) yanıtından bir arayan hattı seçin. |
| `PHONE_NUMBER_NOT_USABLE` | 400 | `phone_number_id` hattı mevcut ama giden arama için hazır değil (provisioned değil). | [`GET /v1/phone-numbers`](api-reference/list-phone-numbers.md) yanıtından provisioned bir hat seçin. |
| `RECORDING_NOT_AVAILABLE` | 404 | Çağrı mevcut ama bu çağrı için hiç ses kaydı üretilmemiş. **Kalıcı.** | Yeniden denemeyin. Bkz. [Ses Kaydı Bağlantısı Al](api-reference/get-recording-url.md). |
| `RECORDING_NOT_READY` | 409 | Ses kaydı var ama henüz indirilebilir değil. | Kısa süre sonra tekrar deneyin. Bkz. [Ses Kaydı Bağlantısı Al](api-reference/get-recording-url.md). |
| `ERR_CALL_NOT_CANCELLABLE` | 409 | Yalnızca hâlâ kuyrukta olan bir çağrı iptal edilebilir; bu çağrı şu anda aranıyor (veya az önce dağıtıma çıktı). | Yeniden denemeyin; sonucu bekleyin. Bkz. [Tek Bir Çağrıyı İptal Et](api-reference/cancel-call.md). |

---

## Ayrıntıyı okuma

Bazı hatalar, `extensions` içinde ek makine-okunabilir alanlar taşır:

| Alan | Hangi hatada | Ne içerir? |
|---|---|---|
| `extensions.validation_errors` | `VALIDATION_FAILED` | Her biri `{ "field": "body.calls", "message": "...", "type": "..." }` biçiminde olan bir **nesne dizisi**; neyin başarısız olduğunu tam olarak gösterir. |
| `extensions.index` | `INVALID_PHONE_NUMBER`, `INVALID_METADATA`, `INVALID_VARIABLES` | Gönderdiğiniz `calls` dizisindeki hatalı kaydın tam sayı indeksi (istek düzeyindeki bir `variables` ihlali için `-1`). |
| `extensions.retry_after`, `extensions.limit` | `RATE_LIMITED` | Beklenmesi gereken saniye (aynı değer `Retry-After` header'ında da bulunur) ve dakikalık limitiniz. |

:::note Beklenmeyen 5xx hataları
Beklenmeyen bir sunucu hatası, tekdüze zarfı **takip etmeyebilir**: ham bir `500`, `extensions.code` içermeyen ve çerçevenin varsayılanı olan `{ "detail": "Internal Server Error" }` yanıtını döndürebilir. `HTTP_500` diye bir kod yoktur. `5xx` için bir kodun bulunacağına güvenmeyin — her `5xx`'i geçici bir sunucu hatası olarak değerlendirip bize bildirin (bkz. [SSS](faq.md#how-do-i-report-an-issue)).
:::
