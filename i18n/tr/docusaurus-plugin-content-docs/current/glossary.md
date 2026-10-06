---
title: Sözlük
sidebar_label: Sözlük
sidebar_position: 9
---

# Sözlük

| Terim | Tanım |
|---|---|
| **API Anahtarı** | `<keyId>.<secret>` biçimindeki şirket kimlik bilgisi |
| **keyId** | API anahtarının noktadan önceki bölümü (UUID) |
| **Açık Anahtar (Plain Key)** | API anahtarının tam metni — yalnızca oluşturma anında görünür |
| **Cursor** | Sayfalama (pagination) için kullanılan opak base64url değeri |
| **İmzalı Bağlantı (Presigned URL)** | Geçici, imzalı indirme bağlantısı — varsayılan olarak yaklaşık 24 saat / 86400 saniye geçerli, yapılandırılabilir |
| **structured_output** | Bir çağrıdan yapay zekâ tarafından çıkarılan veri için JSON Schema şablonu |
| **Call (Çağrı)** | Bir Vindy asistanı tarafından yönetilen telefon görüşmesi kaydı — bir metin (string) `call_id` ile tanımlanır |
| **call_id** | Tek bir çağrıyı tanımlayan kararlı, opak metin (string) — çağrının tüm yaşamı boyunca (kuyrukta → devam ederken → sonlanmış) değişmez. Opak kabul edin; ayrıştırmayın |
| **Assistant (Asistan)** | Vindy'de tanımlı bir yapay zekâ sesli asistanı — `assistant_id` değeri metin (UUID) türündedir |
| **Company (Şirket)** | Vindy'deki kiracı (tenant) — her müşteri bir şirkettir |
| **Yarı açık aralık** | `[from, to)` — sol uç dâhil, sağ uç hariç aralık |
| **E.164** | Uluslararası telefon numarası biçimi (örneğin `+905551112233`) |
| **Idempotent** | Yinelenmeye uygun — aynı isteği iki kez göndermek, bir kez göndermekle aynı etkiyi yaratır |
| **Upsert** | Ekle-veya-güncelle — kayıt yoksa ekler, varsa günceller |
| **Inbound (gelen çağrı)** | Müşterinin sizi aradığı, dışarıdan **gelen** çağrı. |
| **Outbound (giden çağrı)** | Asistanın müşteriyi aradığı, dışarıya **giden** çağrı. |
| **Toplu arama (bulk)** | Tek bir istekle çok sayıda numaranın sırayla aranması. Her toplu arama bir **kampanya** oluşturur. |
| **Kampanya (campaign / batch)** | Bir toplu çağrının tümünü temsil eden grup — `batch_call_id` ile tanımlanır. |
| **Webhook** | Bir olay gerçekleştiğinde (örneğin bir çağrı bitince) Vindy'nin sizin adresinize otomatik gönderdiği bildirim. Sürekli sorup durmak yerine olay kendiliğinden size gelir. |
| **Kuyruk (queue)** | Henüz aranmamış, sırasını bekleyen giden çağrılar. |
| **Terminal durum** | Çağrının artık değişmeyecek son durumu — `completed`, `failed` veya `cancelled`. |
| **WebRTC (tarayıcı çağrısı)** | Telefon hattı yerine doğrudan web tarayıcısı üzerinden yapılan çağrı. Bu çağrılar API'de görünmez. |
| **Şablon değişkenleri (assistant variables)** | Asistanın konuşmasındaki `{{name}}` gibi yer tutucuları dolduran değerler (örneğin `first_name`). |
