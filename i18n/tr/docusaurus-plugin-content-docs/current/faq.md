---
title: SSS
sidebar_label: SSS
sidebar_position: 8
---

# Sık Sorulan Sorular

## Başka bir şirketin verisini görebilir miyim?

Hayır. Her API anahtarı yalnızca tek bir şirkete bağlıdır ve her istek otomatik olarak o şirkete kapsanır. Başka bir şirketin `call_id` değerini kullandığınızda 404 yanıtı alırsınız ve böyle bir kaydın var olup olmadığını dahi anlayamazsınız. Bkz. [Multi-tenancy](concepts/multi-tenancy.md).

## API anahtarımı kaybettim. Kurtarabilir misiniz?

Hayır. Anahtarın açık metni yalnızca oluşturma anında bir kez gösterilir. Yeni bir anahtar oluşturun ve eskisini iptal edin. Bkz. [Kimlik Doğrulama](authentication.md).

## Bir çağrı neden `POST /v1/calls/list` listesinde görünmüyor?

Bu endpoint yalnızca **sonlanmış** bir duruma ulaşan çağrıları döndürür: `completed` veya `failed`, ve ses kaydı aktarımı sonuçlanmış olanlar. Az önce biten bir çağrının listede görünmesi kısa bir süre alabilir. Hâlâ devam eden çağrılar hiçbir zaman görünmez; tarayıcı (WebRTC) çağrıları ise API'de hiç görünmez. Bkz. [yarım veri döndürülmez](api-reference/list-calls/index.md).

## Bir kayıt Vindy panelinde görünüyor ancak API `available: false` döndürüyor. Bu bir hata mı?

Hayır, beklenen bir durumdur. Panel, ses kayıtlarını geçici kaynaklardan gösterebilir; API ise yalnızca kalıcı depolamadaki kayıtları sunar. Müşteri tarafı için bağlayıcı olan, API yanıtıdır. Bkz. [açıklama](api-reference/list-calls/index.md#recording-not-available).

## `call_recording.available` değeri `false`. Yeniden denemeli miyim?

Hayır; bu durum **kalıcıdır**. Ya hiç kayıt üretilmemiştir ya da aktarımı kalıcı olarak başarısız olmuştur. Bkz. [kayıt indirme](guides/recording-retrieval.md).

## İstekleri yeniden denemek güvenli mi? {#is-it-safe-to-retry-requests}

Okumalar için evet. Tüm `GET` endpoint'leri idempotenttir. `POST /v1/calls/list` ise bir gövde kullanmasına karşın **bir değişiklik (mutation) değil, bir sorgudur**; yan etkisi yoktur ve yeniden denenmesi güvenlidir. Kayıtları kendi tarafınızda upsert ettiğinizde (`call_id` üzerinde benzersizlik kısıtı) yeniden denemeler zararsız hâle gelir.

Yazma istekleri farklıdır. `POST /v1/calls/bulk` çağrı oluşturur ve eşzamanlı ya da tekrarlanan bir isteği engelleyen **sunucu tarafında bir kilit yoktur** — ikinci bir isteği "devam eden batch var" gibi bir hatayla reddeden bir mekanizma bulunmaz. Bu nedenle körlemesine yeniden denemek **ikinci bir batch başlatıp kişileri iki kez aratabilir**. Buna karşı kendi tarafınızda önlem alın: bir bulk isteğini yalnızca öncekinin başarısız olduğundan eminken tekrarlayın ve tekilleştirme (dedup) uygulayın (örneğin her batch'i kendi idempotency anahtarınızla etiketleyin ya da numaraların daha önce kabul edilip edilmediğini yeniden göndermeden önce kontrol edin). İptal endpoint'leri ise güvenle tekrar çağrılabilir.

## Ne sıklıkla sorgulama yapmalıyım?

Dakikada birden fazla yapmamanız önerilir. Sürekli senkronizasyon için `date_from` değerini son senkronizasyon noktanızla kullanabilirsiniz; bkz. [artımlı senkronizasyon](guides/incremental-sync.md).

## Bir hız limiti var mı? {#is-there-a-rate-limit}

Evet — varsayılan olarak **API anahtarı başına dakikada 60 istek**. Bu sınırı aşmak, `RATE_LIMITED` kodlu bir `429` yanıtının yanı sıra, kaç saniye beklemeniz gerektiğini bildiren bir `Retry-After` header'ı (aynı değer `extensions.retry_after` içinde de bulunur) döndürür. O süre kadar bekleyip yeniden deneyin. Bkz. [Hata Kodları](errors.md).

## Tarih filtrelerim neden 400 döndürüyor?

Tarihler düz `YYYY-MM-DD` değerleri olmalıdır — içinde saat, saat dilimi ya da farklı bir sıra bulunan her şey (örneğin `05/23/2026`) `INVALID_DATE_FORMAT` ile reddedilir; `date_from`'un `date_to`'dan sonra olması ise `DATE_RANGE_INVALID` döndürür. Kabul edilen ve reddedilen biçimler için [Filtreleme ve Sayfalama](api-reference/list-calls/filtering-pagination.md) sayfasına bakabilirsiniz.

## Bir sorunu nasıl bildiririm? {#how-do-i-report-an-issue}

Aşağıdakilerin tümünü ekleyin; bu, sorunun çözümünü belirgin biçimde hızlandırır:

- Tam HTTP yöntemi ve URL
- İstek header'ları (**Authorization anahtarını maskeleyin**: `Bearer 01902f6e...***`)
- İstek gövdesi
- Yanıt durumu ve gövdesi
- İsteğin yaklaşık zamanı (saat diliminizle birlikte)
