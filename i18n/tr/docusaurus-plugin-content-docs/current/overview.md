---
title: Genel Bakış
sidebar_label: Genel Bakış
sidebar_position: 1
---

# Genel Bakış

Vindy API, Vindy verilerinize kendi sistemleriniz üzerinden programatik erişim sağlar. Asistan tanımlarınıza, çağrı kayıtlarınıza, transcript'lere, yapay zekânın çıkardığı yapısal verilere ve ses kayıtlarına HTTP üzerinden erişebilirsiniz. Veri okumanın ötesinde, giden çağrılardan oluşan toplu aramalar oluşturabilir; henüz aranmamış çağrıları tek tek veya toplu arama düzeyinde iptal edebilirsiniz. Dilerseniz **webhook**'ları da kullanabilirsiniz: Vindy, bir çağrı sona erdiği anda — ve bir toplu arama tamamlandığında — endpoint'inize bildirim gönderir; böylece sürekli sorgulamak (polling) yerine neredeyse anında tepki verebilirsiniz. Bkz. [Webhooks](api-reference/webhooks.md).

**Genel özellikler:**

- JSON yanıt döndüren REST API
- Bearer token ile kimlik doğrulama (API anahtarı)
- Tüm endpoint'ler `/v1/` ön eki altında
- Yanıtlar `application/json` biçiminde
- Büyük listelerde cursor tabanlı pagination
- `call-ended` ve `batch-ended` olayları için isteğe bağlı **webhook** teslimatı

---

## Neler yapabilirsiniz?

| Amaç | İlgili endpoint |
|---|---|
| Şirketinizin asistanlarını görüntülemek | [`GET /v1/assistants`](api-reference/list-assistants.md) |
| Çağrıları hangi arayan numaralardan yapabileceğinizi görmek | [`GET /v1/phone-numbers`](api-reference/list-phone-numbers.md) |
| Giden bir toplu arama oluşturmak (tek istekte 1–200 çağrı) | [`POST /v1/calls/bulk`](api-reference/bulk-create-calls.md) |
| Çağrı kayıtlarını almak — transcript, yapısal veri, ses kaydı | [`POST /v1/calls/list`](api-reference/list-calls/index.md) |
| Tek bir çağrıyı kimliğiyle getirmek | [`GET /v1/calls/:callId`](api-reference/get-call.md) |
| Bir toplu aramayı takip etmek ve çağrılarını sayfalamak | [`POST /v1/calls/batches/:batchId/calls`](api-reference/get-batch-calls.md) |
| Henüz aranmamış (bekleyen) tek bir çağrıyı iptal etmek | [`POST /v1/calls/:callId/cancel`](api-reference/cancel-call.md) |
| Bir toplu aramanın bekleyen çağrılarını iptal etmek | [`POST /v1/calls/batches/:batchId/cancel`](api-reference/cancel-batch.md) |
| Belirli bir çağrının ses kaydını indirmek | [`GET /v1/calls/:callId/recording-url`](api-reference/get-recording-url.md) |
| Bir çağrı sona erdiğinde veya bir toplu arama tamamlandığında, sorgulamadan haberdar olmak | [Webhooks](api-reference/webhooks.md) |

---

## Dokümantasyonun yapısı

- **[Hızlı Başlangıç](quickstart.md)** — ilk isteğinizi beş dakikada gönderin.
- **[Kimlik Doğrulama](authentication.md)** — API anahtarlarının biçimi, kuralları ve sık karşılaşılan hatalar.
- **[Kavramlar](category/concepts)** — yanıt formatı, multi-tenancy ve kişisel veriler. Bu bölümü bir kez okumanız, diğer tüm konuların temelini oluşturur.
- **[API Referansı](category/api-reference)** — her endpoint'in istek/yanıt ayrıntıları ile curl, Node.js ve Python örnekleri.
- **[Hata Kodları](errors.md)** — makine tarafından okunabilir hata kodlarının tam kataloğu.
- **[Rehberler](category/guides)** — sık yapılan işlemler için hazır kullanım örnekleri: artımlı senkronizasyon, kayıt indirme ve tarih aralığı sorguları.

---

## Verileriniz size aittir

Her API anahtarı yalnızca tek bir şirkete bağlıdır. Tüm endpoint'ler otomatik olarak yalnızca o şirketin verisini döndürür; yani yalnızca kendi verinizi görürsünüz, başka bir şirketin id'si `404` döner. Ayrıntılar için [Multi-tenancy](concepts/multi-tenancy.md) bölümüne bakabilirsiniz.
