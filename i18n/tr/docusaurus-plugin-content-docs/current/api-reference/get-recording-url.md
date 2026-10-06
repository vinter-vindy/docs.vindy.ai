---
title: Ses Kaydı Bağlantısı Al
sidebar_label: Ses Kaydı Bağlantısı Al
sidebar_position: 4
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/calls/:callId/recording-url`

Belirli bir çağrının ses kaydı için imzalı (presigned) bir indirme bağlantısı oluşturur. İmza bağlantının içine gömülü olduğu için bu bağlantı doğrudan depolama alanına işaret eder ve ayrı bir kimlik doğrulaması gerektirmez. Bağlantı yaklaşık **24 saat** geçerli kalır; bu yüzden bağlantıyı saklamak yerine sesi kendi deponuza indirin.

Bu ucu, bir çağrı **bittikten sonra** çağırın. Örneğin çağrı [`POST /v1/calls/list`](list-calls/index.md) listesinde göründüğünde ya da [`call-ended` webhook'u](webhooks.md) tetiklendiğinde çağırabilirsiniz.

---

## İstek

```http
GET https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f/recording-url
Authorization: Bearer <api-key>
```

## Yol parametreleri

| Parametre | Tür | Açıklama |
|---|---|---|
| `callId` | string | Çağrıyı kalıcı, benzersiz kimliğiyle tanımlar. [`POST /v1/calls/list`](list-calls/index.md) ve [`GET /v1/calls/:callId`](get-call.md) yanıtlarında dönen ve [`call-ended` webhook'unda](webhooks.md) taşınan `call_id` ile aynıdır. |

## Yanıt (200 OK)

```json
{
  "url": "https://storage.vindy.ai/recordings/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f.ogg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=vindy%2F20260607%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20260607T120000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=8f2b1c4d5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
  "expires_at": "2026-06-08T12:00:00+00:00"
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `url` | string | İmzalı bir indirme bağlantısı verir. Ses kaydını indirmek için bu adrese doğrudan bir GET isteği gönderin; imza bağlantıya gömülüdür. |
| `expires_at` | ISO string | Bağlantının geçerliliğini yitireceği anı gösterir (UTC). Bu an, oluşturulmasından yaklaşık **24 saat** sonradır (varsayılan 86400s, yapılandırılabilir). |

## Hatalar

| Durum | Kod | Açıklama |
|---|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` | İsteğin kimlik doğrulaması başarısız oldu. |
| `404` | `RESOURCE_NOT_FOUND` | Şu durumlardan biri geçerlidir: çağrı bulunamadı, bir tarayıcı (WebRTC) çağrısı, başka bir şirkete ait ya da henüz bitmemiş (hâlâ çalıyor veya görüşme sürüyor). |
| `404` | `RECORDING_NOT_AVAILABLE` | Bu çağrı için indirilebilir bir ses kaydı yoktur. Kayıt ya hiç üretilmemiş (örneğin çok kısa veya başarısız bir çağrı) ya da oluşturulması kalıcı olarak başarısız olmuş veya devre dışı bırakılmış olabilir. **Bitmiş** bir çağrıda bu durum **kalıcıdır**; yeniden denemek işe yaramaz. Henüz **kuyrukta bekleyen ve aranmamış** bir giden çağrıda ise kayıt yalnızca henüz oluşmamıştır; çağrının çalışmasını bekleyip tekrar deneyin. |
| `409` | `RECORDING_NOT_READY` | Ses kaydı vardır ama hâlâ kalıcı depolamaya aktarıldığından henüz indirilemez. Bu durum, çağrı biter bitmez sık görülür. Birazdan tekrar deneyin ya da [`recording-ready` webhook'unu](webhooks.md#recording-ready) bekleyin. |
| `429` | `RATE_LIMITED` | Dakika-başı istek limiti aşıldı; `Retry-After` header'ındaki saniye kadar bekleyip tekrar deneyin. |

**404 örneği — ses kaydı yok (kalıcı):**

```json
{
  "message": "No recording is available for this call.",
  "extensions": {
    "code": "RECORDING_NOT_AVAILABLE"
  }
}
```

**409 örneği — ses kaydı henüz indirilebilir değil (hâlâ aktarılıyor):**

```json
{
  "message": "The recording is not ready yet.",
  "extensions": {
    "code": "RECORDING_NOT_READY"
  }
}
```

:::info 200 vs 409 vs 404 — hangi sonuç, ne yapmalı
**Bitmiş** bir çağrıda üç sonuç mümkündür ve her biri farklı bir anlam taşır:

- **200** — kayıt hazırdır; sesi indirmek için `url`'i kullanın.
- **409 `RECORDING_NOT_READY`** — kayıt hâlâ kalıcı depolamaya aktarılmaktadır. Bu durum, çağrı biter bitmez normaldir. Bir çağrı, kaydından **bağımsız** olarak, sonlanır sonlanmaz [`POST /v1/calls/list`](list-calls/index.md)'te görünür; bu yüzden bununla sık karşılaşırsınız, ender bir durum değildir. Birazdan tekrar deneyin ya da dosya hazır olduğu an size iletilmesi için [`recording-ready` webhook'una](webhooks.md#recording-ready) abone olun.
- **404 `RECORDING_NOT_AVAILABLE`** — hiçbir zaman kayıt oluşmayacaktır; yeniden denemeyin.

Liste ucu da her çağrı için aynı ayrımı [`call_recording.available: false`](list-calls/index.md#recording-not-available) alanıyla gösterir.
:::

## Notlar

- **Bağlantıyı kalıcı olarak önbelleğe almayın.** Bağlantı ~24 saat sonra geçerliliğini yitirir. Veritabanınıza kalıcı olarak kaydederseniz, geçerliliğini yitirmiş bağlantılarla karşılaşabilirsiniz. Bağlantıyı gerektiğinde yeniden oluşturun ve indirin.
- **Birden çok indirme.** Aynı bağlantıyı geçerlilik penceresi (~24 saat) içinde birden çok GET isteğiyle kullanabilirsiniz. Kayıtları farklı kullanıcılara iletiyorsanız, **her kullanıcı için ayrı bir bağlantı oluşturun**.
- **Biçim.** Kayıtlar OGG/Opus ses (`audio/ogg`) olarak teslim edilir. Dosya uzantısını varsaymak yerine `Content-Type` header'ını okuyun.
- **Boyut.** OGG/Opus sıkıştırılmış olduğundan dosyalar küçüktür; genellikle birkaç MB'ın altındadır ve boyut çağrının uzunluğuyla büyür.

## Örnekler

<Tabs groupId="lang">
<TabItem value="curl" label="curl">

```bash
# 1. Bağlantıyı alın
curl -H "Authorization: Bearer $VINDY_API_KEY" \
  https://api.vindy.ai/v1/calls/01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f/recording-url
# → { "url": "https://...call.ogg?X-Amz-...", "expires_at": "..." }

# 2. Hemen indirin (bağlantıyı tırnak içine alın — sorgu dizesi uzundur)
curl -o call.ogg "https://...call.ogg?X-Amz-..."
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
    // RECORDING_NOT_READY — hâlâ aktarılıyor; birazdan tekrar deneyin ya da recording-ready webhook'unu kullanın
    throw new Error("Ses kaydı henüz hazır değil; hâlâ aktarılıyor, birazdan tekrar deneyin");
  }
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`${error.extensions?.code}: ${error.message}`);
  }

  // 2. Ses dosyasını indirin (bağlantı ~24 saat geçerlidir)
  const { url } = await response.json();
  const audio = await fetch(url);
  await writeFile(`call-${callId}.ogg`, Buffer.from(await audio.arrayBuffer()));
  return `call-${callId}.ogg`;
}

await downloadRecording("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f");
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
        # RECORDING_NOT_READY — hâlâ aktarılıyor; birazdan tekrar deneyin ya da recording-ready webhook'unu kullanın
        raise RuntimeError("Ses kaydı henüz hazır değil; hâlâ aktarılıyor, birazdan tekrar deneyin")
    if not response.ok:
        error = response.json()
        code = error.get("extensions", {}).get("code")
        raise RuntimeError(f"{code}: {error.get('message')}")

    # 2. Ses dosyasını indirin (bağlantı ~24 saat geçerlidir)
    url = response.json()["url"]
    audio = requests.get(url)
    audio.raise_for_status()

    path = f"call-{call_id}.ogg"
    with open(path, "wb") as f:
        f.write(audio.content)
    return path

download_recording("01a0c8cf-4eb3-7de3-a3f2-efe4e0daf62f")
```

</TabItem>
</Tabs>
