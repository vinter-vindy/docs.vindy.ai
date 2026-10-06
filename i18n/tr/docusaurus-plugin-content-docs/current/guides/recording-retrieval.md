---
title: Kayıt İndirme
sidebar_label: Kayıt İndirme
sidebar_position: 2
---

# Kayıt İndirme

Çağrı kayıtlarını güvenilir biçimde nasıl indireceğinizi ve indirilecek bir kayıt olmadığını nasıl anlayacağınızı bu bölümde bulabilirsiniz.

---

## Yaklaşım

1. Çağrıları [`POST /v1/calls/list`](../api-reference/list-calls/index.md) ile alın. Bir ses kaydı mevcut ve erişilebilir durumdaysa, `call_recording` içinde doğrudan bir bağlantı döner.
2. `call_recording.available: false` ise iki şeyden biridir: **henüz hazır değil** (kayıt hâlâ aktarılıyor; çağrı biter bitmez normaldir, çünkü bir çağrı, kaydından bağımsız olarak sonlanır sonlanmaz listelenir) veya **kalıcı** (kayıt yok ya da aktarım kalıcı olarak başarısız). İkisini [`GET /v1/calls/:callId/recording-url`](../api-reference/get-recording-url.md) ile ayırın: `409 RECORDING_NOT_READY` = hâlâ aktarılıyor (birazdan tekrar deneyin), `404 RECORDING_NOT_AVAILABLE` = kalıcı. Ya da hiç sorgulamadan, kayıt indirilebilir olduğu an tetiklenen [`recording-ready` webhook'una](../api-reference/webhooks.md#recording-ready) abone olun.
3. Ses dosyasını **kendi depolama alanınıza** indirin; imzalı bağlantı yaklaşık **24 saat** sonra geçerliliğini yitirir. Acele etmenize gerek yok; ancak bağlantıyı veritabanınızda kalıcı olarak saklamayın; bunun yerine `call_id` değerini saklayın ve gerektiğinde yeni bir bağlantı oluşturun.
4. İndirmeden önce bağlantının süresi dolarsa, aynı endpoint'e yeniden GET isteği göndererek (~24 saat geçerli) yeni bir bağlantı alın.

:::tip Sorgulamak yerine push
Kayıt için hiç sorgulama yapmamak için [`recording-ready` webhook'una](../api-reference/webhooks.md#recording-ready) abone olun. Vindy, bir çağrının kaydı indirilebilir olduğu an çağrıyı (`data.call_recording` içinde yeni bir bağlantıyla) size gönderir. Bu olay yalnızca kayıt gerçekten hazır olduğunda tetiklenir; kaydı olmayan bir çağrı için hiç tetiklenmez.
:::

---

## Karar tablosu

| Gördüğünüz | Anlamı | Yapılması gereken |
|---|---|---|
| `call_recording.available: true` + `url` | Ses kaydı hazırdır | Hemen indirin ya da daha sonra güncel bir bağlantı oluşturun |
| `call_recording.available: false` | Ya henüz hazır değildir (hâlâ aktarılıyor) **ya da** kalıcıdır (hiç üretilmedi ya da başarısız oldu) | Aşağıdaki `recording-url` ile sınıflandırın ya da [`recording-ready` webhook'unu](../api-reference/webhooks.md#recording-ready) kullanın |
| 409 `RECORDING_NOT_READY` | Kayıt hâlâ aktarılıyor; çağrı biter bitmez normaldir | Birazdan tekrar deneyin ya da [`recording-ready` webhook'unu](../api-reference/webhooks.md#recording-ready) bekleyin |
| 404 `RECORDING_NOT_AVAILABLE` | **Kalıcı** — hiç kayıt olmayacak | Yeniden denemeyin. Kaydın var olması gerektiğini düşünüyorsanız Vindy'ye bildirin |

:::caution `available: false`'ta sıkı döngü kurmayın
`available: false` her zaman kalıcı değildir; çağrı biter bitmez çoğunlukla kaydın **hâlâ aktarıldığı** anlamına gelir. `recording-url`'i sıkı bir döngüde art arda çağırmayın: bir kez çağırıp sınıflandırın (`409` = hâlâ aktarılıyor, artan beklemeyle tekrar; `404` = kalıcı, durun) ya da (daha iyisi) [`recording-ready` webhook'una](../api-reference/webhooks.md#recording-ready) abone olup kayıt için sorgulamayı tamamen bırakın.
:::

---

## Temel kurallar

- **İmzalı bağlantıyı kalıcı olarak saklamayın.** Yaklaşık 24 saat içinde geçerliliğini yitirir. Bunun yerine `call_id` değerini saklayın, bağlantıyı gerektiğinde yeniden oluşturun ve indirin.
- **Her alıcı için ayrı bir bağlantı.** Kayıtları kendi kullanıcılarınıza iletecekseniz, tek bir bağlantıyı paylaşmak yerine her kullanıcı için ayrı bir bağlantı oluşturun.
- **`Content-Type`'ı denetleyin.** Kayıtlar **OGG/Opus ses** (`audio/ogg`) olarak teslim edilir; dosya uzantısını varsaymak yerine `Content-Type` header'ını okuyun.
- **Dosyalar küçüktür.** OGG/Opus sıkıştırılmış olduğundan bir kayıt genellikle birkaç MB'ın altındadır ve boyutu çağrının uzunluğuyla büyür.

Node.js ve Python için eksiksiz indirme kodunu [recording-url örneklerinde](../api-reference/get-recording-url.md#örnekler) bulabilirsiniz.
