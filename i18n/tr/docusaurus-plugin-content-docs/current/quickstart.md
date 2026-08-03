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

Asistanlarınız tek bir liste hâlinde döner. Bir sonraki adımda gerekeceği için `assistant_id` (bir metin/UUID değeri) değerini not edin:

```json
{
  "data": [
    {
      "type": "assistant",
      "assistant_id": "8f3a1c20-9d4e-4b2a-b1c7-2e5f6a8b9c01",
      "assistant_name": "Customer Support",
      "assistant_language": "tr",
      "assistant_created_at": "2026-05-01T10:30:00+00:00",
      "structured_outputs": [ /* ... */ ]
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
  -d '{"assistant_id": "8f3a1c20-9d4e-4b2a-b1c7-2e5f6a8b9c01", "limit": 10}'
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
  body: JSON.stringify({ assistant_id: "8f3a1c20-9d4e-4b2a-b1c7-2e5f6a8b9c01", limit: 10 }),
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
    json={"assistant_id": "8f3a1c20-9d4e-4b2a-b1c7-2e5f6a8b9c01", "limit": 10},
)
print(response.json()["data"])
```

</TabItem>
</Tabs>

Her çağrı; transcript'i, yapay zekânın çıkardığı yapısal veriyi ve mevcut olduğunda bir ses kaydı bağlantısını (varsayılan olarak yaklaşık 24 saat geçerli) içerir:

```json
{
  "data": [
    {
      "call_id": "sess_a1b2c3d4e5f6",
      "call_status": "completed",
      "call_phone_number": "+905551112233",
      "call_started_at": "2026-05-15T10:30:00+00:00",
      "call_duration_seconds": 87,
      "call_transcript": "[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy. Müşteri memnuniyeti anketimiz kapsamında size birkaç kısa soru sormak istiyorum — şu an uygun musunuz?\n[10:30:07] Müşteri: Evet, müsaitim.\n[10:30:11] Asistan: Teşekkürler. Öncelikle yaşınızı öğrenebilir miyim?\n[10:30:16] Müşteri: Otuz iki.",
      "call_structured_data": {
        "overall_satisfaction": 4,
        "would_recommend": true
      },
      "call_recording": {
        "available": true,
        "url": "https://...",
        "expires_at": "2026-05-15T10:35:00+00:00"
      }
    }
  ],
  "pagination": { "next_cursor": null, "has_more": false, "limit": 10 }
}
```

`call_transcript` tek bir metin dizesidir; içindeki her konuşma sırası bir satır sonu (`\n`) ile ayrılır. JSON satır sonlarını kaçışlı yazdığı için yukarıdaki değer tek satırda görünür. Gerçek satır sonlarıyla görüntülendiğinde yukarıdaki transcript şöyledir:

```text
[10:30:00] Asistan: Merhaba, ben yapay zeka asistanı Vindy. Müşteri memnuniyeti anketimiz kapsamında size birkaç kısa soru sormak istiyorum — şu an uygun musunuz?
[10:30:07] Müşteri: Evet, müsaitim.
[10:30:11] Asistan: Teşekkürler. Öncelikle yaşınızı öğrenebilir miyim?
[10:30:16] Müşteri: Otuz iki.
```

---

## 4. Ses kaydını indirin

`call_recording.available` değeri `true` ise `url` alanı kullanıma hazırdır. Bu adrese doğrudan bir GET isteği gönderin; imza bağlantının içinde yer aldığından ayrıca kimlik doğrulama header'ı gerekmez:

```bash
curl -o call-recording.wav "https://...presigned-url..."
```

Bağlantı geçicidir — varsayılan olarak yaklaşık 24 saat (86400 saniye) geçerlidir ve yapılandırılabilir. Bağlantıyı kalıcı olarak saklamak yerine, gerektiğinde [`GET /v1/calls/:callId/recording-url`](api-reference/get-recording-url.md) ile yeni bir bağlantı oluşturun.

---

## Sonraki adımlar

- [Kimlik Doğrulama](authentication.md) — anahtar biçimi, güvenlik kuralları ve 401 hataları
- [Filtreleme ve Sayfalama](api-reference/list-calls/filtering-pagination.md) — çağrılar için cursor, limit ve tarih filtreleri
- [Yanıt Formatı](concepts/response-envelopes.md) — hata zarfının yapısı
- [Artımlı senkronizasyon rehberi](guides/incremental-sync.md) — kendi veritabanınızı güncel tutma
