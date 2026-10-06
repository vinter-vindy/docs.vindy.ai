---
title: Kişisel Veriler ve Telefon Numaraları
sidebar_label: Kişisel Veriler
sidebar_position: 5
---

# Kişisel Veriler ve Telefon Numaraları

Vindy API, çağrı verisini **olduğu gibi** döndürür. Bu verinin kendi tarafınızda yasalara uygun biçimde işlenmesi sizin sorumluluğunuzdadır.

---

## Hangi alanlar kişisel veri içerir?

| Alan | İçerik |
|---|---|
| `call_phone_number` | Karşı tarafın ham telefon numarasını taşır: giden çağrıda aranan, gelen çağrıda ise arayan numaradır; genellikle **E.164 biçimindedir** (örneğin `+905551112233`). **Maskelenmez.** |
| `call_transcript` | Çağrının tam konuşma metnini taşır. Müşteri serbestçe konuştuğu için ad, adres, kimlik numarası gibi kişisel bilgiler içerebilir. |
| `call_structured_data` | Asistanınızın görüşmeden çıkardığı yapısal veriyi taşır; yalnız sizin tanımladığınız alanları içerir, dolayısıyla içindeki kişisel verinin kapsamını siz belirlersiniz. |
| `call_variables` | Gönderdiğiniz şablon değişkenlerini birebir geri döndürür (örneğin `{"first_name": "..."}`). **Maskelenmez.** |
| `call_metadata` | Kendi belirlediğiniz opak metadata'yı birebir geri döndürür. **Maskelenmez.** |

---

## KVKK / GDPR

Bu veriler kişisel veri (PII) içerebilir. Söz konusu veriyi kendi sisteminizde **yürürlükteki mevzuata uygun biçimde** (Türkiye'de KVKK, AB'de GDPR) saklayın ve işleyin.

Kendi sistemlerinize kopyaladığınız verilere ilişkin saklama, silme ve anonimleştirme politikaları **sizin sorumluluğunuzdadır**. Pratik öneriler:

- Yalnızca gerçekten ihtiyaç duyduğunuz alanları senkronize edin.
- İndirdiğiniz transcript'lere ve ses kayıtlarına kendi saklama politikanızı uygulayın.
- Kayıt indirme bağlantıları geçicidir; varsayılan olarak yaklaşık 24 saat geçerlidir. Bağlantıyı değil, indirdiğiniz ses dosyasını saklayın ve gerektiğinde yeni bir bağlantı oluşturun. Bkz. [Ses Kaydı Bağlantısı Al](../api-reference/get-recording-url.md).
- Ses kayıtlarını kendi kullanıcılarınıza iletecekseniz, tek bir bağlantıyı paylaşmak yerine her kullanıcı için ayrı bir indirme bağlantısı oluşturun; bkz. [kayıt indirme rehberi](../guides/recording-retrieval.md).
