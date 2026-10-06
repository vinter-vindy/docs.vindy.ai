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

## Anahtar nasıl alınır?

1. Vindy paneline giriş yapın.
2. **Settings → API Keys** sayfasına gidin.
3. Bir anahtar oluşturun. Anahtarın açık metni size yalnızca **bir kez** gösterilir; güvenli bir yere kaydedin.

---

## Kurallar

- Anahtarın açık metni **yalnızca** oluşturma anında görüntülenir. Kaybedilmesi durumunda kurtarma imkânı yoktur; yeni bir anahtar oluşturmanız gerekir.
- Bir anahtarın süresi **dolmaz**; iptal edene kadar geçerli kalır. İptal edilen anahtarlar anında geçersiz hâle gelir; bu noktadan sonraki tüm istekler 401 döndürür.
- Her anahtar yalnızca tek bir şirkete bağlıdır ve başka bir şirketin verisine **erişemez**. Ayrıntılar için [Multi-tenancy](concepts/multi-tenancy.md) bölümüne bakabilirsiniz.

---

## Olası hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER` | `Authorization` header'ı eksik |
| `401` | `INVALID_AUTH_FORMAT` | `Bearer <api-key>` biçimine uymuyor |
| `401` | `INVALID_API_KEY` | Anahtar geçersiz veya iptal edilmiş |

Tüm hata yanıtları aynı JSON yapısını paylaşır; ayrıntılar için [Yanıt Formatı](concepts/response-envelopes.md#error-envelope) bölümüne bakabilirsiniz.

**Örnek — eksik header:**

```bash
curl -i https://api.vindy.ai/v1/assistants
```

```json
{
  "message": "Authorization header is required.",
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
