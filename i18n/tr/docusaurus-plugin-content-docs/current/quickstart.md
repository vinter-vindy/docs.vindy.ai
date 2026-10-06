---
title: Hızlı Başlangıç
sidebar_label: Hızlı Başlangıç
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Hızlı Başlangıç

İlk Vindy API isteğinizi yaklaşık beş dakikada gönderin.

:::info Base URL
Production: `https://api.vindy.ai`
:::

---

## 1. API anahtarı oluşturun

1. Vindy paneline giriş yapın.
2. **Settings → API Keys** sayfasına giderek bir anahtar oluşturun.
3. Anahtarın açık metni size yalnızca **bir kez** gösterilir; güvenli bir yere kaydedin. Anahtarı kaybederseniz yeniden oluşturmanız gerekir.

Anahtarı kaynak kodun içine yazmak yerine bir ortam değişkeni olarak saklayın:

```bash
export VINDY_API_KEY="01902f6e-7c5a-7000-8000-abc123def456.R3vP9LkX2nM8jY7fW1qZ4tH6cB0sN5aDmGuI3oVpQ7r"
```

---

## 2. Asistanlarınızı listeleyin

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl https://api.vindy.ai/v1/assistants \
  -H "Authorization: Bearer $VINDY_API_KEY"
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
const response = await fetch("https://api.vindy.ai/v1/assistants", {
  headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` },
});
const body = await response.json();
console.log(body.data);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

response = requests.get(
    "https://api.vindy.ai/v1/assistants",
    headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
)
print(response.json()["data"])
```

</TabItem>
</Tabs>

Asistanlarınız tek bir liste hâlinde döner. Bir sonraki adımda gerekeceği için `assistant_id` (UUID biçiminde bir metin değeri) değerini not edin:

```json
{
  "data": [
    {
      "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "assistant_name": "Vindy - Asistan",
      "assistant_language": "tr-TR",
      "assistant_created_at": "2026-06-08T10:29:55+00:00",
      "assistant_variables": ["first_name", "appointment_time"],
      "structured_outputs": [
        {
          "id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
          "name": "Vindy - Asistan",
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "required": ["arama_sonucu", "genel_memnuniyet_puani"],
            "properties": {
              "arama_sonucu": {
                "type": "string",
                "title": "Arama sonucu",
                "description": "Görüşmenin nasıl sonuçlandığı.",
                "enum": ["tamamlandi", "yarim_kaldi", "ulasilamadi", "belirsiz"]
              },
              "genel_memnuniyet_puani": {
                "type": "integer",
                "title": "Genel memnuniyet",
                "description": "1-5 arası memnuniyet puanı."
              },
              "geri_arama_talebi": { "type": "boolean", "title": "Geri arama talebi" },
              "ilgilenilen_urunler": {
                "type": "array",
                "title": "İlgilenilen ürünler",
                "description": "Müşterinin ilgi gösterdiği benzersiz ürünler.",
                "items": { "type": "string" },
                "uniqueItems": true
              },
              "siparisler": {
                "type": "array",
                "title": "Siparişler",
                "description": "Görüşmede verilen siparişler, her sipariş için bir nesne.",
                "items": {
                  "type": "object",
                  "properties": {
                    "urun": { "type": "string", "description": "Ürün adı." },
                    "miktar": { "type": "integer", "description": "Sipariş edilen adet." }
                  },
                  "required": ["urun", "miktar"]
                }
              }
            }
          }
        }
      ]
    }
  ],
  "total": 1
}
```

---

## 3. Çağrılarınızı listeleyin

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "limit": 50}'
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
const response = await fetch("https://api.vindy.ai/v1/calls/list", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ assistant_id: "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", limit: 50 }),
});
const body = await response.json();
console.log(body.data);
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

