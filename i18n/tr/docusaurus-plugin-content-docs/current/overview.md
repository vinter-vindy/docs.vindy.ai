---
title: Genel Bakış
sidebar_label: Genel Bakış
sidebar_position: 1
---

# Genel Bakış

Vindy API, verilerinize kendi sistemlerinizden **programatik olarak** erişmenizi sağlar. Asistan tanımlarınıza, çağrı kayıtlarınıza, transcript'lere, yapay zekânın çıkardığı yapısal verilere ve ses kayıtlarına HTTP üzerinden erişebilirsiniz. Yalnızca veri okumakla kalmazsınız: giden aramaları tek tek veya toplu olarak başlatabilir, henüz aranmamış çağrıları tek bir çağrı ya da bütün bir toplu arama düzeyinde iptal edebilirsiniz. Dilerseniz **webhook**'ları da kullanabilirsiniz. Bir çağrı bittiğinde, ses kaydı hazır olduğunda veya bir toplu arama tamamlandığında Vindy adresinize bildirim gönderir. Böylece sürekli sorgulama (polling) yapmak yerine olaylara neredeyse anında tepki verebilirsiniz. Bkz. [Webhooks](api-reference/webhooks.md).

**Genel özellikler:**

- JSON yanıt döndüren REST API
- Bearer token ile kimlik doğrulama (API anahtarı)
- Tüm endpoint'ler `/v1/` ön eki altında
- Yanıtlar `application/json` biçiminde
- Büyük listelerde cursor tabanlı sayfalama (pagination)
- `call-ended`, `recording-ready` ve `batch-ended` olayları için isteğe bağlı **webhook** teslimatı

---

## Neler yapabilirsiniz?

| Amaç | İlgili endpoint |
|---|---|
| Şirketinizin asistanlarını görüntülemek | [`GET /v1/assistants`](api-reference/list-assistants.md) |
| Çağrıları hangi arayan numaralardan yapabileceğinizi görmek | [`GET /v1/phone-numbers`](api-reference/list-phone-numbers.md) |
| Çağrı kayıtlarını almak (transcript, yapısal veri, ses kaydı) | [`POST /v1/calls/list`](api-reference/list-calls/index.md) |
| Giden bir toplu arama oluşturmak (tek istekte 1–1000 çağrı) | [`POST /v1/calls/bulk`](api-reference/bulk-create-calls.md) |
| Belirli bir çağrının ses kaydını indirmek | [`GET /v1/calls/:callId/recording-url`](api-reference/get-recording-url.md) |
| Tek bir çağrıyı kimliğiyle getirmek | [`GET /v1/calls/:callId`](api-reference/get-call.md) |
| Tek bir giden arama başlatmak | [`POST /v1/calls`](api-reference/create-call.md) |
| Henüz aranmamış (bekleyen) tek bir çağrıyı iptal etmek | [`POST /v1/calls/:callId/cancel`](api-reference/cancel-call.md) |
| Bir toplu aramanın bekleyen çağrılarını iptal etmek | [`POST /v1/calls/batches/:batchId/cancel`](api-reference/cancel-batch.md) |
| Toplu aramalarınızı listelemek | [`POST /v1/calls/batches/list`](api-reference/list-batches.md) |
| Bir toplu aramanın durumunu ve durum bazında dökümünü görmek | [`GET /v1/calls/batches/:batchId`](api-reference/get-batch.md) |
| Bir toplu aramayı takip etmek ve çağrılarını sayfalamak | [`POST /v1/calls/batches/:batchId/calls`](api-reference/get-batch-calls.md) |
| Bir çağrı sona erdiğinde, bir ses kaydı hazır olduğunda veya bir toplu arama tamamlandığında, sürekli sorgulama yapmadan haberdar olmak | [Webhooks](api-reference/webhooks.md) |

---

## Dokümantasyonun yapısı

- **[Hızlı Başlangıç](quickstart.md)** — ilk isteğinizi beş dakikada gönderin.
- **[Kimlik Doğrulama](authentication.md)** — API anahtarlarının biçimi, kuralları ve sık karşılaşılan hatalar.
- **[Kavramlar](category/concepts)** — yanıt formatı, multi-tenancy ve kişisel veriler. Bu bölümü bir kez okumak, diğer tüm konuları anlamanızın temelini oluşturur.
- **[API Referansı](category/api-reference)** — her endpoint'in istek/yanıt ayrıntıları ile curl, Node.js ve Python örnekleri.
- **[Hata Kodları](errors.md)** — makine tarafından okunabilir hata kodlarının tam kataloğu.
- **[Rehberler](category/guides)** — sık yapılan işlemler için hazır kullanım örnekleri: artımlı senkronizasyon ve kayıt indirme.

---

## Verileriniz size aittir

Her API anahtarı yalnızca tek bir şirkete bağlıdır. Tüm endpoint'ler otomatik olarak yalnızca o şirketin verisini döndürür; yani yalnızca kendi verinizi görürsünüz, başka bir şirketin id'si `404` döner. Ayrıntılar için [Multi-tenancy](concepts/multi-tenancy.md) bölümüne bakabilirsiniz.
