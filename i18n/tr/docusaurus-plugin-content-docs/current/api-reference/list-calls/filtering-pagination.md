---
title: Filtreleme ve Sayfalama
sidebar_label: Filtreleme ve Sayfalama
sidebar_position: 3
---

# Filtreleme ve Sayfalama

Bu sayfa, [`POST /v1/calls/list`](index.md) çağrılarını daraltmak ve sayfalamak için gereken her şeyi anlatır: `cursor`, `limit`, `date_from` ve `date_to` parametreleri ile `assistant_id`, `call_bound_type` ve `status` filtreleri.

Çağrılar **en yeniden en eskiye** sırayla döner; sıralama başlangıç zamanına (yoksa oluşturulma zamanına) göredir.

---

## Parametreler birlikte nasıl çalışır?

| İstek | Ne döner? |
|---|---|
| `date_from`, `date_to`, `status`, `cursor` ve `limit` yok | Şirketinize ait **en yeni 200** sonlanmış çağrı. Daha fazlası varsa `has_more` `true` olur ve `next_cursor` döner; sonraki 200 için onu geri gönderin. |
| Yalnızca `limit` (örn. `500`) | Tek sayfada en yeni *N* çağrı (en çok 500). |
| `status: completed` veya `status: failed` | Yalnızca o sonuçtaki çağrılar, en yeniden başlayarak. Bu listede eşleşebilecek tek iki `status` değeri bunlardır. |
| `status: cancelled` / `pending` / `scheduled` / `in_progress` | **Boş sayfa.** Bu kuyruk durumları bu listede hiç eşleşmez; aşağıdaki nota bakın. |
| Yalnızca `date_from` | O günden itibaren (dahil) çağrılar, en yeniden başlayarak. `cursor` ile devam edin. |
| Yalnızca `date_to` | O gün ve öncesindeki çağrılar (o gün dahil), en yeniden başlayarak. `cursor` ile devam edin. |
| `date_from` + `date_to` | İki ucu da dahil gün aralığındaki çağrılar, en yeniden başlayarak. |
| Yukarıdakilerden herhangi biri **+ `cursor`** | Aynı sorgunun **sonraki sayfası**. Sayfalar arasında diğer tüm parametreleri aynı tutun; yalnızca `cursor` değişir. |

**Diğer filtreler.** `assistant_id`, `call_bound_type` (`inbound` / `outbound`) ve `status` kapsamı daha da daraltır; tarih aralığıyla ve birbirleriyle birlikte çalışır (mantıksal VE). Bir gezinmenin her sayfasında aynı filtreleri gönderin. Bir toplu aramanın çağrılarını listelemek için bunun yerine özel [`POST /v1/calls/batches/:batchId/calls`](../get-batch-calls.md) endpoint'ini kullanın; bu liste toplu aramaya göre filtrelemez.

:::note Bu listede `status` neyi eşler?
Bu liste her zaman yalnızca **sonlanmış** çağrıları döndürür; bu yüzden burada yalnızca `status: completed` ve `status: failed` eşleşebilir. Dört kuyruk durumu (`cancelled`, `pending`, `scheduled`, `in_progress`) yine geçerli değerlerdir ve altısının tamamı [`POST /v1/calls/batches/:batchId/calls`](../get-batch-calls.md) ucunda anlamlıdır; ancak bu listede yalnızca boş sayfa döndürürler. Bilinmeyen bir değer `400 VALIDATION_FAILED` ile reddedilir.
:::

---

## `limit`

- Varsayılan **200**, en fazla **500**; her sayfaya uygulanır. `null` göndermek (veya `limit`'i atlamak) varsayılanı kullanır.
- **1–500** aralığı dışındaki bir değer `400 VALIDATION_FAILED` ile reddedilir.
- `limit` yalnızca sayfa boyutunu belirler; toplamda kaç çağrı çekebileceğinizi **sınırlamaz**. Tümünü okumak için `cursor` ile sayfalamaya devam edin.

## `cursor` {#cursors}

Cursor'ı bir yer imi gibi düşünün. Her yanıt, size geçerli sayfanın bittiği yeri gösteren bir yer imi verir. Bir sonraki istekte bu yer imini geri gönderirsiniz; sunucu da tam o noktadan devam eder. Yer imini kendiniz oluşturmaz ya da okumazsınız.

Tek bir filtre (`assistant_id`) ve küçük bir sayfa boyutuyla döngünün tamamı şöyledir.

**1. İlk istek (cursor yok).** Filtrelerinizi ve bir `limit` gönderirsiniz:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "limit": 50 }
```

Karşılığında en yeni 50 çağrıyı ve bir `pagination` nesnesini alırsınız. `next_cursor` sizin yer iminizdir; `has_more: true` ise daha fazla sayfa olduğunu gösterir:

```json
{ "data": [ /* en yeni 50 çağrı */ ], "pagination": { "next_cursor": "eyJ0...", "has_more": true } }
```

**2. Sonraki istek (cursor'ı geri gönderin).** Aynı filtreleri tekrarlayıp az önce aldığınız yer imini eklersiniz:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "limit": 50, "cursor": "eyJ0..." }
```

