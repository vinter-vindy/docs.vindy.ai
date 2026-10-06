---
title: Hata Kodları
sidebar_label: Hata Kodları
sidebar_position: 6
---

# Hata Kodları

Her hata, makine tarafından okunabilir bir kodu `extensions.code` içinde taşır. Kendi `switch/case` mantığınızda, zamanla değişebilen `message` metnini değil bu kodu kullanın. Üst düzeyde `code` diye bir alan **yoktur**; kodu her zaman `extensions.code` içinden okuyun.

Tüm hata yanıtları aynı JSON yapısını paylaşır; bkz. [hata formatı](concepts/response-envelopes.md#error-envelope).

---

## Katalog

| Kod | Durum | Açıklama | Ne yapmalı? |
|---|---|---|---|
| `MISSING_AUTH_HEADER` | 401 | `Authorization` header'ı eksik. | Header'ı ekleyin. |
| `INVALID_AUTH_FORMAT` | 401 | Header `Bearer <api-key>` biçiminde değil. | Biçimi düzeltin. |
| `INVALID_API_KEY` | 401 | API anahtarı geçersiz veya iptal edilmiş. | Yeni bir anahtar oluşturun. |
| `RESOURCE_NOT_FOUND` | 404 | Kaynak bulunamadı veya sizin şirketinize ait değil: bir çağrı, bir toplu arama ya da kuyrukta bekleyen bir çağrı olabilir. | Kimliği doğrulayın. Başka bir şirkete ait bir kaynağın var olup olmadığını bile anlayamazsınız. |
| `VALIDATION_FAILED` | 400 | Gövde veya yol parametresi doğrulaması başarısız. | `extensions.validation_errors` doğrultusunda düzeltin (aşağıya bakın). |
| `RATE_LIMITED` | 429 | Dakikalık hız limiti aşıldı. | `Retry-After` saniye (varsayılan 60) kadar bekleyip tekrar deneyin. |
| `INVALID_DATE_FORMAT` | 400 | `date_from` / `date_to` bir `YYYY-MM-DD` tarihi değil. | Yalnızca tarih kullanın. Bkz. [Filtreleme ve Sayfalama](api-reference/list-calls/filtering-pagination.md). |
| `DATE_RANGE_INVALID` | 400 | `date_from`, `date_to`'dan sonra. | Aralığı düzeltin. |
| `INVALID_CURSOR` | 400 | Cursor boş veya çözümlenemedi. | Önceki bir yanıttan alınan güncel bir cursor kullanın. |
| `MALFORMED_CURSOR` | 400 | Cursor çözümlenemiyor **ya da** farklı bir endpoint veya farklı bir filtre kümesi için üretilmiş (bir cursor yalnız onu üreten endpoint + filtreler için geçerlidir). | Cursor'u değiştirmeyin; döndürüldüğü biçimde kullanın. Bir filtreyi değiştirdiyseniz ya da endpoint değiştirdiyseniz cursor'sız baştan başlayın. |
| `INVALID_PHONE_NUMBER` | 400 | Bir telefon numarası normalize edilemedi: `POST /v1/calls/bulk` isteğinde `calls[i].phone_number` ya da tekli bir `POST /v1/calls` isteğinde `phone_number`. | Numarayı düzeltin; toplu istekte hatalı indeks `extensions.index` içindedir. Bkz. [Toplu Arama Oluştur](api-reference/bulk-create-calls.md#phone-numbers). |
| `INVALID_METADATA` | 400 | Bir çağrının metadata'sı limitleri aşıyor veya geçersiz bir değer tipi kullanıyor. | Limitlere uyun; hatalı indeks `extensions.index` içindedir. Bkz. [Toplu Arama Oluştur](api-reference/bulk-create-calls.md#metadata). |
| `INVALID_VARIABLES` | 400 | Bir `variables` nesnesi limitleri ihlal ediyor (≤50 anahtar; anahtar ≤40; değer ≤500; string/number/boolean, iç içe yapı yok). | Çağrı-başı bir değer için hatalı indeks `extensions.index` içindedir; istek düzeyindeki bir ihlal `index: -1` bildirir. |
| `ASSISTANT_NOT_FOUND` | 404 | Asistan bulunamadı veya sizin şirketinize ait değil. | `assistant_id` değerini doğrulayın. |
| `PHONE_NUMBER_NOT_FOUND` | 404 | `phone_number_id` bilinmiyor, hatalı biçimli veya şirketinize ait değil. | [`GET /v1/phone-numbers`](api-reference/list-phone-numbers.md) yanıtından bir arayan numara seçin. |
| `PHONE_NUMBER_NOT_USABLE` | 400 | `phone_number_id` numarası mevcut ama giden arama için henüz hazırlanmamış. | [`GET /v1/phone-numbers`](api-reference/list-phone-numbers.md) yanıtından giden aramaya hazır bir numara seçin. |
| `INVALID_CALLING_WINDOW` | 400 | `POST /v1/calls/bulk` isteğindeki `calling_window` geçersiz (bozuk timezone, `start ≥ end`, boş/geçersiz `days` veya bozuk `HH:MM`). | Pencere şeklini düzeltin. Bkz. [Toplu Arama Oluştur](api-reference/bulk-create-calls.md#calling-window). |
| `RECORDING_NOT_AVAILABLE` | 404 | Kullanılabilir bir ses kaydı yok: ya hiç üretilmemiştir ya da kalıcı olarak başarısız olmuş veya devre dışı bırakılmıştır. **Kalıcı.** | Yeniden denemeyin. Bkz. [Ses Kaydı Bağlantısı Al](api-reference/get-recording-url.md). |
| `RECORDING_NOT_READY` | 409 | Ses kaydı var ama henüz indirilebilir değil. | Kısa süre sonra tekrar deneyin. Bkz. [Ses Kaydı Bağlantısı Al](api-reference/get-recording-url.md). |
| `ERR_CALL_NOT_CANCELLABLE` | 409 | Yalnızca kuyrukta bekleyen bir giden çağrı iptal edilebilir; bu çağrı şu anda aranıyor, az önce dağıtıma çıktı ya da gelen/çoktan başlamış bir çağrıdır (bunlar asla iptal edilemez). | Yeniden denemeyin; sonucu bekleyin. Bkz. [Tek Bir Çağrıyı İptal Et](api-reference/cancel-call.md). |

---

## Ayrıntıyı okuma

Bazı hatalar, `extensions` içinde ek makine tarafından okunabilir alanlar taşır:

| Alan | Hangi hatada | Ne içerir? |
|---|---|---|
| `extensions.validation_errors` | `VALIDATION_FAILED` | Her biri `{ "field": "body.calls", "message": "...", "type": "..." }` biçiminde olan bir **nesne dizisi**; neyin başarısız olduğunu tam olarak gösterir. |
| `extensions.index` | `INVALID_PHONE_NUMBER`, `INVALID_METADATA`, `INVALID_VARIABLES` | Gönderdiğiniz `calls` dizisindeki hatalı kaydın tam sayı indeksini verir (istek düzeyindeki bir `variables` ihlali için `-1`). |
| `extensions.retry_after`, `extensions.limit` | `RATE_LIMITED` | Beklemeniz gereken saniyeyi (aynı değer `Retry-After` header'ında da bulunur) ve dakikalık limitinizi verir. |

:::note Beklenmeyen 5xx hataları
Beklenmeyen bir sunucu hatası, tekdüze zarfı **takip etmeyebilir**: ham bir `500`, `extensions.code` içermeyen ve çerçevenin varsayılanı olan `{ "detail": "Internal Server Error" }` yanıtını döndürebilir. `HTTP_500` diye bir kod yoktur. `5xx` için bir kodun bulunacağına güvenmeyin; her `5xx`'i geçici bir sunucu hatası olarak değerlendirip bize bildirin (bkz. [SSS](faq.md#how-do-i-report-an-issue)).
:::

:::note Desteklenmeyen HTTP metodu
Geçerli bir yola desteklenmeyen bir HTTP metoduyla yapılan istek, `ERROR` kodlu bir `405` döndürür; bu, yukarıdaki katalogda yer almayan tek koddur. Her endpoint için belgelenen metodu kullanın.
:::
