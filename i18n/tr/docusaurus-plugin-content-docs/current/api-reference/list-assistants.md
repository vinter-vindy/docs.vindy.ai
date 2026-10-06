---
title: Asistanları Listele
sidebar_label: Asistanları Listele
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# `GET /v1/assistants`

Bu uç, şirketinizdeki her asistanı **tek bir liste** hâlinde döndürür. Her öğe size asistanın temel bilgilerini verir; varsa o asistana bağlı **yapısal çıktı (structured output) şemasını** da içinde taşır.

---

## İstek

```http
GET https://api.vindy.ai/v1/assistants
Authorization: Bearer <api-key>
```

Bu uç hiçbir sorgu parametresi almaz ve yanıt **sayfalanmaz**; tüm asistanları, en fazla 1000 tanesini tek çağrıda döndürür.

## Yanıt (200 OK)

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

## Yanıt alanları

**Üst düzey**

| Alan | Tür | Açıklama |
|---|---|---|
| `data` | array | Şirketinizin asistanlarını, asistan başına bir nesne olarak listeler. |
| `total` | int | `data` dizisinde kaç öğe bulunduğunu belirtir. |

**Asistan öğesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `assistant_id` | string (UUID) | Asistanı kalıcı bir kimlikle tanımlar. Bu asistanın çağrılarını filtrelemek için [`POST /v1/calls/list`](list-calls/index.md) isteğinde, toplu giden çağrı başlatırken de `assistant_id` olarak [`POST /v1/calls/bulk`](bulk-create-calls.md) isteğinde kullanırsınız. |
| `assistant_name` | string | Asistanın görünen adını verir. |
| `assistant_language` | string | Asistanın dil kodunu verir (örneğin `tr-TR`, `en-US`). |
| `assistant_created_at` | ISO 8601 (UTC) | Asistanın oluşturulma zamanını gösterir; `+00:00` offset'li ISO 8601 biçiminde döner. |
| `assistant_variables` | array of string | Bu asistanın beklediği **şablon değişken adlarını** listeler. Vindy bu adları, asistanın prompt ve karşılama (greeting) metnindeki `{{…}}` yer tutucularından türetir; sırayı korur ve tekrarları ayıklar. Çağrı yaparken bu değerleri [`POST /v1/calls`](create-call.md) veya [`POST /v1/calls/bulk`](bulk-create-calls.md) isteğinde `variables` üzerinden gönderin. Asistan hiç değişken kullanmıyorsa liste boştur (`[]`). |
| `structured_outputs` | array | Bu asistana bağlı yapısal çıktı şemasını taşır. Asistanın şeması yoksa boştur (`[]`); varsa `id` değeri `assistant_id` değerine eşit olan **tek** bir giriş bulunur. |

**StructuredOutput nesnesi**