Bu, sonraki 50 çağrıyı ve bir sonraki sayfa için yeni bir `next_cursor`'ı döndürür.

**3. `has_more` `false` olana dek tekrarlayın.** O son sayfada `next_cursor` `null`'dır ve gezinmeniz tamamlanır.

`curl` ile aynı gezinme:

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

### Cursor kuralları

- **İlk istekte göndermeyin.** Bir cursor, ancak bir yanıt size bir tane verdikten sonra var olur.
- **Cursor opaktır.** En yeniden en eskiye sıralamada (başlangıç zamanı, yoksa oluşturulma zamanı) konumunuzu işaretleyen base64url bir token'dır. Onu oluşturmayın, çözmeyin, düzenlemeyin; aldığınız gibi aynen geri gönderin.
- **Filtrelerinizi sayfalar arasında aynı tutun.** Cursor ile sayfalarken aynı `assistant_id`, `call_bound_type`, `status`, `date_from` ve `date_to` değerlerini tekrar gönderin. Cursor, konumunuzu *o tek sorgunun içinde* işaretlediği için onu üreten endpoint'e ve filtrelere bağlıdır. Sayfalar arasında yalnızca `limit` (sayfa boyutu) değişebilir.
- **Bir filtreyi değiştirmek cursor'ı geçersiz kılar.** Herhangi bir filtreyi değiştirip (ya da cursor'ı toplu aramanın çağrı listesi gibi başka bir endpoint'e gönderip) cursor'ı yine de kullanırsanız istek `400 MALFORMED_CURSOR` ile reddedilir. Farklı bir kapsam sorgulamak için cursor'sız yeni bir gezinme başlatın.
- **Cursor'ları uzun süre saklamayın.** Bir cursor'ı günlerce değil, tek bir senkronizasyon oturumu içinde kullanın. Düzenli/**artımlı** senkron için çalıştırmalar arasında cursor saklamayın. Bunun yerine en son çektiğiniz günü hatırlayın, sonraki çalıştırmada `date_from` olarak gönderin ve `call_id` üzerinden tekilleştirin (bir gün her zaman baştan sona yeniden taranır). Cursor, tek bir sorgunun içindeki konumu işaretler; çalıştırmalar arasında taşıyabileceğiniz kalıcı bir ilerleme işareti (watermark) değildir. Bkz. [artımlı senkron rehberi](../../guides/incremental-sync.md).

Cursor hataları:

| Durum | Kod | Anlamı |
|---|---|---|
| `400` | `INVALID_CURSOR` | Cursor boş veya çözümlenemedi. Önceki bir yanıttan alınan güncel bir cursor kullanın. |
| `400` | `MALFORMED_CURSOR` | Cursor çözümlenemiyor **ya da** farklı bir endpoint veya filtre kümesi için üretilmiş. Cursor'u değiştirmeyin; bir filtreyi ya da endpoint'i değiştirdiyseniz cursor'sız baştan başlayın. |

## Sayfalama nesnesi {#paginated}

Her sayfa aynı yapıyla sarmalanır:

```json
{
  "data": [ /* çağrılar */ ],
  "pagination": {
    "next_cursor": "eyJ0IjoiMjAyNi0wNS0…",
    "has_more": true,
    "limit": 50
  }
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Bu sayfadaki çağrıları içerir. |
| `pagination.next_cursor` | string \| null | Sonraki sayfanın opak cursor'ını taşır. Son sayfada `null` olur. |
| `pagination.has_more` | boolean | Bu sayfadan sonra başka çağrı olup olmadığını belirtir. |
| `pagination.limit` | int | Bu istekte uygulanan limiti verir. |

---

## Tarihler: `date_from` / `date_to` {#range-semantics}

Somut bir örnekle başlayalım. Tek bir gün istersiniz:

