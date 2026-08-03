---
title: Artımlı Senkronizasyon
sidebar_label: Artımlı Senkronizasyon
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Artımlı Senkronizasyon

Kendi veritabanınızı, her seferinde tüm veriyi yeniden indirmeden Vindy çağrılarıyla güncel tutabilirsiniz.

---

## Tek seferlik aktarım ile sürekli senkronizasyon

- **Tek seferlik dışa aktarım** (geçmişe yönelik bir rapor) için: tüm sayfalarda [cursor](../api-reference/list-calls/filtering-pagination.md#cursors) ile gezinerek işlemi tamamlayın.
- **Sürekli senkronizasyon** (canlı operasyon) için: `date_from` değerini son senkronize ettiğiniz tarihe eşitleyin ve yalnızca yeni sonlanan çağrıları alın.

Önerilen sorgulama (polling) sıklığı: **dakikada birden fazla olmamalıdır.** Daha sık sorgulama genellikle gereksizdir; çağrılar milisaniye aralıklarla değil, gruplar hâlinde hazır hâle gelir.

---

## Yaklaşım

1. Veritabanınızda **`call_id` üzerinde bir benzersizlik (unique) kısıtı** kullanın ve her çağrıyı upsert edin.
2. Kendi tarafınızda bir **`last_synced_date`** tutun — **Europe/Istanbul** saat diliminde bir `YYYY-MM-DD` tarihi (API'nin tarih filtrelerinin kullandığı saat dilimi). Bunu, çağrı nesnesindeki bir alana **değil**, **her senkronizasyon çalıştırmasını başlattığınız tarihe** eşitleyin.
3. Bir sonraki senkronizasyonda `date_from=<last_synced_date>` ile sorgu gönderin. O sınır gününü yeniden taramak, son çalıştırmanızdan bu yana sonlanmış — dolayısıyla görünür hâle gelmiş — her çağrıyı yakalar.
4. Her sayfayı upsert edin (`call_id` üzerinden tekrarları ayıklayın). [Keyset cursor](../api-reference/list-calls/filtering-pagination.md#cursors) — `(started_at, attempt_id)` — üzerinden oturum içinde `pagination.next_cursor` / `pagination.has_more` ile gezinin ve işiniz bitince cursor'u bırakın (uzun süre saklamanız önerilmez).

:::info Neden bir tarih, `call_created_at` değil?
`date_from` / `date_to` **yalnızca tarihtir** (`YYYY-MM-DD`; girişte saat veya saat dilimi yoktur) ve sizin kontrol ettiğiniz çağrı-başı bir zaman damgasına göre değil, **Europe/Istanbul** gün sınırlarına göre yorumlanır. `call_created_at`, çağrının *kuyruğa alındığı* andır (daha erken ve çağrının bittiği anla ilgisiz); bunu watermark olarak kullanmak pencereyi sabitleyebilir ya da büyük örtüşmeleri yeniden taratabilir. Güvenli dayanak, bir önceki çalıştırmayı **başlattığınız tarihtir**: liste yalnızca sonlanmış çağrıları gösterir (aşağıya bakın); dolayısıyla o günü yeniden taramak, o andan sonra biten her şeyi ortaya çıkarır ve `call_id` üzerinden upsert örtüşmeyi zararsız kılar. Çağrılarınız gece yarısını aşabiliyorsa güvenlik payı olarak bir gün geriye çekin.
:::

Bu yaklaşımın güvenli olmasının nedenleri:

- `POST /v1/calls/list` hiçbir zaman devam eden çağrı döndürmez — yalnızca **sonlanmış** çağrılar görünür ve tarayıcı (WebRTC) çağrıları hiç görünmez. Son çalıştırmanız sırasında henüz bitmemiş bir çağrı kaybolmaz; bittikten sonra daha sonraki bir çalıştırmada ortaya çıkar. Bkz. [yarım veri döndürülmez](../api-reference/list-calls/index.md).
- [Keyset cursor](../api-reference/list-calls/filtering-pagination.md#cursors) `(started_at, attempt_id)`, tek bir gezinme içinde çağrıları tekrarlamaz — sonraki sayfa, önceki sayfanın çağrılarını **yeniden döndürmez**.
- `date_from` ve `date_to`, Europe/Istanbul saat diliminde **dâhil edici gün sınırlarıdır**; bu nedenle ardışık pencerelerde bir sınır gününü yeniden kullanmak o günde örtüşür. `call_id` üzerinden upsert yaptığınız için bu örtüşme — ve başarısız bir isteğin herhangi bir tekrarı — kayıt çiftlenmesi yaratamaz. Bkz. [aralık anlamı](../api-reference/list-calls/filtering-pagination.md#range-semantics).

---

## Uygulama

<Tabs groupId="lang">
<TabItem value="node" label="Node.js">

```javascript
async function syncCalls(assistantId, lastSyncedDate) {
  // BİR SONRAKİ çalıştırmanın watermark'ı: Europe/Istanbul saat diliminde bugünün
  // tarihi (tarih filtrelerinin kullandığı saat dilimi). Sınır gününü yeniden
  // taramak zararsızdır; çünkü call_id üzerinden upsert yaparsınız ve yalnızca
  // sonlanmış çağrılar görünür olduğundan, son çalıştırmada bitmemiş bir çağrı
  // bu sefer basitçe listeye gelir.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date()); // -> "2026-06-10"
  let cursor = undefined;

  do {
    const response = await fetch("https://api.vindy.ai/v1/calls/list", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VINDY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        date_from: lastSyncedDate, // YYYY-MM-DD — bir önceki çalıştırmanın tarihi (yeniden tarama idempotenttir)
        limit: 200, // sayfa başına en fazla 200
        cursor,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`${error.extensions?.code}: ${error.message}`);
    }

    const body = await response.json();
    for (const call of body.data) {
      await upsertCall(call); // INSERT ... ON CONFLICT (call_id) DO UPDATE
    }
    cursor = body.pagination.next_cursor; // has_more false olunca null
  } while (cursor);

  return today; // bir sonraki çalıştırmanın lastSyncedDate değeri olarak kaydedin
}
```

</TabItem>
<TabItem value="python" label="Python">

```python
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

def sync_calls(assistant_id, last_synced_date):
    # BİR SONRAKİ çalıştırmanın watermark'ı: Europe/Istanbul saat diliminde bugünün
    # tarihi (tarih filtrelerinin kullandığı saat dilimi). Sınır gününü yeniden
    # taramak zararsızdır; çünkü call_id üzerinden upsert yaparsınız ve yalnızca
    # sonlanmış çağrılar görünür olduğundan, son çalıştırmada bitmemiş bir çağrı
    # bu sefer basitçe listeye gelir.
    today = datetime.now(ZoneInfo("Europe/Istanbul")).date().isoformat()  # "2026-06-10"
    cursor = None

    while True:
        payload = {
            "assistant_id": assistant_id,
            "date_from": last_synced_date,  # YYYY-MM-DD — bir önceki çalıştırmanın tarihi (yeniden tarama idempotenttir)
            "limit": 200,  # sayfa başına en fazla 200
        }
        if cursor:
            payload["cursor"] = cursor

        response = requests.post(
            "https://api.vindy.ai/v1/calls/list",
            headers={"Authorization": f"Bearer {os.environ['VINDY_API_KEY']}"},
            json=payload,
        )
        if not response.ok:
            error = response.json()
            raise RuntimeError(
                f"{error.get('extensions', {}).get('code')}: {error.get('message')}"
            )

        body = response.json()
        for call in body["data"]:
            upsert_call(call)  # INSERT ... ON CONFLICT (call_id) DO UPDATE

        cursor = body["pagination"]["next_cursor"]  # has_more false olunca null
        if not cursor:
            break

    return today  # bir sonraki çalıştırmanın last_synced_date değeri olarak kaydedin
```

</TabItem>
</Tabs>

---

## Gün gün örnek

```bash
# 1. gün: tam dolum (backfill)
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":200}'
# pagination.has_more false döndürene kadar tüm sayfalarda gezinin.
# Europe/Istanbul saat dilimindeki bugünün tarihini (YYYY-MM-DD) last_synced_date olarak kaydedin (çağrıdaki bir alanı değil).

# 2. gün ve sonrası: artımlı
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","date_from":"2026-06-10","limit":200}'
```
