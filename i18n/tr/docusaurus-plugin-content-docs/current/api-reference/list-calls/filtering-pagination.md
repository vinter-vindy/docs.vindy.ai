---
title: Filtreleme ve Sayfalama
sidebar_label: Filtreleme ve Sayfalama
sidebar_position: 3
---

# Filtreleme ve Sayfalama

[`POST /v1/calls/list`](index.md) çağrılarını daraltma ve sayfalama ile ilgili her şey: `cursor`, `limit`, `date_from` ve `date_to` parametreleri; ayrıca `assistant_id`, `campaign_id` ve `call_bound_type` filtreleri.

Çağrılar **en yeniden en eskiye** sırayla döner; sıralama, her çağrının gerçekleştiği ana (başlangıç zamanına) göredir, çağrı kimliği ise eşitlik bozucudur.

---

## Parametreler birlikte nasıl çalışır?

| İstek | Ne döner? |
|---|---|
| `date_from`, `date_to`, `cursor` ve `limit` yok | Şirketinize ait **en yeni 50** sonlanmış çağrı. Daha fazlası varsa `has_more` `true` olur ve `next_cursor` döner — sonraki 50 için onu geri gönderin. |
| Yalnızca `limit` (örn. `200`) | Tek sayfada en yeni *N* çağrı (en çok 200). |
| Yalnızca `date_from` | O günden itibaren (dahil) çağrılar, en yeniden başlayarak. `cursor` ile devam edin. |
| Yalnızca `date_to` | O gün dahil olacak şekilde ve öncesindeki çağrılar, en yeniden başlayarak. `cursor` ile devam edin. |
| `date_from` + `date_to` | İki ucu da dahil gün aralığındaki çağrılar, en yeniden başlayarak. |
| Yukarıdakilerden herhangi biri **+ `cursor`** | Aynı sorgunun **sonraki sayfası**. Sayfalar arasında diğer tüm parametreleri aynı tutun — yalnızca `cursor` değişir. |

**Diğer filtreler.** `assistant_id`, `campaign_id` ve `call_bound_type` (`inbound` / `outbound`) kapsamı daha da daraltır ve tarih aralığıyla ve birbirleriyle birlikte çalışır (mantıksal VE). `campaign_id`, [`POST /v1/calls/bulk`](../bulk-create-calls.md) yanıtında dönen `batch_call_id` değeridir. Bir gezinmenin her sayfasında aynı filtreleri gönderin.

---

## `limit`

- Varsayılan **50**, en fazla **200**; her sayfaya uygulanır.
- **1–200** aralığı dışındaki bir değer `400 VALIDATION_FAILED` ile reddedilir.
- `limit` yalnızca sayfa boyutunu belirler — toplamda kaç çağrı çekebileceğinizi **sınırlamaz**. Tümünü okumak için `cursor` ile sayfalamaya devam edin.

## `cursor` {#cursors}

- **İlk** istekte göndermeyin.
- Her yanıt bir `pagination.next_cursor` döner. `has_more` `true` olduğu sürece bu değeri `cursor` olarak geri gönderip sonraki sayfayı alın.
- `has_more` `false` olunca durun (bu noktada `next_cursor` `null`'dır).
- Cursor, **opak** bir base64url anahtarıdır — `(started_at, çağrı kimliği)` üzerinde azalan sıralı bir keyset işaretçisi. Oluşturmayın veya çözmeyin. Cursor ile sayfalarken **aynı `assistant_id`, `campaign_id`, `call_bound_type`, `date_from`, `date_to` ve `limit` değerlerini tekrar gönderin**; cursor yalnızca o sorgudaki konumunuzu işaretler.
- Cursor değerlerini uzun süre (örneğin günlerce) saklamayın — tek bir senkronizasyon oturumu içinde kullanın. Düzenli/**artımlı** senkron için çalıştırmalar arasında cursor saklamayın; bunun yerine en son çektiğiniz günü hatırlayıp sonraki çalıştırmada `date_from` olarak gönderin (ve bir gün tam olarak yeniden tarandığından `call_id` üzerinden tekilleştirin). Cursor, *tek bir sorgunun içindeki* konumu işaretler; kalıcı bir watermark değildir. Bkz. [artımlı senkron rehberi](../../guides/incremental-sync.md).

```bash
# İlk istek (cursor yok)
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":50}'

# Yanıt: { "data": [...], "pagination": { "next_cursor": "X", "has_more": true } }

# Sonraki istek (next_cursor değerini kullanın)
curl -X POST https://api.vindy.ai/v1/calls/list \
  -H "Authorization: Bearer $VINDY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"assistant_id":"8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01","limit":50,"cursor":"X"}'

# has_more: false olunca durun
```

Cursor hataları:

| Durum | Kod | Anlamı |
|---|---|---|
| `400` | `INVALID_CURSOR` | Cursor boş veya çözümlenemedi. Önceki bir yanıttan alınan güncel bir cursor kullanın. |
| `400` | `MALFORMED_CURSOR` | Cursor içeriği beklenen yapıda değil. Cursor'u değiştirmeyin — döndürüldüğü biçimde kullanın. |

## Sayfalama nesnesi {#paginated}

Her sayfa aynı yapıyla sarmalanır:

```json
{
  "data": [ /* çağrılar */ ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0xNVQxMTowMjoxMCswMDowMCIsImkiOiJzZXNzXzZhNGIwZDNjMmY4MSJ9",
    "has_more": true,
    "limit": 50
  }
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Bu sayfadaki çağrılar. |
| `pagination.next_cursor` | string \| null | Sonraki sayfa için opak cursor. Son sayfada `null`. |
| `pagination.has_more` | boolean | Bu sayfadan sonra başka çağrı olup olmadığı. |
| `pagination.limit` | int | Bu istekte uygulanan limit. |

