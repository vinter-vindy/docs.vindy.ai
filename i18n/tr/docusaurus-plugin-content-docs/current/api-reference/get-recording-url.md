---
title: Ses Kaydı Bağlantısı Al
sidebar_label: Ses Kaydı Bağlantısı Al
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/calls/:callId/recording-url`

Belirli bir çağrının ses kaydı için imzalı (presigned) bir indirme bağlantısı oluşturur. Bağlantı doğrudan depolamaya yönlendirir; imza bağlantının içinde yer aldığından ayrıca kimlik doğrulama gerektirmez. Bağlantı yaklaşık **24 saat** geçerlidir; yine de kalıcı olarak saklamak yerine indirip kendi deponuza almanız önerilir.

---

## İstek

```http
GET https://api.vindy.ai/v1/calls/sess_a1b2c3d4e5f6/recording-url
Authorization: Bearer <api-key>
```

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `callId` | string | Çağrının kalıcı dize kimliği ([`POST /v1/calls/list`](list-calls/index.md) yanıtından alınır). |

## Yanıt (200 OK)

```json
{
  "url": "https://...?X-Amz-Algorithm=...&X-Amz-Signature=...",
  "expires_at": "2026-06-04T12:39:56+00:00"
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `url` | string | İmzalı indirme bağlantısı. Ses kaydını indirmek için bu adrese doğrudan bir GET isteği gönderin; imza bağlantıya gömülüdür. Bağlantı geçicidir (~24 saat), kalıcı olarak önbelleğe almayın. |
| `expires_at` | ISO string | Bağlantının geçerliliğini yitireceği an (UTC). Oluşturulmasından yaklaşık **24 saat** sonra (varsayılan 86400s, yapılandırılabilir). |

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | Kimlik doğrulama hataları. |
| `404` | `RESOURCE_NOT_FOUND` | Çağrı bulunamadı, bir tarayıcı (WebRTC) çağrısı veya sizin şirketinize ait değil. |
| `404` | `RECORDING_NOT_AVAILABLE` | Çağrı mevcut, ancak bu çağrı için hiç ses kaydı üretilmemiş. **Kalıcı** — yeniden denemek sonucu değiştirmez. |
| `409` | `RECORDING_NOT_READY` | Ses kaydı var ama henüz indirilebilir değil. Nadir bir yarış koşulu — birkaç dakika sonra tekrar deneyin. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` saniye sonra tekrar deneyin. |

**404 örneği — hiç ses kaydı üretilmemiş (kalıcı):**

```json
{
  "message": "No recording was produced for this call. This is permanent — there is nothing to retrieve, and retrying will not help.",
  "extensions": {
    "code": "RECORDING_NOT_AVAILABLE"
  }
}
```

**409 örneği — ses kaydı henüz indirilebilir değil (nadir yarış):**

```json
{
  "message": "Recording is not ready yet. Retry in a few minutes.",
  "extensions": {
    "code": "RECORDING_NOT_READY"
  }
}
```

:::info Kalıcı vs. nadir yarış
[`POST /v1/calls/list`](list-calls/index.md) endpoint'ten aldığınız `call_id` değerleri için neredeyse her zaman ya **200** (ses kaydı hazır, bağlantı ile) ya da kalıcı **404 `RECORDING_NOT_AVAILABLE`** alırsınız — çünkü bir çağrı, ses kaydı kalıcı bir duruma ulaşmadan listede görünmez. **409 `RECORDING_NOT_READY`** nadir bir yarış koşuludur; karşılaşırsanız birkaç dakika sonra tekrar deneyin.
:::

## Notlar

- **Bağlantıyı kalıcı olarak önbelleğe almayın.** Bağlantı ~24 saat sonra geçerliliğini yitirir. Veritabanınıza kalıcı olarak kaydederseniz, geçerliliğini yitirmiş bağlantılarla karşılaşabilirsiniz. Bağlantıyı gerektiğinde yeniden oluşturun ve indirin.
- **Birden çok indirme.** Aynı bağlantıyı geçerlilik penceresi (~24 saat) içinde birden çok GET isteğiyle kullanabilirsiniz. Kayıtları farklı kullanıcılara iletiyorsanız, **her kullanıcı için ayrı bir bağlantı oluşturun**.
- **Kalıcı vs. nadir yarış.** [`POST /v1/calls/list`](list-calls/index.md) endpoint'ten alınan `call_id` değerlerinde hazır-değil yanıtı neredeyse her zaman kalıcıdır — bir `404 RECORDING_NOT_AVAILABLE`, ki yeniden denemek sonucu değiştirmez. Nadir yarış koşullarında bir `409 RECORDING_NOT_READY` görebilirsiniz; bu durumda birkaç dakika sonra tekrar deneyin.
- **Biçim.** Ses dosyaları genellikle `.wav` biçimindedir (mono, 8 kHz veya 16 kHz). Bazı kayıtlar farklı bir codec kullanabileceğinden, `Content-Type` header'ını denetlemeniz güvenli olur.
- **Boyut.** Tipik olarak 1–10 MB; uzun çağrılarda 30 MB'a kadar çıkabilir.

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# 1. Bağlantıyı alın
curl -H "Authorization: Bearer $VINDY_API_KEY" \
  https://api.vindy.ai/v1/calls/sess_a1b2c3d4e5f6/recording-url
# → { "url": "https://...call.wav?X-Amz-...", "expires_at": "..." }

# 2. Hemen indirin (bağlantıyı tırnak içine alın — sorgu dizesi uzundur)
curl -o call.wav "https://...call.wav?X-Amz-..."
```

</TabItem>
<TabItem value="node" label="Node.js">

```javascript
import { writeFile } from "node:fs/promises";

async function downloadRecording(callId) {
  // 1. Güncel bir imzalı bağlantı alın
  const response = await fetch(
    `https://api.vindy.ai/v1/calls/${callId}/recording-url`,
    { headers: { Authorization: `Bearer ${process.env.VINDY_API_KEY}` } },
  );

  if (response.status === 404) {
    const error = await response.json();
    if (error.extensions?.code === "RECORDING_NOT_AVAILABLE") {
      return null; // kalıcı — bu çağrı için hiç ses kaydı üretilmemiş
    }
    throw new Error(error.message); // RESOURCE_NOT_FOUND
  }
  if (response.status === 409) {
    // RECORDING_NOT_READY — nadir yarış; ses kaydı henüz indirilebilir değil
    throw new Error("Ses kaydı henüz hazır değil — birkaç dakika sonra tekrar deneyin");
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  // 2. Ses dosyasını indirin (bağlantı ~24 saat geçerlidir)
  const { url } = await response.json();
  const audio = await fetch(url);
  await writeFile(`call-${callId}.wav`, Buffer.from(await audio.arrayBuffer()));
  return `call-${callId}.wav`;
}

await downloadRecording("sess_a1b2c3d4e5f6");
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
import requests

def download_recording(call_id):
    # 1. Güncel bir imzalı bağlantı alın
    response = requests.get(
        f"https://api.vindy.ai/v1/calls/{call_id}/recording-url",
        headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
    )

    if response.status_code == 404:
        error = response.json()
        if error.get("extensions", {}).get("code") == "RECORDING_NOT_AVAILABLE":
            return None  # kalıcı — bu çağrı için hiç ses kaydı üretilmemiş
        raise RuntimeError(error.get("message"))  # RESOURCE_NOT_FOUND
    if response.status_code == 409:
        # RECORDING_NOT_READY — nadir yarış; ses kaydı henüz indirilebilir değil
        raise RuntimeError("Ses kaydı henüz hazır değil — birkaç dakika sonra tekrar deneyin")
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")

    # 2. Ses dosyasını indirin (bağlantı ~24 saat geçerlidir)
    url = response.json()["url"]
    audio = requests.get(url)
    audio.raise_for_status()

    path = f"call-{call_id}.wav"
    with open(path, "wb") as f:
        f.write(audio.content)
    return path

download_recording("sess_a1b2c3d4e5f6")
```

</TabItem>
</Tabs>