| Alan | Tür | Açıklama |
|---|---|---|
| `id` | string (UUID) | Şemayı kalıcı bir kimlikle tanımlar. `assistant_id` değerine eşittir; bir çağrının çıkardığı veriyi onu üreten şemayla eşleştirmek için kullanılır. |
| `name` | string | Şemanın görünen adını verir; asistanın adını yansıtır. |
| `schema` | object | Şemanın kendisini taşır; asistan için nasıl tanımlandıysa aynen döner. [Nasıl okunacağını](#structured-output-schema) hemen aşağıda anlatıyoruz. |

### Yapısal çıktı şeması {#structured-output-schema}

Bazı asistanlar; çağrının nasıl bittiği, bir memnuniyet puanı ya da müşterinin geri arama isteyip istemediği gibi birkaç bilgiyi her görüşmeden derleyecek biçimde kurulur. Böyle bir asistanın `structured_outputs` girişi bir `schema` taşır. Bu `schema`, asistan için nasıl tanımlandıysa aynen döner ve derlenecek verinin hangi alanlardan oluşacağını, her alanın ne türde olduğunu tek tek anlatır.

Bir `schema`'yı en kolay, **boş bir form** gibi düşünerek anlarsınız. Form yalnızca soruları sıralar; cevapları kendisi tutmaz. Cevaplar sonradan, her görüşme için bir kez gelir. Bir çağrı tamamlandığında, o görüşmede derlenen değerler [Çağrıları Listele](list-calls/index.md) yanıtındaki `call_structured_data` alanında döner. Yani buradaki `schema` boş formun kendisidir; oradaki `call_structured_data` ise o formun tek bir görüşmeyle doldurulmuş hâlidir.

Her şemanın kökü bir nesnedir. Bu nesnenin en önemli anahtarı `properties`'tir; `properties`, her alanın adını o alanın kısa tarifine bağlayan bir haritadır. Aşağıda anlatılan her şey, işte bu alan tariflerini okumakla ilgilidir.

**Şemadaki her alan, veride bir anahtara dönüşür.** Yukarıdaki şemadaki en sade üç alanı birlikte okuyalım:

```json
"arama_sonucu": {
  "type": "string",
  "enum": ["tamamlandi", "yarim_kaldi", "ulasilamadi", "belirsiz"]
},
"genel_memnuniyet_puani": { "type": "integer" },
"geri_arama_talebi": { "type": "boolean" }
```

Burada `arama_sonucu`, yalnızca dört sabit değerden birini alabilen bir metindir; değerleri `enum` ile sınırlanmıştır. `genel_memnuniyet_puani` bir tam sayı, `geri_arama_talebi` ise doğru/yanlış bir değerdir. Görüşme bittiğinde bu üç alan şöyle dolar:

```json
"arama_sonucu": "tamamlandi",
"genel_memnuniyet_puani": 4,
"geri_arama_talebi": false
```

Gördüğünüz gibi, şemadaki her alan adı görüşmenin verisinde bir anahtara karşılık gelir ve her değer, şemada belirtilen `type`'a uyar. Mesele özünde bundan ibarettir.

**Bir alan, tek bir değer yerine liste ya da kayıt da olabilir.** Bir alanın `type`'ı `array` olduğunda, yanındaki `items` girişi her bir elemanın neye benzediğini tarif eder. Yukarıdaki şema bunu iki yerde yapar:

```json
"ilgilenilen_urunler": {
  "type": "array",
  "items": { "type": "string" },
  "uniqueItems": true
},
"siparisler": {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "urun": { "type": "string" },
      "miktar": { "type": "integer" }
    }
  }
}
```

`items`'ı tek bir string olduğu için `ilgilenilen_urunler` bir metin listesidir; `uniqueItems: true` ise aynı değerin listede iki kez yer almayacağını söyler. `siparisler` bir adım daha derine iner. `items`'ı kendi alanları olan bir nesne olduğundan, listenin her elemanı eksiksiz küçük bir kayıttır. Gerçek bir görüşmede bu iki alan şöyle dolar:

```json
"ilgilenilen_urunler": ["urun_a", "urun_b"],
"siparisler": [
  { "urun": "Ürün A", "miktar": 2 },
  { "urun": "Ürün B", "miktar": 1 }
]
```

Bir alan bu kadar iç içe geçebildiğinden, şemayı düz bir değer listesi gibi okumayın. Bir liste bir kaydı, bir kayıt da başka alanları içinde barındırabilir. En sağlıklısı, `items` üzerinden dizilere, `properties` üzerinden nesnelere adım adım inerek şemayı sonuna dek izlemektir.

**Bir çağrının eksiksiz sonucu.** Yukarıdaki asistanın, bir görüşme bittiğinde döndürdüğü `call_structured_data`'nın tamamı, beş alanın hepsi birlikte doldurulmuş hâliyle şöyledir:

```json
{
  "arama_sonucu": "tamamlandi",
  "genel_memnuniyet_puani": 4,
  "geri_arama_talebi": false,
  "ilgilenilen_urunler": ["urun_a", "urun_b"],
  "siparisler": [
    { "urun": "Ürün A", "miktar": 2 },
    { "urun": "Ürün B", "miktar": 1 }
  ]
}
```

Her anahtar, şemanın vaat ettiği alana karşılık gelir: `arama_sonucu` sabit seçimdir, `genel_memnuniyet_puani` memnuniyet sayısıdır, `geri_arama_talebi` doğru/yanlış değerdir, `ilgilenilen_urunler` tekrarsız listedir, `siparisler` ise kayıt listesidir.

**Bir alanda karşılaşacağınız anahtarlar.** Her alan tarifi, küçük bir anahtar kümesinden oluşur. Bunların içinde yalnızca `type` her zaman bulunur; kalanlar yalnızca o alana uyduğunda görünür.

| Anahtar | Ne anlattığı | Örnek |
|---|---|---|
| `type` | Alanın değer türünü verir: `string`, `integer`, `number`, `boolean`, `array` ya da `object`. **Her zaman bulunur.** | `"type": "integer"` |
| `title` | Alanın okunabilir etiketini verir. | `"title": "Genel memnuniyet"` |
| `description` | Alanın görüşmeden neyi derlediğini açıklar. | `"description": "1-5 arası puan."` |
| `enum` | Alan bir seçimse, izin verilen sabit değerleri listeler. | `"enum": ["tamamlandi", "belirsiz"]` |
| `items` | Alan bir `array` ise, her elemanın şeklini tanımlar. | `"items": { "type": "string" }` |
| `uniqueItems` | Alan bir `array` ise, `true` tekrar olmadığını belirtir. | `"uniqueItems": true` |

Opsiyonel bir anahtar, o alana uymadığında gösterilmez; asla `null` olarak yazılmaz. Bu yüzden şemayı temkinli okuyun: bir alanın `title`'ı yoksa onun yerine anahtar adını kullanın, `description`, `enum` ya da `items`'ın da bulunacağını baştan varsaymayın.

**`required` ve `additionalProperties`.** `properties`'in yanı sıra, şemanın kökünde iki anahtar daha görebilirsiniz:

- `required`, asistanın her görüşmede mutlaka doldurduğu alanları sıralar; bu alanların her çağrının `call_structured_data`'sında bulunacağına güvenebilirsiniz. Örneğimizde `arama_sonucu` ile `genel_memnuniyet_puani` zorunludur; kalan alanlar kimi görüşmelerde boş kalabilir. Zorunlu alan hiç yoksa `required` anahtarı şemaya hiç konmaz; yani `"required": []` ya da `"required": null` ile karşılaşmazsınız. Çoğu asistanda zorunlu alan bulunmadığından, bu anahtarın olmamasını olağan sayın.
- `additionalProperties` çoğunlukla `false`'tur; bu da bir görüşmenin verisinde, şemada sıralanan alanların dışında bir alan çıkmayacağı anlamına gelir.

**Değerler nereden gelir.** `schema` hiçbir zaman değer taşımaz; o yalnızca formun kendisidir. Değerler her zaman gerçek bir görüşmeden doğar ve aynı şema her görüşmede farklı bir sonuç üretir. Bu değerleri görmek için [Çağrıları Listele](list-calls/index.md) ucunu çağırın. Dönen `call_structured_data`, anahtarları doğrudan şemanın `properties`'i olan **düz (flat) bir nesnedir**; yapısal çıktının `id`'si altına hiçbir zaman yerleştirilmez. Asistan bir alanı görüşmeden çıkaramadıysa, o alanın değeri `null` olabilir. Kısacası bunu sıradan bir JSON nesnesi gibi ele alın: alanları `properties`'ten okuyun, şemada yalnızca `type` ile `properties`'in bulunacağını varsaymayın.

## Hatalar

| Durum | Kod |
|---|---|
| `401` | `MISSING_AUTH_HEADER`, `INVALID_AUTH_FORMAT`, `INVALID_API_KEY` |
| `429` | `RATE_LIMITED` |

## Notlar

- Asistanlar oluşturulma zamanına göre, en eskiden en yeniye sıralanır.
- Liste, kendi şirketinizin asistanlarını **ve Vindy tarafından sizinle paylaşılan asistanları** birlikte içerir. Paylaşılan asistanlar burada kendi asistanlarınız gibi davranır: [Çağrıları Listele](list-calls/index.md)'de onların çağrılarını filtreleyebilir, [Toplu Arama Oluştur](bulk-create-calls.md) ile onlarla giden çağrı başlatabilirsiniz.
- Yapısal çıktı şeması olmayan bir asistan `structured_outputs: []` döndürür.
- `assistant_variables`, bu asistanla arama yaparken hangi `variables` anahtarlarını göndereceğinizi söyler. Asistan hiç değişken kullanmıyorsa `variables`'ı tümüyle atlayabilirsiniz.
- Çıkarılan değerler, [Çağrıları Listele](list-calls/index.md) yanıtında **düz (flat)** bir `call_structured_data` nesnesi olarak döner; yapısal çıktının `id`'sinin **altına sarılmaz**. `id`'yi yalnızca bir çağrının verisini buradaki şemayla eşleştirmek için kullanın.

## Örnekler

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

if (!response.ok) {
  const error = await response.json();
  throw new Error(`${error.extensions?.code}: ${error.message}`);
}

const { data, total } = await response.json();
console.log(`${total} asistan`);

for (const assistant of data) {
  console.log(`${assistant.assistant_id}: ${assistant.assistant_name}`);
}
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
if not response.ok:
    error = response.json()
    raise RuntimeError(f"{error.get('extensions', {}).get('code')}: {error.get('message')}")

body = response.json()
print(f"{body['total']} asistan")

for assistant in body["data"]:
    print(f"{assistant['assistant_id']}: {assistant['assistant_name']}")
```

</TabItem>
</Tabs>
