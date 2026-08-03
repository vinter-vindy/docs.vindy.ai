---
title: Kimlik Doğrulama
sidebar_label: Kimlik Doğrulama
sidebar_position: 3
---

# Kimlik Doğrulama

Her istek, bir `Authorization` header'ı içermek zorundadır:

```
Authorization: Bearer <api-key>
```

---

## API anahtarı biçimi

`<uuid>.<secret>` — toplam 80 karakter:

- `uuid` bölümü (36 karakter) → anahtar kimliği, hassas bir değer değildir
- `.` (nokta) → ayraç
- `secret` bölümü (43 karakter) → asıl gizli kısım

**Örnek:**

```
01902f6e-7c5a-7000-8000-abc123def456.R3vP9LkX2nM8jY7fW1qZ4tH6cB0sN5aDmGuI3oVpQ7r
```

---

## Anahtar nasıl alınır?

1. Vindy paneline giriş yapın.
2. **Settings → API Keys** sayfasına gidin.
3. Bir anahtar oluşturun. Anahtarın açık metni size yalnızca **bir kez** gösterilir; güvenli bir yere kaydedin.

---

## Kurallar

- Anahtarın açık metni yalnızca oluşturma anında görüntülenir. Kaybedilmesi durumunda kurtarma imkânı yoktur; yeni bir anahtar oluşturmanız gerekir.
- İptal edilen anahtarlar anında geçersiz hâle gelir; bu noktadan sonraki tüm istekler 401 döndürür.
- Süresi dolan anahtarlar (`expires_at < now()`) otomatik olarak geçersizdir.
- Her anahtar yalnızca tek bir şirkete bağlıdır ve başka bir müşterinin verisine erişemez. Ayrıntılar için [Multi-tenancy](concepts/multi-tenancy.md) bölümüne bakabilirsiniz.
- Anahtarları log'lara, kaynak koda veya herkese açık depolara yazmaktan kaçının. Bunun yerine ortam değişkenleri ya da bir secret manager kullanabilirsiniz.
- Anahtarları e-posta, Slack, WhatsApp gibi kanallar üzerinden paylaşmaktan kaçının. Bir anahtarın ele geçirilmiş olabileceğinden şüpheleniyorsanız, anahtarı derhâl iptal edip yenisini oluşturun.

---

## Olası hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER` | `Authorization` header'ı eksik |
| `401` | `INVALID_AUTH_FORMAT` | `Bearer <api-key>` biçimine uymuyor |
| `401` | `INVALID_API_KEY` | Anahtar geçersiz, süresi dolmuş veya iptal edilmiş |

Tüm hata yanıtları aynı JSON yapısını paylaşır; ayrıntılar için [Yanıt Formatı](concepts/response-envelopes.md#error-envelope) bölümüne bakabilirsiniz.

**Örnek — eksik header:**

```bash
curl -i https://api.vindy.ai/v1/assistants
```

```json
{
  "message": "Authorization header is missing.",
  "extensions": {
    "code": "MISSING_AUTH_HEADER"
  }
}
```

---

## Base URL'ler

| Ortam | Base URL |
|---|---|
| Production | `https://api.vindy.ai` |
