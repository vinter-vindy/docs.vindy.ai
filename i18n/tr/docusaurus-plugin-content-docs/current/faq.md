---
title: SSS
sidebar_label: SSS
sidebar_position: 8
---

# Sık Sorulan Sorular

## Başka bir şirketin verisini görebilir miyim?

Hayır. Her API anahtarı yalnızca tek bir şirkete bağlıdır ve her istek otomatik olarak yalnızca o şirketi kapsar. Başka bir şirketin `call_id` değerini kullandığınızda 404 yanıtı alırsınız ve böyle bir kaydın var olup olmadığını dahi anlayamazsınız. Bkz. [Multi-tenancy](concepts/multi-tenancy.md).

## API anahtarımı kaybettim. Kurtarabilir misiniz?

Hayır. Anahtarın açık metni yalnızca oluşturma anında bir kez gösterilir. Yeni bir anahtar oluşturun ve eskisini iptal edin. Bkz. [Kimlik Doğrulama](authentication.md).

## Bir çağrı neden `POST /v1/calls/list` listesinde görünmüyor?

Bu endpoint yalnızca `completed` veya `failed` durumuna ulaşan çağrıları döndürür; `completed` bir çağrı ayrıca **çağrı sonrası analizi tamamlanana** kadar bekler, böylece `call_structured_data` nihai olur. Az önce biten bir çağrının listede görünmesi kısa bir süre alabilir. Hâlâ devam eden çağrılar hiçbir zaman görünmez; tarayıcı (WebRTC) çağrıları ise API'de hiç görünmez. (Ses kaydı ayrı olarak teslim edilir; çağrının görünmesi için gerekli değildir.) Bkz. [devam eden çağrılar neden görünmez](api-reference/list-calls/index.md).

## Bir kayıt Vindy panelinde görünüyor ancak API `available: false` döndürüyor. Bu bir hata mı?

Hayır, beklenen bir durumdur. Panel, ses kayıtlarını geçici kaynaklardan gösterebilir; API ise yalnızca kalıcı depolamadaki kayıtları sunar. Müşteri tarafı için bağlayıcı olan, API yanıtıdır. Bkz. [açıklama](api-reference/list-calls/index.md#recording-not-available).

## `call_recording.available` değeri `false`. Yeniden denemeli miyim?

Duruma bağlı. Bir çağrı biter bitmez kayıt hâlâ **aktarılıyor** olabilir; bu, birazdan hazır hâle gelecek geçici bir `false`'tır (tekrar çekin ya da [`recording-ready` webhook'una](api-reference/webhooks.md#recording-ready) abone olun). Yalnızca hiç kayıt üretilmediğinde veya aktarımı kalıcı olarak başarısız olduğunda **kalıcıdır**. İkisini ayırmak için [`GET /v1/calls/:callId/recording-url`](api-reference/get-recording-url.md)'i çağırın: `409` = hâlâ işleniyor (birazdan tekrar deneyin), `404` = hiç olmayacak. Bkz. [kayıt indirme](guides/recording-retrieval.md).

## İstekleri yeniden denemek güvenli mi? {#is-it-safe-to-retry-requests}

Okumalar için evet. Tüm `GET` endpoint'leri idempotenttir. `POST /v1/calls/list` ise bir gövde kullanmasına karşın **bir değişiklik (mutation) değil, bir sorgudur**; yan etkisi yoktur ve yeniden denenmesi güvenlidir. Kayıtları kendi tarafınızda upsert ettiğinizde (`call_id` üzerinde benzersizlik kısıtı) yeniden denemeler zararsız hâle gelir.

Yazma istekleri farklıdır. `POST /v1/calls/bulk` çağrı oluşturur ve eşzamanlı ya da tekrarlanan bir isteği engelleyen **sunucu tarafında bir kilit yoktur**; ikinci bir isteği "devam eden toplu arama var" gibi bir hatayla reddeden bir mekanizma bulunmaz. Bu nedenle körlemesine yeniden denemek **ikinci bir toplu arama başlatıp kişileri iki kez aratabilir**. Buna karşı kendi tarafınızda önlem alın:

- Bir toplu arama isteğini yalnızca öncekinin başarısız olduğundan eminken tekrarlayın.
- Tekilleştirme (dedup) uygulayın: örneğin her toplu aramayı kendi idempotency anahtarınızla etiketleyin ya da numaraların daha önce kabul edilip edilmediğini yeniden göndermeden önce kontrol edin.

İptal endpoint'leri ise güvenle tekrar çağrılabilir.

## Ne sıklıkla sorgulama yapmalıyım?

Dakikada birden fazla yapmamanız önerilir. Sürekli senkronizasyon için `date_from` değerini son senkronizasyon noktanızla kullanabilirsiniz; bkz. [artımlı senkronizasyon](guides/incremental-sync.md).

## Bir hız limiti var mı? {#is-there-a-rate-limit}

Evet. Varsayılan olarak **şirket (organizasyon) başına dakikada 300 istek** uygulanır; bu bütçe **o şirketin tüm API anahtarları arasında paylaşılır** (limit anahtar başına değil, şirket başına sayılır) ve şirkete göre ayarlanabilir. Bu sınırı aşmak, `RATE_LIMITED` kodlu bir `429` yanıtının yanı sıra, kaç saniye beklemeniz gerektiğini bildiren bir `Retry-After` header'ı (aynı değer `extensions.retry_after` içinde de bulunur) döndürür. O süre kadar bekleyip yeniden deneyin. Bkz. [Hata Kodları](errors.md).

## Tarih filtrelerim neden 400 döndürüyor?

Tarihler düz `YYYY-MM-DD` değerleri olmalıdır; içinde saat, saat dilimi ya da farklı bir sıra bulunan her şey (örneğin `05/23/2026`) `INVALID_DATE_FORMAT` ile reddedilir, `date_from`'un `date_to`'dan sonra olması ise `DATE_RANGE_INVALID` döndürür. Kabul edilen ve reddedilen biçimler için [Filtreleme ve Sayfalama](api-reference/list-calls/filtering-pagination.md) sayfasına bakabilirsiniz.

## Bir sorunu nasıl bildiririm? {#how-do-i-report-an-issue}

Aşağıdakilerin tümünü ekleyin; bu, sorunun çözümünü belirgin biçimde hızlandırır:

- Tam HTTP yöntemi ve URL
- İstek header'ları (**Authorization anahtarını maskeleyin**: `Bearer 01902f6e...***`)
- İstek gövdesi
- Yanıt durumu ve gövdesi
- İsteğin yaklaşık zamanı (saat diliminizle birlikte)