response = requests.post(
    "https://api.vindy.ai/v1/calls/list",
    headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    json={"assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "limit": 50},
)
print(response.json()["data"])
```

</TabItem>
</Tabs>

Her çağrı, kendi transcript'ini, yapay zekânın çıkardığı yapısal veriyi ve (varsa) bir ses kaydı bağlantısını içerir. Bu bağlantı varsayılan olarak yaklaşık 24 saat geçerlidir:

```json
{
  "data": [
    {
      "call_id": "01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "completed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905551112233",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T10:30:00+00:00",
      "call_ended_at": "2026-05-15T10:31:27+00:00",
      "call_created_at": "2026-05-15T10:29:55+00:00",
      "call_duration_seconds": 87,
      "call_end_reason": "completed",
      "call_transcript": "[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy; son siparişinizle ilgili arıyorum. Kısa bir memnuniyet anketi için birkaç dakikanız var mı?\n[10:30:07] Müşteri: Tabii, buyurun.\n[10:30:11] Asistan: Teşekkürler. Genel deneyiminizden memnuniyetinizi 1 ile 5 arasında nasıl puanlarsınız?\n[10:30:18] Müşteri: 4 diyebilirim.\n[10:30:23] Asistan: Duyduğuma sevindim. Siparişinizle ilgili memnun kalmadığınız bir konu oldu mu?\n[10:30:29] Müşteri: Hayır, her şey yolundaydı.\n[10:30:34] Asistan: Harika. Herhangi bir konuda sizi bir temsilcimizin araması gerekir mi?\n[10:30:40] Müşteri: Hayır, gerek yok.\n[10:30:45] Asistan: Zaman ayırdığınız için çok teşekkür ederim, iyi günler dilerim!\n[10:30:50] Müşteri: Size de, teşekkürler.",
      "call_structured_data": {
        "arama_sonucu": "tamamlandi",
        "genel_memnuniyet_puani": 4,
        "geri_arama_talebi": false,
        "ilgilenilen_urunler": null
      },
      "call_metadata": { "order_id": "ORD-4821" },
      "call_variables": { "first_name": "Elif" },
      "call_recording": {
        "available": true,
        "url": "https://...",
        "expires_at": "2026-05-16T10:31:27+00:00"
      }
    },
    {
      "call_id": "019fb39a-2e5f-7c14-9a8b-1d3c5e7f9a20",
      "batch_call_id": "84213f7a-58cc-4372-a567-0e02b2c3d479",
      "call_status": "failed",
      "call_assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01",
      "call_assistant_name": "Vindy - Asistan",
      "call_phone_number": "+905554445566",
      "call_bound_type": "outbound",
      "call_started_at": "2026-05-15T11:02:10+00:00",
      "call_ended_at": "2026-05-15T11:02:16+00:00",
      "call_created_at": "2026-05-15T11:01:58+00:00",
      "call_duration_seconds": 0,
      "call_end_reason": "User Busy",
      "call_transcript": null,
      "call_structured_data": null,
      "call_metadata": { "order_id": "ORD-4822" },
      "call_variables": { "first_name": "Deniz" },
      "call_recording": {
        "available": false
      }
    }
  ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0…",
    "has_more": true,
    "limit": 50
  }
}
```

`call_transcript` tek bir metin dizesidir; içindeki her konuşmacı değişimi bir satır sonu (`\n`) ile ayrılır. JSON satır sonlarını kaçışlı yazdığı için yukarıdaki değer tek satırda görünür. Gerçek satır sonlarıyla görüntülendiğinde ilk çağrının transcript'i şöyledir:

```text
[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy; son siparişinizle ilgili arıyorum. Kısa bir memnuniyet anketi için birkaç dakikanız var mı?
[10:30:07] Müşteri: Tabii, buyurun.
[10:30:11] Asistan: Teşekkürler. Genel deneyiminizden memnuniyetinizi 1 ile 5 arasında nasıl puanlarsınız?
[10:30:18] Müşteri: 4 diyebilirim.
[10:30:23] Asistan: Duyduğuma sevindim. Siparişinizle ilgili memnun kalmadığınız bir konu oldu mu?
[10:30:29] Müşteri: Hayır, her şey yolundaydı.
[10:30:34] Asistan: Harika. Herhangi bir konuda sizi bir temsilcimizin araması gerekir mi?
[10:30:40] Müşteri: Hayır, gerek yok.
[10:30:45] Asistan: Zaman ayırdığınız için çok teşekkür ederim, iyi günler dilerim!
[10:30:50] Müşteri: Size de, teşekkürler.
```

---

## 4. Ses kaydını indirin

`call_recording.available` değeri `true` ise `url` alanı kullanıma hazırdır. Bu adrese doğrudan bir GET isteği gönderin; imza bağlantının içinde yer aldığından ayrıca kimlik doğrulama header'ı gerekmez:

```bash
curl -o call-recording.ogg "https://...presigned-url..."
```

Bağlantı geçicidir; varsayılan olarak yaklaşık 24 saat (86400 saniye) geçerlidir ve bu süre yapılandırılabilir. Bağlantıyı kalıcı olarak saklamak yerine, gerektiğinde [`GET /v1/calls/:callId/recording-url`](api-reference/get-recording-url.md) ile yeni bir bağlantı oluşturun.

---

## Sonraki adımlar

- [Kimlik Doğrulama](authentication.md) — anahtar biçimi, güvenlik kuralları ve 401 hataları
- [Filtreleme ve Sayfalama](api-reference/list-calls/filtering-pagination.md) — çağrılar için cursor, limit ve tarih filtreleri
- [Yanıt Formatı](concepts/response-envelopes.md) — hata zarfının yapısı
- [Artımlı senkronizasyon rehberi](guides/incremental-sync.md) — kendi veritabanınızı güncel tutma
- [Sözlük](glossary.md) — inbound, outbound, toplu çağrı gibi terimlerin herkesin anlayabileceği açıklamaları
