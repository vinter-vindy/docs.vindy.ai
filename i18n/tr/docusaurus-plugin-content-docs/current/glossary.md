---
title: Sözlük
sidebar_label: Sözlük
sidebar_position: 9
---

# Sözlük

| Terim | Tanım |
|---|---|
| **API Anahtarı** | `<keyId>.<secret>` biçimindeki müşteri kimlik bilgisi |
| **keyId** | API anahtarının noktadan önceki bölümü (UUID) |
| **Açık Anahtar (Plain Key)** | API anahtarının tam metni — yalnızca oluşturma anında görünür |
| **Cursor** | Pagination için kullanılan opak base64 değeri |
| **İmzalı Bağlantı (Presigned URL)** | Geçici, imzalı indirme bağlantısı — varsayılan olarak yaklaşık 24 saat / 86400 saniye geçerli, yapılandırılabilir |
| **structured_output** | Bir çağrıdan yapay zekâ tarafından çıkarılan veri için JSON Schema şablonu |
| **Call (Çağrı)** | Bir Vindy asistanı tarafından yönetilen telefon görüşmesi kaydı — metin (string) bir `call_id` ile tanımlanır |
| **call_id** | Tek bir çağrıyı tanımlayan kararlı, opak metin (string) — çağrının tüm yaşamı boyunca (kuyrukta → devam ederken → sonlanmış) değişmez. Opak kabul edin; ayrıştırmayın |
| **Assistant (Asistan)** | Vindy'de tanımlı bir yapay zekâ sesli asistanı — `assistant_id` değeri metin (UUID) türündedir |
| **Company (Şirket)** | Vindy'deki tenant — her müşteri bir şirkettir |
| **Yarı açık aralık** | `[from, to)` — sol uç dâhil, sağ uç hariç aralık |
| **E.164** | Uluslararası telefon numarası biçimi (örneğin `+905551112233`) |
| **Idempotent** | Yinelenmeye uygun — aynı isteği iki kez göndermek, bir kez göndermekle aynı etkiyi yaratır |
| **Upsert** | Ekle-veya-güncelle — kayıt yoksa ekler, varsa günceller |