---

## Tarihler: `date_from` / `date_to` {#range-semantics}

İki parametre de **yalnızca tarih** içeren `YYYY-MM-DD` değerleridir ve her ikisi de **iki ucu dahil tam günlerdir**:

- `date_from` — dahil edilen ilk gün ("bu günden itibaren")
- `date_to` — dahil edilen son gün ("bu güne kadar, bu gün dahil")

Günler **Europe/Istanbul** dilimine göre yorumlanır (yıl boyunca sabit UTC+3; yaz/kış saati yoktur). İçeride aralık, İstanbul saatiyle `[date_from 00:00, (date_to + 1 gün) 00:00)`'dır; böylece her iki ucun yerel günü tam olarak kapsanır.

Birini tek başına ya da ikisini birlikte gönderebilir; en baştan taramak için ikisini de boş bırakabilirsiniz. `date_from`'un `date_to`'dan sonra olması `DATE_RANGE_INVALID` (400) ile reddedilir.

### Kabul edilen biçim

Kabul edilen tek bir biçim vardır — düz bir takvim tarihi:

| Biçim | Örnek | Anlamı |
|---|---|---|
| Tarih (`YYYY-MM-DD`) | `2026-05-23` | 23 Mayıs gününün tamamı, Europe/Istanbul dilimiyle |

Girişte saat veya saat dilimi bileşeni **yoktur** — bir gün gönderirsiniz, İstanbul gün sınırlarını sunucu sizin için uygular.

### Reddedilen biçimler

| Biçim | Hata Kodu | Sorun |
|---|---|---|
| `2026-05-23T15:30:00Z` | `INVALID_DATE_FORMAT` | Saat bileşeni var — yalnızca tarih gönderin |
| `2026-05-23 15:30:00` | `INVALID_DATE_FORMAT` | Düz bir tarih değil |
| `05/23/2026` | `INVALID_DATE_FORMAT` | `YYYY-MM-DD` değil — sıra belirsiz |
| `23-05-2026` | `INVALID_DATE_FORMAT` | GG-AA-YYYY kabul edilmez |
| `2026-13-01` | `INVALID_DATE_FORMAT` | Geçersiz ay (13) |
| `2026-02-30` | `INVALID_DATE_FORMAT` | Geçersiz gün (30 Şubat) |

Reddedilen her değer, yukarıdaki hata koduyla birlikte yapılandırılmış bir 400 döner. Bkz. [Hata Kodları kataloğu](../../errors.md).

### Geçerli aralıklar

| Girdi | Geçerli Aralık (Europe/Istanbul) |
|---|---|
| `date_from=2026-05-23` | `2026-05-23 00:00`'dan itibaren |
| `date_to=2026-05-23` | `2026-05-23` boyunca (`< 2026-05-24 00:00`) |
| `date_from=2026-05-23` + `date_to=2026-05-23` | 23 Mayıs gününün tamamı |
| `date_from=2026-05-01` + `date_to=2026-05-31` | Mayıs ayının tamamı |

---

## Reçeteler

**Tek bir gün** — iki uç da dahil, yani 23 Mayıs'ın tamamı:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-23", "date_to": "2026-05-23" }
```

**Bir takvim ayı** — iki uç da dahil, yani 1–31 Mayıs:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-01", "date_to": "2026-05-31" }
```

**Belirli bir günden bu yana her şey** — "şu ana kadar" için `date_to`'yu boş bırakın:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-23" }
```

**Aralıkları çakışmadan zincirleme** — iki uç da dahil olduğundan, bir aralığın `date_to`'su ile bir sonrakinin `date_from`'u **ardışık günler** olmalı, asla aynı gün olmamalıdır:

```json
{ "date_from": "2026-05-01", "date_to": "2026-05-23" }
{ "date_from": "2026-05-24", "date_to": "2026-05-31" }
```

### Sık yapılan hatalar

| Gönderdiğiniz | Sonuç |
|---|---|
| `"2026-05-23T15:30:00Z"` (saat var) | `400 INVALID_DATE_FORMAT` — tarihler yalnızca gün (`YYYY-MM-DD`) |
| `"23-05-2026"` veya `"05/23/2026"` | `400 INVALID_DATE_FORMAT` — yalnızca `YYYY-MM-DD` |
| `date_from`, `date_to`'dan sonra | `400 DATE_RANGE_INVALID` |