```json
{ "date_from": "2026-05-23", "date_to": "2026-05-23" }
```

23 Mayıs gününe ait tüm çağrıları, İstanbul saatiyle `00:00:00`'dan `23:59:59`'a kadar alırsınız. `date_from` ve `date_to` **iki ucu dahil tam gün** olduğundan, hem ilk gün hem de son gün tam olarak sayılır.

- `date_from` — dahil edilen ilk gün ("o günden itibaren")
- `date_to` — dahil edilen son gün ("o güne kadar, o gün dahil")

Geri kalan ayrıntılar şöyledir:

- İki değer de **yalnızca tarih** içeren `YYYY-MM-DD` biçimindedir. Saat ya da saat dilimi bileşeni yoktur; siz bir gün gönderirsiniz, gün sınırlarını sunucu sizin için uygular.
- Günler **Europe/Istanbul** dilimine göre yorumlanır (yıl boyunca sabit UTC+3; yaz/kış saati yoktur). Yani `date_to: 2026-05-23`, "İstanbul saatiyle 23 Mayıs'ın sonuna kadar" demektir; sunucu bunu 24 Mayıs `00:00`'dan önceki her şey olarak ele alır.
- Birini tek başına ya da ikisini birlikte gönderebilirsiniz. En baştan taramak için ikisini de boş bırakın.
- `date_from`'un `date_to`'dan sonra olması `400 DATE_RANGE_INVALID` ile reddedilir.

:::note Başlangıç zamanı olmayan başarısız çağrılar
`date_from` / `date_to` filtreleri çağrının **başlangıç zamanına**, hiç bağlanmamış bir çağrı için (bazı `no_answer` / `failed` çağrıların başlangıç zamanı yoktur) **oluşturulma zamanına** göre süzer. Bu çağrılar da tarih filtreli sonuçlara **dahil edilir**; `date_from` ile artımlı senkronizasyon güvenlidir.
:::

### Kabul edilen biçim

Kabul edilen tek biçim, düz bir takvim tarihidir:

| Biçim | Örnek | Anlamı |
|---|---|---|
| Tarih (`YYYY-MM-DD`) | `2026-05-23` | 23 Mayıs gününün tamamı, Europe/Istanbul dilimiyle |

Girişte saat ya da saat dilimi bileşeni **yoktur**; siz bir gün gönderirsiniz, İstanbul gün sınırlarını sunucu sizin için uygular.

### Reddedilen biçimler

| Biçim | Hata Kodu | Sorun |
|---|---|---|
| `2026-05-23T15:30:00Z` | `INVALID_DATE_FORMAT` | Saat bileşeni var; yalnızca tarih gönderin |
| `2026-05-23 15:30:00` | `INVALID_DATE_FORMAT` | Düz bir tarih değil |
| `05/23/2026` | `INVALID_DATE_FORMAT` | `YYYY-MM-DD` değil; sıra belirsiz |
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

**Tek bir gün.** İki uç da dahil olduğundan 23 Mayıs gününün tamamı kapsanır:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-23", "date_to": "2026-05-23" }
```

**Bir takvim ayı.** İki uç da dahil olduğundan 1–31 Mayıs kapsanır:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-01", "date_to": "2026-05-31" }
```

**Belirli bir günden bu yana her şey.** "Şu ana kadar" demek için `date_to`'yu boş bırakın:

```json
{ "assistant_id": "8f3a1c20-4d3f-4a8b-bc12-5e6f7a8b9c01", "date_from": "2026-05-23" }
```

**Aralıkları çakışmadan zincirleme.** İki uç da dahil olduğundan, bir aralığın `date_to`'su ile bir sonrakinin `date_from`'u **ardışık günler** olmalı, asla aynı gün olmamalıdır:

```json
{ "date_from": "2026-05-01", "date_to": "2026-05-23" }
{ "date_from": "2026-05-24", "date_to": "2026-05-31" }
```

### Sık yapılan hatalar

| Gönderdiğiniz | Sonuç |
|---|---|
| `"2026-05-23T15:30:00Z"` (saat var) | `400 INVALID_DATE_FORMAT`; tarihler yalnızca gün (`YYYY-MM-DD`) |
| `"23-05-2026"` veya `"05/23/2026"` | `400 INVALID_DATE_FORMAT`; yalnızca `YYYY-MM-DD` |
| `date_from`, `date_to`'dan sonra | `400 DATE_RANGE_INVALID` |
