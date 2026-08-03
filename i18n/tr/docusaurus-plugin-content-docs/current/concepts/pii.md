---
title: Kişisel Veriler ve Telefon Numaraları
sidebar_label: Kişisel Veriler
sidebar_position: 5
---

# Kişisel Veriler ve Telefon Numaraları

Vindy API, çağrı verisini olduğu gibi döndürür. Bu verinin kendi tarafınızda yasalara uygun biçimde işlenmesi sizin sorumluluğunuzdadır.

---

## Hangi alanlar kişisel veri içerir?

| Alan | İçerik |
|---|---|
| `call_phone_number` | Genellikle **E.164 biçiminde** ham telefon numarası (örneğin `+905551112233`). Maskelenmez. |
| `call_transcript` | Müşteriyle yapılan görüşmenin dökümü; kişisel bilgi içerebilir. |
| `call_structured_data` | Asistanınızın çıkardığı yapısal veri; hangi alanları yapılandırdıysanız onları içerir. |

---

## KVKK / GDPR

Bu veriler kişisel veri (PII) içerebilir. Söz konusu veriyi kendi sisteminizde **yürürlükteki mevzuata uygun biçimde** (Türkiye'de KVKK, AB'de GDPR) saklayın ve işleyin.

Kendi sistemlerinize kopyaladığınız verilere ilişkin saklama, silme ve anonimleştirme politikaları sizin sorumluluğunuzdadır. Pratik öneriler:

- Yalnızca gerçekten ihtiyaç duyduğunuz alanları senkronize etmeniz önerilir.
- İndirdiğiniz transcript'lere ve ses kayıtlarına kendi saklama politikanızı uygulamanız önerilir.
- Kayıt indirme bağlantıları geçicidir — varsayılan olarak yaklaşık 24 saat (86400 saniye) geçerlidir ve yapılandırılabilir. Bağlantıyı değil, indirdiğiniz ses dosyasını saklayın.
- Ses kayıtlarını kendi kullanıcılarınıza iletecekseniz, tek bir bağlantıyı paylaşmak yerine her kullanıcı için ayrı bir indirme bağlantısı oluşturun; bkz. [kayıt indirme rehberi](../guides/recording-retrieval.md).
